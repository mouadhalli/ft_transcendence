import { BadRequestException, HttpException, HttpStatus, Injectable, InternalServerErrorException } from '@nestjs/common';
import { UserEntity } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Like, Repository } from 'typeorm';
import { UserDto } from 'src/dto/User.dto';
import { RelationshipEntity, Relationship_State } from './entities/relationship.entity';
import { ChannelService } from 'src/chat/channel/channel.service';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(UserEntity)
			private usersRepository: Repository<UserEntity>,
		@InjectRepository(RelationshipEntity)
			private relationshipRepository: Repository<RelationshipEntity>,
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

		const relationship: RelationshipEntity = await this.relationshipRepository.findOne({
			where: {
				receiver: { id: myId },
				sender: { id: userId },
				state: Relationship_State.BLOCKED
			}
		})

		return relationship ? true : false
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
				relations: ['sender', 'receiver', 'dm'],
			}
		)
		return result.map(relationship => {
			const {sender, receiver, dm} = relationship
			const friend: UserDto = sender.id !== userId ? sender : receiver
			return {...friend, channelId: dm.id}
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

	async acceptFriendship(userId: number, friendId: number) {

		if (!await this.findUser(friendId))
			throw new WsException('cannot find user')

		let Relationship = await this.findRelationship(userId, friendId)

		if (!Relationship)
			throw new WsException('users are not friends')
		if (Relationship.sender.id === userId)
			throw new WsException('only the receiver can accept the friendship')
		if (Relationship.state === 'friends')
			throw new WsException('already friends')

		Relationship.state = Relationship_State.FRIENDS
		Relationship = await this.relationshipRepository.save(Relationship).catch(error => {
			throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
		})

		return Relationship
	}

	async removeRelationShip(relationship: RelationshipEntity) {
		await this.relationshipRepository.remove(relationship).catch((error) => {
			throw new InternalServerErrorException(error.message)
		})
	}

	async addFriend(userId: number, targetId: number) {
		const user: UserDto = await this.findUser(userId)
		let Friendship = await this.findRelationship(userId, targetId)

		if (Friendship) {
			if (Friendship.state === 'friends')
				throw new WsException('User already Friend')
			throw new WsException('an invitation already sent')
		}
		
		const receiver = await this.findUser(targetId)

		if (!receiver)
			throw new WsException('User not found')

		Friendship = this.relationshipRepository.create({sender: user, receiver: receiver})
		
		Friendship = await this.relationshipRepository.save(Friendship).catch(error => {
			throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
		})

		return Friendship
	}

	async blockUser(senderId: number, targetId: number) {
		let relationship = await this.findRelationship(senderId, targetId)

		if (relationship) {

			if (relationship.state === 'blocked') {
				let error: string = 'user already blocked'
				if (relationship.receiver.id === senderId)
					error = 'you are blocked by this user'
				throw new WsException(error)
			}
			relationship.state = Relationship_State.BLOCKED
		}
		else {

			if (!await this.findUser(targetId))
				throw new WsException('user not found')

			relationship = this.relationshipRepository.create({
				sender: {id: senderId},
				receiver: {id: targetId},
				state: Relationship_State.BLOCKED
			})
		}
	
		await this.relationshipRepository.save(relationship).catch(error => {
			throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
		})
	}

	async findAll(): Promise<UserEntity[]> {
		return await this.usersRepository.find();
	}

	async findUser(id: number): Promise<UserEntity> {
		const user: UserEntity = await this.usersRepository.findOneBy({ id });
		return user
	}

	async findUserWithAuthData(userId: number): Promise<UserEntity> {
		return await this.usersRepository.findOne({
			where: {id: userId},
			select: ['id', 'displayName', 'imgPath', 'twoFactorSecret', 'is2faEnabled']
		})
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
				throw new BadRequestException("this Display Name is taken")
			user.displayName = displayName
		}
		if (imgPath)
			user.imgPath = imgPath
		return await this.saveUser(user)
	}

	async set2faState(userId: number, state: boolean) {
		let user = await this.findUserWithAuthData( userId )
		if (!user)
			throw new HttpException('user not found', HttpStatus.NOT_FOUND)
		user.is2faEnabled = state
		user = await this.usersRepository.save(user).catch(error => {
			throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
	  	})
		return user
	}

	async Set2faSecret(userId: number, secret: string) {
		let user = await this.findUserWithAuthData( userId )
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

	async getUsersSortedWithXp() {
		const users: UserDto[] = await this.usersRepository.find({
			order: { lvl: 'DESC' }
		})

		return users
	}

}