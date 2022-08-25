import { Controller, Get } from '@nestjs/common';

@Controller('app')
export class AppController {

    @Get()
    hello_world() {
        return {message: 'hello world'}
    }
}