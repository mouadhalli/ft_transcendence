import { Injectable, CanActivate, ExecutionContext, ParseIntPipe, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ChannelService } from '../channel/channel.service';
import { Channel_Member_Role } from '../entities/channelMember.entity';

@Injectable()
export class IsAdminGuard implements CanActivate {

	constructor( private channelService: ChannelService ) {}

	async canActivate(
	  context: ExecutionContext,
	): Promise<boolean> {

		const request = context.switchToHttp().getRequest();

		const { id } = request.user
		const channelId: string = request.params.channel_id

		const userRole: Channel_Member_Role = await this.channelService.findUserChannelRole(id, channelId)

		if (userRole === 'member')
            throw new ForbiddenException('only a channel owner or admin is allowed to do this action')
            
		return true
	}
}