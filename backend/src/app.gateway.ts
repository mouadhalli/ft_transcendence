import { Logger } from '@nestjs/common';
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
		
	private logger: Logger = new Logger('AppGateway')

	afterInit(server: Server) {
		this.logger.log('App Gateway inisialized')
	}

	async handleConnection(socket: Socket, ...args: any[]) {
		try {
			// const userToken: string = socket.handshake.auth.token
			// extracting token from headers because postmane don't support auth
			const userToken: any = socket.handshake.headers.token
			const user: UserDto = await this.connectionService.authenticateSocket(userToken)

			this.connectionService.saveSocketConnection(socket.id, user)
			this.logger.log(socket.id + ' connected')
		} catch(error) {
			console.log(error)
			socket._error(error)
		}
	}

	handleDisconnect(socket: Socket) {
		this.connectionService.updateSocketConectionStatus(socket.id, ConnectionStatus.OFFLINE)
		this.logger.log(socket.id + ' disconnected')
	}

	@SubscribeMessage('logout')
	logoutSocket(@ConnectedSocket()socket: Socket) {
		this.connectionService.removeSocketConnection(socket.id)
		socket.disconnect()
	}

	@SubscribeMessage('frineds-status')
	async getFriendsConnectionStatus(@ConnectedSocket()socket: Socket) {
		const userId: number = this.connectionService.getSocketUserId(socket.id)
		const frineds = await this.userService.findUserRelationships(userId, 0, 999, Relationship_State.FRIENDS)

		const result = frineds.map(friend => {
			return this.connectionService.getUserConectionStatus(friend.id)
		})

		socket.emit('friends-status', result)
	}
}
