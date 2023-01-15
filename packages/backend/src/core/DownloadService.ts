import * as fs from 'node:fs';
import * as stream from 'node:stream';
import * as util from 'node:util';
import { Inject, Injectable } from '@nestjs/common';
import IPCIDR from 'ip-cidr';
import PrivateIp from 'private-ip';
import got, * as Got from 'got';
import chalk from 'chalk';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { HttpRequestService, UndiciFetcher } from '@/core/HttpRequestService.js';
import { createTemp } from '@/misc/create-temp.js';
import { StatusError } from '@/misc/status-error.js';
import { LoggerService } from '@/core/LoggerService.js';
import type Logger from '@/logger.js';
import { buildConnector } from 'undici';
import type { Response } from 'undici';

const pipeline = util.promisify(stream.pipeline);
import { bindThis } from '@/decorators.js';

export type NonNullBodyResponse = Response & {
	body: ReadableStream;
	clone: () => NonNullBodyResponse;
};

@Injectable()
export class DownloadService {
	private logger: Logger;
	private undiciFetcher: UndiciFetcher;

	constructor(
		@Inject(DI.config)
		private config: Config,

		private httpRequestService: HttpRequestService,
		private loggerService: LoggerService,
	) {
		this.logger = this.loggerService.getLogger('download');

		this.undiciFetcher = new UndiciFetcher(this.httpRequestService.getStandardUndiciFetcherOption(
			{
				connect: process.env.NODE_ENV === 'development' ?
					this.httpRequestService.clientDefaults.connect
					:
					this.httpRequestService.getConnectorWithIpCheck(
						buildConnector({
							...this.httpRequestService.clientDefaults.connect,
						}),
						(ip) => !this.isPrivateIp(ip)
					),
				bodyTimeout: 30 * 1000,
			},
			{
				connect: this.httpRequestService.clientDefaults.connect,
			}
		), this.logger);
	}

	@bindThis
	public async fetchUrl(url: string): Promise<NonNullBodyResponse> {
		this.logger.info(`Downloading ${chalk.cyan(url)} ...`);

		const timeout = 30 * 1000;
		const operationTimeout = 60 * 1000;
		const maxSize = this.config.maxFileSize ?? 262144000;

		const response = await this.undiciFetcher.fetch(url);

		if (response.body === null) {
			throw new StatusError('No body', 400, 'No body');
		}

		this.logger.succ(`Download finished: ${chalk.cyan(url)}`);

		return response as NonNullBodyResponse;
	}

	@bindThis
	public async pipeRequestToFile(_response: Response, path: string): Promise<void> {
		const response = _response.clone();
		if (response.body == null) {
			throw new StatusError('No body', 400, 'No body');
		}

		try {
			this.logger.info(`Saving File to ${chalk.cyanBright(path)} from downloading ...`);
			await pipeline(stream.Readable.fromWeb(response.body), fs.createWriteStream(path));
		} catch (e) {
			if (e instanceof Got.HTTPError) {
				throw new StatusError(`${e.response.statusCode} ${e.response.statusMessage}`, e.response.statusCode, e.response.statusMessage);
			} else {
				throw e;
			}
		}
	}

	@bindThis
	public async downloadUrl(url: string, path: string): Promise<void> {
		await this.pipeRequestToFile(await this.fetchUrl(url), path);
		this.logger.succ(`Download finished: ${chalk.cyan(url)}`);
	}

	@bindThis
	public async downloadTextFile(url: string): Promise<string> {
		// Create temp file
		const [path, cleanup] = await createTemp();
	
		this.logger.info(`text file: Temp file is ${path}`);
	
		try {
			// write content at URL to temp file
			await this.downloadUrl(url, path);
	
			const text = await util.promisify(fs.readFile)(path, 'utf8');
	
			return text;
		} finally {
			cleanup();
		}
	}

	@bindThis
	private isPrivateIp(ip: string): boolean {
		for (const net of this.config.allowedPrivateNetworks ?? []) {
			const cidr = new IPCIDR(net);
			if (cidr.contains(ip)) {
				return false;
			}
		}

		return PrivateIp(ip) ?? false;
	}
}
