import axios from 'axios'
import { Package } from './kt-iot.types'
import { MyWinstonLogger } from 'src/winston/winston-logger.service'
import { getToken, TBHeaders } from '../common/methods'


export default class TbHandler {
  public headers: TBHeaders | null = null
  public token: string | null = null
  public url = process.env.THINGSBOARD
  constructor(private logger: MyWinstonLogger) {
    this.init()
  }

  async init(): Promise<void> {
    try {
      this.token = await getToken()
      this.setHeaders(this.token)
    } catch (e) {
      console.log(e)
      this.logger.error(e.message)
    }
  }

  setHeaders(token: string): void {
    this.headers = {
      'X-Authorization': `Bearer ${token}`
    }
  }

  async getDeviceInfoByName(name: string): Promise<any> {
    return await axios
      .get(`${this.url}/api/tenant/devices?deviceName=${name}`, {
        headers: this.headers
      })
      .then((d) => d.data)
      .catch((e) => this.logger.error(e.message))
  }
  async linkModemToMeter(modemId: string, meterId: string): Promise<boolean | void> {
    const data = {
      from: {
        entityType: 'DEVICE',
        id: modemId
      },
      to: {
        entityType: 'DEVICE',
        id: meterId
      },
      type: 'Contains',
      typeGroup: 'COMMON'
    }
    const status: boolean | void = await axios
      .post(`${this.url}/api/relation`, data, {
        headers: this.headers
      })
      .then((d) => d.status == 200)
      .catch((e) => {
        console.log(e)
        this.logger.error(e.message)
      })
    return status
  }

  async upload(data: Package[]): Promise<number | string> {
    if (!this.token) {
      this.logger.error('no token')
      throw new Error('no token')
    }
    const status: number = await axios
      .post(`${this.url}/api/v1/integrations/http/integration-id`, data, {
        headers: this.headers
      })
      .then((d) => (d.status == 200 ? d.status : d.data))
      .catch((e) => {
        console.log(e)
        this.logger.error(e.message)
      })
    return status
  }
}
