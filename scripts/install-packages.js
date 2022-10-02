const execa = require('execa');

(async () => {
	const args = process.env.npm_config_argv?.original || ['install'];

	console.log('installing dependencies of packages/backend ...');

	await execa('yarn', ['--force'].concat(args), {
		cwd: __dirname + '/../packages/backend',
		stdout: process.stdout,
		stderr: process.stderr,
	});

	console.log('installing dependencies of packages/client ...');

	await execa('yarn', args, {
		cwd: __dirname + '/../packages/client',
		stdout: process.stdout,
		stderr: process.stderr,
	});

	console.log('installing dependencies of packages/sw ...');

	await execa('yarn', args, {
		cwd: __dirname + '/../packages/sw',
		stdout: process.stdout,
		stderr: process.stderr,
	});
})();
