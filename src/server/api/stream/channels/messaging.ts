import read from '../../common/read-messaging-message';
import Channel from '../channel';

export default class extends Channel {
	private otherpartyId: string;

	public init = async (params: any) => {
		this.otherpartyId = params.otherparty as string;

		// Subscribe messaging stream
		this.subscriber.on(`messagingStream:${this.user._id}-${this.otherpartyId}`, data => {
			this.send(JSON.stringify(data));
		});
	}

	public onMessage = (type: string, body: any) => {
		switch (type) {
			case 'read':
				read(this.user._id, this.otherpartyId, body.id);
				break;
		}
	}
}
