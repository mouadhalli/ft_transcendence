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
import { ChannelService } from './channel/channel.service';
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
		private userService: UserService,
		private channelService: ChannelService
	) {}

	@WebSocketServer()
	server: Server;

	@SubscribeMessage('join_channel')
	async joinChannelEvent(@ConnectedSocket() socket: Socket, @MessageBody() payload: any) {
		const { success, channelName, error } = await this.chatService.joinChannel(payload)
	
		if (success === false)
			return { success, error }

		socket.join(channelName)
		return { success }
	}

	@SubscribeMessage('leave_channel')
	async leaveChannelEvent(@ConnectedSocket() socket: Socket, @MessageBody() payload: any) {
		const channelName: string = await this.chatService.leaveChannel(payload)
		socket.leave(channelName)
	}

	@SubscribeMessage('send_message')
	async sendMessageEvent( @ConnectedSocket() socket: Socket, @MessageBody() payload: any) {
		// try {

			const {success, cause, time, channelName, message} = await this.chatService.sendMessage(payload)

			if (success === false) {
				if (cause === 'kicked') {
					this.server.to(String(payload.userId)).socketsLeave(channelName)
					return {success, cause}
				}
				return {success, cause, time}
			}

			// Users who blocked current user should not receive his messages
			const roomSockets = await this.server.in(channelName).fetchSockets()
			const roomMembers: roomMember[] = await this.connectionService.getUsesrIdFromSockets(roomSockets)

			for (let i = 0; i < roomMembers.length; i++) {
				if (payload.userId === roomMembers[i].memberId)
					continue
				const isBlockingMe = await this.userService.isUserBlockingMe(payload.userId, roomMembers[i].memberId)
				const membership = await this.channelService.findMembership2(roomMembers[i].memberId, payload.channelId)

				if (isBlockingMe === true || (membership && membership.state === 'banned')) {
					roomMembers[i].memberSocket.join('exceptionRoom')
				}
			}
			// sending the event to all room sockets except those in axceptionRoom
			socket.to(channelName).except('exceptionRoom').emit('receive_message', message)
			this.server.socketsLeave('exceptionRoom')
		
			return { success } 

		// } catch(error) {
		// 	throw error
		// }
	}

	@SubscribeMessage('send_direct_message')
	async sendDirectMessageEvent( @ConnectedSocket() socket: Socket, @MessageBody() payload: any) {
		// try {

			const { userId, receiverId, content } = payload
			const { success, error, message } = await this.chatService.sendDirectMessage(userId, receiverId, content)
		
			socket.to(receiverId).emit('receive_direct_message', message)

		// } catch(error) {
		// 	console.log(error)
		// 	throw error
		// }
	}

}
