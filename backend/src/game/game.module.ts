import { Module } from "@nestjs/common";
import { gameGateway } from "./game.gateway";

@Module({
  imports: [],
  providers: [gameGateway],
})

export class gameModule {}
