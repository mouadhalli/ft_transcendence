import { Injectable } from '@nestjs/common';
import { UserDto } from './dto/User.dto';
import { WsException } from '@nestjs/websockets';
import { AuthService } from './auth/auth.service';

export enum ConnectionStatus {
	ONLINE = 'online',
	OFFLINE = 'offline',
	INGAME = 'ingame'
}

export class Connection {
    user_id: number
    status: ConnectionStatus
}

@Injectable()
export class GatewayConnectionService {

    constructor(
		private authservice: AuthService
	) {}

	private ConnectedSockets = new Map<string, Connection>();

    async authenticateSocket(userToken: string): Promise<UserDto> {
		const user: UserDto =  await this.authservice.verifyTokenAndExtractUser(userToken)
		if (!user)
			throw new WsException('unauthorized');
		return user
    }

	getSocketConectionStatus(socketId: string) {

		if (!socketId)
			return

		return this.ConnectedSockets.get(socketId).status
	}

	getSocketUserId(socketId: string) {

		if (!socketId)
			return

		return this.ConnectedSockets.get(socketId).user_id
	}

	saveSocketConnection(socketId: string, user: UserDto) {

		if (!socketId || !user)
			return
		const userConnection: Connection = {
			user_id: user.id,
			status: ConnectionStatus.ONLINE
		}

		this.ConnectedSockets.set(socketId, userConnection)

	}

	updateSocketConectionStatus(socketId: string, status: ConnectionStatus) {

		if (!socketId && !status)
			return

		let connection: Connection = this.ConnectedSockets.get(socketId)
		connection.status = status
		this.ConnectedSockets.set(socketId, connection)

	}

	removeSocketConnection(socketId: string) {

		if (!socketId)
			return

		this.ConnectedSockets.delete(socketId)

	}

}