import rndstr from 'rndstr';
import ms from 'ms';
import { IsNull } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { publishMainStream } from '@/services/stream.js';
import config from '@/config/index.js';
import type { Users } from '@/models/index.js';
import { UserProfiles, PasswordResetRequests } from '@/models/index.js';
import { sendEmail } from '@/services/send-email.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { IdService } from '@/services/IdService.js';
import { ApiError } from '../error.js';

export const meta = {
	tags: ['reset password'],

	requireCredential: false,

	description: 'Request a users password to be reset.',

	limit: {
		duration: ms('1hour'),
		max: 3,
	},

	errors: {

	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		username: { type: 'string' },
		email: { type: 'string' },
	},
	required: ['username', 'email'],
} as const;

// eslint-disable-next-line import/no-default-export
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject('usersRepository')
    private usersRepository: typeof Users,

		private idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const user = await this.usersRepository.findOneBy({
				usernameLower: ps.username.toLowerCase(),
				host: IsNull(),
			});

			// 合致するユーザーが登録されていなかったら無視
			if (user == null) {
				return;
			}

			const profile = await UserProfiles.findOneByOrFail({ userId: user.id });

			// 合致するメアドが登録されていなかったら無視
			if (profile.email !== ps.email) {
				return;
			}

			// メアドが認証されていなかったら無視
			if (!profile.emailVerified) {
				return;
			}

			const token = rndstr('a-z0-9', 64);

			await PasswordResetRequests.insert({
				id: this.idService.genId(),
				createdAt: new Date(),
				userId: profile.userId,
				token,
			});

			const link = `${config.url}/reset-password/${token}`;

			sendEmail(ps.email, 'Password reset requested',
				`To reset password, please click this link:<br><a href="${link}">${link}</a>`,
				`To reset password, please click this link: ${link}`);
		});
	}
}
