import { Controller, Get, Delete, UseGuards, Patch, UseInterceptors, UploadedFile, HttpCode, Body, Param, Res, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserDto } from 'src/dto/User.dto';
import { User } from './decorators/user.decorator';
import { UserService } from './user.service';
import { multerOptions } from '../config/mutler.conf'

type File = Express.Multer.File;

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

    @Patch('update')
    @UseGuards(JwtAuthGuard)
    @HttpCode(200)
    @UseInterceptors(FileInterceptor('file', multerOptions))
    async updateProfile(
      @User("id") userId: number,
      @Body('username') username: string,
      @UploadedFile() file: File): Promise<UserDto> {
        const imgUrl = `http://localhost:3000/${file.path}`
        return await this.userService.updateProfile(userId, username, imgUrl)
    }
}
