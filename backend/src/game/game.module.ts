import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "src/auth/auth.module";
import { GatewayConnectionService } from "src/connection.service";
import { UsersModule } from "src/user/user.module";
import { GameEntity } from "./entities/game.entity";
import { ScoreEntity } from "./entities/score.entity";
import { GameController } from "./game.controller";
import { gameGateway } from "./game.gateway";
import { GameService } from "./game.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([GameEntity, ScoreEntity]),
    UsersModule,
    AuthModule
  ],
  controllers: [GameController],
  providers: [gameGateway, GameService, GatewayConnectionService],
})

export class gameModule {}
