import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { updatePerson } from '@/services/remote/activitypub/models/person.js';
import { getRemoteUser } from '../../common/getters.js';

export const meta = {
	tags: ['federation'],

	requireCredential: true,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		userId: { type: 'string', format: 'misskey:id' },
	},
	required: ['userId'],
} as const;

// eslint-disable-next-line import/no-default-export
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
	) {
		super(meta, paramDef, async (ps) => {
			const user = await getRemoteUser(ps.userId);
			await updatePerson(user.uri!);
		});
	}
}
