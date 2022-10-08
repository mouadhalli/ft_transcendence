import { BadRequestException, HttpException, HttpStatus, Injectable, InternalServerErrorException } from '@nestjs/common';
import { UserEntity } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { UserDto } from 'src/dto/User.dto';
import { RelationshipEntity, Relationship_State } from './entities/relationship.entity';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(UserEntity)
			private usersRepository: Repository<UserEntity>,
		@InjectRepository(RelationshipEntity)
			private relationshipRepository: Repository<RelationshipEntity>
	) {}


	async findUsersByUsernameLike(username: string) {
		return this.usersRepository.find({
			where: {
				username: Like(`%${username}%`)
			}
		})
	}

	async findUserRelationships(
		userId: number,
		index: number,
		amount: number,
		type: Relationship_State
	) {
		const skip: number = index | 0
		const take : number = amount | 10
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
				// const result = sender.id !== userId ? sender : receiver
				// const {is2faEnabled, twoFactorSecret, ...friendData}  = result
				// return friendData
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

	async updateRelationship(userId: number, friendId: number, state: Relationship_State) {
		let Relationship = await this.findRelationship(userId, friendId)

		if (!Relationship /* && state === Relationship_State.FRIENDS */)
			throw new BadRequestException("Relationship not found")
		if (state === 'friends' && Relationship.sender.id === userId)
			throw new BadRequestException("only the receiver can accept the friendship")
		if (Relationship.state === state)
			return Relationship
		Relationship.state = state
		Relationship = await this.relationshipRepository.save(Relationship).catch(error => {
			throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
		})
		return Relationship
	}

	async removeRelationship(userId: number, targetId: number) {

		let Relationship = await this.findRelationship(userId, targetId)

		if (!Relationship)
			throw new BadRequestException("relationship not found")
		
		await this.relationshipRepository.remove(Relationship).catch((error) => {
			throw new InternalServerErrorException(error.message)
		})
	}

	async addFriend(senderId: number, targetId: number) {
		let Friendship = await this.findRelationship(senderId, targetId)

		if (Friendship)
			throw new BadRequestException("User already Friend")
		
		const sender = await this.findUser(senderId)
		const receiver = await this.findUser(targetId)

		if (!sender || !receiver)
			throw new BadRequestException("Users not found")

		Friendship = this.relationshipRepository.create({sender: sender, receiver: receiver})
		
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
		const user: UserEntity = await this.usersRepository.findOneBy({ id });
		return user
	}

	async getUserWithRelations(id: number): Promise<UserEntity> {
		const user = await this.usersRepository.findOne({
			relations: ['sentFriendRequests', 'receivedFriendRequests'],
			where: {id: id}
		})
		return user
	}

	async saveUser(userData: UserDto) {
		let newUser: UserEntity = this.usersRepository.create(userData)
		newUser = await this.usersRepository.save(newUser).catch(error => {
			throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
		})
		return newUser
	}

	async updateProfile(id: number, displayName: string, imgPath: string) {
		let user: UserDto = await this.findUser( id );
		if (displayName) {
			const duplicate: UserDto = await this.usersRepository.findOneBy({displayName: displayName})
			if (duplicate && duplicate.id != id)
				throw new BadRequestException('displayName already in user')
			user.displayName = displayName
		}
		if (imgPath)
			user.imgPath = imgPath
		return await this.saveUser(user)
	}

	async set2faState(userId: number, state: boolean) {
		let user = await this.findUser( userId )
		if (!user)
			throw new HttpException('user not found', HttpStatus.NOT_FOUND)
		user.is2faEnabled = state
		user = await this.usersRepository.save(user).catch(error => {
			throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
	  	})
		return user
	}

	async Set2faSecret(userId: number, secret: string) {
		let user = await this.findUser( userId )
		if (!user)
			throw new HttpException('user not found', HttpStatus.NOT_FOUND)
		user.twoFactorSecret = secret
		user = await this.usersRepository.save(user).catch(error => {
			throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
		})
		return user
	}

	async findReceivedFriendRequests(userId: number) {
		const requests = await this.relationshipRepository.find({
			relations: {sender: true},
			select: {
				sender: {
					id: true,
					displayName: true
				}
			},
			where: {
				receiver: {id: userId},
				state: Relationship_State.PENDING
			},
		})
		return requests.map(request => request.sender)
	}

}