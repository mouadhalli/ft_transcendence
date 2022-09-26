import {IsNumber, IsString, IsNotEmpty, IsAlphanumeric, IsEmail, IsUrl, IsOptional} from 'class-validator'
import { Channel_Type } from '../entities/channel.entity'


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
    @IsNotEmpty()
    img_path?: string

    @IsNotEmpty()
    @IsString()
    type: Channel_Type

}