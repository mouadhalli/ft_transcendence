import { Logger, ParseIntPipe, UnauthorizedException, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  SubscribeMessage, WebSocketGateway,
  OnGatewayInit, WebSocketServer,
  OnGatewayConnection, OnGatewayDisconnect,
  MessageBody, ConnectedSocket, WsException
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';
import { ChannelService } from './chat/channel/channel.service';
import { directChannelDto } from './chat/dtos/channel.dto';
import { GatewayConnectionService, ConnectionStatus } from './connection.service';
import { HttpExceptionFilter } from './gateway.filter';
import { Relationship_State } from './user/entities/relationship.entity';
import { UserService } from './user/user.service';

@UseFilters(HttpExceptionFilter)
@WebSocketGateway({
	cors: '*',
	// Credential: true
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	
	constructor(
		private connectionService: GatewayConnectionService,
		private userService: UserService,
		private channelService: ChannelService
	){}

	@WebSocketServer()
	server: Server;
		
	private logger: Logger = new Logger('AppGateway')

	afterInit(server: Server) {
		this.logger.log('App Gateway inisialized')
	}

	async handleConnection(socket: Socket, ...args: any[]) {
		try {

			this.logger.log(socket.id + ' connected')

			const userToken: string = String(socket.handshake.headers.token)
			const { id } = await this.connectionService.getUserFromToken(userToken)

			if (!id)
				throw new WsException('unAuthorized')

			this.connectionService.saveUserSocketConnection(socket.id, id)

			// grouping user sockets in a room so i can ping all user Tabs easily
			socket.join(String(id))

			const channels = await this.channelService.findJoinedChannels(id)
			const dms = await this.channelService.findUserDmChannels(id)
			channels.forEach(channel => socket.join(channel.name))
			dms.forEach(channel => socket.join(channel.id))

		} catch(error) {
			socket._error(error)
			socket.disconnect()
			throw new WsException(error)
		}
	}

	async handleDisconnect(socket: Socket) {
		try {
			this.logger.log(socket.id + ' disconnected')
			const userToken: any = socket.handshake.headers.token
			const { id } = await this.connectionService.getUserFromToken(userToken)

			if (!id)
				throw new WsException('invalid access token')

			this.connectionService.removeUserSocketConnection(id, socket.id)
			socket.leave(String(id))
			
		} catch (error) {
			socket._error(error)
			throw new WsException(error)
		}
	}

	@SubscribeMessage('logout')
	async logoutSocket(@ConnectedSocket() socket: Socket) {
		try {
			const userToken: any = socket.handshake.headers.token
			const { id } = await this.connectionService.getUserFromToken(userToken)

			if (!id)
				throw new WsException('unAuthorized')

			this.connectionService.removeUserConnection(id)
			this.server.to(String(id)).disconnectSockets()
		}
		catch (error) {
			socket._error(error)
			socket.disconnect()
			throw new WsException(error)
		}
	}

	@SubscribeMessage('user-status')
	async getUserConnectionStatus(@ConnectedSocket() socket: Socket, @MessageBody(ParseIntPipe) userId: number) {

		const userToken: any = socket.handshake.headers.token
		const { id } = await this.connectionService.getUserFromToken(userToken)

		if (!id)
			return {success: false, error: 'unAuthorized'}

		const userStatus = this.connectionService.getUserConectionStatus(userId)

		socket.emit('user-status', userStatus)
	}

	@SubscribeMessage('send-friend-request')
	async sendFriendRequest(@ConnectedSocket() socket: Socket, @MessageBody(ParseIntPipe) targetId: number) {

		const userToken: any = socket.handshake.headers.token
		const { id } = await this.connectionService.getUserFromToken(userToken)

		if (!id)
			return {success: false, error: 'unAuthorized'}

		if (!targetId || id === targetId)
			return {success: false, error: 'invalid target id'}
		
		const { success, error, user } = await this.userService.addFriend(id, targetId)

		if (success === false)
			return { success, error }

		const channel = await this.channelService.createDmChannel(id, targetId)
		socket.join(channel.id)

		socket.to(String(targetId)).emit('update-requests', user)

		return { success }
	}

	@SubscribeMessage('accept-friend-request')
	async acceptFriendRequest(@ConnectedSocket() socket: Socket, @MessageBody(ParseIntPipe) targetId: number) {
		
		const userToken: any = socket.handshake.headers.token
		const { id } = await this.connectionService.getUserFromToken(userToken)

		if (!id)
			return {success: false, error: 'unAuthorized'}
		
		if (!targetId || id === targetId)
			return {success: false, error: 'invalid target id'}
		
		const { success, error } = await this.userService.acceptFriendship(id, targetId)

		if (success === false)
			return { success, error }
	
		const channel = await this.channelService.findDmchannelByMembers(id, targetId)
		
		socket.join(channel.id)
		socket.to(String(targetId)).emit('', channel)

		return { success }
	}

	@SubscribeMessage('remove-from-friends')
	async removeUserFromFriends(@ConnectedSocket() socket: Socket, @MessageBody(ParseIntPipe) targetId: number) {
		
		const userToken: any = socket.handshake.headers.token
		const { id } = await this.connectionService.getUserFromToken(userToken)

		if (!id)
			return {success: false, error: 'unAuthorized'}
		
		if (!targetId || id === targetId)
			return {success: false, error: 'invalid target id'}
		
		// const { success, error } = await this.userService.acceptFriendship(id, targetId)
		const { success, error } = await this.channelService.deleteDmChannel(id, targetId)

		if (success === false)
			return { success, error }
	
		
		socket.to(String(targetId)).emit('')

		return { success }
	}

}
