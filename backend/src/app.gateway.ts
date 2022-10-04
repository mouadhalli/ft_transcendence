import { Logger, ParseIntPipe } from '@nestjs/common';
import {
  SubscribeMessage, WebSocketGateway,
  OnGatewayInit, WebSocketServer,
  OnGatewayConnection, OnGatewayDisconnect,
  MessageBody, ConnectedSocket
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';
import { GatewayConnectionService, ConnectionStatus } from './connection.service';
import { UserDto } from './dto/User.dto';
import { Relationship_State } from './user/entities/friendship.entity';
import { UserService } from './user/user.service';

/*
	To Do:
		- when a user change his connection status needs to update all his friends
*/

@WebSocketGateway({
	cors: '*'
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	
	constructor(
		private connectionService: GatewayConnectionService,
		private userService: UserService
	){}

	@WebSocketServer()
	server: Server;
		
	private logger: Logger = new Logger('AppGateway')

	afterInit(server: Server) {
		this.logger.log('App Gateway inisialized')
	}

		async handleConnection(socket: Socket, ...args: any[]) {
			try {
				// this.server.sockets.sockets.forEach(element => {
				// 	console.log(element.id)
				// });
				this.logger.log(socket.id + ' connected')
				// const userToken: string = socket.handshake.auth.token
				// extracting token from headers because postmane don't support auth
				const userToken: any = socket.handshake.headers.token
				const { id } = await this.connectionService.getUserFromToken(userToken)
				this.connectionService.saveSocketConnection(socket.id, id)
				socket.join(String(id))
			} catch(error) {
				socket.disconnect()
				socket._error(error)
			}
	}

	async handleDisconnect(socket: Socket) {
		try {
			this.logger.log(socket.id + ' disconnected')
			const userToken: any = socket.handshake.headers.token
			const { id } = await this.connectionService.getUserFromToken(userToken)
			this.connectionService.removeSocketConnection(id, socket.id)
		} catch (error) {
			// console.log(error)
			socket._error(error)
			// socket.disconnect()
		}
	}

	@SubscribeMessage('logout')
	async logoutSocket(@ConnectedSocket() socket: Socket) {
		try {
			const userToken: any = socket.handshake.headers.token
			const { id } = await this.connectionService.getUserFromToken(userToken)
			this.connectionService.removeConnection(id)
			this.server.to(String(id)).disconnectSockets()
		}
		catch (error) {
			// console.log(error)
			socket._error(error)
		}
	}

	@SubscribeMessage('frineds-status')
	async getFriendsConnectionStatus(@ConnectedSocket() socket: Socket, @MessageBody(ParseIntPipe) userId: number) {
		const frineds = await this.userService.findUserRelationships(userId, 0, 999, Relationship_State.FRIENDS)

		const friendsConnectionStatus = frineds.map(friend => {
			const FriendStatus = this.connectionService.getUserConectionStatus(friend.id)
			return {friendId: friend.id, status: FriendStatus}
		})
		socket.to(String(userId)).emit('friends-status', friendsConnectionStatus)
	}
}
