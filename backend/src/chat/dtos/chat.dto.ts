import { IsAlphanumeric, IsNumber, IsOptional, IsUUID } from 'class-validator';

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

	@IsOptional()
	@IsAlphanumeric()
	content?: string
}

export class sendDirectMsgPayload {

	@IsUUID()
	channelId: string

	@IsOptional()
	@IsAlphanumeric()
	content?: string
}