import { Module, Global } from '@nestjs/common'
import { IotGlobalStarService } from './iot-globalstar.service'
@Global()
@Module({
  providers: [IotGlobalStarService]
})
export class IotGlobalStarModule {}
