import { decode } from 'blurhash';

let canvas: OffscreenCanvas | null = null;

onmessage = (event) => {
    if ('canvas' in event.data) {
        canvas = event.data.canvas;
    }
    if (!(canvas && 'hash' in event.data && typeof event.data.hash === 'string')) {
        console.error('Cannot draw blurhash without canvas and hash', canvas, event.data);
        throw new Error('Cannot draw blurhash without canvas and hash');
    }
    const width = event.data.width ?? 64;
    const height = event.data.height ?? 64;
	const ctx = canvas.getContext!('2d');
    if (!ctx) return;
	const imageData = ctx.createImageData(width, height);
    const pixels = decode(event.data.hash, width, height);
	imageData.data.set(pixels);
	ctx!.putImageData(imageData, 0, 0);
};
