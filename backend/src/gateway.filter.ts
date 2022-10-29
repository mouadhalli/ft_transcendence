import { ArgumentsHost, Catch, HttpException } from '@nestjs/common'
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets'
import { Socket } from 'socket.io'

@Catch(HttpException, WsException)
export class ExceptionFilter extends BaseWsExceptionFilter {
	catch(exception: HttpException | WsException, host: ArgumentsHost) {

		const error = exception instanceof WsException ? exception.getError() : exception.getResponse()
		const details = error instanceof Object ? { ...error } : { message: error }
		const client = host.switchToWs().getClient() as WebSocket
		
		super.catch(new WsException(details.message), host)

		client.send(JSON.stringify({
			event: "error",
			error: details.message
        }))
    }
}