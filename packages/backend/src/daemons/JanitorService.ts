import { Inject, Injectable } from '@nestjs/common';
import { LessThan } from 'typeorm';
import { DI } from '@/di-symbols.js';
import type { AttestationChallengesRepository } from '@/models/index.js';
import type { OnApplicationShutdown } from '@nestjs/common';

const interval = 30 * 60 * 1000;

@Injectable()
export class JanitorService implements OnApplicationShutdown {
	#intervalId: NodeJS.Timer;

	constructor(
		@Inject(DI.attestationChallengesRepository)
		private attestationChallengesRepository: AttestationChallengesRepository,
	) {
	}

	/**
	 * Clean up database occasionally
	 */
	public start(): void {
		const tick = async () => {
			await this.attestationChallengesRepository.delete({
				createdAt: LessThan(new Date(new Date().getTime() - 5 * 60 * 1000)),
			});
		};

		tick();

		this.#intervalId = setInterval(tick, interval);
	}

	public onApplicationShutdown(signal?: string | undefined) {
		clearInterval(this.#intervalId);
	}
}
