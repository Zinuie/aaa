import cluster from 'node:cluster';
import { NestFactory } from '@nestjs/core';
import { envOption } from '@/env.js';
import { ChartManagementService } from '@/services/chart/ChartManagementService.js';
import { ServerService } from '@/server/ServerService.js';
import { initDb } from '../db/postgre.js';
import initializeQueue from '../queue/index.js';
import { AppModule } from '../app.module.js';

/**
 * Init worker process
 */
export async function workerMain() {
	await initDb();

	const app = await NestFactory.createApplicationContext(AppModule);

	// start server
	const serverService = app.get(ServerService);
	serverService.launch();

	// start job queue
	if (!envOption.onlyServer) {
		await initializeQueue(app);
	}

	app.get(ChartManagementService).run();

	if (cluster.isWorker) {
		// Send a 'ready' message to parent process
		process.send!('ready');
	}
}
