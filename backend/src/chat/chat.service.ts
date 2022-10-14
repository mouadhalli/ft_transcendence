import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { AuthService } from '../auth/auth.service'
import { ChannelService } from './channel/channel.service';
import { GatewayConnectionService } from 'src/connection.service';
import { MessageService } from './message/message.service';
import { UserService } from 'src/user/user.service';
import { Channel_Member_Role } from './entities/channelMember.entity';
import * as bcrypt from "bcryptjs";
import { ChannelDto, MembershipDto } from './channel/channel.dto';
import { UserDto } from 'src/dto/User.dto';
import { DirectMessageDto, MessageDto } from './message/message.dto';
import { ChannelEntity } from "./entities/channel.entity"

 
@Injectable()
export class ChatService {

    constructor(
        private authService: AuthService,
        private userService: UserService,
        private channelService: ChannelService,
        private messageService: MessageService,
        private connectionService: GatewayConnectionService
    ) {}

    async joinChannel(userId: number, payload: any) {
        const member: UserDto = await this.userService.findUser(userId)
        const channel: ChannelDto = await this.channelService.findOneChannel(payload.channelId)
        const membership: MembershipDto = await this.channelService.findMembership(member, channel)

        if (!member || !channel)
            throw new WsException("ressources not found")
        // when someone create his own channel i make an owner membership for him right away
        // i added this so they don't join their channels 2 times i might remove it later
        if (membership)
            return channel.name
        if (channel.type === 'private') {
            if (!await bcrypt.compare(payload.password, channel.password))
                throw new WsException("wrong password")
        }
        await this.channelService.createMembership(member, channel, Channel_Member_Role.MEMBER)
        // await this.channelService.updateChannelMembersCount(channel.id, channel.membersCount + 1)
        return channel.name
    }

    async leaveChannel(userId: number, payload: any) {
        const member: UserDto = await this.userService.findUser(userId)
        const channel: ChannelDto = await this.channelService.findOneChannel(payload.channelId)
        const membership: MembershipDto = await this.channelService.findMembership(member, channel)

        if (!member || !channel || !membership)
            throw new WsException("ressource not found")
    
        await this.channelService.deleteMembership(member, channel)
        // await this.channelService.updateChannelMembersCount(channel.id, channel.membersCount - 1)
    
        if (membership.role === 'owner')
            await this.channelService.changeChannelOwner(channel.id)

        return channel.name
    }

    async sendMessage(userId: number, payload: any) {
        const author: UserDto = await this.userService.findUser(userId)
        const channel: ChannelDto = await this.channelService.findOneChannel(payload.channelId)
        const membership: MembershipDto = await this.channelService.findMembership(author, channel)

        if (!author || !channel || !membership)
            throw new WsException("ressources not found")
        
        const message: MessageDto = await this.messageService.saveMessage(
            author,
            channel,
            payload.content
        )

        return {channel, message}

    }

    async sendDirectMessage(userId: number, receiverId: number, content: string) {
        const author: UserDto = await this.userService.findUser(userId)
        const receiver: UserDto = await this.userService.findUser(receiverId)

        if (!author || !receiver)
            throw new WsException("ressources not found")
        
        return await this.messageService.saveDirectMessage(
            author,
            receiver,
            content
        )


    }
}