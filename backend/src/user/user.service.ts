import { BadRequestException, HttpException, HttpStatus, Injectable, InternalServerErrorException } from '@nestjs/common';
import { UserEntity } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Like, Repository } from 'typeorm';
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


	async getUsersWhoBlockedMe(userId: number) {
		const result: RelationshipEntity[] = await this.relationshipRepository.find({
			relations: ['sender'],
			where: {
				receiver: {id: userId},
				state: Relationship_State.BLOCKED
			},
			select: {
				sender: {
					id: true,
					// displayName: true,
					// imgPath: true
				}
			}
		})
		return result.map( relationship => relationship.sender )
	}

	async getBlockedUsers(userId: number) {
		const result: RelationshipEntity[] = await this.relationshipRepository.find({
			relations: ['receiver'],
			where: {
				sender: {id: userId},
				state: Relationship_State.BLOCKED
			},
			select: {
				receiver: {
					id: true,
					// displayName: true,
					// imgPath: true
				}
			}
		})
		return result.map( relationship => relationship.receiver )
	}

	async isUserBlockingMe(myId: number, userId: number) {

		const membership: RelationshipEntity = await this.relationshipRepository.findOne({
			where: {
				receiver: { id: myId },
				sender: { id: userId },
				state: Relationship_State.BLOCKED
			}
		})

		return membership ? true : false
	}

	async findUsersByDisplayNameLike(userId: number, displayname: string) {
		const users: UserEntity[] = await this.usersRepository.find({
			where: {
				displayName: ILike(`%${displayname}%`),
			},
			select: {
				id: true,
				displayName: true,
				imgPath: true
			}
		})
		if (!users.length)
			return

		const UserstoHide: UserEntity[] = await this.getUsersWhoBlockedMe(userId)

		if (!UserstoHide.length)
			return users
	
		return users.filter((user) => {
			const found = UserstoHide.findIndex((userToHide) => userToHide.id === user.id)
			if (found === -1)
				return user
			return false
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

	// async updateRelationship(userId: number, friendId: number, state: Relationship_State) {
	// 	let Relationship = await this.findRelationship(userId, friendId)

	// 	if (!Relationship && state === Relationship_State.FRIENDS)
	// 		throw new BadRequestException("Relationship not found")
	// 	if (state === 'friends' && Relationship.sender.id === userId)
	// 		throw new BadRequestException("only the receiver can accept the friendship")
	// 	if (Relationship.state === state)
	// 		return Relationship
	// 	Relationship.state = state
	// 	Relationship = await this.relationshipRepository.save(Relationship).catch(error => {
	// 		throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
	// 	})
	// 	return Relationship
	// }

	async acceptFriendship(userId: number, friendId: number) {
		let Relationship = await this.findRelationship(userId, friendId)

		if (!Relationship)
			throw new BadRequestException("users are not friends")
		if (Relationship.sender.id === userId)
			throw new BadRequestException("only the receiver can accept the friendship")
		if (Relationship.state === 'friends')
			return Relationship

		Relationship.state = Relationship_State.FRIENDS
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

	async addFriend(user: UserDto, targetId: number) {
		let Friendship = await this.findRelationship(user.id, targetId)

		if (Friendship)
			throw new BadRequestException("User already Friend")
		
		const receiver = await this.findUser(targetId)

		if (!receiver)
			throw new BadRequestException("User not found")

		Friendship = this.relationshipRepository.create({sender: user, receiver: receiver})
		
		Friendship = await this.relationshipRepository.save(Friendship).catch(error => {
			throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
		})
		
		return Friendship
	}

	async blockUser(senderId: number, targetId: number) {
		let relationship = await this.findRelationship(senderId, targetId)

		if (relationship) {

			if (relationship.state === 'blocked' && relationship.receiver.id === senderId)
				return
			if (relationship.state === 'blocked')
				return relationship

			relationship.state = Relationship_State.BLOCKED
		}
		else {

			if (!await this.findUser(targetId))
				throw new BadRequestException("User not found")

			relationship = this.relationshipRepository.create({
				sender: {id: senderId},
				receiver: {id: targetId},
				state: Relationship_State.BLOCKED
			})
		}
	
		return await this.relationshipRepository.save(relationship).catch(error => {
			throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
		})
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