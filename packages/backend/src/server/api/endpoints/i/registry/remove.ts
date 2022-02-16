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
			id: '1fac4e8a-a6cd-4e39-a4a5-3a7e11f1b019',
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

	await RegistryItems.remove(item);
});
