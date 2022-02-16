import $ from 'cafy';
import { resolveUser } from '@/remote/resolve-user';
import define from '../../define';
import { apiLogger } from '../../logger';
import { ApiError } from '../../error';
import { ID } from '@/misc/cafy-id';
import { Users } from '@/models/index';
import { In } from 'typeorm';
import { User } from '@/models/entities/user';

export const meta = {
	tags: ['users'],

	requireCredential: false,

	params: {
		type: 'object',
		properties: {
			userId: { type: 'string', format: 'misskey:id', },
			userIds: { type: 'array', uniqueItems: true, items: {
				type: '~~~'
			},
},
			username: { type: 'string', },
			host: { type: 'string', nullable: true, },
		},
		required: [],
	},

	res: {
		optional: false, nullable: false,
		oneOf: [
			{
				type: 'object',
				ref: 'UserDetailed',
			},
			{
				type: 'array',
				items: {
					type: 'object',
					ref: 'UserDetailed',
				}
			},
		]
	},

	errors: {
		failedToResolveRemoteUser: {
			message: 'Failed to resolve remote user.',
			code: 'FAILED_TO_RESOLVE_REMOTE_USER',
			id: 'ef7b9be4-9cba-4e6f-ab41-90ed171c7d3c',
			kind: 'server',
		},

		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '4362f8dc-731f-4ad8-a694-be5a88922a24',
		},
	},
} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, async (ps, me) => {
	let user;

	const isAdminOrModerator = me && (me.isAdmin || me.isModerator);

	if (ps.userIds) {
		if (ps.userIds.length === 0) {
			return [];
		}

		const users = await Users.find(isAdminOrModerator ? {
			id: In(ps.userIds),
		} : {
			id: In(ps.userIds),
			isSuspended: false,
		});

		// リクエストされた通りに並べ替え
		const _users: User[] = [];
		for (const id of ps.userIds) {
			_users.push(users.find(x => x.id === id)!);
		}

		return await Promise.all(_users.map(u => Users.pack(u, me, {
			detail: true,
		})));
	} else {
		// Lookup user
		if (typeof ps.host === 'string' && typeof ps.username === 'string') {
			user = await resolveUser(ps.username, ps.host).catch(e => {
				apiLogger.warn(`failed to resolve remote user: ${e}`);
				throw new ApiError(meta.errors.failedToResolveRemoteUser);
			});
		} else {
			const q: any = ps.userId != null
				? { id: ps.userId }
				: { usernameLower: ps.username!.toLowerCase(), host: null };

			user = await Users.findOne(q);
		}

		if (user == null || (!isAdminOrModerator && user.isSuspended)) {
			throw new ApiError(meta.errors.noSuchUser);
		}

		return await Users.pack(user, me, {
			detail: true,
		});
	}
});
