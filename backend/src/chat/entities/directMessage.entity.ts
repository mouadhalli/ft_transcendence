import { UserEntity } from "src/user/entities/user.entity"
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm"

@Entity('direct-messages_table')
export class DirectMessageEntity {

    @PrimaryGeneratedColumn()
    id: number

    @Column({
        type: "varchar",
        default: ''
    })
    content: string

    @ManyToOne(() => UserEntity, {
        // eager: true,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    @JoinColumn({ name: "author_id" })
    author: UserEntity

    @ManyToOne(() => UserEntity, {
        // eager: true,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    @JoinColumn({ name: "receiver_id" })
    receiver: UserEntity

    @CreateDateColumn()
    created_at: Date
}