import { Injectable, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, VerifyCallback } from 'passport-42';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        super({
            clientID: configService.get('FORTYTWO_APP_ID'),
            clientSecret: configService.get('FORTYTWO_APP_SECRET'),
            callbackURL: `http://${configService.get('APP_NAME')}:${configService.get('HOST_PORT')}/auth/42/redirect`,
            profileFields: {
                'id': function(obj) { return String(obj.id); },
                'username': 'login',
                'displayName': 'displayname',
                'imgPath': 'image_url',
                'email': 'email',
            }
        })
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        cb: VerifyCallback
    ):Promise<any> {
        const user = {
            id: profile.id,
            username: profile.username,
            displayName: "User_",
            email: profile.email,
            imgPath: profile.imgPath
        }
        cb(null, user)
    }
}
