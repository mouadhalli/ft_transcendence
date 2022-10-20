import { IsAlphanumeric, IsNumber, IsOptional } from 'class-validator';

export class joinChannelPayload {

	@IsNumber()
	userId: number

	@IsNumber()
	channelId: number

	@IsOptional()
	@IsAlphanumeric()
	password?: string
}

export class sendMsgPayload {

	@IsNumber()
	userId: number

	@IsNumber()
	channelId: number

	@IsOptional()
	@IsAlphanumeric()
	content?: string
}

export class sendDirectMsgPayload {

	@IsNumber()
	userId: number

	@IsNumber()
	receiverId: number

	@IsOptional()
	@IsAlphanumeric()
	content?: string
}