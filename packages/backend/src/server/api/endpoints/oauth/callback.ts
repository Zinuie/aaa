/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { OAuth2 } from 'oauth';
import { IsNull } from 'typeorm';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type { MiOAuth2ServersRepository, MiUserIntegrationRepository, SigninsRepository, UserPendingsRepository, UserProfilesRepository, UsersRepository } from '@/models/_.js';
import type { Config } from '@/config.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { MetaService } from '@/core/MetaService.js';
import { IdService } from '@/core/IdService.js';
import { EmailService } from '@/core/EmailService.js';
import { SignupService } from '@/core/SignupService.js';
import { MiLocalUser } from '@/models/User.js';
import { L_CHARS, secureRndstr } from '@/misc/secure-rndstr.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { SigninEntityService } from '@/core/entities/SigninEntityService.js';
import { SigninService } from '../../SigninService.js';
import { ApiError } from '../../error.js';

export const meta = {
	requireCredential: false,
	allowGet: true,

	tags: ['oauth2'],

	errors: {
		invalidRequest: {
			message: 'Invalid request.',
			code: 'INVALID_REQUEST',
			id: 'change this',
		},
		noSuchOAuth2Server: {
			message: 'No such oauth2 server.',
			code: 'NO_SUCH_OAUTH2_SERVER',
			id: 'ac8a48f4-a184-461d-b11f-e10448b3cd37',
		},
		invalidOAuth2ServerConfiguration: {
			message: 'Invalid OAuth2 server configuration.',
			code: 'INVALID_OAUTH2_SERVER_CONFIGURATION',
			id: 'change this',
		},
		notRegisteredIntegration: {
			message: 'Not registered integration.',
			code: 'NOT_REGISTERED_INTEGRATION',
			id: 'change this',
		},
		usernamePathRequiredForSignup: {
			message: 'Username Path is required for signup.',
			code: 'USERNAME_PATH_REQUIRED_FOR_SIGNUP',
			id: 'change this',
		},
		usernameRequiredForSignup: {
			message: 'Username is required for signup.',
			code: 'USERNAME_REQUIRED_FOR_SIGNUP',
			id: 'change this',
		},
		emailPathRequiredForSignup: {
			message: 'Email Path is required for signup.',
			code: 'EMAIL_PATH_REQUIRED_FOR_SIGNUP',
			id: 'change this',
		},
		emailRequiredForSignup: {
			message: 'Email is required for signup.',
			code: 'EMAIL_REQUIRED_FOR_SIGNUP',
			id: 'change this',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		serverId: { type: 'string', format: 'misskey:id' },
		code: { type: 'string' },
	},
	required: ['serverId', 'code'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.config)
		private config: Config,
		@Inject(DI.oauth2ServersRepository)
		private oauth2ServersRepository: MiOAuth2ServersRepository,
		@Inject(DI.userIntegrationRepository)
		private userIntegrationRepository: MiUserIntegrationRepository,
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,
		@Inject(DI.userPendingsRepository)
		private userPendingsRepository: UserPendingsRepository,
		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,
		@Inject(DI.signinsRepository)
		private signinsRepository: SigninsRepository,
		private userEntityService: UserEntityService,
		private signinEntityService: SigninEntityService,
		private metaService: MetaService,
		private idService: IdService,
		private emailService: EmailService,
		private signupService: SignupService,
		private globalEventService: GlobalEventService,
	) {
		super(meta, paramDef, async (ps, me, token, file, cleanup, ip, headers) => {
			if (!ps.code || !ps.serverId || !ip) {
				throw new ApiError(meta.errors.invalidRequest);
			}

			const oauth2Server = await this.oauth2ServersRepository.findOneBy({ id: ps.serverId });
			if (!oauth2Server) {
				throw new ApiError(meta.errors.noSuchOAuth2Server);
			}

			if (!oauth2Server.clientId || !oauth2Server.clientSecret || !oauth2Server.authorizeUrl || !oauth2Server.tokenUrl || !oauth2Server.profileUrl || !oauth2Server.idPath) {
				throw new ApiError(meta.errors.invalidOAuth2ServerConfiguration);
			}

			const oauth2 = new OAuth2(
				oauth2Server.clientId,
				oauth2Server.clientSecret,
				'',
				oauth2Server.authorizeUrl,
				oauth2Server.tokenUrl,
			);

			const accessToken = await new Promise<string>((resolve, reject) => {
				return oauth2.getOAuthAccessToken(ps.code, {
					grant_type: 'authorization_code',
					redirect_uri: `${this.config.url}/oauth-client/callback/${oauth2Server.id}`,
				}, (err, accessToken) => {
					if (err as unknown !== null) {
						return reject(err);
					} else {
						return resolve(accessToken);
					}
				});
			});

			const profileResponse = await fetch(oauth2Server.profileUrl, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			const profile: Record<string, string | null> = await profileResponse.json() as any;

			const serverUserId = profile[oauth2Server.idPath];
			if (serverUserId === null) {
				throw new ApiError(meta.errors.invalidOAuth2ServerConfiguration);
			}

			const userIntegration = await this.userIntegrationRepository.findOneBy({ serverUserId, serverId: oauth2Server.id });
			if (userIntegration) {
				const signIn = this.signIn(headers, ip, userIntegration.user as MiLocalUser);
				return {
					type: 'token',
					...signIn,
				};
			}

			if (!oauth2Server.allowSignUp) {
				throw new ApiError(meta.errors.notRegisteredIntegration);
			}

			if (!oauth2Server.usernamePath) {
				throw new ApiError(meta.errors.usernamePathRequiredForSignup);
			}

			const username = profile[oauth2Server.usernamePath];
			if (!username) {
				throw new ApiError(meta.errors.usernameRequiredForSignup);
			}

			const user = await this.usersRepository.findOneBy({ usernameLower: username.toLowerCase(), host: IsNull() }) as MiLocalUser | null;
			if (user !== null) {
				await this.userIntegrationRepository.insert({
					id: this.idService.gen(),
					userId: user.id,
					serverId: oauth2Server.id,
					serverUserId,
				});

				const signIn = this.signIn(headers, ip, user);
				return {
					type: 'token',
					...signIn,
				};
			}

			const instance = await this.metaService.fetch(true);
			if (!instance.emailRequiredForSignup) {
				const { account, secret } = await this.signupService.signup({
					username,
				});

				const res = await this.userEntityService.pack(account, account, {
					detail: true,
					includeSecrets: true,
				});

				return {
					type: 'token',
					...res,
					token: secret,
				};
			}

			if (!oauth2Server.emailPath) {
				throw new ApiError(meta.errors.emailPathRequiredForSignup);
			}

			const email = profile[oauth2Server.emailPath];
			if (!email) {
				throw new ApiError(meta.errors.emailRequiredForSignup);
			}

			if (oauth2Server.markEmailAsVerified) {
				const { account, secret } = await this.signupService.signup({
					username,
				});

				const profile = await this.userProfilesRepository.findOneByOrFail({ userId: account.id }); // is this correct?
				await this.userProfilesRepository.update({ userId: profile.userId }, {
					email,
					emailVerified: true,
					emailVerifyCode: null,
				});

				const res = await this.userEntityService.pack(account, account, {
					detail: true,
					includeSecrets: true,
				});

				return {
					type: 'token',
					...res,
					token: secret,
				};
			} else {
				const code = secureRndstr(16, { chars: L_CHARS });

				await this.userPendingsRepository.insert({
					id: this.idService.gen(),
					code,
					email,
					username,
				}).then(x => this.userPendingsRepository.findOneByOrFail(x.identifiers[0]));

				const link = `${this.config.url}/signup-complete/${code}`;

				this.emailService.sendEmail(email, 'Signup',
					`To complete signup, please click this link:<br><a href="${link}">${link}</a>`,
					`To complete signup, please click this link: ${link}`);

				return {
					type: 'verificationEmailSent',
				};
			}
		});
	}

	private signIn(headers: any, ip: string, user: MiLocalUser) {
		setImmediate(async () => {
			// Append signin history
			const record = await this.signinsRepository.insert({
				id: this.idService.gen(),
				userId: user.id,
				ip,
				headers,
				success: true,
			}).then(x => this.signinsRepository.findOneByOrFail(x.identifiers[0]));

			// Publish signin event
			this.globalEventService.publishMainStream(user.id, 'signin', await this.signinEntityService.pack(record));
		});

		return {
			id: user.id,
			i: user.token,
		};
	}
}
