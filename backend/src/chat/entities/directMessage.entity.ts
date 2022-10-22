import { UserEntity } from "src/user/entities/user.entity"
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { DirectChannelEntity } from "./directChannel.entity"

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

    @ManyToOne(() => DirectChannelEntity, {
        // eager: true,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    @JoinColumn({ name: "channel_id" })
    channel: DirectChannelEntity

    @CreateDateColumn()
    created_at: Date
}