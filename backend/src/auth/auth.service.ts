import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterInput, UserDto } from 'src/dto/User.dto';
import * as bcrypt from 'bcryptjs'

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService
    ) {}

    async isvalidateUser(username: string, password: string): Promise<any> {
        const user = await this.userService.findByUsername(username);
        if (user && await bcrypt.compare(password, user.password))
            return user
        return null
    }

    issuToken(payload: UserDto) {
        return this.jwtService.sign(payload)
    }

    async isInputDataInUse(userData: RegisterInput) {
        const { username, email} = userData
        const DataInUse = await this.userService.findByUsernameOrEmail(username, email)
        DataInUse.forEach( data => {
            let errorMessage: string
            if (data.username === username)
                errorMessage = 'username already in use'
            else
                errorMessage = 'email already in use'
            throw new HttpException({message: [errorMessage]}, HttpStatus.BAD_REQUEST)
        })
    }

    async saveUser(userData: RegisterInput) {
        await this.userService.addOne(userData)
    }
}