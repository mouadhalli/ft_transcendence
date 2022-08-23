import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserEntity } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';


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

  async findByUsername(username: string): Promise<UserEntity> {
    const User = await this.usersRepository.findOneBy({ username });
    return User
  }

  async findById(id: string): Promise<UserEntity> {
    const User = await this.usersRepository.findOneBy({ id });
    return User
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async findByUsernameOrEmail(username: string, email: string) {
    const Users = await this.usersRepository.find({
      select: { username: true, email: true },
      where: [
        { username: username },
        { email: email }
      ]
    })
    return Users
  }

  async addOne(userData) {
    const newUser = this.usersRepository.create(userData)

    await this.usersRepository.save(newUser).catch(err => {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR)
    })
  }

}