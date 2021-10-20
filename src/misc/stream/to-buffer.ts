import { Readable } from 'stream';

export async function toBuffer(readable: Readable) {
	const chunks = await toBufferArray(readable);
	return Buffer.concat(chunks);
}

export function toBufferArray(readable: Readable) {
	return new Promise<Uint8Array[]>((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject('STREAM TIMEOUT');
		}, 5000);

		const chunks: Uint8Array[] = [];
		readable
			.on('data', chunk => chunks.push(chunk))
			.on('end', () => {
				clearTimeout(timeout);
				resolve(chunks);
			})
			.on('error', reject);
	});
}
