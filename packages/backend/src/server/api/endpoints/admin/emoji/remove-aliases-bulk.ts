import $ from 'cafy';
import define from '../../../define';
import { ID } from '@/misc/cafy-id';
import { Emojis } from '@/models/index';
import { getConnection, In } from 'typeorm';
import { ApiError } from '../../../error';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {
		type: 'object',
		properties: {
			ids: { type: 'array', items: {
				type: 'string', format: 'misskey:id',
			}, },
			aliases: { type: 'array', items: {
				type: 'string',
			}, },
		},
		required: ['ids', 'aliases'],
	},
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, async (ps) => {
	const emojis = await Emojis.find({
		id: In(ps.ids),
	});

	for (const emoji of emojis) {
		await Emojis.update(emoji.id, {
			updatedAt: new Date(),
			aliases: emoji.aliases.filter(x => !ps.aliases.includes(x)),
		});
	}

	await getConnection().queryResultCache!.remove(['meta_emojis']);
});
