import $ from 'cafy';
import define from '../../../define';
import { DriveFiles } from '@/models/index';

export const meta = {
	tags: ['drive'],

	requireCredential: true,

	kind: 'read:drive',

	params: {
		type: 'object',
		properties: {
			md5: { type: 'string', },
		},
		required: ['md5'],
	},

	res: {
		type: 'boolean',
		optional: false, nullable: false,
	},
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, async (ps, user) => {
	const file = await DriveFiles.findOne({
		md5: ps.md5,
		userId: user.id,
	});

	return file != null;
});
