import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserDto } from 'src/dto/User.dto';
import { User } from 'src/user/decorators/user.decorator';
import { TwofaService } from './twofa.service';

@Controller('2fa')
export class TwofaController {
    constructor( private twofaservice: TwofaService ) {}

    @Post('generate')
    @HttpCode(200)
    @UseGuards(JwtAuthGuard)
    async enableTwoFactorAuth(@User('id') userId: number) {
        return await this.twofaservice.generate2faSecret(userId);
    }

    @Post('authenticate')
    @HttpCode(200)
    @UseGuards(JwtAuthGuard)
    async authenticate(@User() user: UserDto , @Body('code') twofaCode: string ) {
        await this.twofaservice.isTwoFactorCodeValid(user.twoFactorSecret, twofaCode)
    }
}
