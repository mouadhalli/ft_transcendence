import { OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';

let players: any = {}
let waiting: any[] = [];
const windw: number = 1300;
const windh: number = 624;
// const ball = {
//     x:windw/2,
//     y:windh/2,
//     r:15,
//     dx:6,
//     dy:6,
// }
let ball_room: any = {};
// let ballon:typeof ball = ball;

@WebSocketGateway({
    //cors: { origin: 'http://localhost:8080/' }
    cors: { origin: '*' },
    namespace: '/play'
})

export class gameGateway implements OnGatewayDisconnect {
    constructor() {}

    @WebSocketServer()
    server: Server;

    // @SubscribeMessage('event_name')
    // eventLogicFunction(socket: Socket, Data: any) {
    //     socket.emit('to_client_event', "Hello world")
    // }
    
    @SubscribeMessage('update_mouse')
    afficher(socket: Socket, Data: any) {
        if (Data.room !== "" && Data.pos != 0)
            this.server.to(Data.room).volatile.emit('mouse', Data);
    }

    @SubscribeMessage('ball_move')
    handelball(socket: Socket, Data: any) {        
        if (Data.room !== '' && ball_room[Data.room] !== undefined)
        {
            if (ball_room[Data.room].x - ball_room[Data.room].r < 0 )
            {
                if (ball_room[Data.room].y >= Data.ped1 && ball_room[Data.room].y <= Data.ped1 + (windw / 14)) {
                    ball_room[Data.room].dx = -ball_room[Data.room].dx + 0; 
                }
                else
                {
                    this.server.to(Data.room).emit('reset', "");
                    ball_room[Data.room].p1 += 0.5;
                    console.log(ball_room[Data.room].p1);
                    if (ball_room[Data.room].p1 < 4.5)
                    {
                        setTimeout(() => {
                            ball_room[Data.room].x = windw / 2 + 50;
                            ball_room[Data.room].y = windh / 2 + 50;
                            ball_room[Data.room].dx = 5;
                            ball_room[Data.room].dy = 5;
                            // if (ball_room[Data.room].p1 < 4.5)
                            this.server.to(Data.room).emit('restart', ball_room[Data.room]);
                        }, 1000);
                    }  
                    else if (socket.id === Data.room)
                        socket.emit('lost', "");
                    else
                        socket.emit('won', "");
                }
            }
            ball_room[Data.room].x = ball_room[Data.room].x + ball_room[Data.room].dx;
            ball_room[Data.room].y = ball_room[Data.room].y + ball_room[Data.room].dy;
            if(ball_room[Data.room].x + ball_room[Data.room].r >= windw){
                ball_room[Data.room].dx =- ball_room[Data.room].dx-0;  
            }
            if(ball_room[Data.room].y + ball_room[Data.room].r > windh || ball_room[Data.room].y-ball_room[Data.room].r < 0){
                ball_room[Data.room].dy=- ball_room[Data.room].dy;
            }
            this.server.to(Data.room).volatile.emit('ball', ball_room[Data.room]);
        }
    }

    @SubscribeMessage('disc')
    disc(socket: Socket, Data: any) {
        socket.emit("fin", Data);
    }

    @SubscribeMessage('connection')
    conn(socket: Socket, Data: any) {
        console.log("Hi user " + socket.id)
        players[socket.id] = "";

        let i:any = waiting.length;
        let f_player : Socket;
        if (i % 2 != 0)//someone is waiting
        {
            f_player = waiting.at(0);
            socket.join(f_player.id);
            waiting.pop();
            ball_room[f_player.id] = Data;
            this.server.to(f_player.id).emit('connection', "start")
            const Datas = {room:f_player.id, yourplace:1}
            f_player.emit("take_pos", Datas)
            socket.emit("take_pos", {...Datas, yourplace:2})

            players[socket.id] = f_player;
            players[f_player.id] = socket;

            // f_player.volatile.emit('connection', "start")
        }
        else
        {
            //ball_room[socket.id] = Data;
            waiting.push(socket);
            socket.emit('connection', "wait")
        }
        //console.log(players);
    }
    
    handleDisconnect(socket: Socket){
        // console.log(players[socket.id] + "|2");
        if (players[socket.id] !== undefined && players[socket.id] !== "")
        {
            let tmp: Socket;
            tmp = players[socket.id];
            tmp.emit("done", "");
            tmp.emit("won", "");
            players[tmp.id] = "";
        }
        delete players[socket.id]
        if (waiting.length && waiting.at(0).id === socket.id)
            waiting.pop();
        console.log("finaly " + socket.id)
        //console.log(players);
    }
}