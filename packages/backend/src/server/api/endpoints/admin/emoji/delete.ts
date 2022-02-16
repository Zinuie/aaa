import $ from 'cafy';
import define from '../../../define';
import { ID } from '@/misc/cafy-id';
import { Emojis } from '@/models/index';
import { getConnection } from 'typeorm';
import { insertModerationLog } from '@/services/insert-moderation-log';
import { ApiError } from '../../../error';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {
		type: 'object',
		properties: {
			id: { type: 'string', format: 'misskey:id', },
		},
		required: ['id'],
	},

	errors: {
		noSuchEmoji: {
			message: 'No such emoji.',
			code: 'NO_SUCH_EMOJI',
			id: 'be83669b-773a-44b7-b1f8-e5e5170ac3c2',
		},
	},
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, async (ps, me) => {
	const emoji = await Emojis.findOne(ps.id);

	if (emoji == null) throw new ApiError(meta.errors.noSuchEmoji);

	await Emojis.delete(emoji.id);

	await getConnection().queryResultCache!.remove(['meta_emojis']);

	insertModerationLog(me, 'deleteEmoji', {
		emoji: emoji,
	});
});
