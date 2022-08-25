import { Controller, Get, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserDto } from 'src/dto/User.dto';
import { User } from './decorators/user.decorator';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
    constructor(private userService: UserService) {}

    @Get('all-users')
    async getAllUsers() {
      return await this.userService.findAll()
    }

    @Delete('all-users')
    async deleteUsers() {
      await this.userService.DeleteAll()
      return {message: "successfully deleted all Users"}
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    async userProfile(@User() user: UserDto) {
      return user
    }
}
