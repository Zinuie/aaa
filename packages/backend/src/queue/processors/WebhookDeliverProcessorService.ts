/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import * as Bull from 'bullmq';
import { DI } from '@/di-symbols.js';
import type { SystemWebhooksRepository, WebhooksRepository } from '@/models/_.js';
import type { Config } from '@/config.js';
import type Logger from '@/logger.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { StatusError } from '@/misc/status-error.js';
import { bindThis } from '@/decorators.js';
import { QueueLoggerService } from '../QueueLoggerService.js';
import { SystemWebhookDeliverJobData, UserWebhookDeliverJobData, WebhookDeliverJobData } from '../types.js';

@Injectable()
export class WebhookDeliverProcessorService {
	private logger: Logger;

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.webhooksRepository)
		private webhooksRepository: WebhooksRepository,

		@Inject(DI.systemWebhooksRepository)
		private systemWebhooksRepository: SystemWebhooksRepository,

		private httpRequestService: HttpRequestService,
		private queueLoggerService: QueueLoggerService,
	) {
		this.logger = this.queueLoggerService.logger.createSubLogger('webhook');
	}

	@bindThis
	public async process(job: Bull.Job<WebhookDeliverJobData>): Promise<string> {
		switch (job.data.publisher) {
			case 'user':
				return this.processUser(job as Bull.Job<UserWebhookDeliverJobData>);
			case 'system':
				return this.processSystem(job as Bull.Job<SystemWebhookDeliverJobData>);
			default:
				throw new Error('Unknown webhook type');
		}
	}

	@bindThis
	private async processUser(job: Bull.Job<UserWebhookDeliverJobData>): Promise<string> {
		try {
			this.logger.debug(`delivering ${job.data.webhookId}`);

			const res = await this.httpRequestService.send(job.data.to, {
				method: 'POST',
				headers: {
					'User-Agent': 'Misskey-Hooks',
					'X-Misskey-Host': this.config.host,
					'X-Misskey-Hook-Id': job.data.webhookId,
					'X-Misskey-Hook-Secret': job.data.secret,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					server: this.config.url,
					hookId: job.data.webhookId,
					userId: job.data.userId,
					eventId: job.data.eventId,
					createdAt: job.data.createdAt,
					type: job.data.type,
					body: job.data.content,
				}),
			});

			this.webhooksRepository.update({ id: job.data.webhookId }, {
				latestSentAt: new Date(),
				latestStatus: res.status,
			});

			return 'Success';
		} catch (res) {
			this.webhooksRepository.update({ id: job.data.webhookId }, {
				latestSentAt: new Date(),
				latestStatus: res instanceof StatusError ? res.statusCode : 1,
			});

			if (res instanceof StatusError) {
				// 4xx
				if (!res.isRetryable) {
					throw new Bull.UnrecoverableError(`${res.statusCode} ${res.statusMessage}`);
				}

				// 5xx etc.
				throw new Error(`${res.statusCode} ${res.statusMessage}`);
			} else {
				// DNS error, socket error, timeout ...
				throw res;
			}
		}
	}

	@bindThis
	private async processSystem(job: Bull.Job<SystemWebhookDeliverJobData>): Promise<string> {
		try {
			this.logger.debug(`delivering ${job.data.webhookId}`);

			const res = await this.httpRequestService.send(job.data.to, {
				method: 'POST',
				headers: {
					'User-Agent': 'Misskey-Hooks',
					'X-Misskey-Host': this.config.host,
					'X-Misskey-Hook-Id': job.data.webhookId,
					'X-Misskey-Hook-Secret': job.data.secret,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					server: this.config.url,
					hookId: job.data.webhookId,
					eventId: job.data.eventId,
					createdAt: job.data.createdAt,
					type: job.data.type,
					body: job.data.content,
				}),
			});

			this.systemWebhooksRepository.update({ id: job.data.webhookId }, {
				latestSentAt: new Date(),
				latestStatus: res.status,
			});

			return 'Success';
		} catch (res) {
			this.logger.error(res as Error);

			this.systemWebhooksRepository.update({ id: job.data.webhookId }, {
				latestSentAt: new Date(),
				latestStatus: res instanceof StatusError ? res.statusCode : 1,
			});

			if (res instanceof StatusError) {
				// 4xx
				if (!res.isRetryable) {
					throw new Bull.UnrecoverableError(`${res.statusCode} ${res.statusMessage}`);
				}

				// 5xx etc.
				throw new Error(`${res.statusCode} ${res.statusMessage}`);
			} else {
				// DNS error, socket error, timeout ...
				throw res;
			}
		}
	}
}
