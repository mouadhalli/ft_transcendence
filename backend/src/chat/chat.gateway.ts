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
		private chatService: ChatService,
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

	// @SubscribeMessage('join_direct_channel')
	// async joinDirectChannelEvent(
	// 	@ConnectedSocket() socket: Socket,
	// 	@MessageBody() channelId: string
	// ) {

	// 	const { id } = await this.connectionService.getUserFromToken(String(socket.handshake.headers?.token))
	// 	if ( !id )
	// 		return { success: false, error: "unauthorized" }

	// 	const {success, error} = await this.chatService.joinDirectChannel(id, channelId)

	// 	if (success === false)
	// 		return { success, error }

	// 	socket.join(channelId)
	// 	return { success }
	// }

	@SubscribeMessage('leave_channel')
	async leaveChannelEvent(
		@ConnectedSocket() socket: Socket,
		@MessageBody('channelId') channelId: string
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

		for (let i = 0; i < roomSockets.length; i++) {
			const memberToken = String(roomSockets[i].handshake.headers?.Token)
			const { id: memberId } = await this.connectionService.getUserFromToken(memberToken)
			if (!id)
				continue
			
			const isBlockingMe = await this.userService.isUserBlockingMe(id, memberId)
			const membership = await this.channelService.findMembershipByIds(memberId, channelId)

			if (isBlockingMe === true || (membership && membership.state === 'banned')) {
				roomSockets[i].join('exceptionRoom')
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
		@MessageBody() {channelId, content }: sendDirectMsgPayload
	) {
		const { id } = await this.connectionService.getUserFromToken(String(socket.handshake.headers?.token))
		if ( !id )
			return { success: false, error: "unauthorized" }

		const { success, error, message } = await this.chatService.sendDirectMessage(id, channelId, content)

		if (success === false)
			return { success, error }

		socket.to(channelId).emit('receive_direct_message', message)

		return { success, message }
	}

}
