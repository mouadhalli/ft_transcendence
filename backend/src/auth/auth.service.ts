import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { UserDto } from 'src/dto/User.dto';
import { twoFactorState, jwtPayload } from '../dto/jwt.dto'
import { ConfigService } from '@nestjs/config';
import { UserEntity } from 'src/user/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

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

        if (!userData)
            return {redirectUrl: `${FRONT_END}/login`}

        user = await this.userService.findUserWithAuthData(userData.id)
        if (!user) { // first auth -> save user then redirect him to chose a displayName && 2fa state
            const UUID = uuidv4().replace('-', '')
            userData.displayName += Buffer.from(UUID, 'hex').toString('base64').replace('/+', 'e')
            user = await this.userService.saveUser(userData)
            redirectUrl = `${FRONT_END}/register`
        }
        else if (user && user.is2faEnabled) { // user already have an account and an active 2fa
            redirectUrl = `${FRONT_END}/2fa-verification`
            twofaStatus = twoFactorState.NOT_CONFIRMED
        }
        else// user already have an account and an unactive 2fa
            redirectUrl = FRONT_END
        await this.userService.updateUserLoginState(user.id, true)
        return {
            redirectUrl: redirectUrl,
            jwtToken: this.issueJwtToken(user, twofaStatus)
        }
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

            if (user && user.loggedIn === false)
                return null
        
            if ( !user || ( user.is2faEnabled
                && (payload.twofaState === "not_confirmed" || payload.twofaState === "not_active" )) )
                    return null

            return user

        } catch(error) {
            return null
        }
    }

    async verifyTokenAndExtract2faState(jwtToken: string) {
        try {
            const payload: jwtPayload = this.jwtService.verify(
                jwtToken,
                {secret: this.configService.get('JWT_SECRET')}
            )

            if (!payload || !payload.id || !await this.userService.findUser(payload.id))
                throw new BadRequestException("cannot find user")

            if (payload.twofaState)
                return payload.twofaState

        } catch (error) {
            throw new UnauthorizedException(error.error)
        }
    }
}