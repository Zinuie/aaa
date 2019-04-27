/**
 * AiScript
 * compiler & type checker
 */

import autobind from 'autobind-decorator';

import {
	faSuperscript,
	faAlignLeft,
	faShareAlt,
	faSquareRootAlt,
	faList,
	faQuoteRight,
	faEquals,
	faGreaterThan,
	faLessThan,
	faGreaterThanEqual,
	faLessThanEqual,
	faExclamation,
	faNotEqual,
	faDice,
	faSortNumericUp,
} from '@fortawesome/free-solid-svg-icons';

export type Block = {
	type: string;
	args: Block[];
	value: any;
};

export type Variable = Block & {
	name: string;
};

type Type = 'string' | 'number' | 'boolean' | 'stringArray';

type TypeError = {
	arg: number;
	expect: Type;
	actual: Type;
};

const funcDefs = {
	not: {
		in: ['boolean'], out: 'boolean', icon: faExclamation,
	},
	eq: {
		in: [0, 0], out: 'boolean', icon: faEquals,
	},
	gt: {
		in: ['number', 'number'], out: 'boolean', icon: faGreaterThan,
	},
	lt: {
		in: ['number', 'number'], out: 'boolean', icon: faLessThan,
	},
	gtEq: {
		in: ['number', 'number'], out: 'boolean', icon: faGreaterThanEqual,
	},
	ltEq: {
		in: ['number', 'number'], out: 'boolean', icon: faLessThanEqual,
	},
	if: {
		in: ['boolean', 0, 0], out: 0, icon: faShareAlt,
	},
	rannum: {
		in: ['number', 'number'], out: 'number', icon: faDice,
	},
	random: {
		in: ['number'], out: 'boolean', icon: faDice,
	},
	randomPick: {
		in: [0], out: 0, icon: faDice,
	},
};

const blockDefs = [{
	type: 'text', out: 'string', icon: faQuoteRight,
}, {
	type: 'multiLineText', out: 'string', icon: faAlignLeft,
}, {
	type: 'textList', out: 'stringArray', icon: faList,
}, {
	type: 'number', out: 'number', icon: faSortNumericUp,
}, {
	type: 'ref', out: null, icon: faSuperscript,
}, ...Object.entries(funcDefs).map(([k, v]) => ({
	type: k, out: v.out || null, icon: v.icon
}))];

type PageVar = { name: string; value: any; type: Type; };

export class AiScript {
	private variables: Variable[];
	private pageVars: PageVar[];
	private envVars: { name: string, value: any }[];

	public static envVarsDef = {
		AI: 'string',
		NAME: 'string',
		NOTES_COUNT: 'number',
		LOGIN: 'boolean',
	};

	public static blockDefs = blockDefs;
	public static funcDefs = funcDefs;

	constructor(variables: Variable[], pageVars: PageVar[] = [], user?: any, visitor?: any) {
		this.variables = variables;
		this.pageVars = pageVars;

		this.envVars = [
			{ name: 'AI', value: 'kawaii' },
			{ name: 'LOGIN', value: visitor != null },
			{ name: 'NAME', value: visitor ? visitor.name : '' }
		];
	}

	@autobind
	public injectPageVars(pageVars: PageVar[]) {
		this.pageVars = pageVars;
	}

	@autobind
	public updatePageVar(name: string, value: any) {
		this.pageVars.find(v => v.name === name).value = value;
	}

	@autobind
	public static isLiteralBlock(v: Block) {
		if (v.type === null) return true;
		if (v.type === 'text') return true;
		if (v.type === 'multiLineText') return true;
		if (v.type === 'textList') return true;
		if (v.type === 'number') return true;
		if (v.type === 'ref') return true;
		return false;
	}

	@autobind
	public typeCheck(v: Block): TypeError | null {
		if (AiScript.isLiteralBlock(v)) return null;

		const def = AiScript.funcDefs[v.type];
		if (def == null) {
			throw new Error('Unknown type: ' + v.type);
		}

		const generic: Type[] = [];

		for (let i = 0; i < def.in.length; i++) {
			const arg = def.in[i];
			const type = this.typeInference(v.args[i]);
			if (type === null) continue;

			if (typeof arg === 'number') {
				if (generic[arg] === undefined) {
					generic[arg] = type;
				} else if (type !== generic[arg]) {
					return {
						arg: i,
						expect: generic[arg],
						actual: type
					};
				}
			} else if (type !== arg) {
				return {
					arg: i,
					expect: arg,
					actual: type
				};
			}
		}

		return null;
	}

	@autobind
	public getExpectedType(v: Block, slot: number): Type | null {
		const def = AiScript.funcDefs[v.type];
		if (def == null) {
			throw new Error('Unknown type: ' + v.type);
		}

		const generic: Type[] = [];

		for (let i = 0; i < def.in.length; i++) {
			const arg = def.in[i];
			const type = this.typeInference(v.args[i]);
			if (type === null) continue;

			if (typeof arg === 'number') {
				if (generic[arg] === undefined) {
					generic[arg] = type;
				}
			}
		}

		if (typeof def.in[slot] === 'number') {
			return generic[def.in[slot]] || null;
		} else {
			return def.in[slot];
		}
	}

	@autobind
	public typeInference(v: Block): Type | null {
		if (v.type === null) return null;
		if (v.type === 'text') return 'string';
		if (v.type === 'multiLineText') return 'string';
		if (v.type === 'textList') return 'stringArray';
		if (v.type === 'number') return 'number';
		if (v.type === 'ref') {
			const variable = this.variables.find(va => va.name === v.value);
			if (variable) {
				return this.typeInference(variable);
			}

			const pageVar = this.pageVars.find(va => va.name === v.value);
			if (pageVar) {
				return pageVar.type;
			}

			const envVar = AiScript.envVarsDef[v.value];
			if (envVar) {
				return envVar;
			}

			return null;
		}

		const generic: Type[] = [];

		const def = AiScript.funcDefs[v.type];

		for (let i = 0; i < def.in.length; i++) {
			const arg = def.in[i];
			if (typeof arg === 'number') {
				const type = this.typeInference(v.args[i]);

				if (generic[arg] === undefined) {
					generic[arg] = type;
				} else {
					if (type !== generic[arg]) {
						generic[arg] = null;
					}
				}
			}
		}

		if (typeof def.out === 'number') {
			return generic[def.out];
		} else {
			return def.out;
		}
	}

	@autobind
	public getVariablesByType(type: Type | null): Variable[] {
		if (type == null) return this.variables;
		return this.variables.filter(x => (this.typeInference(x) === null) || (this.typeInference(x) === type));
	}

	@autobind
	public getEnvVarsByType(type: Type | null): string[] {
		if (type == null) return Object.keys(AiScript.envVarsDef);
		return Object.entries(AiScript.envVarsDef).filter(([k, v]) => type === v).map(([k, v]) => k);
	}

	@autobind
	public getPageVarsByType(type: Type | null): string[] {
		if (type == null) return this.pageVars.map(v => v.name);
		return this.pageVars.filter(v => type === v.type).map(v => v.name);
	}

	@autobind
	private interpolate(str: string, values: { name: string, value: any }[]) {
		return str.replace(/\{(.+?)\}/g, match =>
			(this.getVariableValue(match.slice(1, -1).trim(), values) || '').toString());
	}

	@autobind
	public evaluateVars() {
		const values: { name: string, value: any }[] = [];

		for (const v of this.variables) {
			values.push({
				name: v.name,
				value: this.evaluate(v, values)
			});
		}

		for (const v of this.pageVars) {
			values.push({
				name: v.name,
				value: v.value
			});
		}

		for (const v of this.envVars) {
			values.push({
				name: v.name,
				value: v.value
			});
		}

		return values;
	}

	@autobind
	private evaluate(block: Block, values: { name: string, value: any }[]): any {
		if (block.type === null) {
			return null;
		}

		if (block.type === 'number') {
			return parseInt(block.value, 10);
		}

		if (block.type === 'text' || block.type === 'multiLineText') {
			return this.interpolate(block.value, values);
		}

		if (block.type === 'textList') {
			return block.value.trim().split('\n');
		}

		if (block.type === 'ref') {
			return this.getVariableValue(block.value, values);
		}

		if (block.args === undefined) return null;

		const funcs = {
			not: (a) => !a,
			eq: (a, b) => a === b,
			gt: (a, b) => a > b,
			lt: (a, b) => a < b,
			gtEq: (a, b) => a >= b,
			ltEq: (a, b) => a <= b,
			if: (bool, a, b) => bool ? a : b,
			random: (probability) => Math.floor(Math.random() * 100) < probability,
			rannum: (min, max) => min + Math.floor(Math.random() * (max - min + 1)),
			randomPick: (list) => list[Math.floor(Math.random() * list.length)]
		};

		const fnName = block.type;

		const fn = funcs[fnName];
		if (fn == null) {
			console.error('Unknown function: ' + fnName);
			throw new Error('Unknown function: ' + fnName);
		}

		const args = block.args.map(x => this.evaluate(x, values));

		const res = fn(...args);

		console.log(fnName, args, res);

		return res;
	}

	@autobind
	private getVariableValue(name: string, values: { name: string, value: any }[]): any {
		const v = values.find(v => v.name === name);
		if (v) {
			return v.value;
		}

		const pageVar = this.pageVars.find(v => v.name === name);
		if (pageVar) {
			return pageVar.value;
		}

		if (AiScript.envVarsDef[name]) {
			return this.envVars.find(x => x.name === name).value;
		}

		throw new Error(`Script: No such variable '${name}'`);
	}
}
