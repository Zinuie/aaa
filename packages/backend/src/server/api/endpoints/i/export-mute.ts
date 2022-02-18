import define from '../../define';
import { createExportMuteJob } from '@/queue/index';
import ms from 'ms';

export const meta = {
	secure: true,
	requireCredential: true,
	limit: {
		duration: ms('1hour'),
		max: 1,
	},
} as const;

const paramDef = {

} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, paramDef, async (ps, user) => {
	createExportMuteJob(user);
});
