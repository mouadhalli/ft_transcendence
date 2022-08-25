import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/user/user.service';
import { UserDto } from 'src/dto/User.dto';

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
    const user: UserDto = await this.userService.findUser(jwtPayload.id)
    if (!user)
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED)
    return user
  }
}