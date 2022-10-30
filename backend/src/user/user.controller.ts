import { Controller, Get, UseGuards, Patch, UseInterceptors, UploadedFile, HttpCode, Body, Param, BadRequestException, Query, NotFoundException, ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { User } from './decorators/user.decorator';
import { UserService } from './user.service';
import { multerOptions } from '../config/mutler.config'
import { Relationship_State } from './entities/relationship.entity';
import { UserDto } from 'src/dto/User.dto';
import { validateQueryString, ValidateDisplayName } from 'src/dto/validation.dto';
import { ConfigService } from '@nestjs/config';

type File = Express.Multer.File

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {

	constructor(
		private userService: UserService,
		private configService: ConfigService
	) {}

	@Get('search')
	@HttpCode(201)
	async searchUsers(
		@User('id') userId: number,
		@Query() { q }: validateQueryString
	) {
		return await this.userService.findUsersByDisplayNameLike(userId, q)
	}

	@Get('friends')
	@HttpCode(200)
	async getFriends( @User('id') userId: number ) {
		return await this.userService.findUserRelationships(userId, Relationship_State.FRIENDS)
	}

	@Get('block-list')
	@HttpCode(200)
	async getBlockList( @User('id') userId: number ) {
			return await this.userService.findUserRelationships(userId, Relationship_State.BLOCKED)
	}

	@Get('pending-list')
	@HttpCode(200)
	async getPendingList( @User('id') userId: number ) {
			return await this.userService.findUserRelationships(userId, Relationship_State.PENDING)
	}

	@Get('me')
	@HttpCode(200)
    async me(@User('id') userId: number) {
		return await this.userService.findUser(userId)
    }

	@Get('profile/:id')
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
	@HttpCode(200)
    async getReceivedFriendRequests(@User('id') userId: number) {
		return await this.userService.findReceivedFriendRequests(userId)
    }

	@Patch('update')
	@HttpCode(201)
	@UseInterceptors(FileInterceptor('file', multerOptions))
	async updateProfile(
		@User('id') userId: number,
		@Body() { displayName }: ValidateDisplayName,
		@UploadedFile() file: File) {
			let imgPath = ''
	    	if (file)
				imgPath = `http://${this.configService.get('APP_NAME')}:${this.configService.get('HOST_PORT')}/${file.path}`
			return await this.userService.updateProfile(userId, displayName, imgPath)
	}
}
