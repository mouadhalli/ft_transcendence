import { IsAlphanumeric, IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { Message_Type } from '../entities/directMessage.entity';

export class joinChannelPayload {

	@IsUUID()
	channelId: string

	@IsOptional()
	@IsAlphanumeric()
	password?: string
}

export class sendMsgPayload {

	@IsUUID()
	channelId: string

	@IsString()
	content: string
}

export class sendDmPayload {

	@IsUUID()
	channelId: string

	@IsString()
	content: string

	@IsEnum(Message_Type)
	type: Message_Type
}