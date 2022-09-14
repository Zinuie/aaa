import { Inject, Injectable } from '@nestjs/common';
import { getJsonSchema } from '@/services/chart/core.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import PerUserDriveChart from '@/services/chart/charts/per-user-drive.js';
import { schema } from '@/services/chart/charts/entities/per-user-drive.js';

export const meta = {
	tags: ['charts', 'drive', 'users'],

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
		userId: { type: 'string', format: 'misskey:id' },
	},
	required: ['span', 'userId'],
} as const;

// eslint-disable-next-line import/no-default-export
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		private perUserDriveChart: PerUserDriveChart,
	) {
		super(meta, paramDef, async (ps, me) => {
			return await this.perUserDriveChart.getChart(ps.span, ps.limit, ps.offset ? new Date(ps.offset) : null, ps.userId);
		});
	}
}
