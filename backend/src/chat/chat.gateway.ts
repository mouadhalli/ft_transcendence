import { Logger } from '@nestjs/common';
import {
	SubscribeMessage, WebSocketGateway,
	WebSocketServer, //OnGatewayInit,
	// OnGatewayConnection, OnGatewayDisconnect,
	MessageBody, ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GatewayConnectionService } from 'src/connection.service';
import { ChannelDto } from './channel/channel.dto';
import { ChatService } from './chat.service'

@WebSocketGateway()
export class ChatGateway {

    constructor(
		private readonly chatService: ChatService,
        private connectionService: GatewayConnectionService
	) {}

	@WebSocketServer()
	server: Server;

/*
	To Do:
		- handle exceptions:
			i need more clarity about this and how it combines with the front-end

		- Customise aknowledments:
			need to customise it depending on the front-end

*/

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
	async receiveMessageEvent( @ConnectedSocket() socket: Socket, @MessageBody() payload: any) {
		const { userId } = payload
		const {channel, message} = await this.chatService.sendMessage(userId, payload)
		socket.broadcast.to(channel.name).emit('receive_message', message)
	}

}
