import {IsNumber, IsString, IsNotEmpty, IsAlphanumeric, IsEmail, IsUrl, IsOptional} from 'class-validator'
import { UserDto } from 'src/dto/User.dto'
import { Channel_Type } from '../entities/channel.entity'
import { Channel_Member_Role, Channel_Member_State } from '../entities/channelMember.entity'


export class ChannelDto {

    // @IsNumber()
    id: number

    @IsNotEmpty()
    @IsString()
    @IsAlphanumeric()
    name: string

    @IsOptional()
    @IsNotEmpty()
    @IsString()
    @IsAlphanumeric()
    password?: string

    @IsOptional()
    @IsNotEmpty()
    @IsUrl() // also handles IsString case
    img_path?: string

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

}