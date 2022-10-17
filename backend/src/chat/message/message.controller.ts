import { Controller, Get, HttpCode, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { UserDto } from "src/dto/User.dto";
import { User } from "src/user/decorators/user.decorator";
import { MessageService } from "./message.service";

@Controller('message')
export class MessageController {

    constructor( private messageService: MessageService ) {}

    @Get(':channel_id')
    @UseGuards(JwtAuthGuard)
	@HttpCode(200)
    async getChannelMessages(
        @User() userId: UserDto,
        @Param('channel_id', ParseIntPipe) channelId: number
    ) {
        return await this.messageService.findChannelMessages(userId, channelId)
    }

    @Get(':receiver_id')
    @UseGuards(JwtAuthGuard)
	@HttpCode(200)
    async getDirectMessages(
        @User('id') authorId: number,
        @Param('receiver_id', ParseIntPipe) receiverId: number
    ) {
        return await this.messageService.findDirectMessages(authorId, receiverId)
    }
}