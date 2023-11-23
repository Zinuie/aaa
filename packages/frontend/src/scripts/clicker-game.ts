/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ref, computed } from 'vue';
import * as os from '@/os.js';

type SaveData = {
	gameVersion: number;
	puddings: number;
	totalPuddings: number;
	totalHandmadePuddings: number;
	clicked: number;
	achievements: any[];
	facilities: any[];
};

export const saveData = ref<SaveData>();
export const ready = computed(() => saveData.value != null);

let prev = '';

export async function load() {
	try {
		saveData.value = await os.api('i/registry/get', {
			scope: ['clickerGame'],
			key: 'saveData',
		});
	} catch (err) {
		if (err.code === 'NO_SUCH_KEY') {
			saveData.value = {
				gameVersion: 2,
				puddings: 0,
				totalPuddings: 0,
				totalHandmadePuddings: 0,
				clicked: 0,
				achievements: [],
				facilities: [],
			};
			save();
			return;
		}
		throw err;
	}

	// migration
	if (saveData.value.gameVersion === 1) {
		saveData.value = {
			gameVersion: 2,
			puddings: saveData.value.puddings,
			totalPuddings: saveData.value.puddings,
			totalHandmadePuddings: saveData.value.puddings,
			clicked: saveData.value.clicked,
			achievements: [],
			facilities: [],
		};
		save();
	}
}

export async function save() {
	const current = JSON.stringify(saveData.value);
	if (current === prev) return;

	await os.api('i/registry/set', {
		scope: ['clickerGame'],
		key: 'saveData',
		value: saveData.value,
	});

	prev = current;
}
