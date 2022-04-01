import { Injectable, HttpException } from '@nestjs/common'
import { getToken, TBHeaders, getHeaders } from '../common/methods'
import axios from 'axios'
import { MyWinstonLogger } from 'src/winston/winston-logger.service'

@Injectable()
export class ThingsboardChargeService {
  customerId = ''
  charge = 0
  urlTB = process.env.THINGSBOARD
  logger = new MyWinstonLogger()
  headers: TBHeaders | null = null
  constructor() {
    this.setHeaders()
  }

  async setHeaders(): Promise<void> {
    this.headers = await getHeaders()
  }

  async chargeGroupClients(clients: { entityId: { id: string } }[]): Promise<{ assetId: string }[]> {
    if (!this.headers) await getHeaders()
    const results: Array<Promise<{ assetId: string }>> = []
    const func = async (client: { entityId: { id: string } }) => {
      try {
        const asset = await this.getAssetInfo(client.entityId)
        const devices = await this.getAllDevices(asset.customerId.id)
        const amount = await this.countTelemetry(devices.data)
        const status = await this.postTelemetry(asset.id.id, amount)
        
        return { assetId: asset.id.id }
      } catch (e) {
        this.logger.error(e.message)
        throw Error(e.message)
      }
    }
    clients.map((item) => results.push(func(item)))
    return await Promise.all(results)
  }

  async getAssetInfo(assetId: { id: string }): Promise<{ customerId: { id: string }; id: { id: string } }> {
    try {
      return await axios
        .get(`${this.urlTB}/api/asset/${assetId.id}`, {
          headers: this.headers
        })
        .then((response) => response.data)
        .catch((e) => {
          throw new HttpException(
            {
              status: e.response.status,
              message: 'tb error -> ' + e.response.data.message
            },
            e.response.status
          )
        })
    } catch (e) {
      this.logger.error(e.message)
      throw Error(e.message)
    }
  }

  async getAllDevices(
    customerId: string
  ): Promise<{ data: []; totalPages: number; totalElements: number; hasNext: boolean }> {
    return await axios
      .get(`${this.urlTB}/api/customer/${customerId}/devices?pageSize=900000&page=0`, {
        headers: this.headers
      })
      .then((response) => response.data)
      .catch((e) => {
        throw new HttpException(
          {
            status: e.response.status,
            message: 'tb error -> ' + e.response.data.message
          },
          e.response.status
        )
      })
  }

  async countTelemetry(data: { id: { id: string } }[]): Promise<number> {
    try {
      const promises: any[] = []
      let amount = 0

      data.forEach(async (item) => {
        const promise = new Promise(async (res, rej) => {
          if (!item.id) rej()
          const url = this.urlTB + '/api/plugins/telemetry/DEVICE/' + item.id.id + '/values/timeseries'
          try {
            const timeseries: { ts: { ts: number }[] } = await axios
              .get(url, {
                headers: this.headers
              })
              .then((response) => response.data)
            const attrsUrl =
              this.urlTB + '/api/plugins/telemetry/DEVICE/' + item.id.id + '/values/attributes/SERVER_SCOPE'
            const attrs: { key: string; value: unknown }[] = await axios
              .get(attrsUrl, {
                headers: this.headers
              })
              .then((response) => response.data)
            const value = attrs.find((el) => el.key === 'priceTG')?.value as string
            const lastActivityTime = attrs.find((el) => el.key === 'lastActivityTime')?.value as number
            if (!this.ifLastMonth(lastActivityTime)) throw Error('no last Month')
            if (value) {
              res(+value)
            } else res(0)
          } catch (e) {
            rej(e.message)
          }
        })
        promises.push(promise)
      })
      return await Promise.all(promises)
        .then((values) => {
          values.forEach((val) => (amount += val))
          return amount
        })
        .catch((e) => {
          throw Error(e.message)
        })
    } catch (e) {
      this.logger.error(e.message)
      throw Error(e.message)
    }
  }

  // // posting telemetry to the charging asset
  async postTelemetry(id: string, amount: number): Promise<number> {
    const url = this.urlTB + '/api/plugins/telemetry/ASSET/' + id + '/timeseries/SERVER_SCOPE'
    const data = {
      charge: amount
    }
    return await axios
      .post(url, data, {
        headers: this.headers
      })
      .then((response) => response.status)
      .catch((e) => {
        throw new HttpException(
          {
            status: e.response.status,
            message: 'tb error -> ' + e.response.data.message
          },
          e.response.status
        )
      })
  }

  ifLastMonth(timestamp: number): boolean {
    let sameMonth = false

    const elDate = new Date(timestamp)
    const date = new Date()
    const diff = date.getMonth() - elDate.getMonth()
    if (
      diff <= 1 ||
      (date.getMonth() && // if it is January
        (diff == -11 || // and this is December
          diff == 0)) // or January
    ) {
      sameMonth = true
    }
    return sameMonth
  }
}
