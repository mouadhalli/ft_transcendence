import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { UserDto } from 'src/dto/User.dto';

import { twoFactorState, jwtPayload } from '../dto/jwt.dto'

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService
    ) {}

    issueJwtToken(userData: UserDto, twofaStatus: twoFactorState = twoFactorState.NOT_CONFIRMED) {

        const payload: jwtPayload = {
            id: userData.id,
            username: userData.username,
            twofaState: twofaStatus
        }
        return this.jwtService.sign(payload)
    }

    async logUserIn(userData: UserDto) {
        let user: UserDto
        let redirectUrl: string
        let twofaStatus: twoFactorState = twoFactorState.NOT_ACTIVE
        user = await this.userService.findUser(userData.id)
        if (!user) { // first auth -> save user then redirect him to chose a displayName && 2fa state
            user = await this.userService.saveUser(userData)
            redirectUrl = "http://localhost:8080/register"
        }
        else if (user && user.is2faEnabled) { // user already have an account and an active 2fa
            redirectUrl = "http://localhost:8080/2fa-verification"
            twofaStatus = twoFactorState.NOT_CONFIRMED
        }
        else// user already have an account and an unactive 2fa
            redirectUrl = "http://localhost:8080/"
        return {
            redirectUrl: redirectUrl,
            jwtToken: this.issueJwtToken(user, twofaStatus)
        }
    }

    async fakeLogIn(fakeUser: UserDto) {
        const user = await this.userService.findUser(fakeUser.id)
        if (!user)
            fakeUser = await this.userService.saveUser(fakeUser)
        return this.issueJwtToken(fakeUser, twoFactorState.NOT_ACTIVE)
    }
}