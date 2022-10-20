import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { authenticator } from 'otplib';
import { UserEntity } from 'src/user/entities/user.entity';
import { AuthService } from '../auth.service';
import { twoFactorState } from 'src/dto/jwt.dto';


@Injectable()
export class TwofaService {
    constructor(
        private userService: UserService,
        private authService: AuthService,
    ) {}

    turnTwofaOnOff = async (userId: number, bool: boolean) => {
        return this.userService.set2faState(userId, bool)
    }

    async generate2faSecret(userId: number) {
        const secret = authenticator.generateSecret()
        await this.userService.Set2faSecret(userId, secret);
        const otpauthUrl = authenticator.keyuri(
          String(userId),
          "chemchchemchchemchchemch",
          secret,
        )
        return otpauthUrl
    }

    async verifyTwofaCode(userId: number, twofaCode: string) {

        const user: UserEntity = await this.userService.findUserWithAuthData(userId)

        if (!user.twoFactorSecret)
            throw new BadRequestException("user 2fa is not active")
        else if ( authenticator.verify({ token: twofaCode ,secret: user.twoFactorSecret })  === false)
            throw new UnauthorizedException({message: "unvalid 2fa code", valid: false})

        if (user.is2faEnabled === false)
            await this.turnTwofaOnOff(userId, true)

        const token = this.authService.issueJwtToken(user, twoFactorState.CONFIRMED)
        return {message: "valid 2fa code", valid: true, accessToken: token }
    }

}
