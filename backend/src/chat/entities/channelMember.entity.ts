import { UserEntity } from "src/user/entities/user.entity"
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm"
import { ChannelEntity } from "./channel.entity"

export enum Channel_Member_Role {
    OWNER = 'owner',
    ADMIN = 'admin',
    MEMBER = 'member'
}

export enum Channel_Member_State {
    MUTED = 'muted',
    BANNED = 'banned',
    ACTIVE = 'active'
}

@Entity('channel_membership_table')
export class ChannelMembershipEntity {

    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => UserEntity, (member) => member.id, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    @JoinColumn({ name: 'member_id' })
    member: UserEntity

    @ManyToOne(() => ChannelEntity, (channel) => channel.members, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    @JoinColumn({ name: 'channel_id' })
    channel: ChannelEntity

    @Column({
        type: 'enum',
        enum: Channel_Member_Role,
        default: Channel_Member_Role.MEMBER
    })
    role: Channel_Member_Role

    @Column({
        type: 'enum',
        enum: Channel_Member_State,
        default: Channel_Member_State.ACTIVE
    })
    state: Channel_Member_State

    @Column({nullable: true})
    restricitonEnd: Date

    @Column({
        type: 'boolean',
        default: false,
    })
    isJoined: boolean

    @CreateDateColumn()
    created_at: Date
}