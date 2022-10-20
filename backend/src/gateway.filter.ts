import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch(HttpException)
export class HttpExceptionFilter extends BaseWsExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const properException = new WsException(exception.getResponse());
        // console.log(properException)
        super.catch(properException, host)
        // const client = host.switchToWs().getClient() as WebSocket
  }
}