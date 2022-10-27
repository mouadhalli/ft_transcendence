import { IsAlphanumeric, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

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
