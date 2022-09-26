import { Logger } from '@nestjs/common';
import {
	SubscribeMessage, WebSocketGateway,
	WebSocketServer, //OnGatewayInit,
	// OnGatewayConnection, OnGatewayDisconnect,
	MessageBody, ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service'

@WebSocketGateway()
export class ChatGateway {

    constructor( private readonly Chatservice: ChatService ) {}

	@WebSocketServer()
	server: Server;

	@SubscribeMessage('join_channel')
	async joinChannelEvent(@ConnectedSocket() socket: Socket, @MessageBody() channelName: string) {
		socket.broadcast.to(channelName).emit('receive_message', socket.id + " joined")
	}

	@SubscribeMessage('leave_channel')
	async leaveChannelEvent(@ConnectedSocket() socket: Socket, @MessageBody() channelName: string) {
		socket.leave(channelName)
		socket.broadcast.to(channelName).emit('receive_message', socket.id + " left")
	}

	@SubscribeMessage('send_message')
	async receiveMessageEvent( @ConnectedSocket() socket: Socket, @MessageBody() content: any) {
		socket.broadcast.to(content.channel_name).emit('receive_message', content)
	}
}
