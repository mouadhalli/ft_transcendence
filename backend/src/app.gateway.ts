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

@WebSocketGateway({
	cors: '*'
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	
	constructor(
		private connectionService: GatewayConnectionService
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
}
