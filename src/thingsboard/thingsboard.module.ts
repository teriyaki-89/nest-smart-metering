import { Module } from '@nestjs/common'
import { ThingsboardController } from './thingsboard.controller'
import { ThingsboardService } from './thingsboard.service'

@Module({
  imports: [],
  controllers: [ThingsboardController],
  providers: [ThingsboardService]
})
export class ThingsboardModule {}
