import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { jwtPayload } from 'src/dto/jwt.dto';
import { UserDto } from 'src/dto/User.dto';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {

    constructor() {
        super()
    }

    handleRequest<UserDto>(err: any, data: any, info: any, context: ExecutionContext, status?: any): UserDto {

        if (err)
            throw new UnauthorizedException("invalid token")

        const { user, jwtPayload } = data
		const path = context.switchToHttp().getRequest().route.path

    
        if ( !user || ( user.is2faEnabled
            && (jwtPayload.twofaState === "not_confirmed" || jwtPayload.twofaState === "not_active" )) ){
                if (path === 'auth/verify' && jwtPayload === 'not_confirmed')
                    return user
                throw new UnauthorizedException("invalid token")
        }
        return user
    }

}
