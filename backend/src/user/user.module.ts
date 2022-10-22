import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserEntity } from './entities/user.entity';
import { UserController } from './user.controller';
import { RelationshipEntity } from './entities/relationship.entity';
import { ChannelService } from 'src/chat/channel/channel.service';

@Module({
  imports: [ TypeOrmModule.forFeature([UserEntity, RelationshipEntity]) ],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController]
})
export class UsersModule {}