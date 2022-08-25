// import { Strategy } from 'passport-local';
// import { PassportStrategy } from '@nestjs/passport';
// import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { AuthService } from '../auth.service';
// import { UserDto } from 'src/dto/User.dto';

// @Injectable()
// export class LocalStrategy extends PassportStrategy(Strategy) {
// 	constructor(private authService: AuthService) {
// 		super();
// 	}

// 	async validate(username: string, password: string): Promise<UserDto> {
// 		const user = await this.authService.isValidUser(username, password);
// 		if (!user)
// 			throw new UnauthorizedException();
// 		return {id: user.id, username: user.username};
// 	}
// }