import { DirectChannelEntity } from 'src/chat/entities/directChannel.entity';
import { Entity, CreateDateColumn, Column, PrimaryGeneratedColumn, ManyToOne, UpdateDateColumn, JoinColumn, OneToOne } from 'typeorm'
import { UserEntity } from './user.entity'

export enum Relationship_State {
    PENDING = "pending",
    FRIENDS = "friends",
    BLOCKED = "blocked"
}

@Entity('relationship_table')
export class RelationshipEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: 'enum',
        enum: Relationship_State,
        default: Relationship_State.PENDING,
    })
    state: Relationship_State;

    @ManyToOne(() => UserEntity, (user) => user.id, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    @JoinColumn({ name: 'sender_id' }) // reference id by default
    sender: UserEntity;

    @ManyToOne(() => UserEntity, (user) => user.id, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    @JoinColumn({ name: "receiver_id" })
    receiver: UserEntity;

    @OneToOne(() => DirectChannelEntity, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    })
    @JoinColumn({name: 'dmId'})
    dm: DirectChannelEntity

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}