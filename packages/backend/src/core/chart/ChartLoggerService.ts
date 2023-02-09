import { Inject, Injectable } from '@/di-decorators.js';
import type Logger from '@/logger.js';
import { LoggerService } from '@/core/LoggerService.js';
import { bindThis } from '@/decorators.js';
import { DI } from '@/di-symbols.js';

@Injectable()
export class ChartLoggerService {
	public logger: Logger;

	constructor(
		@Inject(DI.LoggerService)
		private loggerService: LoggerService,
	) {
		this.logger = this.loggerService.getLogger('chart', 'white', process.env.NODE_ENV !== 'test');
	}
}
