import {IsNumber, IsString, IsNotEmpty, IsAlphanumeric, IsEmail, IsUrl, IsOptional, IsUUID} from 'class-validator'
import { UserDto } from 'src/dto/User.dto'
import { Channel_Type } from '../entities/channel.entity'
import { Channel_Member_Role, Channel_Member_State } from '../entities/channelMember.entity'

import {PartialType} from '@nestjs/swagger'


export class ChannelDto {

    @IsUUID()
    id: string

    @IsNotEmpty()
    @IsAlphanumeric()
    name: string

    @IsOptional()
    @IsNotEmpty()
    @IsAlphanumeric()
    password?: string

    @IsNotEmpty()
    @IsString()
    type: Channel_Type

}

export class MembershipDto {

    id: number

    member: UserDto

    channel: ChannelDto

    role: Channel_Member_Role
    
    state: Channel_Member_State

    restricitonEnd: Date

}

// Makes a copy of the ChannelDto with all fields Optional, Useful when updating
// export class UpdateChannelDto extends PartialType(ChannelDto) {}

export class UpdateChannelDto {
    @IsOptional()
    @IsNotEmpty()
    @IsAlphanumeric()
    name: string

    @IsOptional()
    @IsNotEmpty()
    @IsAlphanumeric()
    password?: string

    @IsOptional()
    @IsNotEmpty()
    @IsString()
    type: Channel_Type
}

export class directChannelDto {

    @IsUUID()
    id: number

}