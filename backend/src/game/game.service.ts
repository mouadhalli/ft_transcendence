import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserDto } from "src/dto/User.dto";
import { UserService } from "src/user/user.service";
import { Repository } from "typeorm";
import { GameEntity } from "./entities/game.entity";
import { ScoreEntity } from "./entities/score.entity";

@Injectable()
export class GameService {
    constructor(
        @InjectRepository(GameEntity)
            private gameRepository: Repository<GameEntity>,
        @InjectRepository(ScoreEntity)
            private scoreEntity: Repository<ScoreEntity>,
        private userService: UserService
    ) {}

    async getPlayers(playerA_id: number, playerB_id) {

        const playerA: UserDto = await this.userService.findUser(playerA_id)
        const playerB: UserDto = await this.userService.findUser(playerB_id)

        if (!playerA || !playerB)
            return { success: false, error: "couldn't find player" }
        
        return { success: true,  playerA, playerB}

    }

    async saveGameScore(
        winner: UserDto,
        opponent: UserDto,
        winnerScore: number,
        opponentScore: number
    ) {

        const Score: ScoreEntity = this.scoreEntity.create({
            game: {winner: winner, opponent: opponent},
            winnerScore: winnerScore,
            opponentScore: opponentScore
        })

        return await this.scoreEntity.save(Score).catch(error => {
            throw new InternalServerErrorException(error)
        })
    }

}