import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
	SubscribeMessage, WebSocketGateway,
	WebSocketServer, MessageBody,
	ConnectedSocket, WsException
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GatewayConnectionService } from 'src/connection.service';
import { ExceptionFilter } from 'src/gateway.filter';
import { ChatService } from './chat.service'
import { addMemberPayload, joinChannelPayload, sendDmPayload, sendMsgPayload } from './dtos/chat.dto';

@UseFilters(ExceptionFilter)
@UsePipes( new ValidationPipe({ whitelist: true, transform: true }))
@WebSocketGateway()
export class ChatGateway {

    constructor(
		private chatService: ChatService,
        private connectionService: GatewayConnectionService,
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
			await this.chatService.joinChannel(id, channelId, password)
			socket.join(channelId)
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
			await this.chatService.leaveChannel(id, channelId)
			socket.leave(channelId)
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

			const {success, error, cause, message} = await this.chatService.sendMessage(id, channelId, content)

			if (success === false) {
				if (cause !== 'muted')
					this.server.to(String(id)).socketsLeave(channelId)
				throw new WsException(error)
			}

			const roomSockets = await this.server.in(channelId).fetchSockets()

			await this.chatService.filterRoomMembers(roomSockets, id, channelId)

			socket.to(channelId).except('exceptionRoom').emit('receive_message', message)

			this.server.to(channelId).socketsLeave('exceptionRoom')
				
			return { success: true } 

		} catch (error) {
			return { success: false, error: error?.error }
		}

	}

	@SubscribeMessage('send_direct_message')
	async sendDirectMessageEvent(
		@ConnectedSocket() socket: Socket,
		@MessageBody() {channelId, content, type }: sendDmPayload
	) {
		try {
			
			const { id } = await this.connectionService.authenticateSocket(socket)
			const message = await this.chatService.sendDirectMessage(id, channelId, content, type)
			socket.to(channelId).emit('receive_direct_message', message)
			return { success: true }

		} catch (error) {
			return { success: false, error: error?.error }
		}
	}
	

	@SubscribeMessage('add-member')
	async addUserToChannel(
		@ConnectedSocket() socket: Socket,
		@MessageBody() { channelId, targetId }: addMemberPayload
	) {
		try {
			const { id:userId } = await this.connectionService.authenticateSocket(socket)
			await this.chatService.addUserToChannel(userId, targetId, channelId)

			this.server.to(String(targetId)).socketsJoin(channelId)
			this.server.to(String(targetId)).emit('update_joined')
			return { success: true }

		} catch (error) {
			return { success: false, error: error.error }
		}
	}

}
