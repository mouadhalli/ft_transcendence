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
export class TwofaController {
    constructor(
        private twofaservice: TwofaService,
        private authService: AuthService
    ) {}

    @Get('generate')
    @HttpCode(200)
    @UseGuards(JwtAuthGuard)
    async enableTwoFactorAuth(@User('id') userId: number, @Res({ passthrough: true }) res) {
        const otpauthUrl = await this.twofaservice.generate2faSecret(userId);
        return toDataURL(otpauthUrl)
        // return toFileStream(res, otpauthUrl)
    }

    @Post('verify')
    @UseGuards(JwtAuthGuard)
    async enable2fa(@User() user: UserDto , @Body('code') twofaCode: string, @Res({ passthrough: true }) res ) {
        const isValidCode = authenticator.verify({ token: twofaCode,secret: user.twoFactorSecret })
        if (isValidCode === true){
            if (user.is2faEnabled === false)
                await this.twofaservice.turnTwofaOnOff(user.id, true)
            const token = this.authService.issueJwtToken(user, twoFactorState.confirmed)
            res.status(200).cookie('accessToken', token)
        }
        else
            res.status(401)
        res.send({valid: isValidCode})
    }    
}
