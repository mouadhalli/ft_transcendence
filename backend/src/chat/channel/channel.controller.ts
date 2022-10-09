import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards, Patch, ParseIntPipe, UseInterceptors, UploadedFile, BadRequestException } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { UserDto } from "src/dto/User.dto";
import { User } from "src/user/decorators/user.decorator";
import { Channel_Member_Role, Channel_Member_State } from "../entities/channelMember.entity";
import { ChannelDto, UpdateChannelDto } from "./channel.dto";
import { ChannelService } from "./channel.service";

import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../../config/mutler.conf'
type File = Express.Multer.File

@Controller('channel')
export class ChannelController {

    constructor( private channelService: ChannelService ) {}

    // @UseGuards(JwtAuthGuard)
	@HttpCode(200)
    @Get()
    async getPublicAndProtectedChannels(
        // @User() user: UserDto,
        @Query('index') index: number,
		@Query('amount') amount: number
    ) {
        return await this.channelService.findAllChannels(index, amount)
    }

        // @UseGuards(JwtAuthGuard)
	@HttpCode(201)
    @Post('add-member')
    async addFriendToChannel(
        @User() user: UserDto,
        @Body('target_id', ParseIntPipe) targetId: number,
        @Body('channel_id', ParseIntPipe) channelId: number
    ) {
        if (user.id === targetId)
            throw new BadRequestException('user cannot add himseld')
        await this.channelService.addUserToChannel(user, targetId, channelId)
        return 'target added successfully'
    }


    @Post('create')
    // @UseGuards(JwtAuthGuard)
	@HttpCode(201)
    async createChannel(@User() creator: UserDto, @Body() channelData: ChannelDto) {
        return await this.channelService.createChannel(creator, channelData)
    }

    // @Get('all')
    // async getAllChannels() {
    //     return await this.channelService.findAllChannels()
    // }

    @Get('all-public')
    @UseGuards(JwtAuthGuard)
	@HttpCode(200)
    async getAllPublicChannels() {
        return await this.channelService.findAllPublic()
    }

    @Get('all-protected')
    @UseGuards(JwtAuthGuard)
	@HttpCode(200)
    async getAllProtectedChannels() {
        return await this.channelService.findAllProtected()
    }

    @Get('joined')
    @UseGuards(JwtAuthGuard)
	@HttpCode(200)
    async getJoinedChannels(@User('id') userId: number) {
        return await this.channelService.findJoinedChannels(userId)
    }

    @Get('non-joined')
    @UseGuards(JwtAuthGuard)
	@HttpCode(200)
    async getNonJoinedChannels(@User('id') userId: number) {
        return await this.channelService.findNonJoinedChannels(userId)
    }

    @Get('members/:channel_id')
    @UseGuards(JwtAuthGuard)
	@HttpCode(200)
    async getChannelMembers(@Param('channel_id', ParseIntPipe) channelId: number) {
        return await this.channelService.findChannelMembers(channelId)
    }

    @Get(":channel_id")
    @UseGuards(JwtAuthGuard)
	@HttpCode(200)
    async getChannel(@Param('channel_id', ParseIntPipe) channelId: number) {
        return await this.channelService.findOneChannel(channelId)
    }

    @Delete(":channel_id")
    @UseGuards(JwtAuthGuard)
	@HttpCode(202)
    async deleteChannel(@Param('channel_id', ParseIntPipe) channelId: number) {
        return await this.channelService.deleteChannel(channelId)
    }

    @Patch(':channel_id')
    @UseGuards(JwtAuthGuard)
    @HttpCode(201)
	@UseInterceptors(FileInterceptor('file', multerOptions))
    async updateChannel(
        @Param('channel_id', ParseIntPipe) channelId: number,
        @Body() data: UpdateChannelDto,
        @UploadedFile() file: File
    ) {
        let imgPath = ''
        if (file)
            imgPath = `http://localhost:3000/${file.path}`
        await this.channelService.updateChannel(channelId, data, imgPath)
        return await this.channelService.findOneChannel(channelId)
    }

    @Patch('add-admin')
    @UseGuards(JwtAuthGuard)
    async addAdmin(
        @Query('channel_id', ParseIntPipe) channelId: number,
        @Query('member_id', ParseIntPipe) memberid: number
    ) {
        await this.channelService.changeMembershipRole(channelId, memberid, Channel_Member_Role.ADMIN)
    }

    @Patch('remove-admin')
    @UseGuards(JwtAuthGuard)
    async removeAdmin(
        @Query('channel_id', ParseIntPipe) channelId: number,
        @Query('member_id', ParseIntPipe) memberid: number
    ) {
        await this.channelService.changeMembershipRole(channelId, memberid, Channel_Member_Role.MEMBER)
    }

    @Patch('mute-member')
    @UseGuards(JwtAuthGuard)
    async muteMember(
        @Query('channel_id', ParseIntPipe) channelId: number,
        @Query('member_id', ParseIntPipe) memberid: number
    ) {
        await this.channelService.changeMembershipState(channelId, memberid, Channel_Member_State.MUTED)
    }

    @Patch('unmute-member')
    @UseGuards(JwtAuthGuard)
    async unmuteMember(
        @Query('channel_id', ParseIntPipe) channelId: number,
        @Query('member_id', ParseIntPipe) memberid: number
    ) {
        await this.channelService.changeMembershipState(channelId, memberid, Channel_Member_State.ACTIVE)
    }

    @Patch('ban-member')
    @UseGuards(JwtAuthGuard)
    async banMember(
        @Query('channel_id', ParseIntPipe) channelId: number,
        @Query('member_id', ParseIntPipe) memberid: number
    ) {
        await this.channelService.changeMembershipState(channelId, memberid, Channel_Member_State.BANNED)
    }

    @Patch('unban-member')
    @UseGuards(JwtAuthGuard)
    async unbanMember(
        @Query('channel_id', ParseIntPipe) channelId: number,
        @Query('member_id', ParseIntPipe) memberid: number
    ) {
        await this.channelService.changeMembershipState(channelId, memberid, Channel_Member_State.ACTIVE)
    }

    @Patch('remove-member')
    @UseGuards(JwtAuthGuard)
    async removeMember(
        @Query('channel_id', ParseIntPipe) channelId: number,
        @Query('member_id', ParseIntPipe) memberid: number
    ) {
        await this.channelService.removeMemberFromChannel(channelId, memberid)
    }

}
