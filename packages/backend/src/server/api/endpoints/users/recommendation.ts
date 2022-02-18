import ms from 'ms';
import define from '../../define';
import { Users, Followings } from '@/models/index';
import { generateMutedUserQueryForUsers } from '../../common/generate-muted-user-query';
import { generateBlockedUserQuery, generateBlockQueryForUsers } from '../../common/generate-block-query';

export const meta = {
	tags: ['users'],

	requireCredential: true,

	kind: 'read:account',

	params: {
		type: 'object',
		properties: {
			limit: { type: 'integer', maximum: 100, default: 10, },
			offset: { type: 'integer', default: 0, },
		},
		required: [],
	},

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'UserDetailed',
		},
	},
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, async (ps, me) => {
	const query = Users.createQueryBuilder('user')
		.where('user.isLocked = FALSE')
		.andWhere('user.isExplorable = TRUE')
		.andWhere('user.host IS NULL')
		.andWhere('user.updatedAt >= :date', { date: new Date(Date.now() - ms('7days')) })
		.andWhere('user.id != :meId', { meId: me.id })
		.orderBy('user.followersCount', 'DESC');

	generateMutedUserQueryForUsers(query, me);
	generateBlockQueryForUsers(query, me);
	generateBlockedUserQuery(query, me);

	const followingQuery = Followings.createQueryBuilder('following')
		.select('following.followeeId')
		.where('following.followerId = :followerId', { followerId: me.id });

	query
		.andWhere(`user.id NOT IN (${ followingQuery.getQuery() })`);

	query.setParameters(followingQuery.getParameters());

	const users = await query.take(ps.limit).skip(ps.offset).getMany();

	return await Users.packMany(users, me, { detail: true });
});
