import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { UserDto } from 'src/dto/User.dto';

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService
    ) {}

    issueJwtToken(userData: UserDto) {
        const payload = {
            id: userData.id,
            username: userData.username,
        }
        return this.jwtService.sign(payload)
    }

    async logUserIn(userData: UserDto) {
        let user: UserDto
        let redirectUrl: string
        user = await this.userService.findUser(userData.id)
        if (!user) { // first auth -> save user then redirect him to chose a displayName && 2fa
            user = await this.userService.saveUser(userData)
            redirectUrl = "http://localhost:8080/register"
        }
        else // loggin
            redirectUrl = "http://localhost:8080/"
        return {
            redirectUrl: redirectUrl,
            jwtToken: this.issueJwtToken(user)
        }
    }
}