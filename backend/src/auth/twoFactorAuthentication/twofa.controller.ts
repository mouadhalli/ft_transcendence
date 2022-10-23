import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserDto } from 'src/dto/User.dto';
import { User } from 'src/user/decorators/user.decorator';
import { TwofaService } from './twofa.service';
import { toFileStream, toDataURL } from 'qrcode';
import { authenticator } from 'otplib';
import { AuthService } from 'src/auth/auth.service';
import { twoFactorState } from 'src/dto/jwt.dto';
import { UserEntity } from 'src/user/entities/user.entity';

@Controller('2fa')
@UseGuards(JwtAuthGuard)
export class TwofaController {
    constructor(
        private twofaservice: TwofaService,
    ) {}

    @Get('generate')
    @HttpCode(200)
    async generateQrCode(@User('id') userId: number/*, @Res() res*/) {
        const otpauthUrl = await this.twofaservice.generate2faSecret(userId);
        return toDataURL(otpauthUrl)
        // return toFileStream(res, otpauthUrl)
    }

    @Post('verify')
    @HttpCode(200)
    async verifyCode( @User('id') userId: number, @Body('code') code: string ) {

        return await this.twofaservice.verifyTwofaCode(userId, code)

    }
}
