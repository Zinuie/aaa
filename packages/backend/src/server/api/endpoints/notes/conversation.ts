import $ from 'cafy';
import { ID } from '@/misc/cafy-id';
import define from '../../define';
import { ApiError } from '../../error';
import { getNote } from '../../common/getters';
import { Note } from '@/models/entities/note';
import { Notes } from '@/models/index';

export const meta = {
	tags: ['notes'],

	requireCredential: false,

	params: {
		type: 'object',
		properties: {
			noteId: { type: 'string', format: 'misskey:id', },
			limit: { type: 'integer', maximum: 100, default: 10, },
			offset: { type: 'integer', },
		},
		required: ['noteId'],
	},

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'Note',
		},
	},

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: 'e1035875-9551-45ec-afa8-1ded1fcb53c8',
		},
	},
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, async (ps, user) => {
	const note = await getNote(ps.noteId).catch(e => {
		if (e.id === '9725d0ce-ba28-4dde-95a7-2cbb2c15de24') throw new ApiError(meta.errors.noSuchNote);
		throw e;
	});

	const conversation: Note[] = [];
	let i = 0;

	async function get(id: any) {
		i++;
		const p = await Notes.findOne(id);
		if (p == null) return;

		if (i > ps.offset!) {
			conversation.push(p);
		}

		if (conversation.length == ps.limit!) {
			return;
		}

		if (p.replyId) {
			await get(p.replyId);
		}
	}

	if (note.replyId) {
		await get(note.replyId);
	}

	return await Notes.packMany(conversation, user);
});
