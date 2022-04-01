import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class Providers {
  @PrimaryGeneratedColumn() id!: number
  @Column() nameen!: string
  @Column() nameru!: string
  @Column() namekz!: string
}
