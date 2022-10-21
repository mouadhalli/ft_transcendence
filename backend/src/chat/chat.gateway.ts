import { Logger, ParseIntPipe, UseFilters } from '@nestjs/common';
import {
	SubscribeMessage, WebSocketGateway,
	WebSocketServer, MessageBody,
	ConnectedSocket, WsException
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GatewayConnectionService } from 'src/connection.service';
import { HttpExceptionFilter } from 'src/gateway.filter';
import { UserService } from 'src/user/user.service';
import { ChannelService } from './channel/channel.service';
import { ChatService } from './chat.service'
import { joinChannelPayload, sendDirectMsgPayload, sendMsgPayload } from './dtos/chat.dto';

export class roomMember {
	memberId: number
	memberSocket: Socket
}

@UseFilters(HttpExceptionFilter)
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
	async joinChannelEvent(
		@ConnectedSocket() socket: Socket,
		@MessageBody() { channelId, password }: joinChannelPayload
	) {

		const { id } = await this.connectionService.getUserFromToken(String(socket.handshake.headers?.token))
		if ( !id )
			return { success: false, error: "unauthorized" }

		const { success, channelName, error } = await this.chatService.joinChannel(id, channelId, password)
	
		if (success === false)
			return { success, error }

		socket.join(channelName)
		return { success }
	}

	@SubscribeMessage('leave_channel')
	async leaveChannelEvent(
		@ConnectedSocket() socket: Socket,
		@MessageBody('channelId', ParseIntPipe) channelId: number
	) {

		const { id } = await this.connectionService.getUserFromToken(String(socket.handshake.headers?.token))

		if ( !id )
			return { success: false, error: "unauthorized" }

		const { success, error, channelName } = await this.chatService.leaveChannel(id, channelId)
	
		if (success === false)
			return { success, error }

		socket.leave(channelName)
		return { success }
	}

	@SubscribeMessage('send_message')
	async sendMessageEvent(
		@ConnectedSocket() socket: Socket,
		@MessageBody() {channelId, content }: sendMsgPayload,
	) {
			
		const { id } = await this.connectionService.getUserFromToken(String(socket.handshake.headers?.token))
		if ( !id )
			return { success: false, error: "unauthorized" }

		const {success, cause, time, channelName, message} = await this.chatService.sendMessage(id, channelId, content)

		if (success === false) {
			if (cause === 'kicked') {
				this.server.to(String(id)).socketsLeave(channelName)
				return { success, cause }
			}
			return {success, cause, time}
		}

		// Users who blocked current user should not receive his messages
		const roomSockets = await this.server.in(channelName).fetchSockets()
		const roomMembers: roomMember[] = await this.connectionService.getUsesrIdFromSockets(roomSockets)

		for (let i = 0; i < roomMembers.length; i++) {
			if (id === roomMembers[i].memberId)
				continue
			const isBlockingMe = await this.userService.isUserBlockingMe(id, roomMembers[i].memberId)
			const membership = await this.channelService.findMembership2(roomMembers[i].memberId, channelId)

			if (isBlockingMe === true || (membership && membership.state === 'banned')) {
				roomMembers[i].memberSocket.join('exceptionRoom')
			}
		}
		// sending the event to all room sockets except those in axceptionRoom
		socket.to(channelName).except('exceptionRoom').emit('receive_message', message)
		this.server.socketsLeave('exceptionRoom')
		
		return { success } 
	}

	@SubscribeMessage('send_direct_message')
	async sendDirectMessageEvent(
		@ConnectedSocket() socket: Socket,
		@MessageBody() {receiverId, content }: sendDirectMsgPayload
	) {
	
		const { id } = await this.connectionService.getUserFromToken(String(socket.handshake.headers?.token))
		if ( !id )
			return { success: false, error: "unauthorized" }

		const { success, error, message } = await this.chatService.sendDirectMessage(id, receiverId, content)

		if (success === false)
			return { success, error }

		socket.to(String(receiverId)).emit('receive_direct_message', message)

		return { success, message }
	}

}
