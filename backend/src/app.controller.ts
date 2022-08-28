import { Controller, Get, HttpException, Param, Res, HttpStatus } from '@nestjs/common';
import { existsSync } from 'fs';

@Controller()
export class AppController {

    @Get()
    hello_world() {
        return {message: 'hello world'}
    }

    @Get('uploads/:filename')
    sendImage(@Param("filename") filename, @Res() res) {
        if (!existsSync(`${process.env.UPLOAD_LOCATION}/${filename}`))
            throw new HttpException('file not found', HttpStatus.NOT_FOUND)
        res.sendFile(filename, {root: 'uploads'});
    }
}