import { Inject, Injectable } from '@nestjs/common';
import { removePinned } from '@/services/i/pin.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { Users } from '@/models/index.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['account', 'notes'],

	requireCredential: true,

	kind: 'write:account',

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: '454170ce-9d63-4a43-9da1-ea10afe81e21',
		},
	},

	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'MeDetailed',
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
		@Inject('usersRepository')
		private usersRepository: typeof Users,
	) {
		super(meta, paramDef, async (ps, me) => {
			await removePinned(me, ps.noteId).catch(e => {
				if (e.id === 'b302d4cf-c050-400a-bbb3-be208681f40c') throw new ApiError(meta.errors.noSuchNote);
				throw e;
			});

			return await this.userEntityService.pack<true, true>(me.id, me, {
				detail: true,
			});
		});
	}
}
