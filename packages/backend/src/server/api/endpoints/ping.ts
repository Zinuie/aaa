import define from '../define';

export const meta = {
	requireCredential: false,

	tags: ['meta'],

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			pong: {
				type: 'number',
				optional: false, nullable: false,
			},
		},
	},
} as const;

const paramDef = {

} as const;

// eslint-disable-next-line import/no-default-export
export default define(meta, paramDef, async () => {
	return {
		pong: Date.now(),
	};
});
