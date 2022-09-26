import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { get } from "http";
import { User } from "src/user/decorators/user.decorator";
import { ChannelDto } from "./channel.dto";
import { ChannelService } from "./channel.service";


/* 
    TO DO: 
        - add JWT Guard to routes
*/

@Controller('channel')
export class ChannelController {

    constructor( private channelService: ChannelService ) {}

    @Post('create')
    async createChannel(@User('id') userId, @Body() channelData: ChannelDto) {
        return await this.channelService.createChannel(userId, channelData)
    }

    @Get('all')
    async getAllChannels() {
        return await this.channelService.findAllChannels()
    }

    @Get('joined')
    async getJoinedChannels(@User('id') userId: number) {
        return await this.channelService.findJoinedChannels(userId)
    }

    @Get('non-joined')
    async getNonJoinedChannels(@User('id') userId: number) {
        return await this.channelService.findNonJoinedChannels(userId)
    }

    @Get('members')
    async getChannelMembers(@Body('channel_id') channelId: number) {
        return await this.channelService.findChannelMembers(channelId)
    }

    @Get(":id")
    async getChannel(@Param('id') channelId: number) {
        return await this.channelService.findOneChannel(channelId)
    }

    @Delete(":id")
    async deleteChannel(@Param('id') channelId: number) {
        return await this.channelService.deleteChannel(channelId)
    }


}
