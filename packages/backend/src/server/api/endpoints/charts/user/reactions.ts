import define from '../../../define';
import { convertLog } from '@/services/chart/core';
import { perUserReactionsChart } from '@/services/chart/index';

export const meta = {
	tags: ['charts', 'users', 'reactions'],

	// TODO: response definition
} as const;

const paramDef = {
	type: 'object',
	properties: {
		span: { type: 'string', enum: ['day', 'hour'] },
		limit: { type: 'integer', maximum: 500, default: 30 },
		offset: { type: 'integer', nullable: true, default: null },
		userId: { type: 'string', format: 'misskey:id' },
	},
	required: ['span', 'userId'],
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, paramDef, async (ps) => {
	return await perUserReactionsChart.getChart(ps.span as any, ps.limit, ps.offset ? new Date(ps.offset) : null, ps.userId);
});
