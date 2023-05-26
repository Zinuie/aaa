/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { StoryObj } from '@storybook/vue3';
import MkUserSetupDialog_MisskeyFlavoredMarkdown from './MkUserSetupDialog.MisskeyFlavoredMarkdown.vue';
export const Default = {
	render(args) {
		return {
			components: {
				MkUserSetupDialog_MisskeyFlavoredMarkdown,
			},
			setup() {
				return {
					args,
				};
			},
			computed: {
				props() {
					return {
						...this.args,
					};
				},
			},
			template: '<MkUserSetupDialog_MisskeyFlavoredMarkdown v-bind="props" />',
		};
	},
	args: {
		
	},
	parameters: {
		layout: 'centered',
	},
} satisfies StoryObj<typeof MkUserSetupDialog_MisskeyFlavoredMarkdown>;
