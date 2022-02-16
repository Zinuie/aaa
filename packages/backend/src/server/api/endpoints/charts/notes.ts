import $ from 'cafy';
import define from '../../define';
import { convertLog } from '@/services/chart/core';
import { notesChart } from '@/services/chart/index';

export const meta = {
	tags: ['charts', 'notes'],

	params: {
		type: 'object',
		properties: {
			span: { type: 'string', enum: ['day', 'hour'], },
			limit: { type: 'integer', maximum: 500, default: 30, },
			offset: { type: 'integer', nullable: true, },
		},
		required: ['span'],
	},

	// TODO: response definition
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, async (ps) => {
	return await notesChart.getChart(ps.span as any, ps.limit!, ps.offset ? new Date(ps.offset) : null);
});
