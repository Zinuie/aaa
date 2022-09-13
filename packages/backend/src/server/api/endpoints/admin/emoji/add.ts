import { Inject, Injectable } from '@nestjs/common';
import rndstr from 'rndstr';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { Emojis, DriveFiles } from '@/models/index.js';
import type { IdService } from '@/services/IdService.js';
import { insertModerationLog } from '@/services/insert-moderation-log.js';
import { publishBroadcastStream } from '@/services/stream.js';
import { db } from '@/db/postgre.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	errors: {
		noSuchFile: {
			message: 'No such file.',
			code: 'MO_SUCH_FILE',
			id: 'fc46b5a4-6b92-4c33-ac66-b806659bb5cf',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		fileId: { type: 'string', format: 'misskey:id' },
	},
	required: ['fileId'],
} as const;

// eslint-disable-next-line import/no-default-export
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject('usersRepository')
    private usersRepository: typeof Users,

		@Inject('notesRepository')
    private notesRepository: typeof Notes,

		private idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const file = await DriveFiles.findOneBy({ id: ps.fileId });

			if (file == null) throw new ApiError(meta.errors.noSuchFile);

			const name = file.name.split('.')[0].match(/^[a-z0-9_]+$/) ? file.name.split('.')[0] : `_${rndstr('a-z0-9', 8)}_`;

			const emoji = await Emojis.insert({
				id: this.idService.genId(),
				updatedAt: new Date(),
				name: name,
				category: null,
				host: null,
				aliases: [],
				originalUrl: file.url,
				publicUrl: file.webpublicUrl ?? file.url,
				type: file.webpublicType ?? file.type,
			}).then(x => Emojis.findOneByOrFail(x.identifiers[0]));

			await db.queryResultCache!.remove(['meta_emojis']);

			publishBroadcastStream('emojiAdded', {
				emoji: await Emojis.pack(emoji.id),
			});

			insertModerationLog(me, 'addEmoji', {
				emojiId: emoji.id,
			});

			return {
				id: emoji.id,
			};
		});
	}
}
