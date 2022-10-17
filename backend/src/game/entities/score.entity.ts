import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { GameEntity } from "./game.entity";


@Entity('game_score_table')
export class ScoreEntity {

    @PrimaryGeneratedColumn()
    id: number

    @OneToOne(() => GameEntity, (game) => game.score, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    })
    @JoinColumn({name: 'gameId'})
    game: GameEntity

    @Column({ type: 'int' })
    winnerScore: number

    @Column({ type: 'int' })
    opponentScore: number

}