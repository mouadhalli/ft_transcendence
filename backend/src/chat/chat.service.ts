import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { AuthService } from '../auth/auth.service'
import { ChannelService } from './channel/channel.service';
import { GatewayConnectionService } from 'src/connection.service';
import { MessageService } from './message/message.service';
import { UserService } from 'src/user/user.service';
import { Channel_Member_Role } from './entities/channelMember.entity';
import * as bcrypt from "bcryptjs";
import { ChannelDto, MembershipDto } from './dtos/channel.dto';
import { UserDto } from 'src/dto/User.dto';
import { DirectMessageDto, MessageDto } from './dtos/message.dto';
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

    async joinChannel(userId: number, channelId: string, password: string) {

        const member: UserDto = await this.userService.findUser(userId)
        const channel: ChannelDto = await this.channelService.findChannelWithPassword(channelId)
        const membership: MembershipDto = await this.channelService.findMembership(member, channel)
        if (!member || !channel)
            return {success: false, error: "ressources not found"}
        // when someone create a channel i make an owner membership for him right away
        // this condition prevent creating a new membership for the owner
        if (membership) {
            if (membership.role === 'owner')
                return { success: true, channelName: channel.name }
            return {success: false, error: "already a member"}
        }
        if (channel.type !== 'public') {
            if (channel.type === 'private')
                return {success: false, error: "you can't join a private channel"}
            if ( password && (!await bcrypt.compare(password, channel.password)))
                    return {success: false, error: "incorrect password"}
            return {success: false, error: "password is required"}
        }
        await this.channelService.createMembership(member, channel, Channel_Member_Role.MEMBER)
        return {success: true, channelName: channel.name}
    }

    async leaveChannel(userId: number, channelId: string) {
        const member: UserDto = await this.userService.findUser(userId)
        const channel: ChannelDto = await this.channelService.findOneChannel(channelId)
        const membership: MembershipDto = await this.channelService.findMembership(member, channel)

        if (!member || !channel || !membership)
            return { success: false, error: 'ressource not found' }

        await this.channelService.deleteMembership(member, channel)

        if (membership.role === 'owner')
            await this.channelService.changeChannelOwner(channel.id)

        return {success: true, channelName: channel.name}
    }

    async sendMessage(userId: number, channelId: string, msgContent: string) {
        const author: UserDto = await this.userService.findUser(userId)
        const channel: ChannelDto = await this.channelService.findOneChannel(channelId)
        const membership: MembershipDto = await this.channelService.findMembership(author, channel)

        if (!author || !channel)
            return { success: false, cause: "ressources not found" }
        
        if (!membership)
            return { success: false, cause: "kicked", channelName: channel.name }

        if (membership.state !== 'active') {
            if (membership.restricitonEnd.getTime() > Date.now())
                return {success: false, cause: membership.state, time: membership.restricitonEnd.getTime() - Date.now(), channelName: channel.name}
            this.channelService.removeRestrictionOnChannelMember(channelId, userId)
        }

        const message: MessageDto = await this.messageService.saveMessage(
            author,
            channel,
            msgContent
        )

        return {success: true, channelName: channel.name, message}

    }

    async sendDirectMessage(userId: number, channelId: string, content: string) {
        const author: UserDto = await this.userService.findUser(userId)
        const channel = await this.channelService.findDmChannel(channelId)

        if (!author || !channel)
            return {success: false, error: "ressources not found" }
        
        const receiverId = userId === channel.memberA.id ? userId : channel.memberB.id
        const relationship = await this.userService.findRelationship(userId, receiverId)

        if (!relationship || relationship.state !== 'friends')
            return {success: false, error: "you can only dm your friends" }

        const message = await this.messageService.saveDirectMessage(
            author,
            channel.id,
            content
        )

        return { success: true, message, receiverId}
    }
}