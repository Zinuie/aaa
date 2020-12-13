import { reactive, Ref, ref } from 'vue';
import { Theme } from './scripts/theme';

// TODO: 他のタブと永続化されたstateを同期

// MEMO: ユーザーごとの設定を保存するstorageを実装するときは、storageのkeyに$i.icをくっつけるだけで実装できそう

const PREFIX = 'miux:';

/**
 * 常にメモリにロードしておく必要がないような設定情報を保管するストレージ(非リアクティブ)
 */
export class ColdDeviceStorage {
	public static default = {
		themes: [] as Theme[],
		darkTheme: '8050783a-7f63-445a-b270-36d0f6ba1677',
		lightTheme: '4eea646f-7afa-4645-83e9-83af0333cd37',
		syncDeviceDarkMode: true,
		sound_masterVolume: 0.3,
		sound_note: { type: 'syuilo/down', volume: 1 },
		sound_noteMy: { type: 'syuilo/up', volume: 1 },
		sound_notification: { type: 'syuilo/pope2', volume: 1 },
		sound_chat: { type: 'syuilo/pope1', volume: 1 },
		sound_chatBg: { type: 'syuilo/waon', volume: 1 },
		sound_antenna: { type: 'syuilo/triple', volume: 1 },
		sound_channel: { type: 'syuilo/square-pico', volume: 1 },
		sound_reversiPutBlack: { type: 'syuilo/kick', volume: 0.3 },
		sound_reversiPutWhite: { type: 'syuilo/snare', volume: 0.3 },
	};

	public static watchers = [];

	public static get<T extends keyof typeof ColdDeviceStorage.default>(key: T): typeof ColdDeviceStorage.default[T] {
		// TODO: indexedDBにする
		//       ただしその際はnullチェックではなくキー存在チェックにしないとダメ
		//       (indexedDBはnullを保存できるため、ユーザーが意図してnullを格納した可能性がある)
		const value = localStorage.getItem(PREFIX + key);
		if (value == null) {
			return ColdDeviceStorage.default[key];
		} else {
			return JSON.parse(value);
		}
	}

	public static set<T extends keyof typeof ColdDeviceStorage.default>(key: T, value: typeof ColdDeviceStorage.default[T]): void {
		localStorage.setItem(PREFIX + key, JSON.stringify(value));

		for (const watcher of this.watchers) {
			if (watcher.key === key) watcher.callback(value);
		}
	}

	public static watch(key, callback) {
		this.watchers.push({ key, callback });
	}

	public static ref<T extends keyof typeof ColdDeviceStorage.default>(key: T) {
		const v = ColdDeviceStorage.get(key);
		const r = ref(v);
		// TODO: このままではwatcherがリークするので開放する方法を考える
		this.watch(key, v => {
			r.value = v;
		});
		return r;
	}

	/**
	 * 特定のキーの、簡易的なgetter/setterを作ります
	 * 主にvue場で設定コントロールのmodelとして使う用
	 */
	public static makeGetterSetter<K extends keyof typeof ColdDeviceStorage.default>(key: K) {
		const valueRef = ColdDeviceStorage.ref(key);
		return {
			get: () => {
				return valueRef.value;
			},
			set: (value: unknown) => {
				const val = value;
				ColdDeviceStorage.set(key, val);
			}
		};
	}
}

/**
 * 頻繁にアクセスされる設定情報を保管するストレージ
 */
export class HotDeviceStorage<T extends Record<string, any>, M extends Record<string, (state: T, arg: unknown) => void>> {
	public readonly key: string;

	public readonly default: T;

	public readonly state: T;

	public readonly mutations: M;

	constructor(key: string, makeReactive: boolean, defaultState: T, mutations?: M) {
		this.key = 'db::' + key;
		this.default = defaultState;
		this.state = makeReactive ? reactive(defaultState) : { ...defaultState };
		this.mutations = mutations;

		// TODO: indexedDBにする
		const data = localStorage.getItem(this.key);
		if (data != null) {
			const x = JSON.parse(data);
			for (const [key, value] of Object.entries(this.default)) {
				if (Object.prototype.hasOwnProperty.call(x, key)) {
					this.state[key] = x[key];
				} else {
					this.state[key] = value;
				}
			}
		}
	}

	public set(key: keyof T, value: any): any {
		this.state[key] = value;
		localStorage.setItem(this.key, JSON.stringify(this.state));
	}

	public commit(name: keyof M, arg: any) {
		if (_DEV_) {
			if (this.mutations[name] == null) {
				console.error('UNRECOGNIZED MUTATION: ' + name);
			}
		}
		this.mutations[name](this.state, arg);
		localStorage.setItem(this.key, JSON.stringify(this.state));
	}

	/**
	 * 特定のキーの、簡易的なgetter/setterを作ります
	 * 主にvue場で設定コントロールのmodelとして使う用
	 */
	public makeGetterSetter<K extends keyof T>(key: K, getter?: (v: T[K]) => unknown, setter?: (v: unknown) => T[K]) {
		const valueRef = ref(this.state[key]);
		return {
			get: () => {
				if (getter) {
					return getter(valueRef.value);
				} else {
					return valueRef.value;
				}
			},
			set: (value: unknown) => {
				const val = setter ? setter(value) : value;
				this.set(key, val);
				valueRef.value = val;
			}
		};
	}
}

export const hotDeviceStorage = new HotDeviceStorage('base', false, {
	animation: true,
	animatedMfm: true,
	disableShowingAnimatedImages: false,
	useOsNativeEmojis: false,
	showGapBetweenNotesInTimeline: true,
});

export const reactiveDeviceStorage = new HotDeviceStorage('baseReactive', true, {
	darkMode: false,
});

// このファイルに書きたくないけどここに書かないと何故かVeturが認識しない
declare module '@vue/runtime-core' {
	interface ComponentCustomProperties {
		hotDeviceStorage: typeof hotDeviceStorage;
	}
}
