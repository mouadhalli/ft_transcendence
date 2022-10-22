import { IsAlphanumeric, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class joinChannelPayload {

	@IsNumber()
	channelId: number

	@IsOptional()
	@IsAlphanumeric()
	password?: string
}

export class sendMsgPayload {

	@IsNumber()
	channelId: number

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