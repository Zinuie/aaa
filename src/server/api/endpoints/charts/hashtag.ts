import $ from 'cafy';
import define from '../../define';
import { convertLog } from '@/services/chart/core';
import { hashtagChart } from '@/services/chart/index';

export const meta = {
	tags: ['charts', 'hashtags'],

	params: {
		span: {
			validator: $.str.or(['day', 'hour']),
		},

		limit: {
			validator: $.optional.num.range(1, 500),
			default: 30,
		},

		offset: {
			validator: $.optional.nullable.num,
			default: null,
		},

		tag: {
			validator: $.str,
		},
	},

	res: convertLog(hashtagChart.schema),
};

export default define(meta, async (ps) => {
	return await hashtagChart.getChart(ps.span as any, ps.limit!, ps.offset ? new Date(ps.offset) : null, ps.tag);
});
