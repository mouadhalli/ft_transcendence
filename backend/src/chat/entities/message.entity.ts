import { UserEntity } from "src/user/entities/user.entity"
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { ChannelEntity } from "./channel.entity"

@Entity('messages_table')
export class MessageEntity {

    @PrimaryGeneratedColumn()
    id: number

    @Column({
        type: "varchar",
    })
    content: string

    @ManyToOne(() => UserEntity, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    @JoinColumn({ name: "author_id" })
    author: UserEntity

    @ManyToOne(() => ChannelEntity, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    @JoinColumn({ name: "channel_id" })
    channel: ChannelEntity

    @CreateDateColumn()
    created_at: Date
}