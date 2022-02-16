import $ from 'cafy';
import define from '../../../define';
import { RegistryItems } from '@/models/index';
import { ApiError } from '../../../error';

export const meta = {
	requireCredential: true,

	secure: true,

	params: {
		type: 'object',
		properties: {
			key: { type: 'string', },
			scope: { type: 'array', default: [], items: {
				type: '~~~'
			},
},
		},
		required: ['key'],
	},

	errors: {
		noSuchKey: {
			message: 'No such key.',
			code: 'NO_SUCH_KEY',
			id: '97a1e8e7-c0f7-47d2-957a-92e61256e01a',
		},
	},
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, async (ps, user) => {
	const query = RegistryItems.createQueryBuilder('item')
		.where('item.domain IS NULL')
		.andWhere('item.userId = :userId', { userId: user.id })
		.andWhere('item.key = :key', { key: ps.key })
		.andWhere('item.scope = :scope', { scope: ps.scope });

	const item = await query.getOne();

	if (item == null) {
		throw new ApiError(meta.errors.noSuchKey);
	}

	return {
		updatedAt: item.updatedAt,
		value: item.value,
	};
});
