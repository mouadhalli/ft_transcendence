import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { ChannelEntity, Channel_Type } from "../entities/channel.entity"
import { ChannelMembershipEntity, Channel_Member_Role, Channel_Member_State } from "../entities/channelMember.entity";
import { ChannelDto, MembershipDto, UpdateChannelDto } from "./channel.dto";
// import { UserService } from "src/user/user.service";
import { MessageService } from "../message/message.service"
import * as bcrypt from "bcryptjs";
import { UserService } from "src/user/user.service";
import { UserEntity } from "src/user/entities/user.entity";
import { WsException } from "@nestjs/websockets";
import { UserDto } from "src/dto/User.dto";

@Injectable()
export class ChannelService {

    constructor(
        @InjectRepository(ChannelEntity)
            private channelRepository: Repository<ChannelEntity>,
        @InjectRepository(ChannelMembershipEntity)
            private membershipsRepository: Repository<ChannelMembershipEntity>,
        private userService: UserService
        // private messageService: MessageService
    ) {}

/*
    TO DO:
        - Protect async operations from failing
        - make a new file(memberships.service) for ChannelMembershipEntity operations      
        
*/

    async createChannel(creator: UserDto, data: ChannelDto) {
        try {
            let newChannel: ChannelEntity = this.channelRepository.create({
                name: data.name,
                type: data.type,
            })

            if (newChannel.type === "protected" && data.password)
                newChannel.password = await bcrypt.hash(data.password, 10)
            // if (data.imgPath)
            //     newChannel.imgPath = data.imgPath

            newChannel = await this.channelRepository.save(newChannel)
            return await this.membershipsRepository.save({
                member: creator,
                channel: newChannel,
                role: Channel_Member_Role.OWNER
            })

        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async findOneChannel(channelId: number): Promise<ChannelEntity> {
        try{
            // return await this.channelRepository.findOneBy({id: channelId})
            return await this.channelRepository.findOne({
                relations: ['members'],
                where: {id: channelId}
            })
        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async findAllChannels(index: number, amount: number): Promise<ChannelEntity[]> {
        const skip: number = index | 0
		const take : number = amount | 10
        try{
            return await this.channelRepository.find({
                where: [
                    {type: Channel_Type.PUBLIC},
                    {type: Channel_Type.PROTECTED},
                ],
                skip: skip,
                take: take
            })
        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async turnChannelPrivate(channelId: number): Promise<ChannelEntity> {
        try{

            // TO DO: - only an admin or an owner is allowed to change channel type

            const channel: ChannelEntity = await this.findOneChannel(channelId)

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

    async turnChannelPublic(channelId: number): Promise<ChannelEntity> {
        try{
            // TO DO: - only an admin or an owner is allowed to change channel type

            const channel: ChannelEntity = await this.findOneChannel(channelId)

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

    async turnChannelProtected(channelId: number, password: string): Promise<ChannelEntity> {
        try{
            // TO DO: - only an admin or an owner is allowed to change channel type

            const channel: ChannelEntity = await this.findOneChannel(channelId)

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

    async updateChannel(channelId: number, data: UpdateChannelDto, imgPath: string) {

        if (data.type === 'private')
            await this.turnChannelPrivate(channelId)
        else if (data.type === 'protected' && data.password)
            await this.turnChannelProtected(channelId, data.password)
        else if (data.type === 'public')
            await this.turnChannelPublic(channelId)
        
        if (data.name)
            await this.channelRepository.update(channelId, {name: data.name})
        if (imgPath)
            await this.channelRepository.update(channelId, {imgPath: imgPath})
    }
    
    async findChannelMembers(channelId: number): Promise<ChannelMembershipEntity[]> {

        // TO DO: filter current user blocked users from channel memberships

        if (!await this.findOneChannel(channelId))
            throw new BadRequestException("channel not found")
        
        return await this.membershipsRepository.find({
            where: {
                channel: {id: channelId}
            },
            // select: //maybe ?
        })
    }

    async findAllPublic(): Promise<ChannelEntity[]> {
        return await this.channelRepository.find({
            where: {
                type: Channel_Type.PUBLIC
            },
            // select: //maybe ?
        })
    }

    async findAllProtected(): Promise<ChannelEntity[]> {
        return await this.channelRepository.find({
            where: {
                type: Channel_Type.PROTECTED
            },
            // select: //maybe ?
        })
    }

    async findJoinedChannels(userId: number): Promise<ChannelEntity[]> {
        // return await this.membershipsRepository.find({
        //     relations: ['channel'],
        //     where: {
        //         member: {id: userId},
        //         state: Not(Channel_Member_State.BANNED)
        //     },
        //     select: ['channel']
        // })

        // alternative way

        return await this.channelRepository.find({
            where: {
                members: {
                    id: userId,
                    state: Not(Channel_Member_State.BANNED)
                },
            },
        })
    }

    async findNonJoinedChannels(userId: number): Promise<ChannelEntity[]> {

        return await this.channelRepository.find({
            where: {
                members: {
                    id: Not(userId),
                },
            },
        })

        // alternative way

        // return await this.membershipsRepository.find({
        //     relations: ['channel'],
        //     where: {
        //         member: {id: Not(userId)}
        //     },
        //     select: ['channel']
        // })
    }

    async findMembership(member: UserDto, channel: ChannelDto): Promise<ChannelMembershipEntity> {
        return await this.membershipsRepository.findOne({
            where: {
                member: member,
                channel: channel
            }
        })
    }

    async createMembership (
        user: UserDto,
        channel: ChannelDto,
        member_role: Channel_Member_Role ) : Promise<ChannelMembershipEntity>
        {
        try {
            return await this.membershipsRepository.save({
                member: user,
                channel: channel,
                role: member_role
            })

        } catch (error) {
            throw new WsException("internal server error")
        }
    }

    async deleteMembership(member: UserDto, channel: ChannelDto): Promise<ChannelMembershipEntity> {
        let membership: ChannelMembershipEntity = await this.findMembership(
            member,
            channel
        )

        if (!membership)
            throw new BadRequestException('membership not found')

        return await this.membershipsRepository.remove(membership)
    }

    async findChannelAdminMembership(channelId: number): Promise<ChannelMembershipEntity> {
        return await this.membershipsRepository.findOne({
            where: {
                channel: {id: channelId},
                role: Channel_Member_Role.ADMIN
            },
        })
    }

    async deleteChannel(channelId: number) {
        try{
            // TO DO: - only the owner is allowed to delete his channel
            const channel: ChannelEntity = await this.findOneChannel(channelId)

            if (!channel)
                return
            return await this.channelRepository.remove(channel)
        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async changeChannelOwner(channelId: number) {
        let adminMembership: ChannelMembershipEntity = await this.findChannelAdminMembership(channelId)

        if (!adminMembership)
            await this.deleteChannel(channelId)
        else {
            adminMembership.role = Channel_Member_Role.OWNER
            await this.membershipsRepository.save(adminMembership)
        }
    }

    async changeMembershipRole(memberId: number, channelId: number, role: Channel_Member_Role) {
        const membership: MembershipDto = await this.membershipsRepository.findOne({
            where: {
                member: {id: memberId},
                channel: {id: channelId}
            }
        })

        if (!membership)
            throw new BadRequestException('membership not found')
        
        membership.role = role
        return await this.membershipsRepository.save(membership)
    }

    async changeMembershipState(memberId: number, channelId: number, state: Channel_Member_State) {
        const membership: MembershipDto = await this.membershipsRepository.findOne({
            where: {
                member: {id: memberId},
                channel: {id: channelId}
            }
        })

        if (!membership)
            throw new BadRequestException('membership not found')
        
        if (membership.role === 'owner')
            throw new ForbiddenException('cannot change owner state')
        
        membership.state = state
        return await this.membershipsRepository.save(membership)
    }

    async removeMemberFromChannel(memberId: number, channelId: number) {
        const membership: ChannelMembershipEntity = await this.membershipsRepository.findOne({
            where: {
                member: {id: memberId},
                channel: {id: channelId}
            }
        })

        if (membership.role === 'owner')
            throw new ForbiddenException('cannot remove channel owner')
        
        return await this.membershipsRepository.remove(membership)
    }

}