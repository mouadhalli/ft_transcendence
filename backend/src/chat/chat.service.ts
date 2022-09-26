import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { parse } from 'cookie';
import { WsException } from '@nestjs/websockets';
import { AuthService } from '../auth/auth.service'
import { ChannelService } from './channel/channel.service';
import { GatewayConnectionService } from 'src/connection.service';

 
@Injectable()
export class ChatService {

    constructor(
        private authService: AuthService,
        private channelService: ChannelService,
        private connectionService: GatewayConnectionService
    ) {}

    async joinChannel() {
        
    }

}