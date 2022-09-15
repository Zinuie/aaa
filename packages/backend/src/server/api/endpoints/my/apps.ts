import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { Apps } from '@/models/index.js';
import { AppEntityService } from '@/services/entities/AppEntityService.js';

export const meta = {
	tags: ['account', 'app'],

	requireCredential: true,

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'App',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
		offset: { type: 'integer', default: 0 },
	},
	required: [],
} as const;

// eslint-disable-next-line import/no-default-export
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject('appsRepository')
		private appsRepository: typeof Apps,

		private appEntityService: AppEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = {
				userId: me.id,
			};

			const apps = await this.appsRepository.find({
				where: query,
				take: ps.limit,
				skip: ps.offset,
			});

			return await Promise.all(apps.map(app => this.appEntityService.pack(app, me, {
				detail: true,
			})));
		});
	}
}
