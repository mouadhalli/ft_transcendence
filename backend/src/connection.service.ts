import { Injectable } from '@nestjs/common';
import { UserDto } from './dto/User.dto';
import { WsException } from '@nestjs/websockets';
import { AuthService } from './auth/auth.service';
import { Socket } from 'socket.io';
import { roomMember } from './chat/chat.gateway';

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

/*
	To Do:
	YES	- need to double check if one user can have multiple sockets
		  if he opens multiple tabs
*/
	private ConnectedSockets = new Map<number, Connection>();

    async getUserFromToken(userToken: string): Promise<UserDto> {
		const user: UserDto =  await this.authservice.verifyTokenAndExtractUser(userToken)
		if (!user)
			throw new WsException('unauthorized');
		return user
    }

	// getSocketConectionStatus(socketId: string) {

	// 	if (!socketId)
	// 		return

	// 	return this.ConnectedSockets.get(socketId).status
	// }

	getUserConectionStatus(userId: number) {

		if (!userId)
			return
		
		const friendConnection: Connection = this.ConnectedSockets.get(userId)
		return friendConnection ? friendConnection.status : ConnectionStatus.OFFLINE
	}

	// getSocketUserId(socketId: string) {

	// 	if (!socketId)
	// 		return

	// 	return this.ConnectedSockets.get(socketId).user_id
	// }

	async getUsesrIdFromSockets(sockets: any[]) {

		// return sockets.filter( async (socket: Socket) => {
		// 	const token = String(socket.handshake.headers.token)
		// 	const { id } = await this.getUserFromToken(token)
		// 	return {memberId: id, memberSocket: socket.id}
		// })

		let roomMembers: roomMember[] = []

		for (let i = 0; i < sockets.length; i++) {
			const token = String(sockets[i].handshake.headers.token)
			const { id } = await this.getUserFromToken(token)
			const member: roomMember = {
				memberId: id,
				memberSocket: sockets[i]
			}
			roomMembers.push(member)
		}

		return roomMembers
	
	}

	saveSocketConnection(socketId: string, userId: number) {

		if (!socketId || !userId)
			return

		let userConnection: Connection = this.ConnectedSockets.get(userId)
		if (!userConnection) {
			userConnection = {
				sockets: [socketId],
				status: ConnectionStatus.ONLINE
			}
		}
		else
			userConnection.sockets.push(socketId)
		this.ConnectedSockets.set(userId, userConnection)

	}

	// updateSocketConectionStatus(userId: number, status: ConnectionStatus) {

	// 	if (!userId || !status)
	// 		return

	// 	let connection: Connection = this.ConnectedSockets.get(userId)

	// 	if (!connection)
	// 		return
		
			

	// }

	removeSocketConnection(userId: number, socketId: string) {

		if (!userId)
			return

		let UserConnection: Connection = this.ConnectedSockets.get(userId)
		if (!UserConnection)
			return
		let { sockets } = UserConnection
		const index: number = sockets.indexOf(socketId)
		if (index != -1)
			sockets.splice(index)
		if (!sockets.length)
			this.ConnectedSockets.delete(userId)
		else {
			UserConnection = {
				sockets: sockets,
				status: ConnectionStatus.OFFLINE
			}
			this.ConnectedSockets.set(userId, UserConnection)
		}
	}

	removeConnection(userId: number) {
		if (!userId)
			return
		this.ConnectedSockets.delete(userId)
	}

}