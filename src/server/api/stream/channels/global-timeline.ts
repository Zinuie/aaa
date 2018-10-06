import Mute from '../../../../models/mute';
import shouldMuteThisNote from '../../../../misc/should-mute-this-note';
import Channel from '../channel';

export default class extends Channel {
	public init = async (params: any) => {
		const mute = await Mute.find({ muterId: this.user._id });
		const mutedUserIds = mute.map(m => m.muteeId.toString());

		// Subscribe stream
		this.subscriber.on('globalTimeline', async note => {
			// 流れてきたNoteがミュートしているユーザーが関わるものだったら無視する
			if (shouldMuteThisNote(note, mutedUserIds)) return;

			this.send('note', note);
		});
	}
}
