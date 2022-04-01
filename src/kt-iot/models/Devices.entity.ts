import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class Devices {
  @PrimaryGeneratedColumn() id!: number
  @Column() devicetype!: 'meter' | 'modem'
  @Column() deveui!: string
  @Column() devicename!: string
  @Column() devicegroup!: string
  @Column() port!: number
  @Column() resourceid?: number
  @Column() cityid!: number
  @Column() providerid?: number
  @Column() istracked!: boolean
  @Column() lasttimestamp!: Date
}
