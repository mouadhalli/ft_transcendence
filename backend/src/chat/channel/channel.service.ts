import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { ChannelEntity, Channel_Type } from "../entities/channel.entity"
import { ChannelMembershipEntity, Channel_Member_State } from "../entities/channelMember.entity";
import { ChannelDto } from "./channel.dto";
// import { UserService } from "src/user/user.service";
import { MessageService } from "../message/message.service"
import * as bcrypt from "bcryptjs";

@Injectable()
export class ChannelService {

    constructor(
        @InjectRepository(ChannelEntity)
            private channelRepository: Repository<ChannelEntity>,
        @InjectRepository(ChannelMembershipEntity)
            private channelMemberRepository: Repository<ChannelMembershipEntity>,
        // private userService: UserService
        // private messageService: MessageService
    ) {}

    async test() {
        return this.channelRepository.find({
            
        })
    }

    async createChannel(creator_it: number, data: ChannelDto): Promise<ChannelEntity>  {
        try {
            const newChannel: ChannelEntity = this.channelRepository.create({
                name: data.name,
                type: data.type,
            })

            if (newChannel.type === "protected" && data.password)
                newChannel.password = await bcrypt.hash(data.password, 10)
            if (data.img_path)
                newChannel.img_path = data.img_path

            // TO DO: - create an owner membership for the creator
            return await this.channelRepository.save(newChannel)

        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async findOneChannel(channel_id: number): Promise<ChannelEntity> {
        try{
            return await this.channelRepository.findOneBy({id: channel_id})
        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async findAllChannels(): Promise<ChannelEntity[]> {
        try{
            return await this.channelRepository.find()
        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async deleteChannel(channel_id: number): Promise<ChannelEntity> {
        try{
            // TO DO: - only the owner is allowed to delete his channel
            const channel: ChannelEntity = await this.findOneChannel(channel_id)
            return await this.channelRepository.remove(channel)
        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async turnChannelPrivate(channel_id: number): Promise<ChannelEntity> {
        try{

            // TO DO: - only an admin or an owner is allowed to change channel type

            const channel: ChannelEntity = await this.findOneChannel(channel_id)

            if (!channel)
                throw new BadRequestException("channel not found")
            if (channel.type === "private" || channel.type === "direct")
                return channel
            if (channel.type === "protected" && channel.password)
                channel.password = null
            channel.type = Channel_Type.PRIVATE
            return await this.channelRepository.save(channel)

        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async turnChannelPublic(channel_id: number): Promise<ChannelEntity> {
        try{
            // TO DO: - only an admin or an owner is allowed to change channel type

            const channel: ChannelEntity = await this.findOneChannel(channel_id)

            if (!channel)
                throw new BadRequestException("channel not found")
            if (channel.type === "public" || channel.type === "direct")
                return channel
            channel.password = null
            channel.type = Channel_Type.PUBLIC

            return await this.channelRepository.save(channel)

        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async turnChannelProtected(channel_id: number, password: string): Promise<ChannelEntity> {
        try{
            // TO DO: - only an admin or an owner is allowed to change channel type

            const channel: ChannelEntity = await this.findOneChannel(channel_id)

            if (!channel)
                throw new BadRequestException("channel not found")
            if (channel.type === "protected" || channel.type === "direct")
                return channel
    
            channel.password = await bcrypt.hash(password, 10);
            channel.type = Channel_Type.PROTECTED

            return await this.channelRepository.save(channel)

        } catch (error) {
            throw new InternalServerErrorException(error)
        }

    }
    
    async findChannelMembers(channel_id: number): Promise<ChannelMembershipEntity[]> {

        // TO DO: filter current user blocked users from channel memberships

        if (!await this.findOneChannel(channel_id))
            throw new BadRequestException("channel not found")
        
        return await this.channelMemberRepository.find({
            where: {
                channel: {id: channel_id}
            },
            // select: //maybe ?
        })
    }

    async findAllPublic() {
        return await this.channelRepository.find({
            where: {
                type: Channel_Type.PUBLIC
            },
            // select: //maybe ?
        })
    }

    async findAllProtected() {
        return await this.channelRepository.find({
            where: {
                type: Channel_Type.PROTECTED
            },
            // select: //maybe ?
        })
    }

    async findJoinedChannels(user_id: number) {
        // return await this.channelMemberRepository.find({
        //     relations: ['channel'],
        //     where: {
        //         member: {id: user_id},
        //         state: Not(Channel_Member_State.BANNED)
        //     },
        //     select: ['channel']
        // })

        // alternative way

        return await this.channelRepository.find({
            where: {
                members: {
                    id: user_id,
                    state: Not(Channel_Member_State.BANNED)
                },
            },
        })
    }

    async findNonJoinedChannels(user_id: number) {

        // return await this.channelRepository.find({
        //     where: {
        //         members: {
        //             id: Not(user_id),
        //         },
        //     },
        // })

        // alternative way

        return await this.channelMemberRepository.find({
            relations: ['channel'],
            where: {
                member: {id: Not(user_id)}
            },
            select: ['channel']
        })
    }
}