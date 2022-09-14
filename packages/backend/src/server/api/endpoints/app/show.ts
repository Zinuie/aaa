import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { Apps } from '@/models/index.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['app'],

	errors: {
		noSuchApp: {
			message: 'No such app.',
			code: 'NO_SUCH_APP',
			id: 'dce83913-2dc6-4093-8a7b-71dbb11718a3',
		},
	},

	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'App',
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		appId: { type: 'string', format: 'misskey:id' },
	},
	required: ['appId'],
} as const;

// eslint-disable-next-line import/no-default-export
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject('appsRepository')
		private appsRepository: typeof Apps,
	) {
		super(meta, paramDef, async (ps, user, token) => {
			const isSecure = user != null && token == null;

			// Lookup app
			const ap = await this.appsRepository.findOneBy({ id: ps.appId });

			if (ap == null) {
				throw new ApiError(meta.errors.noSuchApp);
			}

			return await this.appsRepository.pack(ap, user, {
				detail: true,
				includeSecret: isSecure && (ap.userId === user!.id),
			});
		});
	}
}
