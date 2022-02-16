import $ from 'cafy';
import { ID } from '@/misc/cafy-id';
import define from '../../../define';
import { GalleryLikes } from '@/models/index';
import { makePaginationQuery } from '../../../common/make-pagination-query';

export const meta = {
	tags: ['account', 'gallery'],

	requireCredential: true,

	kind: 'read:gallery-likes',

	params: {
		type: 'object',
		properties: {
			limit: { type: 'integer', maximum: 100, default: 10, },
			sinceId: { type: 'string', format: 'misskey:id', },
			untilId: { type: 'string', format: 'misskey:id', },
		},
		required: [],
	},

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			id: {
				type: 'string',
				optional: false, nullable: false,
				format: 'id',
			},
			page: {
				type: 'object',
				optional: false, nullable: false,
				ref: 'GalleryPost',
			},
		},
	},
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, async (ps, user) => {
	const query = makePaginationQuery(GalleryLikes.createQueryBuilder('like'), ps.sinceId, ps.untilId)
		.andWhere(`like.userId = :meId`, { meId: user.id })
		.leftJoinAndSelect('like.post', 'post');

	const likes = await query
		.take(ps.limit!)
		.getMany();

	return await GalleryLikes.packMany(likes, user);
});
