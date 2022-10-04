import { Controller, Get, HttpCode, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { MessageService } from "./message.service";

@Controller('message')
export class MessageController {

    constructor( private messageService: MessageService ) {}

    @Get(':channel_id')
    @UseGuards(JwtAuthGuard)
	@HttpCode(200)
    async getChannelMessages(@Param('channel_id') channelId: number) {
        return await this.messageService.findChannelMessages(channelId)
    }
}