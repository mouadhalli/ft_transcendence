import { Injectable } from '@nestjs/common';
import { UserDto } from './dto/User.dto';
import { AuthService } from './auth/auth.service';

export enum ConnectionStatus {
	ONLINE = 'online',
	OFFLINE = 'offline',
	INGAME = 'ingame'
}

export class Connection {
    sockets: String[]
    status: ConnectionStatus
}

@Injectable()
export class GatewayConnectionService {

    constructor(
		private authservice: AuthService,
	) {}

	private ConnectedSockets = new Map<number, Connection>();

    async getUserFromToken(userToken: string) {
		const user: UserDto =  await this.authservice.verifyTokenAndExtractUser(userToken)
		if (!user)
			return { id: -1 }
		return user
    }

	getUserConectionStatus(userId: number) {

		if (!userId)
			return
		
		const userConnection: Connection = this.ConnectedSockets.get(userId)
		return userConnection ? userConnection.status : ConnectionStatus.OFFLINE
	}

	saveUserSocketConnection(socketId: string, userId: number, init: ConnectionStatus = ConnectionStatus.ONLINE) {

		if (!socketId || !userId)
			return

		let userConnection: Connection = this.ConnectedSockets.get(userId)
		if (!userConnection) {
			userConnection = {
				sockets: [socketId],
				status: init
			}
		}
		else
			userConnection.sockets.push(socketId)
		this.ConnectedSockets.set(userId, userConnection)

	}

	updateUserSocketConectionStatus(userId: number, newStatus: ConnectionStatus) {

		if (!userId || !newStatus)
			return

		let userConnection: Connection = this.ConnectedSockets.get(userId)

		if (!userConnection)
			return

		userConnection.status = newStatus
		this.ConnectedSockets.set(userId, userConnection)
		
	}

	removeUserSocketConnection(userId: number, socketId: string) {

		if (!userId || !socketId)
			return

		let UserConnection: Connection = this.ConnectedSockets.get(userId)
		if (!UserConnection)
			return
		let { sockets } = UserConnection
		const index: number = sockets.indexOf(socketId)
		if (index != -1)
			sockets.splice(index)
		if (!sockets.length)
			this.removeUserConnection(userId)
	}

	removeUserConnection(userId: number) {
		if (!userId)
			return
		this.ConnectedSockets.delete(userId)
	}

}