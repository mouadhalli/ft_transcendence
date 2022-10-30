import { IsNotEmpty, IsNumber, IsString } from 'class-validator'
import { UserEntity } from 'src/user/entities/user.entity'
import { ChannelEntity } from '../entities/channel.entity'

export class MessageDto {

    @IsNotEmpty()
    @IsNumber()
    id: number

    @IsNotEmpty()
    @IsString()
    content: string

    @IsNotEmpty()
    author: UserEntity
    
    @IsNotEmpty()
    channel: ChannelEntity

    @IsNotEmpty()
    created_at: Date
}

export class DirectMessageDto {

    @IsNotEmpty()
    @IsNumber()
    id: number

    @IsNotEmpty()
    @IsString()
    content: string

    @IsNotEmpty()
    author: UserEntity

    @IsNotEmpty()
    created_at: Date
}