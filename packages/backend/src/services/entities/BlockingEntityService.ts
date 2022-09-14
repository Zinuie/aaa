import { Inject, Injectable } from '@nestjs/common';
import { DI_SYMBOLS } from '@/di-symbols.js';
import type { Blockings } from '@/models/index.js';
import { awaitAll } from '@/prelude/await-all.js';
import type { Packed } from '@/misc/schema.js';
import type { Blocking } from '@/models/entities/blocking.js';
import type { User } from '@/models/entities/user.js';
import { UserEntityService } from './UserEntityService.js';

@Injectable()
export class BlockingEntityService {
	constructor(
		@Inject('blockingsRepository')
		private blockingsRepository: typeof Blockings,

		private userEntityService: UserEntityService,
	) {
	}

	public async pack(
		src: Blocking['id'] | Blocking,
		me?: { id: User['id'] } | null | undefined,
	): Promise<Packed<'Blocking'>> {
		const blocking = typeof src === 'object' ? src : await this.blockingsRepository.findOneByOrFail({ id: src });

		return await awaitAll({
			id: blocking.id,
			createdAt: blocking.createdAt.toISOString(),
			blockeeId: blocking.blockeeId,
			blockee: this.userEntityService.pack(blocking.blockeeId, me, {
				detail: true,
			}),
		});
	}

	public packMany(
		blockings: any[],
		me: { id: User['id'] },
	) {
		return Promise.all(blockings.map(x => this.pack(x, me)));
	}
}
