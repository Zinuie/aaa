process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import * as childProcess from 'child_process';
import { async, signup, request, post, react, uploadFile, startServer, shutdownServer } from './utils';

describe('API', () => {
	let p: childProcess.ChildProcess;
	let alice: any;
	let bob: any;
	let carol: any;

	before(async () => {
		p = await startServer();
		alice = await signup({ username: 'alice' });
		bob = await signup({ username: 'bob' });
		carol = await signup({ username: 'carol' });
	});

	after(async () => {
		await shutdownServer(p);
	});

	describe('General validation', () => {
		it('wrong type', async(async () => {
			const res = await request('/test', {
				reqired: true,
				string: 42,
			});
			assert.strictEqual(res.status, 400);
		}));

		it('missing require param', async(async () => {
			const res = await request('/test', {
				string: 'a',
			});
			assert.strictEqual(res.status, 400);
		}));

		it('invalid misskey:id (empty string)', async(async () => {
			const res = await request('/test', {
				id: '',
			});
			assert.strictEqual(res.status, 400);
		}));

		it('valid misskey:id', async(async () => {
			const res = await request('/test', {
				id: '8wvhjghbxu',
			});
			assert.strictEqual(res.status, 200);
		}));

		it('default value', async(async () => {
			const res = await request('/test', {
				reqired: true,
				string: 'a',
			});
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.body.default, 'hello');
		}));

		it('can set null even if it has default value', async(async () => {
			const res = await request('/test', {
				reqired: true,
				nullableDefault: null,
			});
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.body.nullableDefault, null);
		}));
	});
});
