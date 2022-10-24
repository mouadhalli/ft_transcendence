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
import { Socket } from 'socket.io'

 
@Injectable()
export class ChatService {

    constructor(
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
				throw new WsException('ressources not found')
        if (membership) {
            if (membership.role === 'owner')
                return channel.name
			throw new WsException('already a member')
        }
        if (channel.type === 'private')
			throw new WsException("you can't join a private channel")
        if (channel.type === 'protected') {
            if (!password)
			    throw new WsException('password is required')
            if (!await bcrypt.compare(password, channel.password))
			    throw new WsException('incorrect password')
        }
        await this.channelService.createMembership(member, channel, Channel_Member_Role.MEMBER)
    }

    async leaveChannel(userId: number, channelId: string) {
        const member: UserDto = await this.userService.findUser(userId)
        const channel: ChannelDto = await this.channelService.findOneChannel(channelId)
        const membership: MembershipDto = await this.channelService.findMembership(member, channel)

        if (!member || !channel || !membership)
			throw new WsException('ressource not found')

        await this.channelService.deleteMembership(member, channel)

        if (membership.role === 'owner')
            await this.channelService.changeChannelOwner(channel.id)

    }

    async sendMessage(userId: number, channelId: string, msgContent: string) {
        const author: UserDto = await this.userService.findUser(userId)
        const channel: ChannelDto = await this.channelService.findOneChannel(channelId)
        const membership: MembershipDto = await this.channelService.findMembership(author, channel)

        if (!author || !channel)
			throw new WsException('ressources not found')

        if (!membership)
            return { success: false, error: "you are kicked from this channel", channelName: channel.name }

        if (membership.state !== 'active') {
            const time = membership.restricitonEnd.getTime() - Date.now()
            if (time > 0)
                return {success: false, cause: membership.state , error : (membership.state + ' for ' + String(Math.floor(time / 1000)) + ' seconds')}
            this.channelService.removeRestrictionOnChannelMember(channelId, userId)
        }

        const message: MessageDto = await this.messageService.saveMessage(
            author,
            channel,
            msgContent
        )

        return {success: true, message}

    }

    async sendDirectMessage(userId: number, channelId: string, content: string) {
        const author: UserDto = await this.userService.findUser(userId)
        const channel = await this.channelService.findDmChannel(channelId)

        
        if (!author || !channel)
            throw new WsException('ressources not found')
        
        const { relationship } = channel

        const receiver = userId === relationship.sender.id ? relationship.receiver :
                                relationship.sender     

        if (!relationship || relationship.state !== 'friends')
			throw new WsException(`you can't send a message to ${receiver.displayName}`)

        const message = await this.messageService.saveDirectMessage(
            author,
            channel.id,
            content
        )

        return message
    }

    async filterRoomMembers(roomSockets: any[], senderId: number, channelId: string) {

        for (let i = 0; i < roomSockets.length; i++) {
            const memberToken = String(roomSockets[i].handshake.headers?.token)
            const { id: memberId } = await this.connectionService.getUserFromToken(memberToken)

            if (!memberId || memberId === senderId)
                continue

            const isBlockingMe = await this.userService.isUserBlockingMe(senderId, memberId)
            const membership = await this.channelService.findMembershipByIds(memberId, channelId)
    
            if ( membership && membership.state === 'banned') {
                const time = membership.restricitonEnd.getTime() - Date.now()
                console.log(memberId, "banned for: ", time)
                if (time > 0) {
                    roomSockets[i].join('exceptionRoom')
                    continue
                }
                this.channelService.removeRestrictionOnChannelMember(channelId, memberId)
            }
    
            if (isBlockingMe === true) {
                roomSockets[i].join('exceptionRoom')
            }
        }        
    }

}