import { Controller, Req, UseGuards, Get, Request, Delete } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { UserEntity } from './user.entity';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
    constructor(private userService: UserService) {}

    @Get('all-users')
    async getAllUsers() {
      return await this.userService.findAll()
    }

    @Delete('/all-users')
    async deleteUsers() {
      await this.userService.DeleteAll()
      return {message: "successfully deleted all Users"}
    }
  
  
}
