import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersModule } from "src/user/user.module";
import { GameEntity } from "./entities/game.entity";
import { ScoreEntity } from "./entities/score.entity";
import { GameController } from "./game.controller";
import { gameGateway } from "./game.gateway";
import { GameService } from "./game.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([GameEntity, ScoreEntity]),
    UsersModule
  ],
  controllers: [GameController],
  providers: [gameGateway, GameService],
})

export class gameModule {}
