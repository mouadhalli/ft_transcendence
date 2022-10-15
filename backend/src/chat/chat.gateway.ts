import { Logger } from '@nestjs/common';
import {
	SubscribeMessage, WebSocketGateway,
	WebSocketServer, //OnGatewayInit,
	// OnGatewayConnection, OnGatewayDisconnect,
	MessageBody, ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GatewayConnectionService } from 'src/connection.service';
import { UserDto } from 'src/dto/User.dto';
import { UserService } from 'src/user/user.service';
import { ChannelDto } from './channel/channel.dto';
import { ChatService } from './chat.service'

export class roomMember {
	memberId: number
	memberSocket: Socket
}

@WebSocketGateway()
export class ChatGateway {

    constructor(
		private readonly chatService: ChatService,
        private connectionService: GatewayConnectionService,
		private userService: UserService
	) {}

	@WebSocketServer()
	server: Server;

	@SubscribeMessage('join_channel')
	async joinChannelEvent(@ConnectedSocket() socket: Socket, @MessageBody() payload: any) {
		const { userId } = payload
		const channelName: string = await this.chatService.joinChannel(userId, payload)
		socket.join(channelName)
		socket.broadcast.to(channelName).emit('receive_message', userId + " joined")
	}

	@SubscribeMessage('leave_channel')
	async leaveChannelEvent(@ConnectedSocket() socket: Socket, @MessageBody() payload: any) {
		const { userId } = payload
		const channelName: string = await this.chatService.leaveChannel(userId, payload)
		socket.leave(channelName)
		socket.broadcast.to(channelName).emit('receive_message', socket.id + " left")
	}

	@SubscribeMessage('send_message')
	async sendMessageEvent( @ConnectedSocket() socket: Socket, @MessageBody() payload: any) {
		try {

			const { userId } = payload
			const {success, channelName, message, cause} = await this.chatService.sendMessage(userId, payload)


			if (success === false)
				return {success, cause}

			// Users who blocked current user should not receive his messages
			const roomSockets = await this.server.in(channelName).fetchSockets()
			const roomMembers: roomMember[] = await this.connectionService.getUsesrIdFromSockets(roomSockets)

			roomMembers.forEach( async ({memberId, memberSocket}) => {
				const isBlockingMe = await this.userService.isUserBlockingMe(userId, memberId)
				if (isBlockingMe === true)
					memberSocket.join('exceptionRoom')
			})
		
			socket.broadcast.to(channelName).except('exceptionRoom').emit('receive_message', message)
			this.server.socketsLeave('exceptionRoom')

		} catch(error) {
			throw error
		}
	}

	@SubscribeMessage('send_direct_message')
	async sendDirectMessageEvent( @ConnectedSocket() socket: Socket, @MessageBody() payload: any) {
		try {

			const { userId, receiverId, content } = payload
			const message = await this.chatService.sendDirectMessage(userId, receiverId, content)
		
			socket.to(receiverId).emit('receive_message', message)

		} catch(error) {
			throw error
		}
	}

}
