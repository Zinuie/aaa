import { Inject, Injectable } from '@nestjs/common';
import Koa from 'koa';
import Router from '@koa/router';
import multer from '@koa/multer';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { ModuleRef } from '@nestjs/core';
import { Config } from '@/config/types.js';
import { Users , Instances, AccessTokens } from '@/models/index.js';
import { DI_SYMBOLS } from '@/di-symbols.js';
import endpoints from './endpoints.js';
import signup from './private/signup.js';
import signin from './private/signin.js';
import signupPending from './private/signup-pending.js';
import discord from './service/discord.js';
import github from './service/github.js';
import twitter from './service/twitter.js';
import { ApiCallService } from './ApiCallService.js';

@Injectable()
export class ApiServerService {
	constructor(
		private moduleRef: ModuleRef,

		@Inject(DI_SYMBOLS.config)
		private config: Config,

		@Inject('usersRepository')
		private usersRepository: typeof Users,

		private apiCallService: ApiCallService,
	) {
	}

	public createApiServer() {
		const handlers: Record<string, any> = {};

		for (const endpoint of endpoints) {
			handlers[endpoint.name] = this.moduleRef.get('ep:' + endpoint.name).exec;
		}

		// Init app
		const apiServer = new Koa();

		apiServer.use(cors({
			origin: '*',
		}));

		// No caching
		apiServer.use(async (ctx, next) => {
			ctx.set('Cache-Control', 'private, max-age=0, must-revalidate');
			await next();
		});

		apiServer.use(bodyParser({
			// リクエストが multipart/form-data でない限りはJSONだと見なす
			detectJSON: ctx => !ctx.is('multipart/form-data'),
		}));

		// Init multer instance
		const upload = multer({
			storage: multer.diskStorage({}),
			limits: {
				fileSize: this.config.maxFileSize ?? 262144000,
				files: 1,
			},
		});

		// Init router
		const router = new Router();

		/**
		 * Register endpoint handlers
		 */
		for (const endpoint of endpoints) {
			if (endpoint.meta.requireFile) {
				router.post(`/${endpoint.name}`, upload.single('file'), this.apiCallService.handleRequest.bind(this.apiCallService, endpoint, handlers[endpoint.name]));
			} else {
				// 後方互換性のため
				if (endpoint.name.includes('-')) {
					router.post(`/${endpoint.name.replace(/-/g, '_')}`, this.apiCallService.handleRequest.bind(this.apiCallService, endpoint, handlers[endpoint.name]));

					if (endpoint.meta.allowGet) {
						router.get(`/${endpoint.name.replace(/-/g, '_')}`, this.apiCallService.handleRequest.bind(this.apiCallService, endpoint, handlers[endpoint.name]));
					} else {
						router.get(`/${endpoint.name.replace(/-/g, '_')}`, async ctx => { ctx.status = 405; });
					}
				}

				router.post(`/${endpoint.name}`, this.apiCallService.handleRequest.bind(this.apiCallService, endpoint, handlers[endpoint.name]));

				if (endpoint.meta.allowGet) {
					router.get(`/${endpoint.name}`, this.apiCallService.handleRequest.bind(this.apiCallService, endpoint, handlers[endpoint.name]));
				} else {
					router.get(`/${endpoint.name}`, async ctx => { ctx.status = 405; });
				}
			}
		}

		router.post('/signup', signup);
		router.post('/signin', signin);
		router.post('/signup-pending', signupPending);

		router.use(discord.routes());
		router.use(github.routes());
		router.use(twitter.routes());

		router.get('/v1/instance/peers', async ctx => {
			const instances = await Instances.find({
				select: ['host'],
			});

			ctx.body = instances.map(instance => instance.host);
		});

		router.post('/miauth/:session/check', async ctx => {
			const token = await AccessTokens.findOneBy({
				session: ctx.params.session,
			});

			if (token && token.session != null && !token.fetched) {
				AccessTokens.update(token.id, {
					fetched: true,
				});

				ctx.body = {
					ok: true,
					token: token.token,
					user: await Users.pack(token.userId, null, { detail: true }),
				};
			} else {
				ctx.body = {
					ok: false,
				};
			}
		});

		// Return 404 for unknown API
		router.all('(.*)', async ctx => {
			ctx.status = 404;
		});

		// Register router
		apiServer.use(router.routes());

		return apiServer;
	}
}
