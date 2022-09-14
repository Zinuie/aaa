import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { Notes , AntennaNotes } from '@/models/index.js';
import { Antennas } from '@/models/index.js';
import { QueryService } from '@/services/QueryService.js';
import { NoteReadService } from '@/services/NoteReadService.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['antennas', 'account', 'notes'],

	requireCredential: true,

	kind: 'read:account',

	errors: {
		noSuchAntenna: {
			message: 'No such antenna.',
			code: 'NO_SUCH_ANTENNA',
			id: '850926e0-fd3b-49b6-b69a-b28a5dbd82fe',
		},
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
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		antennaId: { type: 'string', format: 'misskey:id' },
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
		sinceId: { type: 'string', format: 'misskey:id' },
		untilId: { type: 'string', format: 'misskey:id' },
		sinceDate: { type: 'integer' },
		untilDate: { type: 'integer' },
	},
	required: ['antennaId'],
} as const;

// eslint-disable-next-line import/no-default-export
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject('notesRepository')
		private notesRepository: typeof Notes,

		@Inject('antennaNotesRepository')
		private antennaNotesRepository: typeof AntennaNotes,

		private queryService: QueryService,
		private noteReadService: NoteReadService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const antenna = await Antennas.findOneBy({
				id: ps.antennaId,
				userId: me.id,
			});

			if (antenna == null) {
				throw new ApiError(meta.errors.noSuchAntenna);
			}

			const query = this.queryService.makePaginationQuery(this.notesRepository.createQueryBuilder('note'),
				ps.sinceId, ps.untilId, ps.sinceDate, ps.untilDate)
				.innerJoin(this.antennaNotesRepository.metadata.targetName, 'antennaNote', 'antennaNote.noteId = note.id')
				.innerJoinAndSelect('note.user', 'user')
				.leftJoinAndSelect('user.avatar', 'avatar')
				.leftJoinAndSelect('user.banner', 'banner')
				.leftJoinAndSelect('note.reply', 'reply')
				.leftJoinAndSelect('note.renote', 'renote')
				.leftJoinAndSelect('reply.user', 'replyUser')
				.leftJoinAndSelect('replyUser.avatar', 'replyUserAvatar')
				.leftJoinAndSelect('replyUser.banner', 'replyUserBanner')
				.leftJoinAndSelect('renote.user', 'renoteUser')
				.leftJoinAndSelect('renoteUser.avatar', 'renoteUserAvatar')
				.leftJoinAndSelect('renoteUser.banner', 'renoteUserBanner')
				.andWhere('antennaNote.antennaId = :antennaId', { antennaId: antenna.id });

			this.queryService.generateVisibilityQuery(query, me);
			this.queryService.generateMutedUserQuery(query, me);
			this.queryService.generateBlockedUserQuery(query, me);

			const notes = await query
				.take(ps.limit)
				.getMany();

			if (notes.length > 0) {
				this.noteReadService.read(me.id, notes);
			}

			return await this.notesRepository.packMany(notes, me);
		});
	}
}
