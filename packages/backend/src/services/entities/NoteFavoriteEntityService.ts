import { Inject, Injectable } from '@nestjs/common';
import { DI_SYMBOLS } from '@/di-symbols.js';
import type { NoteFavorites } from '@/models/index.js';
import { awaitAll } from '@/prelude/await-all.js';
import type { Packed } from '@/misc/schema.js';
import type { } from '@/models/entities/blocking.js';
import type { User } from '@/models/entities/user.js';
import type { NoteFavorite } from '@/models/entities/note-favorite.js';
import { UserEntityService } from './UserEntityService.js';
import { NoteEntityService } from './NoteEntityService.js';

@Injectable()
export class NoteFavoriteEntityService {
	constructor(
		@Inject('noteFavoritesRepository')
		private noteFavoritesRepository: typeof NoteFavorites,

		private noteEntityService: NoteEntityService,
	) {
	}

	public async pack(
		src: NoteFavorite['id'] | NoteFavorite,
		me?: { id: User['id'] } | null | undefined,
	) {
		const favorite = typeof src === 'object' ? src : await this.noteFavoritesRepository.findOneByOrFail({ id: src });

		return {
			id: favorite.id,
			createdAt: favorite.createdAt.toISOString(),
			noteId: favorite.noteId,
			note: await this.noteEntityService.pack(favorite.note || favorite.noteId, me),
		};
	}

	public packMany(
		favorites: any[],
		me: { id: User['id'] },
	) {
		return Promise.all(favorites.map(x => this.pack(x, me)));
	}
}
