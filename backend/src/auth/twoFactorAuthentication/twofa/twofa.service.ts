import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { authenticator } from 'otplib';


@Injectable()
export class TwofaService {
    constructor( private userService: UserService ) {}

    turnTwofaOnOff = async (userId: number, bool: boolean) => {
        return this.userService.set2faState(userId, bool)
    }

    public async generate2faSecret(userId: number) {
        const secret = authenticator.generateSecret()
        await this.userService.Set2faSecret(userId, secret);
        const otpauthUrl = authenticator.keyuri(
          String(userId),
          "chemchchemchchemchchemch",
          secret,
        )
        return otpauthUrl
    }

    isTwoFactorCodeValid(twofaSecret: string, twofaCode: string) {
        return authenticator.verify({
          token: twofaCode,
          secret: twofaSecret,
        });
      }
}
