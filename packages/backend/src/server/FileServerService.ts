import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import fastifyStatic from '@fastify/static';
import rename from 'rename';
import type { Config } from '@/config.js';
import type { DriveFile, DriveFilesRepository } from '@/models/index.js';
import { DI } from '@/di-symbols.js';
import { createTemp } from '@/misc/create-temp.js';
import { FILE_TYPE_BROWSERSAFE } from '@/const.js';
import { StatusError } from '@/misc/status-error.js';
import type Logger from '@/logger.js';
import { DownloadService } from '@/core/DownloadService.js';
import { IImageStreamable, ImageProcessingService, webpDefault } from '@/core/ImageProcessingService.js';
import { VideoProcessingService } from '@/core/VideoProcessingService.js';
import { InternalStorageService } from '@/core/InternalStorageService.js';
import { contentDisposition } from '@/misc/content-disposition.js';
import { FileInfoService } from '@/core/FileInfoService.js';
import { LoggerService } from '@/core/LoggerService.js';
import { bindThis } from '@/decorators.js';
import type { FastifyInstance, FastifyRequest, FastifyReply, FastifyPluginOptions } from 'fastify';
import { isMimeImage } from '@/misc/is-mime-image.js';
import sharp from 'sharp';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const assets = `${_dirname}/../../server/file/assets/`;

@Injectable()
export class FileServerService {
	private logger: Logger;

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,

		private fileInfoService: FileInfoService,
		private downloadService: DownloadService,
		private imageProcessingService: ImageProcessingService,
		private videoProcessingService: VideoProcessingService,
		private internalStorageService: InternalStorageService,
		private loggerService: LoggerService,
	) {
		this.logger = this.loggerService.getLogger('server', 'gray', false);

		//this.createServer = this.createServer.bind(this);
	}

	@bindThis
	public commonReadableHandlerGenerator(reply: FastifyReply) {
		return (err: Error): void => {
			this.logger.error(err);
			reply.code(500);
			reply.header('Cache-Control', 'max-age=300');
		};
	}

	@bindThis
	public createServer(fastify: FastifyInstance, options: FastifyPluginOptions, done: (err?: Error) => void) {
		fastify.addHook('onRequest', (request, reply, done) => {
			reply.header('Content-Security-Policy', 'default-src \'none\'; img-src \'self\'; media-src \'self\'; style-src \'unsafe-inline\'');
			done();
		});

		fastify.register(fastifyStatic, {
			root: _dirname,
			serve: false,
		});

		fastify.get('/files/app-default.jpg', (request, reply) => {
			const file = fs.createReadStream(`${_dirname}/assets/dummy.png`);
			reply.header('Content-Type', 'image/jpeg');
			reply.header('Cache-Control', 'max-age=31536000, immutable');
			return reply.send(file);
		});

		fastify.get<{ Params: { key: string; } }>('/files/:key', async (request, reply) => {
			return await this.sendDriveFile(request, reply)
				.catch(err => this.errorHandler(request, reply, err));
		});
		fastify.get<{ Params: { key: string; } }>('/files/:key/*', async (request, reply) => {
			return await this.sendDriveFile(request, reply)
				.catch(err => this.errorHandler(request, reply, err));
		});

		fastify.get<{
			Params: { url: string; };
			Querystring: { url?: string; };
		}>('/proxy/:url*', async (request, reply) => {
			return await this.proxyHandler(request, reply)
				.catch(err => this.errorHandler(request, reply, err));
		});

		done();
	}

	@bindThis
	private async errorHandler(request: FastifyRequest<{ Params?: { [x: string]: any }; Querystring?: { [x: string]: any }; }>, reply: FastifyReply, err?: any) {
		this.logger.error(`${err}`);

		if (request.query && 'fallback' in request.query) {
			return reply.sendFile('/dummy.png', assets);
		}

		if (err instanceof StatusError && (err.statusCode === 302 || err.isClientError)) {
			reply.code(err.statusCode);
			return;
		}

		reply.code(500);
		return;
	}

	@bindThis
	private async sendDriveFile(request: FastifyRequest<{ Params: { key: string; } }>, reply: FastifyReply) {
		const key = request.params.key;
		const file = await this.getFileFromKey(key).then();

		if (file === '404') {
			reply.code(404);
			reply.header('Cache-Control', 'max-age=86400');
			return reply.sendFile('/dummy.png', assets);
		}

		if (file === '204') {
			reply.code(204);
			reply.header('Cache-Control', 'max-age=86400');
			return;
		}

		try {
			if (file.state === 'remote') {
				const convertFile = async () => {
					if (file.fileRole === 'thumbnail') {
						if (['image/jpeg', 'image/webp', 'image/avif', 'image/png', 'image/svg+xml'].includes(file.mime)) {
							return this.imageProcessingService.convertToWebpStream(
								file.path,
								498,
								280
							);
						} else if (file.mime.startsWith('video/')) {
							return await this.videoProcessingService.generateVideoThumbnail(file.path);
						}
					}

					if (file.fileRole === 'webpublic') {
						if (['image/svg+xml'].includes(file.mime)) {
							return this.imageProcessingService.convertToWebpStream(
								file.path,
								2048,
								2048,
								{ ...webpDefault, lossless: true }
							)
						}
					}

					return {
						data: fs.createReadStream(file.path),
						ext: file.ext,
						type: file.mime,
					};
				};

				const image = await convertFile();

				if (typeof image.data === 'object' && 'pipe' in image.data && typeof image.data.pipe === 'function') {
					image.data.on('end', file.cleanup);
					image.data.on('close', file.cleanup);
				}

				reply.header('Content-Type', FILE_TYPE_BROWSERSAFE.includes(image.type) ? image.type : 'application/octet-stream');
				reply.header('Cache-Control', 'max-age=31536000, immutable');
				return image.data;
			}

			if (file.fileRole !== 'original') {
				const filename = rename(file.file.name, {
					suffix: file.fileRole === 'thumbnail' ? '-thumb' : '-web',
					extname: file.ext ? `.${file.ext}` : undefined,
				}).toString();

				reply.header('Content-Type', FILE_TYPE_BROWSERSAFE.includes(file.mime) ? file.mime : 'application/octet-stream');
				reply.header('Cache-Control', 'max-age=31536000, immutable');
				reply.header('Content-Disposition', contentDisposition('inline', filename));
				return fs.createReadStream(file.path);
			} else {
				const stream = fs.createReadStream(file.path);
				stream.on('error', this.commonReadableHandlerGenerator(reply));
				reply.header('Content-Type', FILE_TYPE_BROWSERSAFE.includes(file.file.type) ? file.file.type : 'application/octet-stream');
				reply.header('Cache-Control', 'max-age=31536000, immutable');
				reply.header('Content-Disposition', contentDisposition('inline', file.file.name));
				return stream;
			}
		} catch (e) {
			if ('cleanup' in file) file.cleanup();
			throw e;
		}
	}

	@bindThis
	private async proxyHandler(request: FastifyRequest<{ Params: { url: string; }; Querystring: { url?: string; }; }>, reply: FastifyReply) {
		const url = 'url' in request.query ? request.query.url : 'https://' + request.params.url;

		if (typeof url !== 'string') {
			reply.code(400);
			return;
		}

		// Create temp file
		const file = await this.getStreamAndTypeFromUrl(url);
		if (file === '404') {
			reply.code(404);
			reply.header('Cache-Control', 'max-age=86400');
			return reply.sendFile('/dummy.png', assets);
		}

		if (file === '204') {
			reply.code(204);
			reply.header('Cache-Control', 'max-age=86400');
			return;
		}

		try {
			const isConvertibleImage = isMimeImage(file.mime, 'sharp-convertible-image');
			const isAnimationConvertibleImage = isMimeImage(file.mime, 'sharp-animation-convertible-image');

			let image: IImageStreamable | null = null;
			if ('emoji' in request.query && isConvertibleImage) {
				if (!isAnimationConvertibleImage && !('static' in request.query)) {
					image = {
						data: fs.createReadStream(file.path),
						ext: file.ext,
						type: file.mime,
					};
				} else {
					const data = sharp(file.path, { animated: !('static' in request.query) })
							.resize({
								height: 128,
								withoutEnlargement: true,
							})
							.webp(webpDefault);

					image = {
						data,
						ext: 'webp',
						type: 'image/webp',
					};
				}
			} else if ('static' in request.query && isConvertibleImage) {
				image = this.imageProcessingService.convertToWebpStream(file.path, 498, 280);
			} else if ('preview' in request.query && isConvertibleImage) {
				image = this.imageProcessingService.convertToWebpStream(file.path, 200, 200);
			} else if ('badge' in request.query) {
				if (!isConvertibleImage) {
					// 画像でないなら404でお茶を濁す
					throw new StatusError('Unexpected mime', 404);
				}

				const mask = sharp(file.path)
					.resize(96, 96, {
						fit: 'inside',
						withoutEnlargement: false,
					})
					.greyscale()
					.normalise()
					.linear(1.75, -(128 * 1.75) + 128) // 1.75x contrast
					.flatten({ background: '#000' })
					.toColorspace('b-w');
	
				const stats = await mask.clone().stats();
	
				if (stats.entropy < 0.1) {
					// エントロピーがあまりない場合は404にする
					throw new StatusError('Skip to provide badge', 404);
				}
	
				const data = sharp({
					create: { width: 96, height: 96, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
				})
					.pipelineColorspace('b-w')
					.boolean(await mask.png().toBuffer(), 'eor');
	
				image = {
					data: await data.png().toBuffer(),
					ext: 'png',
					type: 'image/png',
				};
			} else if (file.mime === 'image/svg+xml') {
				image = this.imageProcessingService.convertToWebpStream(file.path, 2048, 2048);
			} else if (!file.mime.startsWith('image/') || !FILE_TYPE_BROWSERSAFE.includes(file.mime)) {
				throw new StatusError('Rejected type', 403, 'Rejected type');
			}

			if (!image) {
				image = {
					data: fs.createReadStream(file.path),
					ext: file.ext,
					type: file.mime,
				};
			}

			if (typeof image.data === 'object' && 'pipe' in image.data && typeof image.data.pipe === 'function' && 'cleanup' in file) {
				image.data.on('end', file.cleanup);
				image.data.on('close', file.cleanup);
			}

			reply.header('Content-Type', image.type);
			reply.header('Cache-Control', 'max-age=31536000, immutable');
			return image.data;
		} catch (e) {
			if ('cleanup' in file) file.cleanup();
			throw e;
		}
	}

	@bindThis
	private async getStreamAndTypeFromUrl(url: string): Promise<
		{ state: 'remote'; fileRole?: 'thumbnail' | 'webpublic' | 'original'; file?: DriveFile; mime: string; ext: string | null; path: string; cleanup: () => void; }
		| { state: 'stored_internal'; fileRole: 'thumbnail' | 'webpublic' | 'original'; file: DriveFile; mime: string; ext: string | null; path: string; }
		| '404'
		| '204'
	> {
		if (url.startsWith(`${this.config.url}/files/`)) {
			const key = url.replace(`${this.config.url}/files/`, '').split('/').shift();
			if (!key) throw new StatusError('Invalid File Key', 400, 'Invalid File Key');

			return await this.getFileFromKey(key);
		}

		return await this.downloadAndDetectTypeFromUrl(url);
	}

	@bindThis
	private async downloadAndDetectTypeFromUrl(url: string): Promise<
		{ state: 'remote' ; mime: string; ext: string | null; path: string; cleanup: () => void; }
	> {
		const [path, cleanup] = await createTemp();
		try {
			await this.downloadService.downloadUrl(url, path);

			const { mime, ext } = await this.fileInfoService.detectType(path);
	
			return {
				state: 'remote',
				mime, ext,
				path, cleanup,
			}
		} catch (e) {
			cleanup();
			throw e;
		}
	}

	@bindThis
	private async getFileFromKey(key: string): Promise<
		{ state: 'remote'; fileRole: 'thumbnail' | 'webpublic' | 'original'; file: DriveFile; mime: string; ext: string | null; path: string; cleanup: () => void; }
		| { state: 'stored_internal'; fileRole: 'thumbnail' | 'webpublic' | 'original'; file: DriveFile; mime: string; ext: string | null; path: string; }
		| '404'
		| '204'
	> {
		// Fetch drive file
		const file = await this.driveFilesRepository.createQueryBuilder('file')
			.where('file.accessKey = :accessKey', { accessKey: key })
			.orWhere('file.thumbnailAccessKey = :thumbnailAccessKey', { thumbnailAccessKey: key })
			.orWhere('file.webpublicAccessKey = :webpublicAccessKey', { webpublicAccessKey: key })
			.getOne();

		if (file == null) return '404';

		const isThumbnail = file.thumbnailAccessKey === key;
		const isWebpublic = file.webpublicAccessKey === key;

		if (!file.storedInternal) {
			if (!(file.isLink && file.uri)) return '204';
			const result = await this.downloadAndDetectTypeFromUrl(file.uri);
			return {
				...result,
				fileRole: isThumbnail ? 'thumbnail' : isWebpublic ? 'webpublic' : 'original',
				file,
			}
		}

		const path = this.internalStorageService.resolvePath(key);

		if (isThumbnail || isWebpublic) {
			const { mime, ext } = await this.fileInfoService.detectType(path);
			return {
				state: 'stored_internal',
				fileRole: isThumbnail ? 'thumbnail' : 'webpublic',
				file,
				mime, ext,
				path,
			};
		}

		return {
			state: 'stored_internal',
			fileRole: 'original',
			file,
			mime: file.type,
			ext: null,
			path,
		}
	}
}
