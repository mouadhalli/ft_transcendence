import { Controller, Get, Request, Post, UseGuards, Body, Delete } from '@nestjs/common';
import { get } from 'http';

@Controller('app')
export class AppController {

    @Get()
    hello_world() {
        return {message: 'hello world'}
    }
}