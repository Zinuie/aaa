import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import { Config } from '@/config.js';
import type Logger from '@/logger.js';
import { DriveService } from '@/services/DriveService.js';
import { QueueLoggerService } from '../QueueLoggerService.js';
import type Bull from 'bull';
import type { ObjectStorageFileJobData } from '../types.js';

@Injectable()
export class DeleteFileProcessorService {
	#logger: Logger;

	constructor(
		@Inject(DI.config)
		private config: Config,

		private driveService: DriveService,
		private queueLoggerService: QueueLoggerService,
	) {
		this.queueLoggerService.logger.createSubLogger('delete-file');
	}

	public async process(job: Bull.Job<ObjectStorageFileJobData>): Promise<string> {
		const key: string = job.data.key;

		await this.driveService.deleteObjectStorageFile(key);

		return 'Success';
	}
}
