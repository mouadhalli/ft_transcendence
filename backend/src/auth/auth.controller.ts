import { Controller, UseGuards, Post, Body, Get, Res, BadRequestException } from '@nestjs/common';
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
        return res.cookie('accessToken', jwtToken).redirect(redirectUrl)
    }

    @Post('fake-login')
    async fakeUserLogin(
        @Body('id') fakeId: number,
        @Body('displayName') displayName: string,
    ) {
        if (!fakeId || !displayName)
            throw new BadRequestException('missing credentials')
        const fakeUser: UserDto = {
            id: fakeId,
            username: displayName,
            email: displayName + '@gmail.com',
            displayName: 'ooO' + displayName + 'Ooo',
            imgPath: displayName,
            is2faEnabled: false
        }
        return await this.authService.fakeLogIn(fakeUser)
    }

}
