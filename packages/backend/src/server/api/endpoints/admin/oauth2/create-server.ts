/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { MiOAuth2ServersRepository } from '@/models/_.js';
import { titleSchema } from '@/models/OAuth2Server.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireAdmin: true,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		title: titleSchema,
	},
	required: ['title'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.oauth2ServersRepository)
		private oauth2ServersRepository: MiOAuth2ServersRepository,

		private idService: IdService,
		private moderationLogService: ModerationLogService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (!me.isRoot) throw new Error('access denied');

			const res = await this.oauth2ServersRepository.insert({
				id: this.idService.gen(),
				updatedAt: new Date(),
				title: ps.title,
			}).then(r => this.oauth2ServersRepository.findOneByOrFail({ id: r.identifiers[0].id }));

			this.moderationLogService.log(me, 'createOAuth2Server', {
				oauth2ServerId: res.id,
				oauth2Server: res,
			});

			return res;
		});
	}
}
