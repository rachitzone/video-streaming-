import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Stream {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  host_id: number;

  @Column()
  title: string;

  @Column({ default: 'CREATED' })
  status: string;

  @Column()
  stream_key: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ nullable: true })
  ended_at: Date;
}
