import { IsAlphanumeric, IsNumber, IsOptional } from 'class-validator';

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

	@IsNumber()
	receiverId: number

	@IsOptional()
	@IsAlphanumeric()
	content?: string
}