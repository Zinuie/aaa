import * as Bull from 'bull';
import * as tmp from 'tmp';
import * as fs from 'fs';

import { queueLogger } from '../../logger';
import addFile from '../../../services/drive/add-file';
import dateFormat = require('dateformat');
import { getFullApAccount } from '../../../misc/convert-host';
import { Users, Followings } from '../../../models';
import { MoreThan } from 'typeorm';

const logger = queueLogger.createSubLogger('export-following');

export async function exportFollowing(job: Bull.Job, done: any): Promise<void> {
	logger.info(`Exporting following of ${job.data.user.id} ...`);

	const user = await Users.findOne(job.data.user.id);
	if (user == null) {
		done();
		return;
	}

	// Create temp file
	const [path, cleanup] = await new Promise<[string, any]>((res, rej) => {
		tmp.file((e, path, fd, cleanup) => {
			if (e) return rej(e);
			res([path, cleanup]);
		});
	});

	logger.info(`Temp file is ${path}`);

	const stream = fs.createWriteStream(path, { flags: 'a' });

	let exportedCount = 0;
	let ended = false;
	let cursor: any = null;

	while (!ended) {
		const followings = await Followings.find({
			where: {
				followerId: user.id,
				...(cursor ? { id: MoreThan(cursor) } : {})
			},
			take: 100,
			order: {
				id: 1
			}
		});

		if (followings.length === 0) {
			ended = true;
			job.progress(100);
			break;
		}

		cursor = followings[followings.length - 1].id;

		for (const following of followings) {
			const u = await Users.findOne({ id: following.followeeId });
			const content = getFullApAccount(u.username, u.host);
			await new Promise((res, rej) => {
				stream.write(content + '\n', err => {
					if (err) {
						logger.error(err);
						rej(err);
					} else {
						res();
					}
				});
			});
			exportedCount++;
		}

		const total = await Followings.count({
			followerId: user.id,
		});

		job.progress(exportedCount / total);
	}

	stream.end();
	logger.succ(`Exported to: ${path}`);

	const fileName = 'following-' + dateFormat(new Date(), 'yyyy-mm-dd-HH-MM-ss') + '.csv';
	const driveFile = await addFile(user, path, fileName);

	logger.succ(`Exported to: ${driveFile.id}`);
	cleanup();
	done();
}
