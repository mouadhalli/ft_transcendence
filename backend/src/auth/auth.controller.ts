import { Controller, UseGuards, Get, Res, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FortyTwoAuthGuard } from './guards/42.auth.guard';
import { UserDto } from 'src/dto/User.dto';
import { User } from '../user/decorators/user.decorator'

@Controller('auth')
export class AuthController {
    constructor(private authService:AuthService) {}

    @Get('42')
    @UseGuards(FortyTwoAuthGuard)
    FortyTwoAuth() {}

    @Get('42/redirect')
    @UseGuards(FortyTwoAuthGuard)
    async FortyTwoAuthRedirect(@User() user: UserDto, @Res() res: any) {
        const {redirectUrl, jwtToken} = await this.authService.logUserIn(user)
        if (!jwtToken)
            return res.redirect(redirectUrl)
        return res.cookie('accessToken', jwtToken).redirect(redirectUrl)
    }

    @Get('2fa-state')
    async put(@Headers('Authorization') token: string ) {

        if (!token)
            throw new UnauthorizedException('token not found')
        const accessToken: string = token.split(' ')[1]
        return await this.authService.verifyTokenAndExtract2faState(accessToken)
    }
}
