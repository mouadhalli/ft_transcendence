import { UserEntity } from "src/user/entities/user.entity"
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { DirectChannelEntity } from "./directChannel.entity"

export enum Message_Type {
    MESSAGE = 'message',
    INVITE = 'invite'
}

@Entity('direct-messages_table')
export class DirectMessageEntity {

    @PrimaryGeneratedColumn()
    id: number

    @Column({
        type: "varchar",
        default: ''
    })
    content: string

    @Column({
        type: "enum",
        enum: Message_Type,
        default: Message_Type.MESSAGE
    })
    type: string

    @ManyToOne(() => UserEntity, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    @JoinColumn({ name: "author_id" })
    author: UserEntity

    @ManyToOne(() => DirectChannelEntity, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    @JoinColumn({ name: "channel_id" })
    channel: DirectChannelEntity

    @CreateDateColumn()
    created_at: Date
}