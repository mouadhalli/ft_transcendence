import { IsAlphanumeric, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { Message_Type } from '../entities/directMessage.entity';

export class joinChannelPayload {

	@IsNotEmpty()
	@IsUUID()
	channelId: string

	@IsOptional()
	@IsAlphanumeric()
	password?: string
}

export class sendMsgPayload {

	@IsNotEmpty()
	@IsUUID()
	channelId: string

	@IsNotEmpty()
	@IsString()
	content: string
}

export class sendDmPayload {

	@IsNotEmpty()
	@IsUUID()
	channelId: string

	@IsNotEmpty()
	@IsString()
	content: string

	@IsNotEmpty()
	@IsEnum(Message_Type)
	type: Message_Type
}

export class addMemberPayload {

	@IsNotEmpty()
	@IsUUID()
	channelId: string

	@IsNotEmpty()
	@IsNumber()
	targetId: number

}