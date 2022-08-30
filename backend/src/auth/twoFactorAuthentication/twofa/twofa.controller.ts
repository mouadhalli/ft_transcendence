import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserDto } from 'src/dto/User.dto';
import { User } from 'src/user/decorators/user.decorator';
import { TwofaService } from './twofa.service';
import { toDataURL } from 'qrcode';
import { HttpErrorByCode } from '@nestjs/common/utils/http-error-by-code.util';

@Controller('2fa')
export class TwofaController {
    constructor( private twofaservice: TwofaService ) {}

    @Get('generate')
    @HttpCode(200)
    @UseGuards(JwtAuthGuard)
    async enableTwoFactorAuth(@User('id') userId: number, @Res() res) {
        const otpauthUrl = await this.twofaservice.generate2faSecret(userId);
        return toDataURL(otpauthUrl)
    }

    @Post('authenticate')
    @HttpCode(200)
    @UseGuards(JwtAuthGuard)
    async authenticate(@User() user: UserDto , @Body('code') twofaCode: string ) {
        const is2faEnabled = user.is2faEnabled
        const isValid = this.twofaservice.isTwoFactorCodeValid(user.twoFactorSecret, twofaCode)
        if (isValid === false)
            throw new UnauthorizedException('invalid code')
        if (is2faEnabled === false)
            await this.twofaservice.turnTwofaOnOff(user.id, true)
        return true
    }
}
