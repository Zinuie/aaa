import { Inject, Injectable } from '@/di-decorators.js';
import { getJsonSchema } from '@/core/chart/core.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import UsersChart from '@/core/chart/charts/users.js';
import { schema } from '@/core/chart/charts/entities/users.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['charts', 'users'],

	res: getJsonSchema(schema),

	allowGet: true,
	cacheSec: 60 * 60,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		span: { type: 'string', enum: ['day', 'hour'] },
		limit: { type: 'integer', minimum: 1, maximum: 500, default: 30 },
		offset: { type: 'integer', nullable: true, default: null },
	},
	required: ['span'],
} as const;

// eslint-disable-next-line import/no-default-export
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.UsersChart)
		private usersChart: UsersChart,
	) {
		super(meta, paramDef, async (ps, me) => {
			return await this.usersChart.getChart(ps.span, ps.limit, ps.offset ? new Date(ps.offset) : null);
		});
	}
}
