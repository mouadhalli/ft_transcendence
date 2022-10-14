import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { WsException } from "@nestjs/websockets";
import { UserDto } from "src/dto/User.dto";
import { UserService } from "src/user/user.service";
import { Repository } from "typeorm";
import { ChannelDto, MembershipDto } from "../channel/channel.dto";
import { ChannelService } from "../channel/channel.service";
import { ChannelEntity } from "../entities/channel.entity";
import { MessageEntity } from "../entities/message.entity";
import { MessageDto } from "./message.dto";

@Injectable()
export class MessageService {

    constructor(
        @InjectRepository(MessageEntity)
            private messageRepository: Repository<MessageEntity>,
        private channelService: ChannelService,
        private userService: UserService
    ) {}

    async findChannelMessages(user: UserDto, channelId: number): Promise<MessageEntity[]> {
    
        const channel: ChannelEntity = await this.channelService.findOneChannel(channelId)

        if (!channel)
            throw new BadRequestException('channel not found')

        const userMembership: MembershipDto = await this.channelService.findMembership(user, channel)

        if (!userMembership)
            throw new BadRequestException('user is not a member of this channel')
        
        if (userMembership.state === 'banned')
            throw new ForbiddenException('user is banned from this channel')
        
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

    async saveMessage(author: UserDto, channel: ChannelDto, content: string): Promise<MessageEntity> {
        try {

            // const message: MessageEntity = this.messageRepository.create({
            //     content: content,
            //     author: author,
            //     channel: channel
            // })

            return await this.messageRepository.save({
                content: content,
                author: author,
                channel: channel
            })

        } catch(error) {
            throw new WsException("internal server error")
        }
    }
}