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
import { Relationship_State } from "src/user/entities/relationship.entity";

@Injectable()
export class ChannelService {

    constructor(
        @InjectRepository(ChannelEntity)
            private channelRepository: Repository<ChannelEntity>,
        @InjectRepository(ChannelMembershipEntity)
            private membershipsRepository: Repository<ChannelMembershipEntity>,
        private userService: UserService
    ) {}

    async addUserToChannel(user: UserDto, targetId: number, channelId: number) {

        const channel: ChannelDto = await this.findOneChannel(channelId)
        if (!channel)
            throw new BadRequestException('channel not found')
        
        if (channel.type === 'direct')
            throw new BadRequestException('cannot add members to a direct channel')

        if (!await this.findMembership(user, channel))
            throw new BadRequestException(`${user.displayName} is not a member of this channel`)

        const target: UserEntity = await this.userService.findUser(targetId)
        if (!target)
            throw new BadRequestException('target not found')
        
        const isFriends: Relationship_State = (await this.userService.findRelationship(user.id, targetId)).state
        if (isFriends !== 'friends')
            throw new BadRequestException('user can only add his friends to channel')

        if (await this.findMembership(target, channel))
            throw new BadRequestException(`${target.displayName} is already a member of this channel`)

        await this.createMembership(target, channel, Channel_Member_Role.MEMBER)

    }

    async createChannel(creator: UserDto, data: ChannelDto) {
        try {

            if (await this.channelRepository.findOneBy({name: data.name}))
                throw new BadRequestException("channel name already in use")
            
            
            let newChannel: ChannelEntity = this.channelRepository.create({
                name: data.name,
                type: data.type
            })

            if (data.type === 'protected') {
                if (!data.password)
                    throw new BadRequestException("protected channels require a password")
                newChannel.password = await bcrypt.hash(data.password, 10)
            }

            newChannel = await this.channelRepository.save(newChannel)
    
            await this.createMembership(creator, newChannel, Channel_Member_Role.OWNER)
            return newChannel.id

        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async findOneChannel(channelId: number): Promise<ChannelEntity> {
        try{
            return await this.channelRepository.findOne({
                where: {id: channelId}
            })
        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async turnChannelPrivate(channelId: number): Promise<ChannelEntity> {
        try{
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
    
    async findChannelMembers(channelId: number) {
        
        const members =  await this.membershipsRepository.find({
            relations: ['member'],
            where: {
                channel: {id: channelId}
            },
            select: {
                role: true,
                member: {id: true, displayName: true}
            }
        })

        return members

    }

    async findAllPublic(): Promise<ChannelEntity[]> {
        return await this.channelRepository.find({
            where: {
                type: Channel_Type.PUBLIC
            },
        })
    }

    async findAllProtected(): Promise<ChannelEntity[]> {
        return await this.channelRepository.find({
            where: {
                type: Channel_Type.PROTECTED
            },
        })
    }

    async findJoinedChannels(userId: number): Promise<ChannelEntity[]> {

        return await this.channelRepository.find({
            where: {
                members: {
                    member: {id: userId},
                    state: Not(Channel_Member_State.BANNED)
                },
            },
        })
    }

    async findPrivateAndProtectedChannels() {
        return await this.channelRepository.find({
            where: [
                {type: Channel_Type.PUBLIC},
                {type: Channel_Type.PROTECTED},
            ]
        })
    }

    async findNonJoinedChannels(userId: number) {

        const joinedChannels = await this.findJoinedChannels(userId)
        
        const Allchannels = await this.findPrivateAndProtectedChannels()

        return Allchannels.filter(channel => {
            const isJoined = joinedChannels.findIndex((Joinedchannel) => Joinedchannel.id === channel.id)
            if (isJoined === -1)
                return channel
            return false
        })

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
        member_role: Channel_Member_Role
    ) {
        try {
            await this.membershipsRepository.save({
                member: user,
                channel: channel,
                role: member_role
            })

            return await this.channelRepository.increment(
                {id: channel.id},
                "membersCount",
                1
            )

        } catch (error) {
            throw new WsException("internal server error")
        }
    }

    async deleteMembership(member: UserDto, channel: ChannelDto) {
        let membership: ChannelMembershipEntity = await this.findMembership(
            member,
            channel
        )

        if (!membership)
            throw new BadRequestException('membership not found')

        await this.membershipsRepository.remove(membership)
        return await this.channelRepository.decrement(
            {id: channel.id},
            "membersCount",
            1
        )
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

    async changeMembershipState(channelId: number, memberId: number, state: Channel_Member_State) {
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

    async removeMemberFromChannel(channelId: number, memberId: number) {
        const membership: ChannelMembershipEntity = await this.membershipsRepository.findOne({
            where: {
                member: {id: memberId},
                channel: {id: channelId}
            }
        })

        if (!membership)
            return

        if (membership.role === 'owner')
            throw new ForbiddenException('cannot remove channel owner')
        
        await this.membershipsRepository.remove(membership)
        await this.channelRepository.decrement(
            {id: channelId},
            "membersCount",
            1
        )
    }

    async findUserChannelRole(userId: number, channelId: number) {
        const user: UserDto = await this.userService.findUser(userId)
    
        if (!user)
            throw new BadRequestException('user not found')
        
        const channel: ChannelDto = await this.findOneChannel(channelId)
    
        if (!channel)
            throw new BadRequestException('channel not found')

        const membership: MembershipDto = await this.findMembership(user, channel)
        if (!membership)
            throw new BadRequestException('user is not a member of this channel')
        
        return membership.role
    }

}