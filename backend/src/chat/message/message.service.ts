import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { WsException } from "@nestjs/websockets";
import { UserDto } from "src/dto/User.dto";
import { Repository } from "typeorm";
import { ChannelDto } from "../channel/channel.dto";
import { ChannelService } from "../channel/channel.service";
import { ChannelEntity } from "../entities/channel.entity";
import { MessageEntity } from "../entities/message.entity";
import { MessageDto } from "./message.dto";

@Injectable()
export class MessageService {

    constructor(
        @InjectRepository(MessageEntity)
            private messageRepository: Repository<MessageEntity>,
        private channelService: ChannelService
    ) {}

    async findChannelMessages(channelId: number): Promise<MessageEntity[]> {
        // TO DO: - filter blocked users messages
    
        const channel: ChannelEntity = await this.channelService.findOneChannel(channelId)

        if (!channel)
            throw new BadRequestException('channel not found')

        // return await this.messageRepository.find({
        //     relations: ['author', 'channel'],
        //     where: {
        //         channel: channel
        //     },
        //     order: {created_at: "ASC"}
        // })
        return await this.messageRepository.find({
            relations: {author: true, channel: true},
            where: {
                channel: {id: channelId}
            },
            order: {created_at: "ASC"}
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