import autobind from 'autobind-decorator';
import Chart, { DeepPartial } from '../../core';
import { SchemaType } from '../../../../misc/schema';
import { name, schema } from '../schemas/network';

type NetworkLog = SchemaType<typeof schema>;

export default class NetworkChart extends Chart<NetworkLog> {
	constructor() {
		super(name, schema);
	}

	@autobind
	public async update(incomingRequests: number, time: number, incomingBytes: number, outgoingBytes: number) {
		const inc: DeepPartial<NetworkLog> = {
			incomingRequests: incomingRequests,
			totalTime: time,
			incomingBytes: incomingBytes,
			outgoingBytes: outgoingBytes
		};

		await this.inc(inc);
	}

	@autobind
	protected genNewLog(latest: NetworkLog): DeepPartial<NetworkLog> {
		return {};
	}

	@autobind
	protected async fetchActual(): Promise<DeepPartial<NetworkLog>> {
		return {};
	}
}
