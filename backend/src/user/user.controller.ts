import { Controller, Get, Delete, UseGuards, Patch, UseInterceptors, UploadedFile, HttpCode, Body, Param, Res, HttpException, HttpStatus, Post, BadRequestException, Query, NotFoundException, ParseIntPipe, ValidationPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { User } from './decorators/user.decorator';
import { UserService } from './user.service';
import { multerOptions } from '../config/mutler.conf'
import { Relationship_State } from './entities/relationship.entity';
import { UserDto } from 'src/dto/User.dto';
import { validateQueryString, ValidateDisplayName } from 'src/dto/validation.dto';

type File = Express.Multer.File

@Controller('user')
// @UseGuards(JwtAuthGuard)
export class UserController {

	constructor( private userService: UserService ) {}

	@Get('search')
	@UseGuards(JwtAuthGuard)
	@HttpCode(201)
	async searchUsers(
		@User('id') userId: number,
		@Query() { q }: validateQueryString
	) {
		return await this.userService.findUsersByDisplayNameLike(userId, q)
	}

	@Get('friends')
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
	async getFriends(
		@User('id') userId: number,
		@Query('index') index: number,
		@Query('amount') amount: number
	) {
		return await this.userService.findUserRelationships(userId, index, amount, Relationship_State.FRIENDS)
	}

	@Get('block-list')
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
	async getBlockList(
		@User('id') userId: number,
		@Query('index') index: number,
		@Query('amount') amount: number) {
			return await this.userService.findUserRelationships(userId, index, amount, Relationship_State.BLOCKED)
	}

	@Get('pending-list')
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
	async getPendingList(
		@User('id') userId: number,
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
		// @Body('displayName') { displayName }: ValidateDisplayName,
		@Body('displayName') displayName: string,
		@UploadedFile() file: File) {
			console.log(displayName);
			
			let imgPath = ''
	    	if (file)
				imgPath = `http://localhost:3000/${file.path}`
			return await this.userService.updateProfile(userId, String(displayName), imgPath)
	}
}
