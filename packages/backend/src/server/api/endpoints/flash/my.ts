import { Inject, Injectable } from '@/di-decorators.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { FlashsRepository } from '@/models/index.js';
import { QueryService } from '@/core/QueryService.js';
import { FlashEntityService } from '@/core/entities/FlashEntityService.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['account', 'flash'],

	requireCredential: true,

	kind: 'read:flash',

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'Flash',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
		sinceId: { type: 'string', format: 'misskey:id' },
		untilId: { type: 'string', format: 'misskey:id' },
	},
	required: [],
} as const;

// eslint-disable-next-line import/no-default-export
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.flashsRepository)
		private flashsRepository: FlashsRepository,

		@Inject(DI.FlashEntityService)
		private flashEntityService: FlashEntityService,

		@Inject(DI.QueryService)
		private queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.flashsRepository.createQueryBuilder('flash'), ps.sinceId, ps.untilId)
				.andWhere('flash.userId = :meId', { meId: me.id });

			const flashs = await query
				.take(ps.limit)
				.getMany();

			return await this.flashEntityService.packMany(flashs);
		});
	}
}
