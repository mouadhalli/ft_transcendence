import { IsString, IsNotEmpty, IsAlphanumeric, IsOptional, IsUUID, IsEnum, MaxLength, MinLength} from 'class-validator'
import { UserDto } from 'src/dto/User.dto'
import { Channel_Type } from '../entities/channel.entity'
import { Channel_Member_Role, Channel_Member_State } from '../entities/channelMember.entity'

import {PartialType} from '@nestjs/mapped-types'
import { RelationshipEntity } from 'src/user/entities/relationship.entity'


export class ChannelDto {

    id: string

    @IsNotEmpty()
    @IsAlphanumeric()
    @MaxLength(10)
    name: string

    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @MinLength(3)
    @MaxLength(20)
    password?: string

    @IsNotEmpty()
    @IsEnum(Channel_Type)
    type: Channel_Type

}

export class MembershipDto {

    id: number

    member: UserDto

    channel: ChannelDto

    role: Channel_Member_Role
    
    state: Channel_Member_State

    restricitonEnd: Date

    isJoined: boolean

}

// Makes a copy of the ChannelDto with all fields Optional, Useful for updating data
export class UpdateChannelDto extends PartialType(ChannelDto) {}

export class directChannelDto {

    @IsUUID()
    id: string

    relationship: RelationshipEntity

}