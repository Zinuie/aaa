process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import rndstr from 'rndstr';
import { buildServiceProvider, getRequiredService, ServiceCollection, ServiceProvider } from 'yohira';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';
import { ApNoteService } from '@/core/activitypub/models/ApNoteService.js';
import { ApPersonService } from '@/core/activitypub/models/ApPersonService.js';
import { FederatedInstanceService } from '@/core/FederatedInstanceService.js';
import { LoggerService } from '@/core/LoggerService.js';
import { addGlobalServices, initializeGlobalServices } from '@/boot/GlobalModule.js';
import { addRepositoryServices } from '@/boot/RepositoryModule.js';
import { addQueueServices } from '@/boot/QueueModule.js';
import { addCoreServices } from '@/boot/CoreModule.js';
import { DI } from '@/di-symbols.js';
import type { IActor } from '@/core/activitypub/type.js';
import { MockResolver } from '../misc/mock-resolver.js';

const host = 'https://host1.test';

function createRandomActor(): IActor & { id: string } {
	const preferredUsername = `${rndstr('A-Z', 4)}${rndstr('a-z', 4)}`;
	const actorId = `${host}/users/${preferredUsername.toLowerCase()}`;

	return {
		'@context': 'https://www.w3.org/ns/activitystreams',
		id: actorId,
		type: 'Person',
		preferredUsername,
		inbox: `${actorId}/inbox`,
		outbox: `${actorId}/outbox`,
	};
}

describe('ActivityPub', () => {
	let serviceProvider: ServiceProvider;
	let noteService: ApNoteService;
	let personService: ApPersonService;
	let resolver: MockResolver;

	beforeEach(async () => {
		const services = new ServiceCollection();
		addGlobalServices(services);
		addRepositoryServices(services);
		addQueueServices(services);
		addCoreServices(services);

		serviceProvider = buildServiceProvider(services);

		await initializeGlobalServices(serviceProvider);

		noteService = getRequiredService<ApNoteService>(serviceProvider, DI.ApNoteService);
		personService = getRequiredService<ApPersonService>(serviceProvider, DI.ApPersonService);
		resolver = new MockResolver(getRequiredService<LoggerService>(serviceProvider, DI.LoggerService));

		// Prevent ApPersonService from fetching instance, as it causes Jest import-after-test error
		const federatedInstanceService = getRequiredService<FederatedInstanceService>(serviceProvider, DI.FederatedInstanceService);
		vi.spyOn(federatedInstanceService, 'fetch').mockImplementation(() => new Promise(() => {}));
	});

	afterEach(async () => {
		await serviceProvider.disposeAsync();
	});

	describe('Parse minimum object', () => {
		const actor = createRandomActor();

		const post = {
			'@context': 'https://www.w3.org/ns/activitystreams',
			id: `${host}/users/${rndstr('0-9a-z', 8)}`,
			type: 'Note',
			attributedTo: actor.id,
			to: 'https://www.w3.org/ns/activitystreams#Public',
			content: 'あ',
		};

		test('Minimum Actor', async () => {
			resolver._register(actor.id, actor);

			const user = await personService.createPerson(actor.id, resolver);

			assert.deepStrictEqual(user.uri, actor.id);
			assert.deepStrictEqual(user.username, actor.preferredUsername);
			assert.deepStrictEqual(user.inbox, actor.inbox);
		});

		test('Minimum Note', async () => {
			resolver._register(actor.id, actor);
			resolver._register(post.id, post);

			const note = await noteService.createNote(post.id, resolver, true);

			assert.deepStrictEqual(note?.uri, post.id);
			assert.deepStrictEqual(note.visibility, 'public');
			assert.deepStrictEqual(note.text, post.content);
		});
	});

	describe('Name field', () => {
		test('Truncate long name', async () => {
			const actor = {
				...createRandomActor(),
				name: rndstr('0-9a-z', 129),
			};

			resolver._register(actor.id, actor);

			const user = await personService.createPerson(actor.id, resolver);

			assert.deepStrictEqual(user.name, actor.name.slice(0, 128));
		});

		test('Normalize empty name', async () => {
			const actor = {
				...createRandomActor(),
				name: '',
			};

			resolver._register(actor.id, actor);

			const user = await personService.createPerson(actor.id, resolver);

			assert.strictEqual(user.name, null);
		});
	});
});
