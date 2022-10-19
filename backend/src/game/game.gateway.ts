import { OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';
import { GatewayConnectionService } from "src/connection.service";
import { UserService } from "src/user/user.service";
import { GameService } from "./game.service";
import { ScoreEntity } from "./entities/score.entity";

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
let playerID: any = {};
let Intervals: any = {};
// let ballon:typeof ball = ball;

@WebSocketGateway({
    //cors: { origin: 'http://localhost:8080/' }
    cors: { origin: '*' },
    namespace: '/play'
})

export class gameGateway implements OnGatewayDisconnect {
    constructor(
        private userService: UserService,
        private gameService: GameService
    ) {}

    @WebSocketServer()
    server: Server;

    // @SubscribeMessage('event_name')
    // eventLogicFunction(socket: Socket, Data: any) {
    //     socket.emit('to_client_event', "Hello world")
    // }
    
    @SubscribeMessage('getIDS')
    async getID(socket: Socket, Data: any){
        playerID[socket.id] = Data;
        console.log(Data);
        // await this.gameService.saveGameScore(winner, loser, swinner, sloser);
    }

    @SubscribeMessage('update_mouse')
    afficher(socket: Socket, Data: any) {
        if (Data.room !== "" && Data.pos != 0 && ball_room[Data.room] !== undefined && ball_room[Data.room] !== "")
        {
            this.server.to(Data.room).volatile.emit('mouse', Data);
            if (Data.pos === 1)
                ball_room[Data.room].p1 = Data.mousepos - 41;
            else if (Data.pos === 2)
                ball_room[Data.room].p2 = Data.mousepos - 41;
                // console.log(Data.room + " " + ball_room[Data.room]);
            
        }
    }

    /*@SubscribeMessage('ball_move')
    handelball(socket: Socket, Data: any) {
        console.log("oooooops");
           
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
    }*/

    @SubscribeMessage('disc')
    disc(socket: Socket, Data: any) {
        socket.emit("fin", Data);
    }

    async storeScore(server: Server, socketleft: Socket, socketright: Socket) {
        console.log("abcd");
    }

    async gameLoop(server: Server, socketleft: Socket, socketright: Socket, param1: number, func: (winnerId: number, opponentId: number, winnerScore: number, opponentScore: number) => Promise<ScoreEntity>) {
        //console.log(param1);
        // socketleft.emit("testinter", param1);
        // socketright.emit("testinter", param1);
        if (socketleft.id !== '' && ball_room[socketleft.id] !== undefined)
        {
            console.log(ball_room[socketleft.id].dx);
            console.log(ball_room[socketleft.id].dy);
            
            if (ball_room[socketleft.id].x - ball_room[socketleft.id].r < 0 && ball_room[socketleft.id].dx < 0)
            {
                if (ball_room[socketleft.id].y >= ball_room[socketleft.id].p1 && ball_room[socketleft.id].y <= ball_room[socketleft.id].p1 + (windw / 14)) {
                    if (ball_room[socketleft.id].dx > 0)
                        ball_room[socketleft.id].dx = -ball_room[socketleft.id].dx - 0.5;
                    else
                        ball_room[socketleft.id].dx = -ball_room[socketleft.id].dx + 0.5;
                    if (ball_room[socketleft.id].dy > 0)
                        ball_room[socketleft.id].dy = ball_room[socketleft.id].dy + 0.25;
                    else
                        ball_room[socketleft.id].dy = ball_room[socketleft.id].dy - 0.25;
                }
                else
                {
                    ball_room[socketleft.id].score1 += 1;
                    server.to(socketleft.id).emit('reset', {score1:ball_room[socketleft.id].score1, score2:ball_room[socketleft.id].score2});
                    //server.to(socketleft.id).emit('reset', "");
                    console.log(ball_room[socketleft.id].score1);
                    if (ball_room[socketleft.id].score1 < 5)
                    {
                        ball_room[socketleft.id].x = windw / 2;
                        ball_room[socketleft.id].y = windh / 2;
                        ball_room[socketleft.id].dx = 0;
                        ball_room[socketleft.id].dy = 0;
                        // if (ball_room[socketleft.id].p1 < 4.5)
                        setTimeout(() => {
                            ball_room[socketleft.id].x = windw / 2;
                            ball_room[socketleft.id].y = windh / 2;
                            ball_room[socketleft.id].dx = 8;
                            ball_room[socketleft.id].dy = 8;
                            server.to(socketleft.id).emit('restart', ball_room[socketleft.id]);
                       }, 1000);
                    }
                    else
                    {
                        // else if (socket.id === socketleft.id)
                        socketleft.emit('lost', "");
                        // else
                        socketright.emit('won', "");
                        players[socketleft.id] = "";
                        players[socketright.id] = "";
                        console.log(ball_room[socketleft.id].score1 + " " + ball_room[socketleft.id].score2);
                        
                        await func(playerID[socketright.id], playerID[socketleft.id], ball_room[socketleft.id].score1, ball_room[socketleft.id].score2);
                        // storeScore(server, socketleft, socketright);
                        clearInterval(Intervals[socketleft.id]);
                    }
                }
            }
            ball_room[socketleft.id].x = ball_room[socketleft.id].x + ball_room[socketleft.id].dx;
            ball_room[socketleft.id].y = ball_room[socketleft.id].y + ball_room[socketleft.id].dy;
            if(ball_room[socketleft.id].x + ball_room[socketleft.id].r >= windw){
                // ball_room[socketleft.id].dx =- ball_room[socketleft.id].dx-0;
                if (ball_room[socketleft.id].dx > 0)
                    ball_room[socketleft.id].dx = -ball_room[socketleft.id].dx - 0.5;
                else
                    ball_room[socketleft.id].dx = -ball_room[socketleft.id].dx + 0.5;
                if (ball_room[socketleft.id].dy > 0)
                    ball_room[socketleft.id].dy = ball_room[socketleft.id].dy + 0.25;
                else
                    ball_room[socketleft.id].dy = ball_room[socketleft.id].dy - 0.25; 
            }
            if(ball_room[socketleft.id].y + ball_room[socketleft.id].r > windh || ball_room[socketleft.id].y-ball_room[socketleft.id].r < 0){
                ball_room[socketleft.id].dy=- ball_room[socketleft.id].dy * 1.01;
            }
            if (ball_room[socketleft.id].dx > 22)
                ball_room[socketleft.id].dx = 22;
            else if (ball_room[socketleft.id].dx < -22)
                ball_room[socketleft.id].dx = -22;
            server.to(socketleft.id).emit('ball', ball_room[socketleft.id]);
            //console.log("done");
        }
    }

    @SubscribeMessage('connection')
    async conn(socket: Socket, Data: any) {
        
        console.log("Hi user " + socket.id);
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

            Intervals[socket.id] = setInterval(this.gameLoop, 25, this.server, f_player, socket, 10, this.gameService.saveGameScore);
            Intervals[f_player.id] = Intervals[socket.id];
            
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
    
    async handleDisconnect(socket: Socket){
        // console.log(players[socket.id] + "|2");
        if (players[socket.id] !== undefined && players[socket.id] !== "")
        {
            let swinner:number = 0;
            let sloser:number = 0;
            let tmp: Socket;
            tmp = players[socket.id];
            clearInterval(Intervals[tmp.id]);
            tmp.emit("done", "");
            tmp.emit("won", "");
            if (ball_room[socket.id] !== undefined && ball_room[socket.id] !== "")
            {
                sloser = ball_room[socket.id].score2;
                swinner = ball_room[socket.id].score1;
                delete ball_room[socket.id];
            }
            else if (ball_room[tmp.id] !== undefined && ball_room[tmp.id] !== "")
            {
                swinner = ball_room[tmp.id].score2;
                sloser = ball_room[tmp.id].score1;
                delete ball_room[tmp.id];
            }
            console.log(swinner + " " + sloser);
            // await this.gameService.saveGameScore(playerID[tmp.id], playerID[socket.id], swinner, sloser);
            
            players[tmp.id] = "";
            console.log("salina");
        }
        delete players[socket.id]
        if (waiting.length && waiting.at(0).id === socket.id)
            waiting.pop();
        console.log("finaly " + socket.id)
        //console.log(players);
    }
}