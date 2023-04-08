import * as misskey from 'misskey-js';
import * as Acct from 'misskey-js/built/acct';

export const acct = (user: misskey.Acct) => {
	return Acct.toString(user);
};

export const userName = (user: misskey.entities.User) => {
	return user.name || user.username;
};
