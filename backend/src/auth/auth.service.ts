import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { UserDto } from 'src/dto/User.dto';
import { twoFactorState, jwtPayload } from '../dto/jwt.dto'
import { ConfigService } from '@nestjs/config';
import { UserEntity } from 'src/user/entities/user.entity';

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService,
        private configService: ConfigService
    ) {}

    issueJwtToken(userData: UserDto, twofaStatus: twoFactorState = twoFactorState.NOT_CONFIRMED) {

        const payload: jwtPayload = {
            id: userData.id,
            displayName: userData.displayName,
            twofaState: twofaStatus
        }
        return this.jwtService.sign(payload)
    }

    async logUserIn(userData: UserDto) {
        let user: UserEntity
        let redirectUrl: string
        let twofaStatus: twoFactorState = twoFactorState.NOT_ACTIVE
        const FRONT_END = `http://${this.configService.get('APP_NAME')}:${this.configService.get('FRONT_END_PORT')}`
        user = await this.userService.findUserWithAuthData(userData.id)
        if (!user) { // first auth -> save user then redirect him to chose a displayName && 2fa state
            user = await this.userService.saveUser(userData)
            redirectUrl = `${FRONT_END}/register`
        }
        else if (user && user.is2faEnabled) { // user already have an account and an active 2fa
            redirectUrl = `${FRONT_END}/2fa-verification`
            twofaStatus = twoFactorState.NOT_CONFIRMED
        }
        else// user already have an account and an unactive 2fa
            redirectUrl = FRONT_END
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

    async verifyTokenAndExtractUser(jwtToken: string): Promise<UserDto> {
        try {
            if (!jwtToken)
                return null

            const payload: jwtPayload = this.jwtService.verify(
                jwtToken,
                {secret: this.configService.get('JWT_SECRET')}
            )

            if (!payload || !payload.id || !payload.twofaState) {
                return null
            }

            const user: UserDto = await this.userService.findUser(payload.id)
        
            if ( !user || ( user.is2faEnabled
                && (payload.twofaState === "not_confirmed" || payload.twofaState === "not_active" )) )
                    return null

            return user

        } catch(error) {
            return null
        }
    }
}