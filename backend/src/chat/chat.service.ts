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

    async joinChannel(userId: number, channelId: number, password: string) {


        // if (!userId || !channelId )
        //     return {success: false, error: "invalid input"}

        const member: UserDto = await this.userService.findUser(userId)
        const channel: ChannelDto = await this.channelService.findChannelWithPassword(channelId)
        const membership: MembershipDto = await this.channelService.findMembership(member, channel)
        if (!member || !channel)
            return {success: false, error: "ressources not found"}
        // when someone create a channel i make an owner membership for him right away
        // this condition prevent creating a new membership for the owner
        if (membership && membership.role !== 'owner')
            return {success: false, error: "already a member"}
        if (channel.type === 'protected') {
            if (!await bcrypt.compare(password, channel.password))
                return {success: false, error: "wrong password"}
        }
        await this.channelService.createMembership(member, channel, Channel_Member_Role.MEMBER)
        return {success: true, channelName: channel.name}
    }

    async leaveChannel(userId: number, channelId: number) {
        const member: UserDto = await this.userService.findUser(userId)
        const channel: ChannelDto = await this.channelService.findOneChannel(channelId)
        const membership: MembershipDto = await this.channelService.findMembership(member, channel)

        if (!member || !channel || !membership)
            throw new WsException("ressource not found")

        await this.channelService.deleteMembership(member, channel)

        if (membership.role === 'owner')
            await this.channelService.changeChannelOwner(channel.id)

        return channel.name
    }

    async sendMessage(userId: number, channelId: number, msgContent: string) {
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

    async sendDirectMessage(userId: number, receiverId: number, content: string) {
        const author: UserDto = await this.userService.findUser(userId)
        const receiver: UserDto = await this.userService.findUser(receiverId)

        if (!author || !receiver)
            return {success: false, error: "ressources not found" }
        
        const message: DirectMessageDto = await this.messageService.saveDirectMessage(
            author,
            receiver,
            content
        )

        return { success: true, message }
    }
}