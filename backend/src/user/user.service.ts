import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserEntity } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDto } from 'src/dto/User.dto';

type File = Express.Multer.File;

@Injectable()
export class UserService {
  constructor(@InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>) {}

  async findAll(): Promise<UserEntity[]> {
    return await this.usersRepository.find();
  }

  async DeleteAll() {
    const allUsers = await this.usersRepository.find()
    allUsers.forEach( async (User) => {
      await this.usersRepository.remove(User)
    })
  }

  async findUser(id: number): Promise<UserEntity> {
    const user = await this.usersRepository.findOneBy({ id });
    return user
  }

  // async findByUsernameOrEmail(username: string, email: string) {
  //   const Users = await this.usersRepository.find({
  //     select: { username: true, email: true },
  //     where: [
  //       { username: username },
  //       { email: email }
  //     ]
  //   })
  //   return Users
  // }

  async saveUser(userData: UserDto): Promise<UserDto> {
    let newUser: UserEntity = this.usersRepository.create(userData)
    
    newUser = await this.usersRepository.save(newUser).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })
    return newUser
  }

  async updateProfile(id: number, newUsername: string, imgUrl: string): Promise<UserDto> {
    let user = await this.findUser( id );
    if (newUsername)
      user.username = newUsername
    if (imgUrl.length)
      user.imageUrl = imgUrl
    user = await this.usersRepository.save(user).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })
    return user
  }

  async set2faState(userId: number, state: boolean): Promise<UserDto> {
    let user = await this.findUser( userId )
    if (!user)
      throw new HttpException('user not found', HttpStatus.NOT_FOUND)
    user.is2faEnabled = state
    user = await this.usersRepository.save(user).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })
    return user
  }

  async Set2faSecret(userId: number, secret: string): Promise<UserDto> {
    let user = await this.findUser( userId )
    if (!user)
      throw new HttpException('user not found', HttpStatus.NOT_FOUND)
    user.twoFactorSecret = secret
    user = await this.usersRepository.save(user).catch(error => {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })
    return user
  }


}