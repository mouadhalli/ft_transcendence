import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards, Patch, ParseIntPipe, UseInterceptors, UploadedFile, BadRequestException, ParseUUIDPipe, SetMetadata } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { UserDto } from "src/dto/User.dto";
import { User } from "src/user/decorators/user.decorator";
import { Channel_Member_Role, Channel_Member_State } from "../entities/channelMember.entity";
import { ChannelDto, UpdateChannelDto } from "../dtos/channel.dto";
import { ChannelService } from "./channel.service";
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../../config/mutler.config'
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { ConfigService } from "@nestjs/config";
type File = Express.Multer.File

@Controller('channel')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChannelController {

    constructor(
        private channelService: ChannelService,
        private configService: ConfigService
    ) {}

    @Post('create')
	@HttpCode(201)
    async createChannel(
        @User() creator: UserDto,
        @Body() channelData: ChannelDto,
    ) {
        const channelId: string = await this.channelService.createChannel(creator, channelData)
        return  this.channelService.findOneChannel(channelId)
    }

    @Get("channel-role/:channel_id")
	@HttpCode(200)
    async getChannelRole(
        @User('id') userId: number,
        @Param('channel_id', ParseUUIDPipe) channelId: string
    ) {
        const { id, name, imgPath, type, membersCount } = await this.channelService.findOneChannel(channelId)
        const role = await this.channelService.findUserChannelRole(userId, channelId)

        return { id, name, imgPath, type, membersCount, role }
    }

    @Get("find/:channel_id")
	@HttpCode(200)
    async getChannel(
        @Param('channel_id', ParseUUIDPipe) channelId: string
    ) {
        return await this.channelService.findOneChannel(channelId)
    }

    @Get('role/:channel_id')
    async getMyChannelRole(
        @User('id') userId: number,
        @Param('channel_id', ParseUUIDPipe) channelId: string
    ) {
        return await this.channelService.findUserChannelRole(userId, channelId)
    }

    @Get('all-public')
	@HttpCode(200)
    async getAllPublicChannels() {
        return await this.channelService.findAllPublic()
    }

    @Get('all-protected')
	@HttpCode(200)
    async getAllProtectedChannels() {
        return await this.channelService.findAllProtected()
    }

    @Get('joined')
	@HttpCode(200)
    async getJoinedChannels(@User('id') userId: number) {
        return await this.channelService.findJoinedChannels(userId)
    }

    @Get('dms')
	@HttpCode(200)
    async getDirectChannels(@User('id') userId: number) {
        return await this.channelService.findUserDmChannels(userId)
    }

    @Get('non-joined')
	@HttpCode(200)
    async getNonJoinedChannels(@User('id') userId: number) {
        return await this.channelService.findNonJoinedChannels(userId)
    }

    @Get('members/:channel_id')
	@HttpCode(200)
    async getChannelMembers(
        @Param('channel_id', ParseUUIDPipe) channelId: string
    ) {
        return await this.channelService.findChannelMembers(channelId)
    }

    @Delete("delete/:channel_id")
    @Roles('owner')
    @HttpCode(202)
    async deleteChannel(@Param('channel_id', ParseUUIDPipe) channelId: string) {
        return await this.channelService.deleteChannel(channelId)
    }

    @Patch('add-admin/:channel_id')
    @Roles('owner')
    async addAdmin(
        @Param('channel_id', ParseUUIDPipe) channelId: string,
        @Query('member_id', ParseIntPipe) memberId: number
    ) {
        await this.channelService.changeMembershipRole(memberId, channelId, Channel_Member_Role.ADMIN)
    }

    @Patch('remove-admin/:channel_id')
    @Roles('owner')
    async removeAdmin(
        @Param('channel_id', ParseUUIDPipe) channelId: string,
        @Query('member_id', ParseIntPipe) memberId: number
    ) {
        await this.channelService.changeMembershipRole(memberId, channelId, Channel_Member_Role.MEMBER)
    }

    @Patch('mute-member/:channel_id')
    @Roles('owner', 'admin')
	@HttpCode(200)
    async muteMember(
        @Param('channel_id', ParseUUIDPipe) channelId: string,
        @Query('member_id', ParseIntPipe) memberId: number,
        @Query('mute_time', ParseIntPipe) muteTime: number
    ) {
        await this.channelService.restrictChannelMember(channelId, memberId, muteTime, Channel_Member_State.MUTED)
    }

    @Patch('unmute-member/:channel_id')
    @Roles('owner', 'admin')
    async unmuteMember(
        @Param('channel_id', ParseUUIDPipe) channelId: string,
        @Query('member_id', ParseIntPipe) memberId: number
    ) {
        await this.channelService.removeRestrictionOnChannelMember(channelId, memberId)
    }

    @Patch('ban-member/:channel_id')
    @Roles('owner', 'admin')
    async banMember(
        @Param('channel_id', ParseUUIDPipe) channelId: string,
        @Query('member_id', ParseIntPipe) memberId: number,
        @Query('mute_time', ParseIntPipe) banTime: number
    ) {
        await this.channelService.restrictChannelMember(channelId, memberId, banTime, Channel_Member_State.BANNED)
    }

    @Patch('unban-member/:channel_id')
    @Roles('owner', 'admin')
    async unbanMember(
        @Param('channel_id', ParseUUIDPipe) channelId: string,
        @Query('member_id', ParseIntPipe) memberId: number
    ) {
        await this.channelService.removeRestrictionOnChannelMember(channelId, memberId)
    }

    @Patch('remove-member/:channel_id')
    @Roles('owner', 'admin')
    async removeMember(
        @Param('channel_id', ParseUUIDPipe) channelId: string,
        @Query('member_id', ParseIntPipe) memberId: number
    ) {
        await this.channelService.removeMemberFromChannel(channelId, memberId)
    }

    @Patch('update/:channel_id')
    @Roles('owner', 'admin')
    @HttpCode(201)
	@UseInterceptors(FileInterceptor('file', multerOptions))
    async updateChannel(
        @Param('channel_id', ParseUUIDPipe) channelId: string,
        @Body() data: UpdateChannelDto,
        @UploadedFile() file: File
    ) {
        let imgPath = ''
        if (file)
			imgPath = `http://${this.configService.get('APP_NAME')}:${this.configService.get('HOST_PORT')}/${file.path}`
        await this.channelService.updateChannel(channelId, data, imgPath)
        return await this.channelService.findOneChannel(channelId)
    }
}
