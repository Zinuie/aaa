import define from '../../define';
import { Channels } from '@/models/index';
import { makePaginationQuery } from '../../common/make-pagination-query';

export const meta = {
	tags: ['channels', 'account'],

	requireCredential: true,

	kind: 'read:channels',

	params: {
		type: 'object',
		properties: {
			sinceId: { type: 'string', format: 'misskey:id', },
			untilId: { type: 'string', format: 'misskey:id', },
			limit: { type: 'integer', maximum: 100, default: 5, },
		},
		required: [],
	},

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'Channel',
		},
	},
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, async (ps, me) => {
	const query = makePaginationQuery(Channels.createQueryBuilder(), ps.sinceId, ps.untilId)
		.andWhere({ userId: me.id });

	const channels = await query
		.take(ps.limit)
		.getMany();

	return await Promise.all(channels.map(x => Channels.pack(x, me)));
});
