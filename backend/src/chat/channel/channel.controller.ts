import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards, Patch, ParseIntPipe, UseInterceptors, UploadedFile, BadRequestException } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { UserDto } from "src/dto/User.dto";
import { User } from "src/user/decorators/user.decorator";
import { Channel_Member_Role, Channel_Member_State } from "../entities/channelMember.entity";
import { ChannelDto, UpdateChannelDto } from "../dtos/channel.dto";
import { ChannelService } from "./channel.service";

import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../../config/mutler.conf'
import { IsOwnerGuard } from "../guards/owner.role.guard";
import { IsAdminGuard } from "../guards/admin.role.guard";
type File = Express.Multer.File

@Controller('channel')
export class ChannelController {

    constructor( private channelService: ChannelService ) {}

    @Post('add-member/:channel_id')
    @UseGuards(JwtAuthGuard, IsAdminGuard)
	@HttpCode(201)
    async addFriendToChannel(
        @User() user: UserDto,
        @Param('channel_id', ParseIntPipe) channelId: number,
        @Body('target_id', ParseIntPipe) targetId: number
    ) {
        console.log(targetId, channelId)
        if (user.id === targetId)
            throw new BadRequestException('user cannot add himseld')
        await this.channelService.addUserToChannel(user, targetId, channelId)
        return 'target added successfully'
    }

    @Post('create')
    @UseGuards(JwtAuthGuard)
	@HttpCode(201)
    async createChannel(
        @User() creator: UserDto,
        @Body() channelData: ChannelDto,
    ) {
        const channelId: number = await this.channelService.createChannel(creator, channelData)
        return  this.channelService.findOneChannel(channelId)
    }

    @Get('role/:channel_id')
    async getMyChannelRole(
        @User('id') userId: number,
        @Param('channel_id', ParseIntPipe) channelId: number
    ) {
        return await this.channelService.findUserChannelRole(userId, channelId)
    }

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
    async getChannel(
        @User('id') userId: number,
        @Param('channel_id', ParseIntPipe) channelId: number
    ) {
        const { id, name, imgPath, type, membersCount } = await this.channelService.findOneChannel(channelId)
        const role = await this.channelService.findUserChannelRole(userId, channelId)

        return { id, name, imgPath, type, membersCount, role }
    }

    @Delete(":channel_id")
    @UseGuards(JwtAuthGuard, IsOwnerGuard)
	@HttpCode(202)
    async deleteChannel(@Param('channel_id', ParseIntPipe) channelId: number) {
        return await this.channelService.deleteChannel(channelId)
    }

    @Delete("all")
	@HttpCode(202)
    async deleteAllChannels() {
        return await this.channelService.deleteAllChannels()
    }

    @Patch('add-admin/:channel_id')
    @UseGuards(JwtAuthGuard, IsAdminGuard)
    async addAdmin(
        @Param('channel_id', ParseIntPipe) channelId: number,
        @Query('member_id', ParseIntPipe) memberId: number
    ) {
        await this.channelService.changeMembershipRole(memberId, channelId, Channel_Member_Role.ADMIN)
    }

    @Patch('remove-admin/:channel_id')
    @UseGuards(JwtAuthGuard, IsAdminGuard)
    async removeAdmin(
        @Param('channel_id', ParseIntPipe) channelId: number,
        @Query('member_id', ParseIntPipe) memberId: number
    ) {
        await this.channelService.changeMembershipRole(memberId, channelId, Channel_Member_Role.MEMBER)
    }

    @Patch('mute-member/:channel_id')
    @UseGuards(JwtAuthGuard, IsAdminGuard)
	@HttpCode(200)
    async muteMember(
        @Param('channel_id', ParseIntPipe) channelId: number,
        @Query('member_id', ParseIntPipe) memberId: number,
        @Query('mute_time', ParseIntPipe) muteTime: number
    ) {
        await this.channelService.restrictChannelMember(channelId, memberId, muteTime, Channel_Member_State.MUTED)
    }

    @Patch('unmute-member/:channel_id')
    @UseGuards(JwtAuthGuard, IsAdminGuard)
    async unmuteMember(
        @Param('channel_id', ParseIntPipe) channelId: number,
        @Query('member_id', ParseIntPipe) memberId: number
    ) {
        await this.channelService.removeRestrictionOnChannelMember(channelId, memberId)
    }

    @Patch('ban-member/:channel_id')
    @UseGuards(JwtAuthGuard, IsAdminGuard)
    async banMember(
        @Param('channel_id', ParseIntPipe) channelId: number,
        @Query('member_id', ParseIntPipe) memberId: number,
        @Query('mute_time', ParseIntPipe) banTime: number
    ) {
        await this.channelService.restrictChannelMember(channelId, memberId, banTime, Channel_Member_State.BANNED)
    }

    @Patch('unban-member/:channel_id')
    @UseGuards(JwtAuthGuard, IsAdminGuard)
    async unbanMember(
        @Param('channel_id', ParseIntPipe) channelId: number,
        @Query('member_id', ParseIntPipe) memberId: number
    ) {
        await this.channelService.removeRestrictionOnChannelMember(channelId, memberId)
    }

    @Patch('remove-member/:channel_id')
    @UseGuards(JwtAuthGuard, IsAdminGuard)
    async removeMember(
        @Param('channel_id', ParseIntPipe) channelId: number,
        @Query('member_id', ParseIntPipe) memberId: number
    ) {
        await this.channelService.removeMemberFromChannel(channelId, memberId)
    }

    @Patch(':channel_id')
    @UseGuards(JwtAuthGuard, IsOwnerGuard)
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
}
