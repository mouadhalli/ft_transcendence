import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';
import { UserDto } from 'src/dto/User.dto';
import { ChannelService } from '../channel/channel.service';

@Injectable()
export class RolesGuard implements CanActivate {

    constructor(
        private reflector: Reflector,
        private channelService: ChannelService
    ) {}

    async canActivate(
        context: ExecutionContext,
    ): Promise<boolean> {
        const roles = this.reflector.get<string[]>('roles', context.getHandler());

        if (!roles)
            return true;

        const request = context.switchToHttp().getRequest()
        const { id }: UserDto = request.user
        const channelId: string = request.params.channel_id
    
        if (!isUUID(channelId))
            throw new BadRequestException("invalid id format: expecting uuid")

        const userRole: string = await this.channelService.findUserChannelRole(id, channelId)
        if (roles.indexOf(userRole) === -1)
            throw new ForbiddenException("you don't have the right privelege to do this actions")
        return true
    }
}
