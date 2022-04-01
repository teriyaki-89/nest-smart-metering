import { Module } from '@nestjs/common'
import { MyWinstonLogger } from './winston-logger.service'

@Module({
  providers: [MyWinstonLogger],
  exports: [MyWinstonLogger]
})
export class LoggerModule {}
