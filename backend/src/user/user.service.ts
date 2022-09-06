import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserEntity } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDto } from 'src/dto/User.dto';
import { RelationshipEntity, Relationship_State } from './entities/friendship.entity';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(UserEntity)
			private usersRepository: Repository<UserEntity>,
		@InjectRepository(RelationshipEntity)
			private relationshipRepository: Repository<RelationshipEntity>
	) {}

	async findUserRelationships(userId: number, index: number, amount: number, type: Relationship_State) {
	
		const skip: number = index | 0
		const take : number = amount | 5
		const result = await this.relationshipRepository.find(
			{
				where: [
					{sender: {id: userId,}, state: type},
					{receiver: {id: userId}, state: type}
				],
				skip: skip,
				take: take,
				relations: ['sender', 'receiver'],
			}
		)
		return result.map(relationship => {
				const {sender, receiver} = relationship
				return sender.id !== userId ? sender : receiver
		})
	}

	async findRelationship(userId: number, targetId: number) {
		const relationship = await this.relationshipRepository.findOne({
			where: [
				{sender: {id: userId}, receiver: {id: targetId}},
				{sender: {id: targetId}, receiver: {id: userId}},
			],
			relations: ['sender', 'receiver'],
		})
		return relationship
	}

	async updateRelationship(userId: number, friendId: number, type: Relationship_State) {
		let Relationship = await this.findRelationship(userId, friendId)

		if (!Relationship && type === Relationship_State.FRIENDS)
			throw new BadRequestException("Relationship not found")

		Relationship.state = type

		Relationship = await this.relationshipRepository.save(Relationship).catch(error => {
			throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
		})
		return Relationship
	}

	async removeRelationship(userId: number, targetId: number) {

		let Relationship = await this.findRelationship(userId, targetId)

		if (!Relationship)
			throw new BadRequestException("relationship not found")
		
		await this.relationshipRepository.remove(Relationship)
	}

	async addFriend(userId: number, friendId: number) {

		let Friendship = await this.findRelationship(userId, friendId)

		if (Friendship)
			throw new BadRequestException("User already Friend")
		
		const User = await this.findUser(userId)
		const Friend = await this.findUser(friendId)

		Friendship = this.relationshipRepository.create({sender: User, receiver: Friend})
		
		Friendship = await this.relationshipRepository.save(Friendship).catch(error => {
			throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
		})
		
		return Friendship
	}

	async findAll(): Promise<UserEntity[]> {
		return await this.usersRepository.find();
	}

	async DeleteAll() {
		const allUsers = await this.usersRepository.find()
		allUsers.forEach( async (User) => {
			await this.usersRepository.remove(User)
		})
	}

	async findUser(id: number): Promise<UserEntity> {
		const user = await this.usersRepository.findOneBy({ id });
		return user
	}

	async getUserWithRelations(id: number): Promise<UserEntity> {
		const user = await this.usersRepository.findOne({
			relations: ['sentFriendRequests', 'receivedFriendRequests'],
			where: {id: id}
		})
		return user
	}

	async saveUser(userData: UserDto): Promise<UserDto> {
		let newUser: UserEntity = this.usersRepository.create(userData)
		newUser = await this.usersRepository.save(newUser).catch(error => {
			throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
		})
		return newUser
	}

	async updateProfile(id: number, newUsername: string, imgUrl: string): Promise<UserDto> {
		let user = await this.findUser( id );
		if (newUsername)
			user.username = newUsername
		if (imgUrl.length)
			user.imageUrl = imgUrl
		user = await this.usersRepository.save(user).catch(error => {
			throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
		})
		return user
	}

	async set2faState(userId: number, state: boolean): Promise<UserDto> {
		let user = await this.findUser( userId )
		if (!user)
			throw new HttpException('user not found', HttpStatus.NOT_FOUND)
		user.is2faEnabled = state
		user = await this.usersRepository.save(user).catch(error => {
			throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
	  	})
		return user
	}

	async Set2faSecret(userId: number, secret: string): Promise<UserDto> {
		let user = await this.findUser( userId )
		if (!user)
			throw new HttpException('user not found', HttpStatus.NOT_FOUND)
		user.twoFactorSecret = secret
		user = await this.usersRepository.save(user).catch(error => {
			throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
		})
		return user
	}

}