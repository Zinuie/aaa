import { Inject, Injectable } from '@nestjs/common';
import { DI_SYMBOLS } from '@/di-symbols.js';
import type { Mutings } from '@/models/index.js';
import { awaitAll } from '@/prelude/await-all.js';
import type { Packed } from '@/misc/schema.js';
import type { } from '@/models/entities/blocking.js';
import type { User } from '@/models/entities/user.js';
import type { Muting } from '@/models/entities/muting.js';
import { UserEntityService } from './UserEntityService.js';

@Injectable()
export class MutingEntityService {
	constructor(
		@Inject('mutingsRepository')
		private mutingsRepository: typeof Mutings,

		private userEntityService: UserEntityService,
	) {
	}

	public async pack(
		src: Muting['id'] | Muting,
		me?: { id: User['id'] } | null | undefined,
	): Promise<Packed<'Muting'>> {
		const muting = typeof src === 'object' ? src : await this.mutingsRepository.findOneByOrFail({ id: src });

		return await awaitAll({
			id: muting.id,
			createdAt: muting.createdAt.toISOString(),
			expiresAt: muting.expiresAt ? muting.expiresAt.toISOString() : null,
			muteeId: muting.muteeId,
			mutee: this.userEntityService.pack(muting.muteeId, me, {
				detail: true,
			}),
		});
	}

	public packMany(
		mutings: any[],
		me: { id: User['id'] },
	) {
		return Promise.all(mutings.map(x => this.pack(x, me)));
	}
}

