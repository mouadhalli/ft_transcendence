import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserDto } from "src/dto/User.dto";
import { UserEntity } from "src/user/entities/user.entity";
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

    async findUserGames(userId: number) {
        return await this.gameRepository.find({
            relations: {winner: true, opponent: true, score: true},
            where: [
                { winner: { id: userId } },
                { opponent: { id: userId } }
            ]
        })
    }

    async countUserWins(userId: number) {
        return await this.gameRepository.count({
            where: { winner: { id: userId } }
        })
    }

    async countUserDefeats(userId: number) {
        return await this.gameRepository.count({
            where: { opponent: { id: userId } }
        })
    }

    async countUserTotalGamesPlayed(userId: number) {
        return await this.gameRepository.count({
            where: [
                { winner: { id: userId } },
                { opponent: { id: userId } }
            ]
        })
    }

    async countUserTotalGoals(userId: number) {

        const games: GameEntity[] = await this.findUserGames(userId)

        let totalGoals: number = 0

        games.forEach((game) => {
            if (game.winner.id === userId)
                totalGoals += game.score.winnerScore
            else
                totalGoals += game.score.opponentScore
        })

        return totalGoals
    }

    async gainXp(userId: number) {
        const user: UserDto = await this.userService.findUser(userId)

        if (!user)
            return { success: false, error: "user not found" }

        user.xp += 1
            
        //xp required to reach next lvl XP = LVL * ((LVL - 1) / 2)
        if (user.xp === user.lvl * ((user.lvl - 1) / 2)) {
            user.lvl += 1
            user.xp = 0
        }

        await this.userService.saveUser(user).catch((error) => {
            throw new BadRequestException(error)
        })
        return { success: true, user}

    }

    async getUserXpAndLvl(userId: number) {
        const { xp, lvl }: UserDto = await this.userService.findUser(userId)

        if (!lvl)
            throw new BadRequestException("couldn't find user")
        
        return {xp, lvl}

    }

}