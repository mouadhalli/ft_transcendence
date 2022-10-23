import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/user/user.service';
import { UserDto } from 'src/dto/User.dto';
import { twoFactorState } from '../../dto/jwt.dto'
import { UserEntity } from 'src/user/entities/user.entity';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private userService: UserService,
              private configService: ConfigService
    ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get("JWT_SECRET"),
    });
  }

  async validate(jwtPayload: any) {
    const user: UserEntity = await this.userService.findUserWithAuthData(jwtPayload.id)

    // if (user) {
    //   console.log("user: 2fa state -> ", user.is2faEnabled)
    //   console.log("jwt : 2fa state -> ", jwtPayload.twofaState)
    // }
  
    if ( !user ||
      ( user.is2faEnabled && (jwtPayload.twofaState === "not_confirmed" || jwtPayload.twofaState === "not_active" )) )
      throw new UnauthorizedException("invalid token")

    return user
  }
}