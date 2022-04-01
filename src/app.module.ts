import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ThingsboardModule } from './thingsboard/thingsboard.module'
import { KTIotModule } from './kt-iot/kt-iot.module'
import { DatabaseModule } from './database/database.module'
import configuration from './kt-iot/config/configuration'

@Module({
  imports: [
    ThingsboardModule,
    KTIotModule,
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true
    }),
    DatabaseModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
