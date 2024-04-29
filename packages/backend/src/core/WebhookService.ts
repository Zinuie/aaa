/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import * as Redis from 'ioredis';
import type { MiUser, SystemWebhooksRepository, WebhooksRepository } from '@/models/_.js';
import type { MiWebhook } from '@/models/Webhook.js';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';
import { GlobalEvents, GlobalEventService } from '@/core/GlobalEventService.js';
import { MiSystemWebhook, type SystemWebhookEventType } from '@/models/SystemWebhook.js';
import { IdService } from '@/core/IdService.js';
import { QueueService } from '@/core/QueueService.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { LoggerService } from '@/core/LoggerService.js';
import Logger from '@/logger.js';
import type { OnApplicationShutdown } from '@nestjs/common';

@Injectable()
export class WebhookService implements OnApplicationShutdown {
	private logger: Logger;
	private activeWebhooksFetched = false;
	private activeWebhooks: MiWebhook[] = [];
	private activeSystemWebhooksFetched = false;
	private activeSystemWebhooks: MiSystemWebhook[] = [];

	constructor(
		@Inject(DI.redisForSub)
		private redisForSub: Redis.Redis,
		@Inject(DI.webhooksRepository)
		private webhooksRepository: WebhooksRepository,
		@Inject(DI.systemWebhooksRepository)
		private systemWebhooksRepository: SystemWebhooksRepository,
		private idService: IdService,
		private queueService: QueueService,
		private moderationLogService: ModerationLogService,
		private loggerService: LoggerService,
		private globalEventService: GlobalEventService,
	) {
		this.redisForSub.on('message', this.onMessage);
		this.logger = this.loggerService.getLogger('webhook');
	}

	@bindThis
	public async getActiveWebhooks() {
		if (!this.activeWebhooksFetched) {
			this.activeWebhooks = await this.webhooksRepository.findBy({
				active: true,
			});
			this.activeWebhooksFetched = true;
		}

		return this.activeWebhooks;
	}

	@bindThis
	public async fetchActiveSystemWebhooks() {
		if (!this.activeSystemWebhooksFetched) {
			this.activeSystemWebhooks = await this.systemWebhooksRepository.findBy({
				isActive: true,
			});
			this.activeSystemWebhooksFetched = true;
		}

		return this.activeSystemWebhooks;
	}

	/**
	 * SystemWebhook の一覧を取得する.
	 */
	@bindThis
	public async fetchSystemWebhooks(params?: {
		ids?: MiSystemWebhook['id'][];
		isActive?: MiSystemWebhook['isActive'];
		on?: MiSystemWebhook['on'];
	}): Promise<MiSystemWebhook[]> {
		const query = this.systemWebhooksRepository.createQueryBuilder('systemWebhook');
		if (params) {
			if (params.ids && params.ids.length > 0) {
				query.andWhere('systemWebhook.id IN (:...ids)', { ids: params.ids });
			}
			if (params.isActive !== undefined) {
				query.andWhere('systemWebhook.isActive = :isActive', { isActive: params.isActive });
			}
			if (params.on && params.on.length > 0) {
				query.andWhere('systemWebhook.on IN (:...on)', { on: params.on });
			}
		}

		return query.getMany();
	}

	/**
	 * SystemWebhook を作成する.
	 */
	@bindThis
	public async createSystemWebhook(
		params: {
			isActive: MiSystemWebhook['isActive'];
			name: MiSystemWebhook['name'];
			on: MiSystemWebhook['on'];
			url: MiSystemWebhook['url'];
			secret: MiSystemWebhook['secret'];
		},
		updater: MiUser,
	): Promise<MiSystemWebhook> {
		const id = this.idService.gen();
		await this.systemWebhooksRepository.insert({
			...params,
			id,
		});

		const webhook = await this.systemWebhooksRepository.findOneByOrFail({ id });
		this.globalEventService.publishInternalEvent('systemWebhookCreated', webhook);
		this.moderationLogService
			.log(updater, 'createSystemWebhook', {
				systemWebhookId: webhook.id,
				webhook: webhook,
			})
			.then();

		return webhook;
	}

	/**
	 * SystemWebhook を更新する.
	 */
	@bindThis
	public async updateSystemWebhook(
		params: {
			id: MiSystemWebhook['id'];
			isActive: MiSystemWebhook['isActive'];
			name: MiSystemWebhook['name'];
			on: MiSystemWebhook['on'];
			url: MiSystemWebhook['url'];
			secret: MiSystemWebhook['secret'];
		},
		updater: MiUser,
	): Promise<MiSystemWebhook> {
		const beforeEntity = await this.systemWebhooksRepository.findOneByOrFail({ id: params.id });
		await this.systemWebhooksRepository.update(beforeEntity.id, {
			updatedAt: new Date(),
			isActive: params.isActive,
			name: params.name,
			on: params.on,
			url: params.url,
			secret: params.secret,
		});

		const afterEntity = await this.systemWebhooksRepository.findOneByOrFail({ id: beforeEntity.id });
		this.globalEventService.publishInternalEvent('systemWebhookUpdated', afterEntity);
		this.moderationLogService
			.log(updater, 'updateSystemWebhook', {
				systemWebhookId: beforeEntity.id,
				before: beforeEntity,
				after: afterEntity,
			})
			.then();

		return afterEntity;
	}

	/**
	 * SystemWebhook を削除する.
	 */
	@bindThis
	public async deleteSystemWebhook(id: MiSystemWebhook['id'], updater: MiUser) {
		const webhook = await this.systemWebhooksRepository.findOneByOrFail({ id });
		await this.systemWebhooksRepository.delete(id);

		this.globalEventService.publishInternalEvent('systemWebhookDeleted', webhook);
		this.moderationLogService
			.log(updater, 'deleteSystemWebhook', {
				systemWebhookId: webhook.id,
				webhook,
			})
			.then();
	}

	/**
	 * SystemWebhook をWebhook配送キューに追加する
	 * @see QueueService.systemWebhookDeliver
	 */
	@bindThis
	public enqueueSystemWebhook(webhook: MiSystemWebhook | MiSystemWebhook['id'], type: SystemWebhookEventType, content: unknown) {
		const webhookEntity = typeof webhook === 'string' ? this.activeSystemWebhooks.find(a => a.id === webhook) : webhook;
		if (!webhookEntity) {
			this.logger.warn(`Webhook not found : ${webhook}`);
			return;
		}

		if (!webhookEntity.isActive || !webhookEntity.on.includes(type)) {
			this.logger.info(`Webhook ${webhookEntity.id} is not active or not listening to ${type}`);
			return;
		}

		return this.queueService.systemWebhookDeliver(webhookEntity, type, content);
	}

	@bindThis
	private async onMessage(_: string, data: string): Promise<void> {
		const obj = JSON.parse(data);
		if (obj.channel !== 'internal') {
			return;
		}

		const { type, body } = obj.message as GlobalEvents['internal']['payload'];
		switch (type) {
			case 'webhookCreated': {
				if (body.active) {
					this.activeWebhooks.push({ // TODO: このあたりのデシリアライズ処理は各modelファイル内に関数としてexportしたい
						...body,
						latestSentAt: body.latestSentAt ? new Date(body.latestSentAt) : null,
						user: null, // joinなカラムは通常取ってこないので
					});
				}
				break;
			}
			case 'webhookUpdated': {
				if (body.active) {
					const i = this.activeWebhooks.findIndex(a => a.id === body.id);
					if (i > -1) {
						this.activeWebhooks[i] = { // TODO: このあたりのデシリアライズ処理は各modelファイル内に関数としてexportしたい
							...body,
							latestSentAt: body.latestSentAt ? new Date(body.latestSentAt) : null,
							user: null, // joinなカラムは通常取ってこないので
						};
					} else {
						this.activeWebhooks.push({ // TODO: このあたりのデシリアライズ処理は各modelファイル内に関数としてexportしたい
							...body,
							latestSentAt: body.latestSentAt ? new Date(body.latestSentAt) : null,
							user: null, // joinなカラムは通常取ってこないので
						});
					}
				} else {
					this.activeWebhooks = this.activeWebhooks.filter(a => a.id !== body.id);
				}
				break;
			}
			case 'webhookDeleted': {
				this.activeWebhooks = this.activeWebhooks.filter(a => a.id !== body.id);
				break;
			}
			case 'systemWebhookCreated': {
				if (body.isActive) {
					this.activeSystemWebhooks.push(MiSystemWebhook.deserialize(body));
				}
				break;
			}
			case 'systemWebhookUpdated': {
				if (body.isActive) {
					const i = this.activeSystemWebhooks.findIndex(a => a.id === body.id);
					if (i > -1) {
						this.activeSystemWebhooks[i] = MiSystemWebhook.deserialize(body);
					} else {
						this.activeSystemWebhooks.push(MiSystemWebhook.deserialize(body));
					}
				} else {
					this.activeSystemWebhooks = this.activeSystemWebhooks.filter(a => a.id !== body.id);
				}
				break;
			}
			case 'systemWebhookDeleted': {
				this.activeSystemWebhooks = this.activeSystemWebhooks.filter(a => a.id !== body.id);
				break;
			}
			default:
				break;
		}
	}

	@bindThis
	public dispose(): void {
		this.redisForSub.off('message', this.onMessage);
	}

	@bindThis
	public onApplicationShutdown(signal?: string | undefined): void {
		this.dispose();
	}
}
