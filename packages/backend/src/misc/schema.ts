import { packedUserSchema } from '@/models/schema/user';
import { packedNoteSchema } from '@/models/schema/note';
import { packedUserListSchema } from '@/models/schema/user-list';
import { packedAppSchema } from '@/models/schema/app';
import { packedMessagingMessageSchema } from '@/models/schema/messaging-message';
import { packedNotificationSchema } from '@/models/schema/notification';
import { packedDriveFileSchema } from '@/models/schema/drive-file';
import { packedDriveFolderSchema } from '@/models/schema/drive-folder';
import { packedFollowingSchema } from '@/models/schema/following';
import { packedMutingSchema } from '@/models/schema/muting';
import { packedBlockingSchema } from '@/models/schema/blocking';
import { packedNoteReactionSchema } from '@/models/schema/note-reaction';
import { packedHashtagSchema } from '@/models/schema/hashtag';
import { packedPageSchema } from '@/models/schema/page';
import { packedUserGroupSchema } from '@/models/schema/user-group';
import { packedNoteFavoriteSchema } from '@/models/schema/note-favorite';
import { packedChannelSchema } from '@/models/schema/channel';
import { packedAntennaSchema } from '@/models/schema/antenna';
import { packedClipSchema } from '@/models/schema/clip';
import { packedFederationInstanceSchema } from '@/models/schema/federation-instance';
import { packedQueueCountSchema } from '@/models/schema/queue';
import { packedGalleryPostSchema } from '@/models/schema/gallery-post';
import { packedEmojiSchema } from '@/models/schema/emoji';

export const refs = {
	User: packedUserSchema,
	UserList: packedUserListSchema,
	UserGroup: packedUserGroupSchema,
	App: packedAppSchema,
	MessagingMessage: packedMessagingMessageSchema,
	Note: packedNoteSchema,
	NoteReaction: packedNoteReactionSchema,
	NoteFavorite: packedNoteFavoriteSchema,
	Notification: packedNotificationSchema,
	DriveFile: packedDriveFileSchema,
	DriveFolder: packedDriveFolderSchema,
	Following: packedFollowingSchema,
	Muting: packedMutingSchema,
	Blocking: packedBlockingSchema,
	Hashtag: packedHashtagSchema,
	Page: packedPageSchema,
	Channel: packedChannelSchema,
	QueueCount: packedQueueCountSchema,
	Antenna: packedAntennaSchema,
	Clip: packedClipSchema,
	FederationInstance: packedFederationInstanceSchema,
	GalleryPost: packedGalleryPostSchema,
	Emoji: packedEmojiSchema,
};

export type Packed<x extends keyof typeof refs> = SchemaTypeDef<typeof refs[x], false>;
export type PackedAPI<x extends keyof typeof refs> = SchemaTypeDef<typeof refs[x], true>;

type TypeStringef = 'boolean' | 'number' | 'string' | 'array' | 'object' | 'any';
type StringDefToType<T extends TypeStringef> =
	T extends 'boolean' ? boolean :
	T extends 'number' ? number :
	T extends 'string' ? string | Date :
	T extends 'array' ? ReadonlyArray<any> :
	T extends 'object' ? Record<string, any> :
	any;

// https://swagger.io/specification/?sbsearch=optional#schema-object
type OfSchema = {
	readonly anyOf?: ReadonlyArray<MinimumSchema>;
	readonly oneOf?: ReadonlyArray<MinimumSchema>;
	readonly allOf?: ReadonlyArray<MinimumSchema>;
}

export interface MinimumSchema extends OfSchema {
	readonly type?: TypeStringef;
	readonly nullable?: boolean;
	readonly optional?: boolean;
	readonly items?: MinimumSchema;
	readonly properties?: Obj;
	readonly description?: string;
	readonly example?: any;
	readonly format?: string;
	readonly ref?: keyof typeof refs;
	readonly enum?: ReadonlyArray<string>;
	readonly default?: (this['type'] extends TypeStringef ? StringDefToType<this['type']> : any) | null;
	readonly maxLength?: number;
	readonly minLength?: number;
}

export interface Schema extends MinimumSchema {
	readonly nullable: boolean;
	readonly optional: boolean;
}

type NonUndefinedPropertyNames<T extends Obj> = {
	[K in keyof T]: T[K]['optional'] extends true ? never : K
}[keyof T];

type UndefinedPropertyNames<T extends Obj> = {
	[K in keyof T]: T[K]['optional'] extends true ? K : never
}[keyof T];

export interface Obj { [key: string]: Schema; }

export type ObjType<s extends Obj, AllowDate extends boolean> =
	{ -readonly [P in UndefinedPropertyNames<s>]?: SchemaType<s[P], AllowDate> } &
	{ -readonly [P in NonUndefinedPropertyNames<s>]: SchemaType<s[P], AllowDate> };

type NullOrUndefined<p extends MinimumSchema, T> =
	p['nullable'] extends true
		?	p['optional'] extends true
			? (T | null | undefined)
			: (T | null)
		: p['optional'] extends true
			? (T | undefined)
			: T;

// 共用体型を交差型にする型 https://stackoverflow.com/questions/54938141/typescript-convert-union-to-intersection
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

// https://github.com/misskey-dev/misskey/pull/8144#discussion_r785287552
// 単純にSchemaTypeDef<X>で判定するだけではダメ
type UnionSchemaType<a extends readonly any[], AllowDate extends boolean, X extends MinimumSchema = a[number]> = X extends any ? SchemaType<X, AllowDate> : never;
type ArrayUnion<T> = T extends any ? Array<T> : never; 

export type SchemaTypeDef<p extends MinimumSchema, AllowDate extends boolean> =
	p['type'] extends 'number' ? number :
	p['type'] extends 'string' ? (
		p['enum'] extends readonly string[] ?
			p['enum'][number] :
			AllowDate extends true ? string | Date : string
	) :
	p['type'] extends 'boolean' ? boolean :
	p['type'] extends 'object' ? (
		p['ref'] extends keyof typeof refs ? AllowDate extends true ? PackedAPI<p['ref']> : Packed<p['ref']> :
		p['properties'] extends NonNullable<Obj> ? ObjType<p['properties'], AllowDate> :
		p['anyOf'] extends ReadonlyArray<MinimumSchema> ? any :
		p['allOf'] extends ReadonlyArray<MinimumSchema> ? UnionToIntersection<UnionSchemaType<p['allOf'], AllowDate>> :
		any
	) :
	p['type'] extends 'array' ? (
		p['items'] extends OfSchema ? (
			p['items']['anyOf'] extends ReadonlyArray<MinimumSchema> ? UnionSchemaType<NonNullable<p['items']['anyOf']>, AllowDate>[] :
			p['items']['oneOf'] extends ReadonlyArray<MinimumSchema> ? ArrayUnion<UnionSchemaType<NonNullable<p['items']['oneOf']>, AllowDate>> :
			p['items']['allOf'] extends ReadonlyArray<MinimumSchema> ? UnionToIntersection<UnionSchemaType<NonNullable<p['items']['allOf']>, AllowDate>>[] :
			never
		) :
		p['items'] extends NonNullable<MinimumSchema> ? SchemaTypeDef<p['items'], AllowDate>[] :
		any[]
	) :
	p['oneOf'] extends ReadonlyArray<MinimumSchema> ? UnionSchemaType<p['oneOf'], AllowDate> :
	any;

export type SchemaType<p extends MinimumSchema, AllowDate extends boolean> = NullOrUndefined<p, SchemaTypeDef<p, AllowDate>>;
