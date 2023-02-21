const execa = require("execa");
const fs = require("fs");
const yaml = require("js-yaml");
const path =
	process.env.NODE_ENV === "test"
		? __dirname + "/../.config/test.yml"
		: __dirname + "/../.config/default.yml";
const config = yaml.load(fs.readFileSync(path, "utf-8"));

const start = async () => {
	try {
		const exist = fs.existsSync(
			__dirname + "/../packages/backend/built/boot/index.js"
		);
		if (!exist) throw new Error("not exist yet");

		await execa(
			"pnpm",
			["start-server-and-test", "start", config.url, "dev:watch"],
			{
				cwd: __dirname + "/../",
				stdout: process.stdout,
				stderr: process.stderr,
			}
		);
	} catch (e) {
		await new Promise((resolve) => setTimeout(resolve, 3000));
		start();
	}
};

start();
