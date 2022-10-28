import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { ChannelEntity, Channel_Type } from "../entities/channel.entity"
import { ChannelMembershipEntity, Channel_Member_Role, Channel_Member_State } from "../entities/channelMember.entity";
import { ChannelDto, directChannelDto, MembershipDto, UpdateChannelDto } from "../dtos/channel.dto";
import { MessageService } from "../message/message.service"
import * as bcrypt from "bcryptjs";
import { UserService } from "src/user/user.service";
import { UserEntity } from "src/user/entities/user.entity";
import { WsException } from "@nestjs/websockets";
import { UserDto } from "src/dto/User.dto";
import { RelationshipEntity, Relationship_State } from "src/user/entities/relationship.entity";
import { DirectChannelEntity } from "../entities/directChannel.entity";

@Injectable()
export class ChannelService {

    constructor(
        @InjectRepository(ChannelEntity)
            private channelRepository: Repository<ChannelEntity>,
        @InjectRepository(DirectChannelEntity)
            private dmRepository: Repository<DirectChannelEntity>,
        @InjectRepository(ChannelMembershipEntity)
            private membershipsRepository: Repository<ChannelMembershipEntity>,
        private userService: UserService
    ) {}

    async addUserToChannel(user: UserDto, targetId: number, channelId: string) {

        const channel: ChannelDto = await this.findOneChannel(channelId)
        if (!channel)
            throw new BadRequestException('channel not found')

        if (!await this.findMembership(user, channel))
            throw new BadRequestException(`${user.displayName} is not a member of this channel`)

        const target: UserEntity = await this.userService.findUser(targetId)
        if (!target)
            throw new BadRequestException('target not found')
        
        const isFriends: Relationship_State = (await this.userService.findRelationship(user.id, targetId)).state
        if (isFriends !== 'friends')
            throw new BadRequestException(`${target.displayName} is not on your friends list`)

        const targetMembership = await this.findMembership(target, channel)

        if (targetMembership) {
            if (targetMembership.isJoined)
                throw new BadRequestException(`${target.displayName} is already a member of this channel`)
            if (targetMembership.state === 'banned') {
                const time = targetMembership.restricitonEnd.getTime() - Date.now()
                if (time > 0)
                    throw new ForbiddenException(
                        `${target.displayName} is banned for + ${String(Math.floor(time / 1000))} seconds`
                    )
                this.removeRestrictionOnChannelMember(channelId, targetId)
            }
            await this.updateMembershipJoinState(targetMembership, true)
        }
        else
            await this.createMembership(target, channel, Channel_Member_Role.MEMBER)
        await this.incrementChannelMembersCounter(channelId)

    }

    async createChannel(creator: UserDto, data: ChannelDto) {

        if (await this.channelRepository.findOneBy({name: data.name}))
            throw new BadRequestException("channel name already in use")
            
        let newChannel: ChannelEntity = this.channelRepository.create({
            name: data.name,
            type: data.type,
        })

        if (data.type === 'protected') {
            if (!data.password)
                throw new BadRequestException("protected channels require a password")
            newChannel.password = await bcrypt.hash(data.password, 10)
        }

        newChannel = await this.channelRepository.save(newChannel).catch(error => {
            console.log('nari')
            throw new InternalServerErrorException(error)
        })
    
        await this.createMembership(creator, newChannel, Channel_Member_Role.OWNER)
        return newChannel.id
    }

    async findOneChannel(channelId: string): Promise<ChannelEntity> {
        try{
            return await this.channelRepository.findOne({
                where: {id: channelId}
            })
        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async findChannelWithPassword(channelId: string): Promise<ChannelEntity> {
        try{
            return await this.channelRepository.findOne({
                select: ['id', 'name', 'imgPath', 'password', 'type', 'membersCount'],
                where: {id: channelId}
            })
        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async turnChannelPrivate(channelId: string): Promise<ChannelEntity> {
        try{
            const channel: ChannelEntity = await this.findChannelWithPassword(channelId)

            if (!channel)
                throw new BadRequestException("channel not found")
            if (channel.type === "private")
                return channel
            if (channel.type === "protected" && channel.password)
                channel.password = null
            channel.type = Channel_Type.PRIVATE
            return await this.channelRepository.save(channel)

        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async turnChannelPublic(channelId: string): Promise<ChannelEntity> {
        try{
            const channel: ChannelEntity = await this.findChannelWithPassword(channelId)

            if (!channel)
                throw new BadRequestException("channel not found")
            if (channel.type === "public")
                return channel
            channel.password = null
            channel.type = Channel_Type.PUBLIC

            return await this.channelRepository.save(channel)

        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async turnChannelProtected(channelId: string, password: string): Promise<ChannelEntity> {
        try{
            const channel: ChannelEntity = await this.findChannelWithPassword(channelId)

            if (!channel)
                throw new BadRequestException("channel not found")
            channel.password = await bcrypt.hash(password, 10);
            channel.type = Channel_Type.PROTECTED

            return await this.channelRepository.save(channel)

        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async updateChannel(channelId: string, data: UpdateChannelDto, imgPath: string) {

        if (!data)
            return

        if (data.type === 'private')
            await this.turnChannelPrivate(channelId)
        else if (data.type === 'public')
            await this.turnChannelPublic(channelId)
        else if (data.password)
            await this.turnChannelProtected(channelId, data.password)
        
        if (data.name)
            await this.channelRepository.update(channelId, {name: data.name})
        if (imgPath)
            await this.channelRepository.update(channelId, {imgPath: imgPath})
    }
    
    async findChannelMembers(channelId: string) {
        
        const members =  await this.membershipsRepository.find({
            relations: ['member'],
            where: {
                channel: {id: channelId},
                isJoined: true
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
                    isJoined: true
                },
            },
        })
    }

    async findChannelsLeftByUser(userId: number): Promise<ChannelEntity[]> {

        return await this.channelRepository.find({
            where: {
                members: {
                    member: {id: userId},
                    isJoined: false
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

    async findMembershipByIds(memberId: number, channelId: string): Promise<ChannelMembershipEntity> {
        return await this.membershipsRepository.findOne({
            where: {
                member: { id: memberId },
                channel: { id: channelId }
            }
        })
    }

    async incrementChannelMembersCounter(channelId: string) {
        await this.channelRepository.increment(
            {id: channelId},
            "membersCount",
            1
        )
    }

    async decrementChannelMembersCounter(channelId: string) {
        await this.channelRepository.decrement(
            {id: channelId},
            "membersCount",
            1
        )
    }

    async createMembership (
        user: UserDto,
        channel: ChannelDto,
        member_role: Channel_Member_Role
    ) {
        return await this.membershipsRepository.save({
            member: user,
            channel: channel,
            role: member_role,
        }).catch(error => {
            throw new InternalServerErrorException(error)
        })
    }

    async saveMembership(membership: MembershipDto) {
        await this.membershipsRepository.save(membership).catch(error => {
            throw new InternalServerErrorException(error)
        })
    }

    // async deleteMembership(member: UserDto, channel: ChannelDto) {
    //     let membership: ChannelMembershipEntity = await this.findMembership(
    //         member,
    //         channel
    //     )

    //     if (!membership)
    //         throw new BadRequestException('membership not found')

    //     await this.membershipsRepository.remove(membership)
    //     return await this.channelRepository.decrement(
    //         {id: channel.id},
    //         "membersCount",
    //         1
    //     )
    // }

    async findChannelAdminMembership(channelId: string): Promise<ChannelMembershipEntity> {
        return await this.membershipsRepository.findOne({
            where: {
                channel: {id: channelId},
                role: Channel_Member_Role.ADMIN
            },
        })
    }

    async deleteChannel(channelId: string) {
        try{
            const channel: ChannelEntity = await this.findOneChannel(channelId)
            if (!channel)
                throw new BadRequestException("channel not found")
            return await this.channelRepository.remove(channel)
        } catch (error) {
            throw new InternalServerErrorException(error)
        }
    }

    async findNewOwner(channelId: string) {
        let adminMembership: ChannelMembershipEntity = await this.findChannelAdminMembership(channelId)

        if (adminMembership)
            return await this.updateMembershipRole(adminMembership, Channel_Member_Role.OWNER)

        let randomMembership: MembershipDto = await this.membershipsRepository.findOne({
            relations: {member: true},
            where: {
                channel: {id: channelId},
                role: Channel_Member_Role.MEMBER,
                state: Channel_Member_State.ACTIVE,
                isJoined: true
            },
            select: {member: {id: true}}
        })

        if (randomMembership)
            return await this.updateMembershipRole(randomMembership, Channel_Member_Role.OWNER)

        await this.deleteChannel(channelId)
    }

    async changeMembershipRole(memberId: number, channelId: string, role: Channel_Member_Role) {
        const membership: MembershipDto = await this.membershipsRepository.findOne({
            where: {
                member: {id: memberId},
                channel: {id: channelId},
                isJoined: true
            }
        })

        if (!membership)
            throw new BadRequestException('user is not a member of this channel')
        
        membership.role = role
        return await this.membershipsRepository.save(membership)
    }

    async changeMembershipState(channelId: string, memberId: number, state: Channel_Member_State) {
        const membership: MembershipDto = await this.membershipsRepository.findOne({
            where: {
                member: {id: memberId},
                channel: {id: channelId},
                isJoined: true
            }
        })

        if (!membership)
            throw new BadRequestException('user is not member of this channel')
        
        if (membership.role === 'owner')
            throw new ForbiddenException('cannot change owner state')
        
        membership.state = state
        return await this.membershipsRepository.save(membership)
    }

    async removeMemberFromChannel(channelId: string, memberId: number) {
        const membership: ChannelMembershipEntity = await this.membershipsRepository.findOne({
            where: {
                member: {id: memberId},
                channel: {id: channelId},
                isJoined: true
            }
        })

        if (!membership)
            throw new BadRequestException('user is not member of this channel') 

        if (membership.role === 'owner')
            throw new ForbiddenException('cannot remove channel owner')
        
        membership.isJoined = false
        
        await this.saveMembership(membership)
        await this.decrementChannelMembersCounter(channelId)
    }

    async findUserChannelRole(userId: number, channelId: string) {
        const user: UserDto = await this.userService.findUser(userId)
    
        if (!user)
            throw new BadRequestException('user not found')
        
        const channel: ChannelDto = await this.findOneChannel(channelId)
        if (!channel)
            throw new BadRequestException('channel not found')

        const membership: MembershipDto = await this.findMembership(user, channel)
        if (!membership || !membership.isJoined)
            throw new BadRequestException('user is not a member of this channel')
        
        return membership.role
    }

    async removeRestrictionOnChannelMember(channelId: string, memberId: number) {
        const membership: MembershipDto = await this.membershipsRepository.findOne({
            where: {
                channel: { id: channelId },
                member: { id: memberId }
            }
        })

        if (!membership)
            throw new BadRequestException("couldn't find membership")
        if (membership.state === 'active')
            throw new BadRequestException("member is not restricted")
        
        membership.restricitonEnd = null
        membership.state = Channel_Member_State.ACTIVE

        await this.saveMembership(membership)
    }

    async restrictChannelMember(
        channelId: string,
        memberId: number,
        time: number,
        type: Channel_Member_State
    ) {
        const membership: MembershipDto = await this.membershipsRepository.findOne({
            where: {
                channel: { id: channelId },
                member: { id: memberId }
            }
        })

        if (!time || !type || type === 'active')
            return

        if (!membership || !membership.isJoined)
            throw new BadRequestException("user is not a member of this channel")
        
        if (type === 'muted' && membership.state === 'banned')
            throw new BadRequestException('user is banned')
        
        if (membership.role !== 'member')
            throw new ForbiddenException('only a member can be restricted')
        
        const now = new Date()
        membership.restricitonEnd = new Date()
        membership.restricitonEnd.setMilliseconds(now.getMilliseconds() + time)

        membership.state = type

        this.membershipsRepository.save(membership).catch((error) => {
            throw new InternalServerErrorException(error)
        })
    }

    async deleteAllChannels() {
        const allChannels = await this.channelRepository.find()
        allChannels.forEach( async (channel) => {
            await this.channelRepository.remove(channel)
        } )
    }

    async createDmChannel(userA: number, userB: number) {

        const friendship = await this.userService.findRelationship(userA, userB)

        // if (!friendship || friendship.state === 'pending')
        //     throw new BadRequestException('users are not friends')
        const dm = this.dmRepository.create({
            relationship: friendship
        })

        return await this.dmRepository.save(dm)
        .catch(error => {throw new InternalServerErrorException(error)})
    }

    async findDmChannel(channelId: string) {
        return await this.dmRepository.findOne({
            relations: {
                relationship: { sender: true, receiver: true }
            },
            where: {id: channelId}
        })
    }

    async findUserDmChannels(userId: number) {
        const dms: DirectChannelEntity[] = await this.dmRepository.find({
            relations: {
                relationship: { sender: true, receiver: true }
            },
            where: [
                { relationship: { sender: { id: userId }, state: Relationship_State.FRIENDS } },
                { relationship: { receiver: { id: userId }, state: Relationship_State.FRIENDS } }
            ]
        })

        return dms.map(dm => {
            const { id, relationship} = dm

            if (relationship.sender.id === userId)
                return { id, friend: relationship.receiver }
            return { id, friend: relationship.sender }
        })

    }

    async findUserDmchannel(userId: number, channelId: string) {
        return await this.dmRepository.findOne({
            where: [
                {id: channelId, relationship: { sender: { id: userId }}},
                {id: channelId, relationship: { receiver: { id: userId }}}
            ]
        })
    }

    async findDmchannelByMembers(memberA: number, memberB: number) {
        return await this.dmRepository.findOne({
            where: [
                { relationship: { sender: {id: memberA}, receiver: {id: memberB} }},
                { relationship: { sender: {id: memberB}, receiver: {id: memberA} }},
            ]
        })
    }

    async deleteDmChannel(memberA: number, memberB: number) {

        if (!await this.userService.findUser(memberB))
			throw new WsException('user not found')

        const relationship: RelationshipEntity = await this.userService.findRelationship(memberA, memberB)
        if (!relationship)
			throw new WsException('relationship not found')

        const dmChannel: DirectChannelEntity = await this.findDmchannelByMembers(memberA, memberB)
        if (!dmChannel)
			throw new WsException('dm channel not found')
    
        await this.dmRepository.remove(dmChannel)
        await this.userService.removeRelationShip(relationship)
    }

    async updateMembershipJoinState(membership: MembershipDto, join: boolean) {
        membership.isJoined = join
        await this.saveMembership(membership)
    }

    async updateMembershipRole(membership: MembershipDto, newRole: Channel_Member_Role) {
        membership.role = newRole
        await this.saveMembership(membership)
    }

}