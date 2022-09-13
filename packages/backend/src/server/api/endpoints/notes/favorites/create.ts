import { Inject, Injectable } from '@nestjs/common';
import { NoteFavorites } from '@/models/index.js';
import type { IdService } from '@/services/IdService.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '../../../error.js';
import { getNote } from '../../../common/getters.js';

export const meta = {
	tags: ['notes', 'favorites'],

	requireCredential: true,

	kind: 'write:favorites',

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: '6dd26674-e060-4816-909a-45ba3f4da458',
		},

		alreadyFavorited: {
			message: 'The note has already been marked as a favorite.',
			code: 'ALREADY_FAVORITED',
			id: 'a402c12b-34dd-41d2-97d8-4d2ffd96a1a6',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		noteId: { type: 'string', format: 'misskey:id' },
	},
	required: ['noteId'],
} as const;

// eslint-disable-next-line import/no-default-export
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		private idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Get favoritee
			const note = await getNote(ps.noteId).catch(e => {
				if (e.id === '9725d0ce-ba28-4dde-95a7-2cbb2c15de24') throw new ApiError(meta.errors.noSuchNote);
				throw e;
			});

			// if already favorited
			const exist = await NoteFavorites.findOneBy({
				noteId: note.id,
				userId: me.id,
			});

			if (exist != null) {
				throw new ApiError(meta.errors.alreadyFavorited);
			}

			// Create favorite
			await NoteFavorites.insert({
				id: this.idService.genId(),
				createdAt: new Date(),
				noteId: note.id,
				userId: me.id,
			});
		});
	}
}
