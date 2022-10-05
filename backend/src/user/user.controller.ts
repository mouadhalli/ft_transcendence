import { Controller, Get, Delete, UseGuards, Patch, UseInterceptors, UploadedFile, HttpCode, Body, Param, Res, HttpException, HttpStatus, Post, BadRequestException, Query, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { User } from './decorators/user.decorator';
import { UserService } from './user.service';
import { multerOptions } from '../config/mutler.conf'
import { Relationship_State } from './entities/relationship.entity';

type File = Express.Multer.File

@Controller('user')
export class UserController {

	constructor( private userService: UserService ) {}

	@Post('add-friend')
	@UseGuards(JwtAuthGuard)
	@HttpCode(201)
	async sendFriendRequest(
		@User('id') userId: number,
		@Body('target_id') friendId: number ) {
			if (!friendId || userId === friendId)
				throw new BadRequestException("invalid target id")
			return await this.userService.addFriend(userId, friendId)
	}

	@Post('accept-friend')
	@UseGuards(JwtAuthGuard)
	@HttpCode(201)
	async acceptFriendRequest(
		@User('id') userId: number,
		@Body('target_id') friendId: number ) {
			if (!friendId || userId === friendId)
				throw new BadRequestException("invalid friend id")
			return await this.userService.updateRelationship(userId, friendId, Relationship_State.FRIENDS)
	}

	@Post('remove-friend')
	@UseGuards(JwtAuthGuard)
	@HttpCode(201)
	async removeFromFriends(
		@User('id') userId: number,
		@Body('target_id') friendId: number ) {
			if (userId === friendId)
				throw new BadRequestException("invalid friend id")
			return await this.userService.removeRelationship(userId, friendId)
	}

	@Post('block-user')
	@UseGuards(JwtAuthGuard)
	@HttpCode(201)
	async BlockUser(
		@User('id') userId: number,
		@Body('target_id') friendId: number ) {
			if (userId === friendId)
				throw new BadRequestException("invalid friend id")
			return await this.userService.updateRelationship(userId, friendId, Relationship_State.BLOCKED)
	}

	@Post('unblock-user')
	@UseGuards(JwtAuthGuard)
	@HttpCode(201)
	async unblock(
		@User('id') userId: number,
		@Body('target_id') friendId: number ) {
			if (userId === friendId)
				throw new BadRequestException("invalid friend id")
			return await this.userService.removeRelationship(userId, friendId)
	}

	@Get('friends')
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
	async getFriends(
		@User('id') userId,
		@Query('index') index: number,
		@Query('amount') amount: number
	) {
		return await this.userService.findUserRelationships(userId, index, amount, Relationship_State.FRIENDS)
	}

	@Get('block-list')
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
	async getBlockList(
		@User('id') userId,
		@Query('index') index: number,
		@Query('amount') amount: number) {
			return await this.userService.findUserRelationships(userId, index, amount, Relationship_State.BLOCKED)
	}

	@Get('pending-list')
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
	async getPendingList(
		@User('id') userId,
		@Query('index') index: number,
		@Query('amount') amount: number) {
			return await this.userService.findUserRelationships(userId, index, amount, Relationship_State.PENDING)
	}

	@Get('me')
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
    async me(@User('id') userId: number) {
		// return await this.userService.getUserWithRelations(userId)
		return await this.userService.findUser(userId)
    }

	@Get('profile/:id')
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
    async userProfile(@Param('id') userId: number) {
		if (!userId)
			throw new BadRequestException('user id not found')
		const user = await this.userService.getUserWithRelations(userId)
		if (!user)
			throw new NotFoundException('user profile not found')
		return user
    }

	@Get('all-users')
	// @UseGuards(JwtAuthGuard)
	@HttpCode(200)
    async getAllUsers() {
		return await this.userService.findAll()
    }

    @Delete('all-users')
	// @UseGuards(JwtAuthGuard)
	@HttpCode(202)
	async deleteUsers() {
		await this.userService.DeleteAll()
    	return {message: "successfully deleted all Users"}
    }

	@Patch('update')
	@UseGuards(JwtAuthGuard)
	@HttpCode(201)
	@UseInterceptors(FileInterceptor('file', multerOptions))
	async updateProfile(
		@User('id') userId: number,
		@Body('displayName') displayName: string,
		@UploadedFile() file: File) {
			let imgPath = ''
	    	if (file)
				imgPath = `http://localhost:3000/${file.path}`
			return await this.userService.updateProfile(userId, displayName, imgPath)
	}
}
