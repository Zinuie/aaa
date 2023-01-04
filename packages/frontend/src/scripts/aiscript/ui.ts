import { Interpreter, Parser, utils, values } from '@syuilo/aiscript';
import { v4 as uuid } from 'uuid';
import { ref, Ref } from 'vue';

export type AsUiRoot = {
	id: string;
	type: 'root';
	children: AsUiComponent['id'][];
};

export type AsUiText = {
	id: string;
	type: 'text';
	text: string;
	size?: number;
	bold?: boolean;
	color?: string;
	font?: 'serif' | 'sans-serif' | 'monospace';
};

export type AsUiMfm = {
	id: string;
	type: 'mfm';
	text: string;
	size?: number;
	color?: string;
	font?: 'serif' | 'sans-serif' | 'monospace';
};

export type AsUiButton = {
	id: string;
	type: 'button';
	text: string;
	onClick: () => void;
	primary?: boolean;
	rounded?: boolean;
};

export type AsUiButtons = {
	id: string;
	type: 'buttons';
	buttons: AsUiButton[];
};

export type AsUiSwitch = {
	id: string;
	type: 'switch';
	onChange: () => void;
	default?: boolean;
	label?: string;
	caption?: string;
};

export type AsUiTextInput = {
	id: string;
	type: 'textInput';
	onInput: () => void;
	default?: string;
	label?: string;
	caption?: string;
};

export type AsUiNumberInput = {
	id: string;
	type: 'numberInput';
	onInput: () => void;
	default?: number;
	label?: string;
	caption?: string;
};

export type AsUiContainer = {
	id: string;
	type: 'container';
	children: AsUiComponent['id'][];
	align?: 'left' | 'center' | 'right';
	bgColor?: string;
	fgColor?: string;
	font?: 'serif' | 'sans-serif' | 'monospace';
	borderWidth?: number;
	borderColor?: string;
	padding?: number;
	rounded?: boolean;
};

export type AsUiComponent = AsUiRoot | AsUiText | AsUiMfm | AsUiButton | AsUiButtons | AsUiSwitch | AsUiTextInput | AsUiNumberInput | AsUiContainer;

export function patch(id: string, def: values.Value, call: (fn: values.VFn, args: values.Value[]) => Promise<values.Value>) {
	// TODO
}

function getRootOptions(def: values.Value | undefined): Omit<AsUiRoot, 'id' | 'type'> {
	utils.assertObject(def);

	const children = def.value.get('children');
	utils.assertArray(children);

	return {
		children: children.value.map(v => {
			utils.assertObject(v);
			return v.value.get('id').value;
		}),
	};
}

function getContainerOptions(def: values.Value | undefined): Omit<AsUiContainer, 'id' | 'type'> {
	utils.assertObject(def);

	const children = def.value.get('children');
	utils.assertArray(children);
	const align = def.value.get('align');
	if (align) utils.assertString(align);
	const bgColor = def.value.get('bgColor');
	if (bgColor) utils.assertString(bgColor);
	const fgColor = def.value.get('fgColor');
	if (fgColor) utils.assertString(fgColor);
	const font = def.value.get('font');
	if (font) utils.assertString(font);
	const borderWidth = def.value.get('borderWidth');
	if (borderWidth) utils.assertNumber(borderWidth);
	const borderColor = def.value.get('borderColor');
	if (borderColor) utils.assertString(borderColor);
	const padding = def.value.get('padding');
	if (padding) utils.assertNumber(padding);
	const rounded = def.value.get('rounded');
	if (rounded) utils.assertBoolean(rounded);

	return {
		children: children.value.map(v => {
			utils.assertObject(v);
			return v.value.get('id').value;
		}),
		align: align?.value,
		fgColor: fgColor?.value,
		bgColor: bgColor?.value,
		font: font?.value,
		borderWidth: borderWidth?.value,
		borderColor: borderColor?.value,
		padding: padding?.value,
		rounded: rounded?.value,
	};
}

function getTextOptions(def: values.Value | undefined): Omit<AsUiText, 'id' | 'type'> {
	utils.assertObject(def);

	const text = def.value.get('text');
	utils.assertString(text);
	const size = def.value.get('size');
	if (size) utils.assertNumber(size);
	const bold = def.value.get('bold');
	if (bold) utils.assertBoolean(bold);
	const color = def.value.get('color');
	if (color) utils.assertString(color);
	const font = def.value.get('font');
	if (font) utils.assertString(font);

	return {
		text: text.value,
		size: size?.value,
		bold: bold?.value,
		color: color?.value,
		font: font?.value,
	};
}

function getMfmOptions(def: values.Value | undefined): Omit<AsUiMfm, 'id' | 'type'> {
	utils.assertObject(def);

	const text = def.value.get('text');
	utils.assertString(text);
	const size = def.value.get('size');
	if (size) utils.assertNumber(size);
	const color = def.value.get('color');
	if (color) utils.assertString(color);
	const font = def.value.get('font');
	if (font) utils.assertString(font);

	return {
		text: text.value,
		size: size?.value,
		color: color?.value,
		font: font?.value,
	};
}

function getTextInputOptions(def: values.Value | undefined, call: (fn: values.VFn, args: values.Value[]) => Promise<values.Value>): Omit<AsUiTextInput, 'id' | 'type'> {
	utils.assertObject(def);

	const onInput = def.value.get('onInput');
	utils.assertFunction(onInput);
	const defaultValue = def.value.get('default');
	if (defaultValue) utils.assertString(defaultValue);
	const label = def.value.get('label');
	if (label) utils.assertString(label);
	const caption = def.value.get('caption');
	if (caption) utils.assertString(caption);

	return {
		onInput: (v) => {
			call(onInput, [utils.jsToVal(v)]);
		},
		default: defaultValue?.value,
		label: label?.value,
		caption: caption?.value,
	};
}

function getNumberInputOptions(def: values.Value | undefined, call: (fn: values.VFn, args: values.Value[]) => Promise<values.Value>): Omit<AsUiNumberInput, 'id' | 'type'> {
	utils.assertObject(def);

	const onInput = def.value.get('onInput');
	utils.assertFunction(onInput);
	const defaultValue = def.value.get('default');
	if (defaultValue) utils.assertNumber(defaultValue);
	const label = def.value.get('label');
	if (label) utils.assertString(label);
	const caption = def.value.get('caption');
	if (caption) utils.assertString(caption);

	return {
		onInput: (v) => {
			call(onInput, [utils.jsToVal(v)]);
		},
		default: defaultValue?.value,
		label: label?.value,
		caption: caption?.value,
	};
}

function getButtonOptions(def: values.Value | undefined, call: (fn: values.VFn, args: values.Value[]) => Promise<values.Value>): Omit<AsUiButton, 'id' | 'type'> {
	utils.assertObject(def);

	const text = def.value.get('text');
	utils.assertString(text);
	const onClick = def.value.get('onClick');
	utils.assertFunction(onClick);
	const primary = def.value.get('primary');
	if (primary) utils.assertBoolean(primary);
	const rounded = def.value.get('rounded');
	if (rounded) utils.assertBoolean(rounded);

	return {
		text: text.value,
		onClick: () => {
			call(onClick, []);
		},
		primary: primary?.value,
		rounded: rounded?.value,
	};
}

function getButtonsOptions(def: values.Value | undefined, call: (fn: values.VFn, args: values.Value[]) => Promise<values.Value>): Omit<AsUiButtons, 'id' | 'type'> {
	utils.assertObject(def);

	const buttons = def.value.get('buttons');
	utils.assertArray(buttons);

	return {
		buttons: buttons.value.map(button => {
			utils.assertObject(button);
			const text = button.value.get('text');
			utils.assertString(text);
			const onClick = button.value.get('onClick');
			utils.assertFunction(onClick);
			const primary = button.value.get('primary');
			if (primary) utils.assertBoolean(primary);
			const rounded = button.value.get('rounded');
			if (rounded) utils.assertBoolean(rounded);

			return {
				text: text.value,
				onClick: () => {
					call(onClick, []);
				},
				primary: primary?.value,
				rounded: rounded?.value,
			};
		}),
	};
}

function getSwitchOptions(def: values.Value | undefined, call: (fn: values.VFn, args: values.Value[]) => Promise<values.Value>): Omit<AsUiSwitch, 'id' | 'type'> {
	utils.assertObject(def);

	const onChange = def.value.get('onChange');
	utils.assertFunction(onChange);
	const defaultValue = def.value.get('default');
	if (defaultValue) utils.assertBoolean(defaultValue);
	const label = def.value.get('label');
	if (label) utils.assertString(label);
	const caption = def.value.get('caption');
	if (caption) utils.assertString(caption);

	return {
		onChange: (v) => {
			call(onChange, [utils.jsToVal(v)]);
		},
		default: defaultValue?.value,
		label: label?.value,
		caption: caption?.value,
	};
}

export function registerAsUiLib(components: Ref<AsUiComponent>[], done: (root: Ref<AsUiRoot>) => void) {
	const instances = {};

	function createComponentInstance(type: AsUiComponent['type'], def: values.Value | undefined, id: values.Value | undefined, getOptions: (def: values.Value | undefined, call: (fn: values.VFn, args: values.Value[]) => Promise<values.Value>) => any, call: (fn: values.VFn, args: values.Value[]) => Promise<values.Value>) {
		if (id) utils.assertString(id);
		const _id = id?.value ?? uuid();
		const component = ref({
			...getOptions(def, call),
			type,
			id: _id,
		});
		components.push(component);
		const instance = values.OBJ(new Map([
			['id', values.STR(_id)],
			['update', values.FN_NATIVE(async ([def], opts) => {
				const updates = getOptions(def, call);
				for (const update in updates) {
					component.value[update] = updates[update];
				}
			})],
		]));
		instances[_id] = instance;
		return instance;
	}

	const rootInstance = createComponentInstance('root', utils.jsToVal({ children: [] }), utils.jsToVal('___root___'), getRootOptions, () => {});
	const rootComponent = components[0] as Ref<AsUiRoot>;
	done(rootComponent);

	return {
		'Mk:Ui:root': rootInstance,

		'Mk:Ui:patch': values.FN_NATIVE(async ([id, val], opts) => {
			utils.assertString(id);
			utils.assertArray(val);
			patch(id.value, val.value, opts.call);
		}),

		'Mk:Ui:get': values.FN_NATIVE(async ([id], opts) => {
			utils.assertString(id);
			const instance = instances[id.value];
			if (instance) {
				return instance;
			} else {
				return values.NULL;
			}
		}),

		// Mk:Ui:root.update({ children: [...] }) の糖衣構文
		'Mk:Ui:render': values.FN_NATIVE(async ([children], opts) => {
			utils.assertArray(children);
		
			rootComponent.value.children = children.value.map(v => {
				utils.assertObject(v);
				return v.value.get('id').value;
			});
		}),

		'Mk:Ui:Component:container': values.FN_NATIVE(async ([def, id], opts) => {
			return createComponentInstance('container', def, id, getContainerOptions, opts.call);
		}),

		'Mk:Ui:Component:text': values.FN_NATIVE(async ([def, id], opts) => {
			return createComponentInstance('text', def, id, getTextOptions, opts.call);
		}),

		'Mk:Ui:Component:mfm': values.FN_NATIVE(async ([def, id], opts) => {
			return createComponentInstance('mfm', def, id, getMfmOptions, opts.call);
		}),

		'Mk:Ui:Component:textInput': values.FN_NATIVE(async ([def, id], opts) => {
			return createComponentInstance('textInput', def, id, getTextInputOptions, opts.call);
		}),

		'Mk:Ui:Component:numberInput': values.FN_NATIVE(async ([def, id], opts) => {
			return createComponentInstance('numberInput', def, id, getNumberInputOptions, opts.call);
		}),

		'Mk:Ui:Component:button': values.FN_NATIVE(async ([def, id], opts) => {
			return createComponentInstance('button', def, id, getButtonOptions, opts.call);
		}),

		'Mk:Ui:Component:buttons': values.FN_NATIVE(async ([def, id], opts) => {
			return createComponentInstance('buttons', def, id, getButtonsOptions, opts.call);
		}),

		'Mk:Ui:Component:switch': values.FN_NATIVE(async ([def, id], opts) => {
			return createComponentInstance('switch', def, id, getSwitchOptions, opts.call);
		}),
	};
}
