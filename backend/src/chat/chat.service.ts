import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { ChannelService } from './channel/channel.service';
import { GatewayConnectionService } from 'src/connection.service';
import { MessageService } from './message/message.service';
import { UserService } from 'src/user/user.service';
import { Channel_Member_Role } from './entities/channelMember.entity';
import * as bcrypt from "bcryptjs";
import { ChannelDto, MembershipDto } from './dtos/channel.dto';
import { UserDto } from 'src/dto/User.dto';
import { MessageDto } from './dtos/message.dto';
import { Message_Type } from './entities/directMessage.entity';

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
        if (!member)
			throw new WsException("couldn't find user")

        const channel: ChannelDto = await this.channelService.findChannelWithPassword(channelId)
        if (!channel)
			throw new WsException("couldn't find channel")

        let membership: MembershipDto = await this.channelService.findMembership(member, channel)

        if (membership && membership.isJoined)
            throw new WsException('you are already a member of this channel')

        if (!membership || ( membership && membership.role !== 'owner')) {
            console.log('taba9 3lih');
            
            if (channel.type === 'private')
                throw new WsException("you can't join a private channel")
            if (channel.type === 'protected') {
                if (!password)
			        throw new WsException('password is required')
                if (!await bcrypt.compare(password, channel.password))
			        throw new WsException('incorrect password')
            }
        }

        if (membership) {
            if (membership.state === 'banned') {
                const time = membership.restricitonEnd.getTime() - Date.now()
                if (time > 0)
                    throw new WsException(membership.state + ' for ' + String(Math.floor(time / 1000)) + ' seconds')
                this.channelService.removeRestrictionOnChannelMember(channelId, userId)
            }
        }
        else
            membership = await this.channelService.createMembership(member, channel, Channel_Member_Role.MEMBER)

        await this.channelService.updateMembershipJoinState(membership, true);
        await this.channelService.incrementChannelMembersCounter(channel.id)
    }

    async leaveChannel(userId: number, channelId: string) {
        const member: UserDto = await this.userService.findUser(userId)
        if (!member)
			throw new WsException("couldn't find user")

        const channel: ChannelDto = await this.channelService.findOneChannel(channelId)
        if (!channel)
            throw new WsException("couldn't find channel")

        const membership: MembershipDto = await this.channelService.findMembership(member, channel)

        if (!membership || !membership.isJoined)
            throw new WsException("you are not a member of this channel")

        if (membership.role !== 'member') {  
            if (membership.role === 'owner')
                await this.channelService.findNewOwner(channel.id)
            await this.channelService.updateMembershipRole(membership, Channel_Member_Role.MEMBER)
        }
        await this.channelService.updateMembershipJoinState(membership, false)
        await this.channelService.decrementChannelMembersCounter(channel.id)
    }

    async sendMessage(userId: number, channelId: string, msgContent: string) {
        const author: UserDto = await this.userService.findUser(userId)
        if (!author)
        throw new WsException("couldn't find user")

        const channel: ChannelDto = await this.channelService.findOneChannel(channelId)
        if (!channel)
            throw new WsException("couldn't find channel")
        const membership: MembershipDto = await this.channelService.findMembership(author, channel)

        if (!membership || !membership.isJoined)
			throw new WsException('you are not a member of this channel')

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

    async sendDirectMessage(
        userId: number,
        channelId: string,
        content: string,
        msgType: Message_Type
    ) {
        const author: UserDto = await this.userService.findUser(userId)
        if (!author)
            throw new WsException("couldn't find user")
        const channel = await this.channelService.findDmChannel(channelId)
        
        if (!channel)
            throw new WsException("couldn't find dm channel")
        
        const { relationship } = channel

        const receiver = userId === relationship.sender.id ? relationship.receiver :
                                relationship.sender     

        if (!relationship || relationship.state !== 'friends')
			throw new WsException(`you can't send a message to ${receiver.displayName}`)

        const message = await this.messageService.saveDirectMessage(
            author,
            channel.id,
            content,
            msgType
        )

        return message
    }

    async filterRoomMembers(roomSockets: any[], senderId: number, channelId: string) {

        for (let i = 0; i < roomSockets.length; i++) {
            const memberToken = String(roomSockets[i].handshake.headers?.token)
            const { id: memberId } = await this.connectionService.getUserFromToken(memberToken)

            if (!memberId || memberId === senderId)
                continue

            const membership = await this.channelService.findMembershipByIds(memberId, channelId)

            if (!membership)
                continue
                
            if (!membership.isJoined) {
                roomSockets[i].leave(channelId)
                continue
            }

            if ( membership && membership.state === 'banned') {
                const time = membership.restricitonEnd.getTime() - Date.now()
                if (time > 0) {
                    roomSockets[i].leave(channelId)
                    continue
                }
                this.channelService.removeRestrictionOnChannelMember(channelId, memberId)
            }
    
            const isBlockingMe = await this.userService.isUserBlockingMe(senderId, memberId)

            if (isBlockingMe) {
                roomSockets[i].join('exceptionRoom')
            }
        }        
    }

    async addUserToChannel(userId: number, targetId: number, channelId: string) {
        try {
            if (userId === targetId)
                throw new BadRequestException('invalid id')
            await this.channelService.addUserToChannel(userId, targetId, channelId)
        } catch (error) {
            throw new WsException(error.message)
        }
    }

}