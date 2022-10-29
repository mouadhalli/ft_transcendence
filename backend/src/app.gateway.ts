import { BadRequestException, Logger, ParseIntPipe, UnauthorizedException, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  SubscribeMessage, WebSocketGateway,
  OnGatewayInit, WebSocketServer,
  OnGatewayConnection, OnGatewayDisconnect,
  MessageBody, ConnectedSocket, WsException
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';
import { ChannelService } from './chat/channel/channel.service';
import { directChannelDto } from './chat/dtos/channel.dto';
import { GatewayConnectionService } from './connection.service';
import { ExceptionFilter } from './gateway.filter';
import { UserService } from './user/user.service';

@UseFilters(ExceptionFilter)
@WebSocketGateway({
	cors: `http://${process.env.APP_NAME}:${process.env.FRONT_END_PORT}`,
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

			const { id } = await this.connectionService.authenticateSocket(socket)
	
			this.connectionService.saveUserSocketConnection(socket.id, id)

			// grouping user sockets in a room so i can ping all user Tabs easily
			socket.join(String(id))

			const channels = await this.channelService.findJoinedChannels(id)
			const dms = await this.channelService.findUserDmChannels(id)
			channels.forEach(channel => socket.join(channel.id))
			dms.forEach(dm => socket.join(dm.id))

		} catch(error) {
			socket.disconnect()
		}
	}

	async handleDisconnect(socket: Socket) {
		try {
			const { id } = await this.connectionService.authenticateSocket(socket)

			this.connectionService.removeUserSocketConnection(id, socket.id)

			this.logger.log(socket.id + ' disconnected')
		} catch (error) {
			this.logger.log(socket.id + ' disconnected')
		}
	}

	@SubscribeMessage('logout')
	async logoutSocket(@ConnectedSocket() socket: Socket) {
		try {
			const { id } = await this.connectionService.authenticateSocket(socket)

			this.connectionService.removeUserConnection(id)
			this.server.to(String(id)).disconnectSockets()
		}
		catch (error) {
			socket.disconnect()
		}
	}

	@SubscribeMessage('user-status')
	async getUserConnectionStatus(@ConnectedSocket() socket: Socket, @MessageBody(ParseIntPipe) userId: number) {

		try {
			await this.connectionService.authenticateSocket(socket)
	
			const status = this.connectionService.getUserConectionStatus(userId)

			return { success: true, status }

		} catch (error) {
			return { success: false, error: error.error }
		}
	}

	@SubscribeMessage('send-friend-request')
	async sendFriendRequest(@ConnectedSocket() socket: Socket, @MessageBody(ParseIntPipe) targetId: number) {

		try {

			const { id } = await this.connectionService.authenticateSocket(socket)
			
			if (id === targetId)
				throw new WsException('invalid target id')
			
			await this.userService.addFriend(id, targetId)
	
			const { id: channelId }: directChannelDto = await this.channelService.createDmChannel(id, targetId)
			
			socket.join(channelId)
	
			socket.to(String(targetId)).emit('update-friends')
	
			return { success: true }

		} catch (error) {
			return { success: false, error: error.error }
		}
	}

	@SubscribeMessage('accept-friend-request')
	async acceptFriendRequest(@ConnectedSocket() socket: Socket, @MessageBody(ParseIntPipe) targetId: number) {
		try {
			const { id } = await this.connectionService.authenticateSocket(socket)
			
			if (id === targetId)
				throw new WsException('invalid target id')
			
			await this.userService.acceptFriendship(id, targetId)
		
			const { id: channelId }: directChannelDto = await this.channelService.findDmchannelByMembers(id, targetId)
			
			socket.join(channelId)
			socket.to(String(targetId)).emit('update-friends')
	
			return { success: true }

		} catch (error) {
			return { success: false, error: error.error }
		}
	}

	@SubscribeMessage('remove-relationship')
	async removeUserFromFriends(@ConnectedSocket() socket: Socket, @MessageBody(ParseIntPipe) targetId: number) {
		
		try {
			const { id } = await this.connectionService.authenticateSocket(socket)
			
			if (id === targetId)
				throw new WsException('invalid target id')
			
			await this.channelService.deleteDmChannel(id, targetId)
	
			socket.to(String(targetId)).emit('update-friends')
			return { success: true }

		} catch (error) {
			return { success: false, error: error.error }
		}
	}

	@SubscribeMessage('block-user')
	async blockUser(@ConnectedSocket() socket: Socket, @MessageBody(ParseIntPipe) targetId: number) {
		
		try {
			const { id } = await this.connectionService.authenticateSocket(socket)
			
			if (id === targetId)
				throw new WsException('invalid target id')
			
			await this.userService.blockUser(id, targetId)
	
			socket.to(String(targetId)).emit('update-friends')

			return { success: true }

		} catch (error) {
			return { success: false, error: error.error }
		}
	}

}
