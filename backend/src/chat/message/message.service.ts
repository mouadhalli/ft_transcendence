import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { WsException } from "@nestjs/websockets";
import { UserDto } from "src/dto/User.dto";
import { UserService } from "src/user/user.service";
import { Repository } from "typeorm";
import { ChannelDto, MembershipDto } from "../dtos/channel.dto";
import { ChannelService } from "../channel/channel.service";
import { ChannelEntity } from "../entities/channel.entity";
import { DirectMessageEntity, Message_Type } from "../entities/directMessage.entity";
import { MessageEntity } from "../entities/message.entity";
import { MessageDto } from "../dtos/message.dto";

@Injectable()
export class MessageService {

    constructor(
        @InjectRepository(MessageEntity)
            private messageRepository: Repository<MessageEntity>,
        @InjectRepository(DirectMessageEntity)
            private directMessageRepository: Repository<DirectMessageEntity>,
        private channelService: ChannelService,
        private userService: UserService
    ) {}

    async findChannelMessages(user: UserDto, channelId: string){
    
        const channel: ChannelEntity = await this.channelService.findOneChannel(channelId)

        if (!channel)
            throw new BadRequestException('channel not found')

        const userMembership: MembershipDto = await this.channelService.findMembership(user, channel)

        if (!userMembership || !userMembership.isJoined)
            throw new BadRequestException('user is not a member of this channel')
        
        if (userMembership.state === 'banned') {
            if (userMembership.restricitonEnd.getTime() > Date.now())
                throw new ForbiddenException(`banned from this channel for ${userMembership.restricitonEnd.getTime() - Date.now()} seconds`)
            this.channelService.removeRestrictionOnChannelMember(channelId, user.id)
        }
        
        const blockedUsers: UserDto[] = await this.userService.getBlockedUsers(user.id)

        let messages: MessageDto[] =  await this.messageRepository.find({
            relations: {author: true, channel: true},
            where: {
                channel: {id: channelId}
            },
            order: {created_at: "ASC"}
        })

        return messages.filter((message) => {
            const toHide = blockedUsers.findIndex((blockedUser) => blockedUser.id === message.author.id)
            if (toHide === -1)
                return message
            return false
        })
    }

    async saveMessage(
        author: UserDto,
        channel: ChannelDto,
        content: string,
    ): Promise<MessageEntity> {
        try {
            return await this.messageRepository.save({
                content: content,
                author: author,
                channel: channel,
            })
        } catch(error) {
            throw new WsException("internal server error")
        }
    }

    async findDirectMessages(userId: number, directChannelId: string) {
        return await this.directMessageRepository.find({
            where: [
                { channel: { id: directChannelId, relationship: { sender: {id: userId} } }},
                { channel: { id: directChannelId, relationship: { receiver: {id: userId} } }}
            ],
            relations: ['author']
        })
    }

    async saveDirectMessage(
        author: UserDto,
        channelId: string,
        content: string,
        msgType: Message_Type
    ) {
        try {
            return await this.directMessageRepository.save({
                content: content,
                author: author,
                channel: { id: channelId },
                type: msgType
            })

        } catch(error) {
            throw new WsException("internal server error")
        }
    }
}