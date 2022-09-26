import { ChannelMembershipEntity } from 'src/chat/entities/channelMember.entity';
import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm'
import { RelationshipEntity } from './friendship.entity';

@Entity('users_table')
export class UserEntity {

    @PrimaryColumn({ type: "int" })
    id: number;

    @Column({
        type: 'varchar',
        default: '',
        unique: true
    })
    username: string;

    @Column({
        type: 'varchar',
        default: '',
        unique: true
    })
    email: string;

    @Column({
        type: 'varchar',
        default: '',
        unique: true
    })
    displayName: string;

    @Column({ default: '' })
    imageUrl: string;

    @Column({ default: false })
    is2faEnabled: boolean;

/* in typescript:
    ? = optional = we can create a user without the optional collumn = allowed to be undefined
    ! = telling Typescript to not warn you that you didn't initialize it */
    @Column({ nullable: true })
    twoFactorSecret?: string;

    @OneToMany(() => RelationshipEntity, (relationship) => relationship.sender, {
        // https://orkhan.gitbook.io/typeorm/docs/eager-and-lazy-relations
        // eager: true, // you don't need to join or specify relations you want to load
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    })
    sentFriendRequests: RelationshipEntity[]

    @OneToMany(() => RelationshipEntity, (relationship) => relationship.receiver, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    })
    receivedFriendRequests: RelationshipEntity[]

    @OneToMany(() => ChannelMembershipEntity, (membership) => membership.member, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    })
    channel_memberships: ChannelMembershipEntity[]
}