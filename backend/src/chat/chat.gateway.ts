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
		try {
			const { id } = await this.connectionService.authenticateSocket(socket)
			const channelName: string = await this.chatService.joinChannel(id, channelId, password)
			socket.join(channelName)
			return { success: true }

		} catch (error) {
			return { success: false, error: error?.error }
		}
	}

	@SubscribeMessage('leave_channel')
	async leaveChannelEvent(
		@ConnectedSocket() socket: Socket,
		@MessageBody('channelId') channelId: string
	) {

		try {
			const { id } = await this.connectionService.authenticateSocket(socket)
			const channelName: string = await this.chatService.leaveChannel(id, channelId)
			socket.leave(channelName)
			return { success: true }


		} catch (error) {
			return { success: false, error: error?.error }
		}
	}

	@SubscribeMessage('send_message')
	async sendMessageEvent(
		@ConnectedSocket() socket: Socket,
		@MessageBody() {channelId, content }: sendMsgPayload,
	) {
		
		try {
			const { id } = await this.connectionService.authenticateSocket(socket)
		 
			const {success, error, channelName, message} = await this.chatService.sendMessage(id, channelId, content)
			if (success === false) {
				this.server.to(String(id)).socketsLeave(channelName)
				throw new WsException(error)
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
				
			return { success: true } 

		} catch (error) {
			return { success: false, error: error?.error }
		}

	}

	@SubscribeMessage('send_direct_message')
	async sendDirectMessageEvent(
		@ConnectedSocket() socket: Socket,
		@MessageBody() {channelId, content }: sendDirectMsgPayload
	) {
		try {
			const { id } = await this.connectionService.authenticateSocket(socket)
			const message = await this.chatService.sendDirectMessage(id, channelId, content)
			socket.to(channelId).emit('receive_direct_message', message)
			return { success: true }

		} catch (error) {
			return { success: false, error: error?.error }
		}
	}

}
