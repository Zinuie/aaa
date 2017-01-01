/**
 * Misskey Entory Point!
 */

Error.stackTraceLimit = Infinity;

/**
 * Module dependencies
 */
import * as fs from 'fs';
import * as os from 'os';
import * as cluster from 'cluster';
import Logger from './utils/logger';
import * as chalk from 'chalk';
const portUsed = require('tcp-port-used');
const isRoot = require('is-root');
import ProgressBar from './utils/cli/progressbar';
import initdb from './db/mongodb';
import LastCommitInfo from './utils/lastCommitInfo';
import EnvironmentInfo from './utils/environmentInfo';
import MachineInfo from './utils/machineInfo';

// Init babel
require('babel-core/register');
require('babel-polyfill');

global.config = require('./config').default(`${__dirname}/../.config/config.yml`);

/**
 * Initialize state
 */
enum State {
	success,
	warn,
	failed
}

// Set process title
process.title = 'Misskey';

// Start app
main();

/**
 * Init proccess
 */
function main(): void {
	// Master
	if (cluster.isMaster) {
		master();
	} else { // Workers
		worker();
	}
}

/**
 * Init master proccess
 */
async function master(): Promise<void> {
	let state: State;

	try {
		// initialize app
		state = await init();
	} catch (e) {
		console.error(e);
		process.exit(1);
	}

	switch (state) {
		case State.failed:
			Logger.error(chalk.red('Fatal error occurred during initializing :('));
			process.exit();
			return;
		case State.warn:
			Logger.warn(chalk.yellow('Initialized with some problem(s) :|'));
			break;
		case State.success:
			Logger.info(chalk.green('Successfully initialized :)'));
			break;
	}

	// Spawn workers
	spawn(() => {
		Logger.info(chalk.bold.green(`Now listening on port ${config.port}`));

		// Listen new workers
		cluster.on('fork', worker => {
			console.log(`Process forked: [${worker.id}]`);
		});

		// Listen online workers
		cluster.on('online', worker => {
			console.log(`Process is now online: [${worker.id}]`);
		});

		// Listen for dying workers
		cluster.on('exit', worker => {
			// Replace the dead worker,
			// we're not sentimental
			console.log(chalk.red(`[${worker.id}] died :(`));
			cluster.fork();
		});
	});
}

/**
 * Init worker proccess
 */
function worker(): void {
	// Register config
	global.config = config;

	// Init mongo
	initdb().then(db => {
		global.db = db;

		// start server
		require('./server');
	}, err => {
		console.error(err);
		process.exit(0);
	});
}

/**
 * Init app
 */
async function init(): Promise<State> {
	let warn = false;

	Logger.info('Welcome to Misskey!');
	Logger.info(chalk.bold('Misskey Core <aoi>'));
	Logger.info('Initializing...');

	await LastCommitInfo.show();
	EnvironmentInfo.show();
	MachineInfo.show();

	let configLogger = new Logger('Config');
	if (!fs.existsSync(`${__dirname}/../.config/config.yml`)) {
		configLogger.error('Configuration not found');
		return State.failed;
	}

	configLogger.info('Successfully loaded');
	configLogger.info(`maintainer: ${config.maintainer}`);

	if (process.platform === 'linux' && !isRoot() && config.port < 1024) {
		Logger.error('You need root privileges to listen on port below 1024 on Linux');
		return State.failed;
	}

	// Check if a port is being used
	if (await portUsed.check(config.port)) {
		Logger.error(`Port ${config.port} is already used`);
		return State.failed;
	}

	// Try to connect to MongoDB
	let mongoDBLogger = new Logger('MongoDB');
	try {
		const db = await initdb(config);
		mongoDBLogger.info('Successfully connected');
		db.close();
	} catch (e) {
		mongoDBLogger.error(`${e}`);
		return State.failed;
	}

	return warn ? State.warn : State.success;
}

/**
 * Spawn workers
 */
function spawn(callback: any): void {
	// Count the machine's CPUs
	const cpuCount = os.cpus().length;

	const progress = new ProgressBar(cpuCount, 'Starting workers');

	// Create a worker for each CPU
	for (let i = 0; i < cpuCount; i++) {
		const worker = cluster.fork();
		worker.on('message', message => {
			if (message === 'ready') {
				progress.increment();
			}
		});
	}

	// On all workers started
	progress.on('complete', () => {
		callback();
	});
}

// Dying away...
process.on('exit', () => {
	Logger.info('The process is going exit');
});
