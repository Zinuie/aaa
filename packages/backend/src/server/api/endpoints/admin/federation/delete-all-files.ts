import { Inject, Injectable } from '@/di-decorators.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { DriveFilesRepository } from '@/models/index.js';
import { DriveService } from '@/core/DriveService.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		host: { type: 'string' },
	},
	required: ['host'],
} as const;

// eslint-disable-next-line import/no-default-export
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,

		@Inject(DI.DriveService)
		private driveService: DriveService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const files = await this.driveFilesRepository.findBy({
				userHost: ps.host,
			});

			for (const file of files) {
				this.driveService.deleteFile(file);
			}
		});
	}
}
