import { OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';
import { GatewayConnectionService } from "src/connection.service";
// import { UserService } from "src/user/user.service";
import { GameService } from "./game.service";
import { ScoreEntity } from "./entities/score.entity";
import { ConnectionStatus } from "../connection.service"
import { JwtService } from "@nestjs/jwt";
import { jwtPayload } from "src/dto/jwt.dto";
import { ConfigService } from "@nestjs/config";
import { UserService } from "src/user/user.service";
import { getIdsData, mouseData } from '../dto/validation.dto'
import { UseFilters, UsePipes, ValidationPipe } from "@nestjs/common";
import { ExceptionFilter } from "src/gateway.filter";
// import { emit } from "process";

let players: any = {}
let waiting: any[] = [];
let waitingmodern: any[] = [];

const windw: number = 1300;
const windh: number = 624;

let ball_room: any = {};
let playerID: any = {};
let privateroomsID: any = {};
let isGameEnded: any = {};
let socketFromId: any = {};
let Intervals: any = {};


function getRandomDY() {
    let value:number = (Math.random() * 100000) % 24 - 12;
    value =  (value < 2 && value > -2) ? 2: value;
    return value;
}

// const ball = {
//     x:windw/2,
//     y:windh/2,
//     r:15,
//     dx:8,
//     dy:getRandomDY(),
//     p1:0,
//     p2:0,
//     score1:0,
//     score2:0,
//     playerleft:"",
//     playerright:"",
//     middleY:0,
//     counter:0,
//     mDY:0,
//   }

function init_data() {
    let Data = {
        x : windw/2,
        y : windh/2,
        r : 15,
        dx : 8,
        dy : getRandomDY(),
        p1 : 0,
        p2 : 0,
        score1 : 0,
        score2 : 0,
        playerleft : "",
        playerright : "",
        middleY : 0,
        counter : 0,
        mDY : 0,
        coolDown : 0,
    };
    return Data;
}

@UseFilters(ExceptionFilter)
@UsePipes( new ValidationPipe({ whitelist: true, transform: true }))
@WebSocketGateway({
    //cors: { origin: 'http://localhost:8080/' }
    cors: `http://${process.env.APP_NAME}:${process.env.FRONT_END_PORT}`,
    // cors: { origin: '*' },
    namespace: '/play'
})

export class gameGateway implements OnGatewayDisconnect {
    
    constructor(
        private userService: UserService,
        private gameService: GameService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private connectionService: GatewayConnectionService
    ) {}

    @WebSocketServer()
    server: Server;

    issueJwtToken(Data: number) {
        const payload:any  = {
            id:Data
        }
        return this.jwtService.sign(payload)
    }

    @SubscribeMessage('generateGameLink')
    async generateGameLink(socket: Socket){
        const token = String(socket.handshake.headers.token)
        const { id } = await this.connectionService.getUserFromToken(token)
        if (id === -1)
            return { success: false };
        const connectionStatus = this.connectionService.getUserConectionStatus(id);
        console.log(connectionStatus);
            
        if (connectionStatus !== undefined && connectionStatus !== "offline")
        {
            console.log("can't generate");
            return { success: false };
        }
        const gameToken: string = this.issueJwtToken(id);
        return { success: true, Token: gameToken }
    }

    @SubscribeMessage('game-status')
    async getStatus(socket: Socket, id: number){
        const connectionStatus = this.connectionService.getUserConectionStatus(id);
        //console.log(connectionStatus);
        if (connectionStatus == ConnectionStatus.INGAME)
            return {status: "in-game"}
        else
            return {status: "offline"}
    }

    @SubscribeMessage('getIDS')
    async getID(socket: Socket, Data: getIdsData){
        console.log("oooo");
        
        Data.room = "";
        Data.pos = 0;
        if (Data.mode === "private")
        {
            try
            {
                const { id }: jwtPayload = this.jwtService.verify(
                    String(Data.id),
                    {secret: this.configService.get('JWT_SECRET2')}
                )
                if (!id)
                {
                    socket.emit("inGame", 4);
                    return ;
                }
            }catch (error){
                socket.emit("inGame", 4);
                return ;
            }
            if (privateroomsID[Data.id] === undefined)
            {
                privateroomsID[Data.id] = socket.id;
                Data.pos = 1;
            }
            Data.room = privateroomsID[Data.id];
        }
        if (Data.mode !== "watch")
        {
            const token = String(socket.handshake.headers.token)
            const { id } = await this.connectionService.getUserFromToken(token)
            console.log(id);
            
            if (id === -1)
            {
                socket.emit("inGame", 2);
                return
            }
            Data.id = id;
            // get id from token
            // check invalid token

            const connectionStatus = this.connectionService.getUserConectionStatus(id);
            console.log(connectionStatus);
            
            if (connectionStatus === undefined || connectionStatus === "offline")
            {
                this.connectionService.saveUserSocketConnection(socket.id, id, ConnectionStatus.INGAME);
            }
            else
            {
                console.log("sir fhalk");
                socket.emit("inGame", 1);
                return ;
            }
        }
        else
        {
            const token = String(socket.handshake.headers.token)
            Data.token = token;
            const { id } = await this.connectionService.getUserFromToken(token)
            console.log(id);
            
            if (id === -1)
            {
                socket.emit("inGame", 2);
                return
            }
        }
        Data.socket = socket.id;
        playerID[socket.id] = Data;
        if (Data.mode !== "watch")
            socketFromId[Data.id] = socket;
        console.log(Data.id + "     " + socket.id);
        
        // await this.gameService.saveGameScore(winner, loser, swinner, sloser);
        socket.emit("start_connection", "");
    }
    
    @SubscribeMessage('update_mouse')
    updateMouse(socket: Socket, Data: mouseData) {
        //console.log(playerID[socket.id]);
        
        if (Data.room !== "" && Data.pos != 0 && ball_room[Data.room] !== undefined && ball_room[Data.room] !== "")
        {
            if (playerID[socket.id] !== undefined && playerID[socket.id].room === Data.room && playerID[socket.id].pos === Data.pos)
            {
                this.server.to(Data.room).volatile.emit('mouse', Data);
                if (Data.mousepos < 41)
                    Data.mousepos = 41;
                else if (Data.mousepos > windh - 41)
                    Data.mousepos = windh - 41;
                if (Data.pos === 1)
                    ball_room[Data.room].p1 = Data.mousepos - 41;
                else if (Data.pos === 2)
                    ball_room[Data.room].p2 = Data.mousepos - 41;
            }
        }
    }


    @SubscribeMessage('discn')
    discn(socket: Socket, Data: any) {
        socket.emit("fin", "");
    }


    async gameLoop(server: Server, socketleft: Socket, socketright: Socket, func: (winnerId: number, opponentId: number, winnerScore: number, opponentScore: number) => Promise<ScoreEntity>) {
        // console.log(ball_room[socketleft.id]);
        // console.log(socketleft.id);
        
        if (socketleft.id !== '' && ball_room[socketleft.id] !== undefined)
        {
            if (ball_room[socketleft.id].x - ball_room[socketleft.id].r <= 0 && ball_room[socketleft.id].dx < 0)
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
                    console.log(ball_room[socketleft.id].score1 + " : " + ball_room[socketleft.id].score2);
                    ball_room[socketleft.id].x = windw / 2;
                    ball_room[socketleft.id].y = windh / 2;
                    ball_room[socketleft.id].dx = 0;
                    ball_room[socketleft.id].dy = 0;
                    if (ball_room[socketleft.id].score1 < 5)
                    {
                        setTimeout(() => {
                            if (ball_room[socketleft.id] !== undefined)
                            {
                                ball_room[socketleft.id].dx = 8;
                                ball_room[socketleft.id].dy = getRandomDY();
                                server.to(socketleft.id).emit('restart', ball_room[socketleft.id]);
                            }
                        }, 1000);
                    }
                    else
                    {
                        server.to(socketleft.id).emit('done', "");
                        socketleft.emit('lost', "");
                        socketright.emit('won', "");
                        players[socketleft.id] = "";
                        players[socketright.id] = "";
                        console.log(ball_room[socketleft.id].score1 + " " + ball_room[socketleft.id].score2);
                        // await func(62741, 62742, 5, 2);
                        // await func(playerID[socketright.id].id, playerID[socketleft.id].id, ball_room[socketleft.id].score1, ball_room[socketleft.id].score2);
                        isGameEnded[socketleft.id] = true;
                        await func(ball_room[socketleft.id].playerright, ball_room[socketleft.id].playerleft, ball_room[socketleft.id].score1, ball_room[socketleft.id].score2);
                        clearInterval(Intervals[socketleft.id]);
                    }
                }
            }
            ball_room[socketleft.id].x = ball_room[socketleft.id].x + ball_room[socketleft.id].dx;
            ball_room[socketleft.id].y = ball_room[socketleft.id].y + ball_room[socketleft.id].dy;

            if(ball_room[socketleft.id].x + ball_room[socketleft.id].r >= windw && ball_room[socketleft.id].dx > 0){
                if (ball_room[socketleft.id].y >= ball_room[socketleft.id].p2 && ball_room[socketleft.id].y <= ball_room[socketleft.id].p2 + (windw / 14))
                {
                    ball_room[socketleft.id].dx = -ball_room[socketleft.id].dx - 0.5;
                    if (ball_room[socketleft.id].dy > 0)
                        ball_room[socketleft.id].dy = ball_room[socketleft.id].dy + 0.25;
                    else
                        ball_room[socketleft.id].dy = ball_room[socketleft.id].dy - 0.25;
                }
                else //! *****************************************************************
                {
                    ball_room[socketleft.id].score2 += 1;
                    server.to(socketleft.id).emit('reset', {score1:ball_room[socketleft.id].score1, score2:ball_room[socketleft.id].score2});
                    console.log(ball_room[socketleft.id].score1 + " : " + ball_room[socketleft.id].score2);
                    ball_room[socketleft.id].x = windw / 2;
                    ball_room[socketleft.id].y = windh / 2;
                    ball_room[socketleft.id].dx = 0;
                    ball_room[socketleft.id].dy = 0;
                    if (ball_room[socketleft.id].score2 < 5)
                    {
                        setTimeout(() => {
                            if (ball_room[socketleft.id] !== undefined)
                            {
                                ball_room[socketleft.id].dx = -8;
                                ball_room[socketleft.id].dy = getRandomDY();
                                server.to(socketleft.id).emit('restart', ball_room[socketleft.id]);
                            }
                        }, 1000);
                    }
                    else
                    {
                        server.to(socketleft.id).emit('done', "");
                        socketright.emit('lost', "");
                        socketleft.emit('won', "");
                        players[socketleft.id] = "";
                        players[socketright.id] = "";
                        console.log(ball_room[socketleft.id].score1 + " " + ball_room[socketleft.id].score2);
                        // await func(62741, 62742, 5, 2);
                        // await func(playerID[socketright.id].id, playerID[socketleft.id].id, ball_room[socketleft.id].score1, ball_room[socketleft.id].score2);
                        isGameEnded[socketleft.id] = true;
                        await func(ball_room[socketleft.id].playerleft, ball_room[socketleft.id].playerright, ball_room[socketleft.id].score2, ball_room[socketleft.id].score1);
                        clearInterval(Intervals[socketleft.id]);
                    }
                } //! -----------------------------------------------------------------
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


//**************************************************************************************************************************************** */
    
    async gameLoopModern(server: Server, socketleft: Socket, socketright: Socket, func: (winnerId: number, opponentId: number, winnerScore: number, opponentScore: number) => Promise<ScoreEntity>) {
        if (socketleft.id !== '' && ball_room[socketleft.id] !== undefined)
        {
            let oldBallX: number = ball_room[socketleft.id].x;
            
            if (ball_room[socketleft.id].coolDown > 0)
                ball_room[socketleft.id].coolDown--;

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
                    // console.log("hi");

                    server.to(socketleft.id).emit('reset', {score1:ball_room[socketleft.id].score1, score2:ball_room[socketleft.id].score2});
                    // console.log(ball_room[socketleft.id].score1);
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
                                server.to(socketleft.id).emit('restart', ball_room[socketleft.id]);
                            }
                       }, 1000);
                    }
                    else
                    {
                        server.to(socketleft.id).emit('done', "");
                        socketleft.emit('lost', "");
                        socketright.emit('won', "");
                        players[socketleft.id] = "";
                        players[socketright.id] = "";
                        console.log(ball_room[socketleft.id].score1 + " " + ball_room[socketleft.id].score2);
                        
                        // await func(playerID[socketright.id], playerID[socketleft.id], ball_room[socketleft.id].score1, ball_room[socketleft.id].score2);
                        // ball_room[socketleft.id].playerleft
                        // await func(playerID[socketright.id].id, playerID[socketleft.id].id, ball_room[socketleft.id].score1, ball_room[socketleft.id].score2);
                        isGameEnded[socketleft.id] = true;
                        await func(ball_room[socketleft.id].playerright, ball_room[socketleft.id].playerleft, ball_room[socketleft.id].score1, ball_room[socketleft.id].score2);
                        clearInterval(Intervals[socketleft.id]);
                    }
                }
            }
            ball_room[socketleft.id].x = ball_room[socketleft.id].x + ball_room[socketleft.id].dx;
            ball_room[socketleft.id].y = ball_room[socketleft.id].y + ball_room[socketleft.id].dy;

            if(ball_room[socketleft.id].x + ball_room[socketleft.id].r >= windw && ball_room[socketleft.id].dx > 0)
            {
                if (ball_room[socketleft.id].y >= ball_room[socketleft.id].p2 && ball_room[socketleft.id].y <= ball_room[socketleft.id].p2 + (windw / 14))
                {
                    ball_room[socketleft.id].dx = -ball_room[socketleft.id].dx - 0.5;
                    if (ball_room[socketleft.id].dy > 0)
                        ball_room[socketleft.id].dy = ball_room[socketleft.id].dy + 0.25;
                    else
                        ball_room[socketleft.id].dy = ball_room[socketleft.id].dy - 0.25;
                }
                else //! ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
                {
                    ball_room[socketleft.id].score2 += 1;

                    server.to(socketleft.id).emit('reset', {score1:ball_room[socketleft.id].score1, score2:ball_room[socketleft.id].score2});
                    // console.log(ball_room[socketleft.id].score1);
                    ball_room[socketleft.id].x = windw / 2;
                    ball_room[socketleft.id].y = windh / 2;
                    ball_room[socketleft.id].dx = 0;
                    ball_room[socketleft.id].dy = 0;
                    ball_room[socketleft.id].middleY = 0;
                    if (ball_room[socketleft.id].score2 < 7)
                    {
                        setTimeout(() => {
                            if (ball_room[socketleft.id] !== undefined)
                            {
                                ball_room[socketleft.id].dx = -8;
                                ball_room[socketleft.id].dy = getRandomDY();
                                ball_room[socketleft.id].middleY = 0;
                                server.to(socketleft.id).emit('restart', ball_room[socketleft.id]);
                            }
                       }, 1000);
                    }
                    else
                    {
                        server.to(socketleft.id).emit('done', "");
                        socketright.emit('lost', "");
                        socketleft.emit('won', "");
                        players[socketleft.id] = "";
                        players[socketright.id] = "";
                        console.log(ball_room[socketleft.id].score1 + " " + ball_room[socketleft.id].score2);
                        
                        isGameEnded[socketleft.id] = true;
                        await func(ball_room[socketleft.id].playerleft, ball_room[socketleft.id].playerright, ball_room[socketleft.id].score2, ball_room[socketleft.id].score1);
                        clearInterval(Intervals[socketleft.id]);
                    }
                } //! ..................................................................
            }

            if(ball_room[socketleft.id].y + ball_room[socketleft.id].r > windh || ball_room[socketleft.id].y-ball_room[socketleft.id].r < 0){
                ball_room[socketleft.id].dy=- ball_room[socketleft.id].dy * 1.01;
            }
            if (ball_room[socketleft.id].dx > 22)
                ball_room[socketleft.id].dx = 22;
            else if (ball_room[socketleft.id].dx < -22)
                ball_room[socketleft.id].dx = -22;
            
                
            if (((oldBallX >= windw / 2 && ball_room[socketleft.id].x <= windw / 2)
                || (oldBallX <= windw / 2 && ball_room[socketleft.id].x >= windw / 2)) 
                && ball_room[socketleft.id].y >= ball_room[socketleft.id].middleY
                && ball_room[socketleft.id].y <= ball_room[socketleft.id].middleY + (windw / 9)
                && ball_room[socketleft.id].coolDown == 0)
            {
                ball_room[socketleft.id].coolDown = 4;
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

    async sendPlayers(room:string, leftsocket:Socket, rightsocket:Socket)
    {
        const user1 = await this.userService.findUser(playerID[leftsocket.id].id);
        console.log(user1.username);
        const user2 = await this.userService.findUser(playerID[rightsocket.id].id);
        console.log(user2.username);
        
        this.server.to(leftsocket.id).emit('setPlayers', {player1Name:user1.displayName, player2Name:user2.displayName ,player1Img:user1.imgPath, player2Img:user2.imgPath})
    }

    @SubscribeMessage('connection')
    async conn(socket: Socket, Data: any) {
        console.log("-----------------------------------------");
        
        console.log("Hi user " + socket.id);
        players[socket.id] = "";
        
        let i:any;
        let f_player : Socket;
        if (playerID[socket.id] !== undefined)
        {
            console.log(playerID[socket.id].mode);
            if (playerID[socket.id].mode === "classic")
            {
                console.log("##################################################");
                
                i = waiting.length;
                console.log(i);
                if (i % 2 != 0)//someone is waiting
                {
                    f_player = waiting.at(i - 1);
                    socket.join(f_player.id);
                    waiting.pop();
                    playerID[f_player.id].room = f_player.id;
                    playerID[socket.id].room = f_player.id;
                    playerID[f_player.id].pos = 1;
                    playerID[socket.id].pos = 2;
                    ball_room[f_player.id] = init_data();
                    // console.log(ball_room[f_player.id].score1);
                    
                    ball_room[f_player.id].playerleft = playerID[f_player.id].id;
                    ball_room[f_player.id].playerright = playerID[socket.id].id;
                    // console.log(ball_room[f_player.id]);
                    
                    this.server.to(f_player.id).emit('connection', "start")
                    const Datas = {room:f_player.id, yourplace:1}
                    f_player.emit("takePosition", Datas)
                    socket.emit("takePosition", {...Datas, yourplace:2})

                    players[socket.id] = f_player;
                    players[f_player.id] = socket;

                    isGameEnded[f_player.id] = false;

                    // this.server.to(f_player.id).emit('setPlayers', {player1:playerID[f_player.id].id, player2:playerID[socket.id].id})
                    this.sendPlayers(f_player.id, f_player, socket);

                    setTimeout(() => {
                        Intervals[socket.id] = setInterval(this.gameLoop, 25, this.server, f_player, socket, this.gameService.saveGameScore.bind(this.gameService));
                    }, 2000);

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
                    f_player = waitingmodern.at(i - 1);
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

                    isGameEnded[f_player.id] = false;

                    this.sendPlayers(f_player.id, f_player, socket);

                    setTimeout(() => {
                        Intervals[socket.id] = setInterval(this.gameLoopModern, 25, this.server, f_player, socket, this.gameService.saveGameScore.bind(this.gameService));
                    }, 2000);

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
                    console.log(getID);
                    f_player = socketFromId[getID];
                    
                    if (f_player !== undefined && playerID[f_player.id] !== undefined)
                    {
                        console.log("watch " + f_player.id);
                        console.log(isGameEnded[f_player.id]);
                        
                        if (playerID[f_player.id].room != undefined && playerID[f_player.id].room != "" && ball_room[playerID[f_player.id].room] != undefined && (isGameEnded[playerID[f_player.id].room] == false || isGameEnded[playerID[f_player.id].room] === undefined))
                        {
                            socket.join(playerID[f_player.id].room);
                            if (playerID[f_player.id].mode === "modern")
                                socket.emit('watch_modern', "");
                            socket.emit('watch_work', "");
                            if (playerID[f_player.id].room == f_player.id)
                                this.sendPlayers(f_player.id, f_player, players[f_player.id]);
                            else
                                this.sendPlayers(playerID[f_player.id].room, players[f_player.id], f_player);

                            this.server.to(playerID[f_player.id].room).emit('setScore', {score1:ball_room[playerID[f_player.id].room]?.score1, score2:ball_room[playerID[f_player.id].room]?.score2});
                        }
                        else if (isGameEnded[playerID[f_player.id].room] == false || isGameEnded[playerID[f_player.id].room] === undefined)
                        {
                            socket.join(f_player.id);
                            socket.emit('watch_wait', "");
                        }
                        else
                            socket.emit('done', "");
                        return ;
                    }
                }
                socket.emit("inGame", 3);
            }
            else if (playerID[socket.id].mode === "private")
            {
                if (playerID[socket.id] !== undefined)
                {
                    if (playerID[socket.id].pos === 1)
                    {
                        socket.emit('connection', "wait");
                    }
                    else
                    {
                        let isThereop = false;
                        const roomID = playerID[socket.id].room;
                        console.log(playerID[roomID]);
                        
                        if (playerID[roomID] !== undefined && (isGameEnded[roomID] == false || isGameEnded[roomID] === undefined))
                        {
                            f_player = socketFromId[playerID[roomID].id];
                            if (f_player !== undefined)
                            {
                                const sockets = await this.server.in(roomID).fetchSockets();
                                console.log(sockets.length + "   ..............");

                                for (let a of sockets)
                                {
                                    if (playerID[a.id].pos == 2)
                                        isThereop = true;
                                }

                                if (isThereop === false)
                                {
                                    // khona ydkhal yl3ab f pos 2
                                    playerID[socket.id].pos = 2;
                                    socket.join(roomID);
                                    
                                    ball_room[roomID] = init_data();
                                    ball_room[roomID].playerleft = playerID[roomID].id;
                                    ball_room[roomID].playerright = playerID[socket.id].id;
                                    
                                    this.server.to(roomID).emit('connection', "start")
                                    const Datas = {room:roomID, yourplace:1}
                                    f_player.emit("takePosition", Datas)
                                    socket.emit("takePosition", {...Datas, yourplace:2})

                                    players[socket.id] = f_player;
                                    players[f_player.id] = socket;

                                    isGameEnded[f_player.id] = false;

                                    this.sendPlayers(f_player.id, f_player, socket);
                                    
                                    setTimeout(() => {
                                        Intervals[socket.id] = setInterval(this.gameLoop, 25, this.server, f_player, socket, this.gameService.saveGameScore.bind(this.gameService));
                                    }, 2000);

                                    Intervals[f_player.id] = Intervals[socket.id];
                                }
                                else
                                {
                                    // watch
                                    
                                    if (isGameEnded[f_player.id] !== undefined && isGameEnded[f_player.id] == false)
                                    {
                                        socket.join(roomID);
                                        socket.emit('watch_work', "");
                                    }
                                    else
                                    {
                                        socket.emit('done', "");
                                    }
                                }
                            }
                            else
                            {
                                socket.emit("inGame", 4);
                            }
                        }
                        else if (isGameEnded[roomID] == true)
                        {
                            console.log("ok");
                            socket.emit('done', "");
                        }
                        else if (playerID[roomID] === undefined)
                        {
                            socket.emit("inGame", 4);
                        }
                    }
                }
            }
        }
    }

    async handleDisconnect(socket: Socket){
        //if mode not watch
        if (playerID[socket.id] !== undefined && playerID[socket.id].mode !== "watch")
        {
            if (players[socket.id] !== undefined && players[socket.id] !== "")
            {
                let swinner:number = 0;
                let sloser:number = 0;
                let tmp:Socket;

                tmp = players[socket.id];
                clearInterval(Intervals[tmp.id]);
                tmp.emit("won", "");
                if (ball_room[socket.id] !== undefined && ball_room[socket.id] !== "")
                {
                    isGameEnded[socket.id] = true;
                    this.server.to(socket.id).emit('done', "");
                    sloser = ball_room[socket.id].score2;
                    swinner = ball_room[socket.id].score1;
                    delete ball_room[socket.id];
                }
                else if (ball_room[tmp.id] !== undefined && ball_room[tmp.id] !== "")
                {
                    isGameEnded[tmp.id] = true;
                    this.server.to(tmp.id).emit('done', "");
                    swinner = ball_room[tmp.id].score2;
                    sloser = ball_room[tmp.id].score1;
                    delete ball_room[tmp.id];
                }
                console.log(swinner + " " + sloser);
                await this.gameService.saveGameScore(playerID[tmp.id].id, playerID[socket.id].id, swinner, sloser);
                
                players[tmp.id] = "";
                console.log("salina");
            }
            else if (isGameEnded[socket.id] === undefined)
            {
                this.server.to(socket.id).emit('inGame', 3);
                // send to room match doesn't exist
            }
        }
        if (playerID[socket.id] !== undefined)
        {
            this.connectionService.removeUserConnection(playerID[socket.id].id);
            delete playerID[socket.id];
        }
        if (players[socket.id] !== undefined)
        {
            delete players[socket.id]
        }
        if (waiting.length && waiting.at(0).id === socket.id)//to be checked
            waiting.pop();
        else if (waitingmodern.length && waitingmodern.at(0).id === socket.id)
            waitingmodern.pop();
        console.log("finaly " + socket.id)
    }
    
}