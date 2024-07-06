/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// https://vitejs.dev/config/build-options.html#build-modulepreload
import 'vite/modulepreload-polyfill';

import '@/style.scss';
import '@/style.embed.scss';
import { createApp, defineAsyncComponent } from 'vue';
import { common } from '@/boot/common.js';
import type { CommonBootOptions } from '@/boot/common.js';
import { setIframeId, postMessageToParentWindow } from '@/scripts/post-message.js';
import { parseEmbedParams } from '@/scripts/embed-page.js';
import { defaultStore } from '@/store.js';

const bootOptions: Partial<CommonBootOptions> = {};

const params = new URLSearchParams(location.search);
const embedParams = parseEmbedParams(params);

// カラーモードのオーバーライド
if (embedParams.colorMode != null) {
	bootOptions.forceColorMode = embedParams.colorMode;
}

// サイズの制限
document.documentElement.style.maxWidth = '500px';

// サーバー起動の場合はもとから付与されているけど一応
document.documentElement.classList.add('embed');

// 外部タブでのstoreの変更の影響を受けないように
defaultStore.setConfig({
	disableMessageChannel: true,
});

// iframeIdの設定
function setIframeIdHandler(event: MessageEvent) {
	if (event.data?.type === 'misskey:embedParent:registerIframeId' && event.data.payload?.iframeId != null) {
		setIframeId(event.data.payload.iframeId);
		window.removeEventListener('message', setIframeIdHandler);
	}
}
window.addEventListener('message', setIframeIdHandler);

// 起動
common(() => createApp(
	defineAsyncComponent(() => import('@/ui/embed.vue')),
), bootOptions).then(async ({ app }) => {
	//#region Embed Provide
	app.provide('EMBED_PAGE', true);
	app.provide('embedParams', embedParams);
	//#endregion

	//#region defaultStoreを書き換え
	await defaultStore.ready;

	defaultStore.set('sound_notUseSound', true);
	defaultStore.set('showPreview', false);
	//#endregion

	// 起動完了を通知（このあとクライアント側から misskey:embedParent:registerIframeId が送信される）
	postMessageToParentWindow('misskey:embed:ready');
});
