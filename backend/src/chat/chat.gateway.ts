import { BadRequestException, Logger, ParseIntPipe, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
	SubscribeMessage, WebSocketGateway,
	WebSocketServer, //OnGatewayInit,
	// OnGatewayConnection, OnGatewayDisconnect,
	MessageBody, ConnectedSocket, WsException
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
		@MessageBody() {userId, channelId, password}: joinChannelPayload
	) {

		const { success, channelName, error } = await this.chatService.joinChannel(userId, channelId, password)
	
		if (success === false)
			return { success, error }

		socket.join(channelName)
		return { success }
	}

	@SubscribeMessage('leave_channel')
	async leaveChannelEvent(
		@ConnectedSocket() socket: Socket,
		@MessageBody('userId', ParseIntPipe) userId: number,
		@MessageBody('userId', ParseIntPipe) channelId: number
	) {
		const channelName: string = await this.chatService.leaveChannel(userId, channelId)
		socket.leave(channelName)
	}

	@SubscribeMessage('send_message')
	async sendMessageEvent(
		@ConnectedSocket() socket: Socket,
		@MessageBody() { userId, channelId, content }: sendMsgPayload,
		) {
			const {success, cause, time, channelName, message} = await this.chatService.sendMessage(userId, channelId, content)

			if (success === false) {
				if (cause === 'kicked') {
					this.server.to(String(userId)).socketsLeave(channelName)
					return {success, cause}
				}
				return {success, cause, time}
			}

			// Users who blocked current user should not receive his messages
			const roomSockets = await this.server.in(channelName).fetchSockets()
			const roomMembers: roomMember[] = await this.connectionService.getUsesrIdFromSockets(roomSockets)

			for (let i = 0; i < roomMembers.length; i++) {
				if (userId === roomMembers[i].memberId)
					continue
				const isBlockingMe = await this.userService.isUserBlockingMe(userId, roomMembers[i].memberId)
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
		@MessageBody() { userId, receiverId, content }: sendDirectMsgPayload
	) {
	
		const { success, error, message } = await this.chatService.sendDirectMessage(userId, receiverId, content)

		if (success === false)
			return { success, error }

		socket.to(String(receiverId)).emit('receive_direct_message', message)

		return { success, message }
	}

}
