import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ObjectList } from './iot-globalstar.dto'
import axios from 'axios'

@Injectable()
export class IotGlobalStarService {
  public startInterval = 1000 * 15 // run once in an hour
  public interval: NodeJS.Timeout = setInterval(() => this.init(), this.startInterval)
  //public interval: NodeJS.Timeout = setTimeout(() => this.init(), 1000)
  public restart = true

  constructor(private configService: ConfigService) {}

  onModuleDestroy(): void {
    clearInterval(this.interval)
  }
  onApplicationShutdown(): void {
    clearInterval(this.interval)
  }

  async init(): Promise<undefined> {
    if (!this.restart) return
    this.restart = false
    const data = await this.getData()
    console.log(data)
    if (data) {
      const res = await this.uploadToTB(data)
      console.log(res)
      this.restart = true
    }
  }

  async getData(): Promise<ObjectList> {
    const url = 'https://api.spotter.net/company/getLocation.php'
    const query = {
      Username: 'test-user',
      Password: 'test-password'
    }

    return await axios
      .post(url, query)
      .then((d) => d.data)
      .catch((e) => {
        console.log(e)
        this.restart = true
      })
  }
  async uploadToTB(data: ObjectList): Promise<number | void> {
    const url = 'https://iot.test.kz/api/v1/integrations/http/integration-id'
    return await axios
      .post(url, data)
      .then((d) => d.status)
      .catch((e) => {
        console.log(e)
        this.restart = true
      })
  }
}
