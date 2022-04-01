import { Module, Global } from '@nestjs/common'
import { KTIotService } from './kt-iot.service'
import { KtIotController } from './kt-iot.controller'
import { LoggerModule } from '../winston/winston-logger.module'

import { Providers } from './models/Providers.entity'
import { Cities } from './models/Cities.entity'
import { Resources } from './models/Resources.entity'
import { Devices } from './models/Devices.entity'
import { TypeOrmModule } from '@nestjs/typeorm'

@Global()
@Module({
  imports: [LoggerModule, TypeOrmModule.forFeature([Providers, Cities, Resources, Devices])],
  providers: [KTIotService],
  controllers: [KtIotController]
})
export class KTIotModule {}
