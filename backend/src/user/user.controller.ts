import { Controller, Get, Delete, UseGuards, Patch, UseInterceptors, UploadedFile, HttpCode, Body, Param, Res, HttpException, HttpStatus, Post, BadRequestException, Query, NotFoundException, ParseIntPipe, ValidationPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { User } from './decorators/user.decorator';
import { UserService } from './user.service';
import { multerOptions } from '../config/mutler.conf'
import { Relationship_State } from './entities/relationship.entity';
import { UserDto } from 'src/dto/User.dto';
import { FindQueryString } from 'src/dto/validation.dto';

type File = Express.Multer.File

@Controller('user')
export class UserController {

	constructor( private userService: UserService ) {}

	@Get('search')
	@UseGuards(JwtAuthGuard)
	@HttpCode(201)
	async searchUsers(
		@User('id') userId: number,
		@Query() { q }: FindQueryString
	) {
		return await this.userService.findUsersByDisplayNameLike(userId, q)
	}

	// @Post('add-friend')
	// @UseGuards(JwtAuthGuard)
	// @HttpCode(201)
	// async sendFriendRequest(
	// 	@User() user: UserDto,
	// 	@Body('target_id', ParseIntPipe) friendId: number ) {
	// 		if (!friendId || user.id === friendId)
	// 			throw new BadRequestException("invalid target id")
	// 		await this.userService.addFriend(user, friendId)
	// 		return "friend request sent"
	// }

	// @Post('accept-friend')
	// @UseGuards(JwtAuthGuard)
	// @HttpCode(201)
	// async acceptFriendRequest(
	// 	@User('id') userId: number,
	// 	@Body('target_id', ParseIntPipe) friendId: number ) {
	// 		if (!friendId || userId === friendId)
	// 			throw new BadRequestException("invalid friend id")
	// 		await this.userService.acceptFriendship(userId, friendId)
	// 		return "friend Request accepted"
	// }

	@Post('remove-friend')
	@UseGuards(JwtAuthGuard)
	@HttpCode(201)
	async removeFromFriends(
		@User('id') userId: number,
		@Body('target_id', ParseIntPipe) friendId: number ) {
			if (userId === friendId)
				throw new BadRequestException("invalid friend id")
			await this.userService.removeRelationship(userId, friendId)
			return "friendship removed"
	}

	@Post('block-user')
	@UseGuards(JwtAuthGuard)
	@HttpCode(201)
	async BlockUser(
		@User('id') userId: number,
		@Body('target_id', ParseIntPipe) friendId: number ) {
			if (userId === friendId)
				throw new BadRequestException("invalid friend id")
			await this.userService.blockUser(userId, friendId)
			return "user blocked"
	}

	@Post('unblock-user')
	@UseGuards(JwtAuthGuard)
	@HttpCode(201)
	async unblock(
		@User('id') userId: number,
		@Body('target_id', ParseIntPipe) friendId: number ) {
			if (userId === friendId)
				throw new BadRequestException("invalid friend id")
			await this.userService.removeRelationship(userId, friendId)
			return "user unblocked"
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
		return await this.userService.findUser(userId)
    }

	@Get('profile/:id')
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
    async userProfile(
		@User('id') userId: number,
		@Param('id', ParseIntPipe) targetId: number
	) {
		if (!targetId)
			throw new BadRequestException('user id not found')
		const profile: UserDto = await this.userService.findUser(targetId)
		if (!profile)
			throw new NotFoundException('user profile not found')
		const relationship = await this.userService.findRelationship(userId, profile.id)
		if (relationship) {
			const {state, sender} = relationship
			const imSender = sender.id === userId ? true : false
			return {profile, relationship_state: state, imSender: imSender}
		}
		return { profile }
    }

	@Get('received-requests')
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
    async getReceivedFriendRequests(@User('id') userId: number) {
		return await this.userService.findReceivedFriendRequests(userId)
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
