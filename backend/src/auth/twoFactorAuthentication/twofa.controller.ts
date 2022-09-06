import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserDto } from 'src/dto/User.dto';
import { User } from 'src/user/decorators/user.decorator';
import { TwofaService } from './twofa.service';
import { toFileStream, toDataURL } from 'qrcode';
import { authenticator } from 'otplib';
import { AuthService } from 'src/auth/auth.service';
import { twoFactorState } from 'src/dto/jwt.dto';

@Controller('2fa')
@UseGuards(JwtAuthGuard)
export class TwofaController {
    constructor(
        private twofaservice: TwofaService,
        private authService: AuthService
    ) {}

    @Get('generate')
    @HttpCode(200)
    async generateQrCode(@User('id') userId: number, @Res() res) {
        const otpauthUrl = await this.twofaservice.generate2faSecret(userId);
        // return toDataURL(otpauthUrl)
        return toFileStream(res, otpauthUrl)
    }

    @Post('verify')
    @HttpCode(200)
    async verifyCode( @User() user: UserDto, @Body('code') code: string ) {

        if (!user.twoFactorSecret)
            throw new UnauthorizedException("user 2fa is not active")
        else if ( authenticator.verify({ token: code ,secret: user.twoFactorSecret })  === false)
            throw new UnauthorizedException({message: "unvalid 2fa code", valid: false})

        if (user.is2faEnabled === false)
            await this.twofaservice.turnTwofaOnOff(user.id, true)

        const token = this.authService.issueJwtToken(user, twoFactorState.CONFIRMED)
        return {message: "valid 2fa code", valid: true, accessToken: token }
    }
}
