import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { UserProfiles } from '@/models/index.js';

export const meta = {
	requireCredential: true,

	secure: true,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		value: { type: 'boolean' },
	},
	required: ['value'],
} as const;

// eslint-disable-next-line import/no-default-export
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject('userProfilesRepository')
		private userProfilesRepository: typeof UserProfiles,
	) {
		super(meta, paramDef, async (ps, me) => {
			await this.userProfilesRepository.update(me.id, {
				usePasswordLessLogin: ps.value,
			});
		});
	}
}
