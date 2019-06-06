import config from '../../../config';
import { Note } from '../../../models/entities/note';

export default (object: unknown, note: Note) => {
	const activity = {
		id: `${config.url}/notes/${note.id}/activity`,
		actor: `${config.url}/users/${note.userId}`,
		type: 'Create',
		published: note.createdAt.toISOString(),
		object
	};

	if (object.to) activity.to = object.to;
	if (object.cc) activity.cc = object.cc;

	return activity;
};
