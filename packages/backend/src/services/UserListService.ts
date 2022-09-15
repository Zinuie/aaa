import { Inject, Injectable } from '@nestjs/common';
import type { UserListJoinings , Users } from '@/models/index.js';
import type { User } from '@/models/entities/User.js';
import type { UserList } from '@/models/entities/UserList.js';
import type { UserListJoining } from '@/models/entities/UserListJoining.js';
import { IdService } from '@/services/IdService.js';
import { UserFollowingService } from '@/services/UserFollowingService.js';
import { GlobalEventService } from '@/services/GlobalEventService.js';
import { UserEntityService } from './entities/UserEntityService.js';
import { ProxyAccountService } from './ProxyAccountService.js';

@Injectable()
export class UserListService {
	constructor(
		@Inject('usersRepository')
		private usersRepository: typeof Users,

		@Inject('userListJoiningsRepository')
		private userListJoiningsRepository: typeof UserListJoinings,

		private userEntityService: UserEntityService,
		private idService: IdService,
		private userFollowingService: UserFollowingService,
		private globalEventServie: GlobalEventService,
		private proxyAccountService: ProxyAccountService,
	) {
	}

	public async push(target: User, list: UserList) {
		await this.userListJoiningsRepository.insert({
			id: this.idService.genId(),
			createdAt: new Date(),
			userId: target.id,
			userListId: list.id,
		} as UserListJoining);
	
		this.globalEventServie.publishUserListStream(list.id, 'userAdded', await this.userEntityService.pack(target));
	
		// このインスタンス内にこのリモートユーザーをフォローしているユーザーがいなくても投稿を受け取るためにダミーのユーザーがフォローしたということにする
		if (this.userEntityService.isRemoteUser(target)) {
			const proxy = await this.proxyAccountService.fetch();
			if (proxy) {
				this.userFollowingService.follow(proxy, target);
			}
		}
	}
}
