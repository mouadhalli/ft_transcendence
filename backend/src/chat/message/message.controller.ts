import { Controller, Get, HttpCode, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { MessageService } from "./message.service";

@Controller('message')
export class MessageController {

    constructor( private messageService: MessageService ) {}

    @Get(':channel_id')
    @UseGuards(JwtAuthGuard)
	@HttpCode(200)
    async getChannelMessages(@Param('channel_id', ParseIntPipe) channelId: number) {
        return await this.messageService.findChannelMessages(channelId)
    }
}