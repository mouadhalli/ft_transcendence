import { Injectable, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, VerifyCallback } from 'passport-42';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        super({
            clientID:configService.get('FORTYTWO_APP_ID'),
            clientSecret:configService.get('FORTYTWO_APP_SECRET'),
            callbackURL: "http://localhost:3000/auth/42/redirect",
            profileFields: {
                'displayName': 'displayname',
                'imageUrl': 'image_url'
            }
        })
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        cb: VerifyCallback
    ):Promise<any> {
        // console.log(profile)
        const {displayName, imageUrl} = profile
        const user = {
            username: displayName,
            image: imageUrl
        }
        cb(null, user)
    }
}
