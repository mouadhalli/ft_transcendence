import { Controller, UseGuards, Post, Body, Req, HttpException, HttpStatus, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { FortyTwoAuthGuard } from './guards/42.auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterInput, UserDto } from 'src/dto/User.dto';
import { User } from '../user/decorators/user.decorator'

@Controller('auth')
export class AuthController {
    constructor(private authService:AuthService) {}

    @UseGuards(LocalAuthGuard)
    @Post('login')
    loginLocal(@User() user: UserDto) {
        const token = this.authService.issuToken(user)
        return { access_token: token }
    }
  
    @Post('register')
    async register(@Body() userInput: RegisterInput) {
        const {password, confirmPassword} = userInput
        await this.authService.isInputDataInUse(userInput)
        if (password !== confirmPassword) 
            throw new HttpException({message: ["passwords doesn't match"]} , HttpStatus.BAD_REQUEST)
        await this.authService.saveUser(userInput)
    }

    @Get('42')
    @UseGuards(FortyTwoAuthGuard)
    FortyTwoAuth() {}

    @Get('42/redirect')
    @UseGuards(FortyTwoAuthGuard)
    async FortyTwoAuthRedirect(@User() user: any) {
        return user
    }
}
