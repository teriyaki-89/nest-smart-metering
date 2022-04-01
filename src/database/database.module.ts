import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Providers } from '../kt-iot/models/Providers.entity'
import { Cities } from '../kt-iot/models/Cities.entity'
import { Resources } from '../kt-iot/models/Resources.entity'
import { Devices } from '../kt-iot/models/Devices.entity'

@Module({
  imports: [
    TypeOrmModule.forRoot(
       {
            type: 'postgres',
            host: '172.17.0.1',
            port: 5432,
            username: 'postgres',
            password: '123456',
            database: 'smart-meters',
            entities: [Providers, Cities, Resources, Devices]
            //synchronize: true
          }
    )
    
  ]
})
export class DatabaseModule {}
