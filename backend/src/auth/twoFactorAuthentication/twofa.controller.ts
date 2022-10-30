import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { User } from 'src/user/decorators/user.decorator';
import { TwofaService } from './twofa.service';
import { toDataURL } from 'qrcode';

@Controller('2fa')
@UseGuards(JwtAuthGuard)
export class TwofaController {
    constructor(
        private twofaservice: TwofaService,
    ) {}

    @Get('generate')
    @HttpCode(200)
    async generateQrCode(@User('id') userId: number) {
        const otpauthUrl = await this.twofaservice.generate2faSecret(userId);
        return toDataURL(otpauthUrl)
    }

    @Post('verify')
    @HttpCode(200)
    async verifyCode( @User('id') userId: number, @Body('code') code: string ) {

        return await this.twofaservice.verifyTwofaCode(userId, code)

    }
}
