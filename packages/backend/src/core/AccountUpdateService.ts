import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import { UsersRepository } from '@/models/index.js';
import { Config } from '@/config.js';
import type { User } from '@/models/entities/User.js';
import { ApRendererService } from '@/core/remote/activitypub/ApRendererService.js';
import { RelayService } from '@/core/RelayService.js';
import { ApDeliverManagerService } from '@/core/remote/activitypub/ApDeliverManagerService.js';
import { UserEntityService } from './entities/UserEntityService.js';

@Injectable()
export class AccountUpdateService {
	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private userEntityService: UserEntityService,
		private apRendererService: ApRendererService,
		private apDeliverManagerService: ApDeliverManagerService,
		private relayService: RelayService,
	) {
	}

	public async publishToFollowers(userId: User['id']) {
		const user = await this.usersRepository.findOneBy({ id: userId });
		if (user == null) throw new Error('user not found');
	
		// フォロワーがリモートユーザーかつ投稿者がローカルユーザーならUpdateを配信
		if (this.userEntityService.isLocalUser(user)) {
			const content = this.apRendererService.renderActivity(this.apRendererService.renderUpdate(await this.apRendererService.renderPerson(user), user));
			this.apDeliverManagerService.deliverToFollowers(user, content);
			this.relayService.deliverToRelays(user, content);
		}
	}
}
