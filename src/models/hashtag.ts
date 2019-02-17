import * as mongo from 'mongodb';
import db from '../db/mongodb';

const Hashtag = db.get<IHashtags>('hashtags');
Hashtag.createIndex('tag', { unique: true });
Hashtag.createIndex('mentionedUsersCount');
Hashtag.createIndex('mentionedLocalUsersCount');
Hashtag.createIndex('attachedUsersCount');
Hashtag.createIndex('attachedLocalUsersCount');
export default Hashtag;

// 後方互換性のため
Hashtag.findOne({ attachedUserIds: { $exists: false }}).then(h => {
	if (h != null) {
		Hashtag.update({}, {
			$rename: {
				mentionedUserIdsCount: 'mentionedUsersCount'
			},
			$set: {
				mentionedLocalUserIds: [],
				mentionedLocalUsersCount: 0,
				attachedUserIds: [],
				attachedUsersCount: 0,
				attachedLocalUserIds: [],
				attachedLocalUsersCount: 0,
			}
		}, {
			multi: true
		});
	}
});

export interface IHashtags {
	tag: string;
	mentionedUserIds: mongo.ObjectID[];
	mentionedUsersCount: number;
	mentionedLocalUserIds: mongo.ObjectID[];
	mentionedLocalUsersCount: number;
	attachedUserIds: mongo.ObjectID[];
	attachedUsersCount: number;
	attachedLocalUserIds: mongo.ObjectID[];
	attachedLocalUsersCount: number;
}
