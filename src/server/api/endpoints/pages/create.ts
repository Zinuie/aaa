import $ from 'cafy';
import * as ms from 'ms';
import define from '../../define';
import { ID } from '../../../../misc/cafy-id';
import { types, bool } from '../../../../misc/schema';
import { Pages, DriveFiles } from '../../../../models';
import { genId } from '../../../../misc/gen-id';
import { Page } from '../../../../models/entities/page';
import { ApiError } from '../../error';

export const meta = {
	desc: {
		'ja-JP': 'ページを作成します。',
	},

	tags: ['pages'],

	requireCredential: true,

	kind: 'write:pages',

	limit: {
		duration: ms('1hour'),
		max: 300
	},

	params: {
		title: {
			validator: $.str,
		},

		name: {
			validator: $.optional.nullable.str,
			default: null
		},

		content: {
			validator: $.arr($.obj())
		},

		variables: {
			validator: $.arr($.obj())
		},

		eyeCathcingImageFileId: {
			validator: $.optional.type(ID),
		},

		font: {
			validator: $.optional.str.or(['serif', 'sans-serif']),
			default: 'sans-serif'
		},

		alignCenter: {
			validator: $.optional.bool,
			default: false
		},
	},

	res: {
		type: types.object,
		optional: bool.false, nullable: bool.false,
		ref: 'Page',
	},

	errors: {
		noSuchFile: {
			message: 'No such file.',
			code: 'NO_SUCH_FILE',
			id: 'b7b97489-0f66-4b12-a5ff-b21bd63f6e1c'
		},
	}
};

export default define(meta, async (ps, user) => {
	let eyeCatchingImageFile = null;
	if (ps.eyeCathcingImageFileId != null) {
		eyeCatchingImageFile = await DriveFiles.findOne({
			id: ps.eyeCathcingImageFileId,
			userId: user.id
		});

		if (eyeCatchingImageFile == null) {
			throw new ApiError(meta.errors.noSuchFile);
		}
	}

	const page = await Pages.save(new Page({
		id: genId(),
		createdAt: new Date(),
		updatedAt: new Date(),
		title: ps.title,
		name: ps.name,
		content: ps.content,
		variables: ps.variables,
		eyeCatchingImageFileId: eyeCatchingImageFile ? eyeCatchingImageFile.id : null,
		userId: user.id,
		visibility: 'public',
		alignCenter: ps.alignCenter,
		font: ps.font
	}));

	return await Pages.pack(page);
});
