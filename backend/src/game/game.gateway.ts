import { OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';

let players: any = {}
let waiting: any[] = [];

@WebSocketGateway({
    //cors: { origin: 'http://localhost:8080/' }
    cors: { origin: '*' },
    // namespace: '/chat'
})

export class gameGateway implements OnGatewayDisconnect {
    constructor() {}

    @WebSocketServer()
    server: Server;

    @SubscribeMessage('event_name')
    eventLogicFunction(socket: Socket, Data: any) {
        socket.emit('to_client_event', "Hello world")
        
    }
    
    @SubscribeMessage('somting')
    afficher(socket: Socket, Data: any) {
        //socket.emit('to_client_event', "Hello world")
        //console.log("hi");
        //console.log(Data)
        socket.emit('mouse', Data)
        // for (let id in players)
        // {
        //     if (players[id] === )
        // }
    }

    @SubscribeMessage('connection')
    conn(socket: Socket, Data: any) {
        socket.volatile.emit('connection', "Hello world")
        console.log("Hi user")
        console.log(socket.id)
        players[socket.id] = Data;
        let i:any = waiting.length;
        if (i % 2 != 0)
        {
            console.log("hi abc " + i)
            waiting.push(socket);
        }
        else
        {
            console.log("abc " + i)
            waiting.push(socket);
            // waiting[socket.id] = socket;
        }
        console.log(players);
        // socket.on('disconnect', socket: Socket)
    }
    
    handleDisconnect(socket: Socket){
        delete players[socket.id]
        console.log("finaly " + socket.id)
        console.log(players);
    }
}