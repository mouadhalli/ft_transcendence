import { SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class gameGateway {
    constructor() {}

    @WebSocketServer()
    server: Server;

    @SubscribeMessage('event_name')
    eventLogicFunction(socket: Socket, Data: any) {
        socket.emit('to_client_event', "Hello world")
    }
}