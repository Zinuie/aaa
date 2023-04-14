import { type Schema, refs } from '@/misc/json-schema.js';
import type { MediaType } from './types';

type OpenAPISchema = NonNullable<MediaType['schema']>;

export function convertSchemaToOpenApiSchema(schema: Schema): OpenAPISchema {
	const res: OpenAPISchema = schema;

	if (schema.type === 'object' && schema.properties) {
		res.required = Object.entries(schema.properties).filter(([, v]) => !v.optional).map(([k]) => k);

		for (const [k, v] of Object.entries(schema.properties)) {
			res.properties[k] = convertSchemaToOpenApiSchema(v);
		}
	}

	if (schema.type === 'array' && schema.items) {
		res.items = convertSchemaToOpenApiSchema(schema.items);
	}

	if (schema.anyOf) res.anyOf = schema.anyOf.map(convertSchemaToOpenApiSchema);
	if (schema.oneOf) res.oneOf = schema.oneOf.map(convertSchemaToOpenApiSchema);
	if (schema.allOf) res.allOf = schema.allOf.map(convertSchemaToOpenApiSchema);

	if (schema.ref) {
		res.$ref = `#/components/schemas/${schema.ref}`;
	}

	return res;
}

export const schemas: { [key: string]: OpenAPISchema } = {
	Error: {
		type: 'object',
		properties: {
			error: {
				type: 'object',
				description: 'An error object.',
				properties: {
					code: {
						type: 'string',
						description: 'An error code. Unique within the endpoint.',
					},
					message: {
						type: 'string',
						description: 'An error message.',
					},
					id: {
						type: 'string',
						format: 'uuid',
						description: 'An error ID. This ID is static.',
					},
				},
				required: ['code', 'id', 'message'],
			},
		},
		required: ['error'],
	},

	...Object.fromEntries(
		Object.entries(refs).map(([key, schema]) => [key, convertSchemaToOpenApiSchema(schema)]),
	),
};
