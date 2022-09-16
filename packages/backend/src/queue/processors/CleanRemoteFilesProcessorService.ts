import { Inject, Injectable } from '@nestjs/common';
import { IsNull, MoreThan, Not } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { DriveFiles } from '@/models/index.js';
import { Config } from '@/config.js';
import type Logger from '@/logger.js';
import { DriveService } from '@/services/DriveService.js';
import { QueueLoggerService } from '../QueueLoggerService.js';
import type Bull from 'bull';

@Injectable()
export class CleanRemoteFilesProcessorService {
	#logger: Logger;

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject('driveFilesRepository')
		private driveFilesRepository: typeof DriveFiles,

		private driveService: DriveService,
		private queueLoggerService: QueueLoggerService,
	) {
		this.#logger = this.queueLoggerService.logger.createSubLogger('clean-remote-files');
	}

	public async process(job: Bull.Job<Record<string, unknown>>, done: () => void): Promise<void> {
		this.#logger.info('Deleting cached remote files...');

		let deletedCount = 0;
		let cursor: any = null;

		while (true) {
			const files = await this.driveFilesRepository.find({
				where: {
					userHost: Not(IsNull()),
					isLink: false,
					...(cursor ? { id: MoreThan(cursor) } : {}),
				},
				take: 8,
				order: {
					id: 1,
				},
			});

			if (files.length === 0) {
				job.progress(100);
				break;
			}

			cursor = files[files.length - 1].id;

			await Promise.all(files.map(file => this.driveService.deleteFileSync(file, true)));

			deletedCount += 8;

			const total = await this.driveFilesRepository.countBy({
				userHost: Not(IsNull()),
				isLink: false,
			});

			job.progress(deletedCount / total);
		}

		this.#logger.succ('All cahced remote files has been deleted.');
		done();
	}
}
