import { Injectable, CanActivate, ExecutionContext, ParseIntPipe, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ChannelService } from '../channel/channel.service';
import { Channel_Member_Role } from '../entities/channelMember.entity';

@Injectable()
export class IsOwnerGuard implements CanActivate {

	constructor( private channelService: ChannelService ) {}

	async canActivate(
	  context: ExecutionContext,
	): Promise<boolean> {

		const request = context.switchToHttp().getRequest();

		const { id } = request.user
		const channelId: string = request.params.channel_id

		const userRole: Channel_Member_Role = await this.channelService.findUserChannelRole(id, channelId)

		if (userRole !== 'owner')
			throw new ForbiddenException('only a channeld owner is allowed to do this action')
	
		return true
	}
}