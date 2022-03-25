import { EntityRepository, Repository } from 'typeorm';
import { FollowRequest } from '@/models/entities/follow-request.js';
import { Users } from '../index.js';
import { User } from '@/models/entities/user.js';

@EntityRepository(FollowRequest)
export class FollowRequestRepository extends Repository<FollowRequest> {
	public async pack(
		src: FollowRequest['id'] | FollowRequest,
		me?: { id: User['id'] } | null | undefined
	) {
		const request = typeof src === 'object' ? src : await this.findOneByOrFail({ id: src });

		return {
			id: request.id,
			follower: await Users.pack(request.followerId, me),
			followee: await Users.pack(request.followeeId, me),
		};
	}
}
