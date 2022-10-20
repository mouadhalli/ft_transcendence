import { OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';
// import { GatewayConnectionService } from "src/connection.service";
// import { UserService } from "src/user/user.service";
import { GameService } from "./game.service";
import { ScoreEntity } from "./entities/score.entity";

let players: any = {}
let waiting: any[] = [];
let waitingmodern: any[] = [];

const windw: number = 1300;
const windh: number = 624;

let ball_room: any = {};
let playerID: any = {};
let socketFromId: any = {};
let Intervals: any = {};


function getRandomDY() {
    let value:number = (Math.random() * 100000) % 24 - 12;
    value =  (value < 1 && value > -1) ? 2: value;
    return value;
}

const ball = {
    x:windw/2,
    y:windh/2,
    r:15,
    dx:8,
    dy:getRandomDY(),
    p1:0,
    p2:0,
    score1:0,
    score2:0,
    playerleft:"",
    playerright:"",
    middleY:0,
    counter:0,
    mDY:0,
  }

function init_data() {
    let Data: typeof ball;
    Data = ball;
    return Data;
}

@WebSocketGateway({
    //cors: { origin: 'http://localhost:8080/' }
    cors: { origin: '*' },
    namespace: '/play'
})

export class gameGateway implements OnGatewayDisconnect {
    constructor(
        // private userService: UserService,
        private gameService: GameService
    ) {}

    @WebSocketServer()
    server: Server;

    @SubscribeMessage('getIDS')
    async getID(socket: Socket, Data: any){
        Data.socket = socket.id;
        playerID[socket.id] = Data;
        socketFromId[Data.id] = socket;
        console.log(Data);
        // await this.gameService.saveGameScore(winner, loser, swinner, sloser);
    }

    @SubscribeMessage('update_mouse')
    afficher(socket: Socket, Data: any) {
        if (Data.room !== "" && Data.pos != 0 && ball_room[Data.room] !== undefined && ball_room[Data.room] !== "")
        {
            if (playerID[socket.id].room === Data.room && playerID[socket.id].pos === Data.pos)
            {
                this.server.to(Data.room).volatile.emit('mouse', Data);
                if (Data.pos === 1)
                    ball_room[Data.room].p1 = Data.mousepos - 41;
                else if (Data.pos === 2)
                    ball_room[Data.room].p2 = Data.mousepos - 41;
            }
        }
    }


    @SubscribeMessage('disc')
    disc(socket: Socket, Data: any) {
        socket.emit("fin", Data);
    }

    // @SubscribeMessage('gamedone')
    // async gamedone(socket: Socket, Data: any) {
    //     console.log(Data);
    //     if (Data !== "" && ball_room[Data] !== undefined)
    //     {
    //         if (ball_room[Data].score1 > ball_room[Data].score2)
    //         {
    //             await this.gameService.saveGameScore(ball_room[Data].playerright, ball_room[Data].playerleft, ball_room[Data].score1, ball_room[Data].score2);
    //         }
    //         else
    //         {
    //             await this.gameService.saveGameScore(ball_room[Data].playerleft, ball_room[Data].playerright, ball_room[Data].score2, ball_room[Data].score1);
    //         }
    //     }
    //     // await this.gameService.saveGameScore(playerID[tmp.id], playerID[socket.id], swinner, sloser);
    // }

    async gameLoop(server: Server, socketleft: Socket, socketright: Socket, func: (winnerId: number, opponentId: number, winnerScore: number, opponentScore: number) => Promise<ScoreEntity>) {
        if (socketleft.id !== '' && ball_room[socketleft.id] !== undefined)
        {
            // console.log(ball_room[socketleft.id].dx);
            // console.log(ball_room[socketleft.id].dy);
            
            if (ball_room[socketleft.id].x - ball_room[socketleft.id].r < 0 && ball_room[socketleft.id].dx < 0)
            {
                if (ball_room[socketleft.id].y >= ball_room[socketleft.id].p1 && ball_room[socketleft.id].y <= ball_room[socketleft.id].p1 + (windw / 14)) {
                    // if (ball_room[socketleft.id].dx > 0)
                    //     ball_room[socketleft.id].dx = -ball_room[socketleft.id].dx - 0.5;
                    // else
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
                    console.log(ball_room[socketleft.id].score1);
                    ball_room[socketleft.id].x = windw / 2;
                    ball_room[socketleft.id].y = windh / 2;
                    ball_room[socketleft.id].dx = 0;
                    ball_room[socketleft.id].dy = 0;
                    if (ball_room[socketleft.id].score1 < 5)
                    {
                        setTimeout(() => {
                            if (ball_room[socketleft.id] !== undefined)
                            {
                                // ball_room[socketleft.id].x = windw / 2;
                                // ball_room[socketleft.id].y = windh / 2;
                                ball_room[socketleft.id].dx = 8;
                                ball_room[socketleft.id].dy = getRandomDY();
                                server.to(socketleft.id).emit('restart', ball_room[socketleft.id]);
                            }
                       }, 1000);
                    }
                    else
                    {
                        socketleft.emit('lost', "");
                        socketright.emit('won', "");
                        players[socketleft.id] = "";
                        players[socketright.id] = "";
                        console.log(ball_room[socketleft.id].score1 + " " + ball_room[socketleft.id].score2);
                        // await func(62741, 62742, 5, 2);
                        await func(playerID[socketright.id].id, playerID[socketleft.id].id, ball_room[socketleft.id].score1, ball_room[socketleft.id].score2);
                        clearInterval(Intervals[socketleft.id]);
                    }
                }
            }
            ball_room[socketleft.id].x = ball_room[socketleft.id].x + ball_room[socketleft.id].dx;
            ball_room[socketleft.id].y = ball_room[socketleft.id].y + ball_room[socketleft.id].dy;
            if(ball_room[socketleft.id].x + ball_room[socketleft.id].r >= windw){
                // if (ball_room[socketleft.id].dx > 0)
                ball_room[socketleft.id].dx = -ball_room[socketleft.id].dx - 0.5;
                // else
                //     ball_room[socketleft.id].dx = -ball_room[socketleft.id].dx + 0.5;
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
        }
    }


//******************************************************************************************* */
    
    async gameLoopModern(server: Server, socketleft: Socket, socketright: Socket, func: (winnerId: number, opponentId: number, winnerScore: number, opponentScore: number) => Promise<ScoreEntity>) {
        if (socketleft.id !== '' && ball_room[socketleft.id] !== undefined)
        {
            let oldBallX: number = ball_room[socketleft.id].x;

            if (ball_room[socketleft.id].counter == 0)
            {
                ball_room[socketleft.id].counter = 20;
                if (Math.floor(getRandomDY()) % 2 == 0)
                    ball_room[socketleft.id].mDY = 5;
                else
                    ball_room[socketleft.id].mDY = -5;
            }

            if (ball_room[socketleft.id].x - ball_room[socketleft.id].r < 0 && ball_room[socketleft.id].dx < 0)
            {
                if (ball_room[socketleft.id].y >= ball_room[socketleft.id].p1 && ball_room[socketleft.id].y <= ball_room[socketleft.id].p1 + (windw / 14)) {
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
                    console.log(ball_room[socketleft.id].score1);
                    ball_room[socketleft.id].x = windw / 2;
                    ball_room[socketleft.id].y = windh / 2;
                    ball_room[socketleft.id].dx = 0;
                    ball_room[socketleft.id].dy = 0;
                    ball_room[socketleft.id].middleY = 0;
                    if (ball_room[socketleft.id].score1 < 7)
                    {
                        setTimeout(() => {
                            if (ball_room[socketleft.id] !== undefined)
                            {
                                ball_room[socketleft.id].dx = 8;
                                ball_room[socketleft.id].dy = getRandomDY();
                                ball_room[socketleft.id].middleY = 0;
                            }
                            server.to(socketleft.id).emit('restart', ball_room[socketleft.id]);
                       }, 1000);
                    }
                    else
                    {
                        socketleft.emit('lost', "");
                        socketright.emit('won', "");
                        players[socketleft.id] = "";
                        players[socketright.id] = "";
                        console.log(ball_room[socketleft.id].score1 + " " + ball_room[socketleft.id].score2);
                        
                        // await func(playerID[socketright.id], playerID[socketleft.id], ball_room[socketleft.id].score1, ball_room[socketleft.id].score2);
                        await func(playerID[socketright.id].id, playerID[socketleft.id].id, ball_room[socketleft.id].score1, ball_room[socketleft.id].score2);
                        clearInterval(Intervals[socketleft.id]);
                    }
                }
            }
            ball_room[socketleft.id].x = ball_room[socketleft.id].x + ball_room[socketleft.id].dx;
            ball_room[socketleft.id].y = ball_room[socketleft.id].y + ball_room[socketleft.id].dy;
            if(ball_room[socketleft.id].x + ball_room[socketleft.id].r >= windw){
                ball_room[socketleft.id].dx = -ball_room[socketleft.id].dx - 0.5;
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
            
                
            if (((oldBallX > windw / 2 && ball_room[socketleft.id].x < windw / 2)
                || (oldBallX < windw / 2 && ball_room[socketleft.id].x > windw / 2)) 
                && ball_room[socketleft.id].y >= ball_room[socketleft.id].middleY
                && ball_room[socketleft.id].y <= ball_room[socketleft.id].middleY + (windw / 9))
            {
                ball_room[socketleft.id].x = oldBallX;
                if (ball_room[socketleft.id].dx < 0)
                    ball_room[socketleft.id].dx = -ball_room[socketleft.id].dx + 0.5;
                else
                    ball_room[socketleft.id].dx = -ball_room[socketleft.id].dx - 0.5;
            }
                
            if (ball_room[socketleft.id].middleY + ball_room[socketleft.id].mDY > 0 
                && ball_room[socketleft.id].middleY + ball_room[socketleft.id].mDY < windh - (windw / 9)
                && ball_room[socketleft.id].dx != 0)
                ball_room[socketleft.id].middleY += ball_room[socketleft.id].mDY;
            else if (ball_room[socketleft.id].dx != 0)
            {
                ball_room[socketleft.id].counter = 30;
                ball_room[socketleft.id].mDY *= -1;
            }
            ball_room[socketleft.id].counter--;

            server.to(socketleft.id).emit('ball', ball_room[socketleft.id]);
        }
    }

    @SubscribeMessage('connection')
    async conn(socket: Socket, Data: any) {
        
        console.log("Hi user " + socket.id);
        players[socket.id] = "";
        
        let i:any;
        let f_player : Socket;
        console.log(playerID[socket.id].mode);

        if (playerID[socket.id].mode === "classic")
        {
            i = waiting.length;
            if (i % 2 != 0)//someone is waiting
            {
                f_player = waiting.at(0);
                socket.join(f_player.id);
                waiting.pop();
                playerID[f_player.id].room = f_player.id;
                playerID[socket.id].room = f_player.id;
                playerID[f_player.id].pos = 1;
                playerID[socket.id].pos = 2;
                ball_room[f_player.id] = init_data();
                ball_room[f_player.id].playerleft = playerID[f_player.id].id;
                ball_room[f_player.id].playerright = playerID[socket.id].id;
                console.log(ball_room[f_player.id]);
                
                this.server.to(f_player.id).emit('connection', "start")
                const Datas = {room:f_player.id, yourplace:1}
                f_player.emit("takePosition", Datas)
                socket.emit("takePosition", {...Datas, yourplace:2})

                players[socket.id] = f_player;
                players[f_player.id] = socket;

                Intervals[socket.id] = setInterval(this.gameLoop, 25, this.server, f_player, socket, this.gameService.saveGameScore.bind(this.gameService));
                Intervals[f_player.id] = Intervals[socket.id];
            }
            else
            {
                waiting.push(socket);
                socket.emit('connection', "wait")
            }
        }
        else if (playerID[socket.id].mode === "modern")
        {
            i = waitingmodern.length;
            if (i % 2 != 0)//someone is waiting
            {
                f_player = waitingmodern.at(0);
                socket.join(f_player.id);
                waitingmodern.pop();
                playerID[f_player.id].room = f_player.id;
                playerID[socket.id].room = f_player.id;
                playerID[f_player.id].pos = 1;
                playerID[socket.id].pos = 2;
                ball_room[f_player.id] = init_data();
                ball_room[f_player.id].playerleft = playerID[f_player.id].id;
                ball_room[f_player.id].playerright = playerID[socket.id].id;

                this.server.to(f_player.id).emit('connection', "start Modern")
                const Datas = {room:f_player.id, yourplace:1}
                f_player.emit("takePosition", Datas)
                socket.emit("takePosition", {...Datas, yourplace:2})

                players[socket.id] = f_player;
                players[f_player.id] = socket;

                Intervals[socket.id] = setInterval(this.gameLoopModern, 25, this.server, f_player, socket, this.gameService.saveGameScore.bind(this.gameService));
                Intervals[f_player.id] = Intervals[socket.id];
            }
            else
            {
                waitingmodern.push(socket);
                socket.emit('connection', "wait Modern")
            }
        }
        else if (playerID[socket.id].mode === "watch")
        {
            let getID = playerID[socket.id].id;
            if (getID !== undefined)
            {
                f_player = socketFromId[getID];
                if (f_player !== undefined && playerID[f_player.id] !== undefined)
                {
                    if (playerID[f_player.id].room != undefined && playerID[f_player.id].room != "")
                    {
                        socket.join(playerID[f_player.id].room);
                        if (playerID[f_player.id].mode === "modern")
                            socket.emit('watch_modern', "");
                        socket.emit('watch_work', "");
                    }
                    else
                    {
                        socket.join(f_player.id);
                        socket.emit('watch_wait', "");
                        // socket.emit('connection', "match didnt start yet"); //00000000000000000000000000000000
                    }
                }
            }
        }
    }
    
    async handleDisconnect(socket: Socket){
        if (players[socket.id] !== undefined && players[socket.id] !== "")
        {
            let swinner:number = 0;
            let sloser:number = 0;
            let tmp: Socket;
            tmp = players[socket.id];
            clearInterval(Intervals[tmp.id]);
            // tmp.emit("done", "");
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
            await this.gameService.saveGameScore(playerID[tmp.id].id, playerID[socket.id].id, swinner, sloser);
            
            players[tmp.id] = "";
            console.log("salina");
        }
        delete players[socket.id]
        if (waiting.length && waiting.at(0).id === socket.id)
            waiting.pop();
        else if (waitingmodern.length && waitingmodern.at(0).id === socket.id)
            waitingmodern.pop();
        console.log("finaly " + socket.id)
    }
}