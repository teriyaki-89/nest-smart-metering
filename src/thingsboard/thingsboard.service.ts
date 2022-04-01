import { Injectable, HttpException } from '@nestjs/common'
import { checkAuthUser, getToken, getHeaders, TBHeaders } from '../common/methods'
import axios from 'axios'
import { client as WebSocketClient } from 'websocket'
import { ThingsboardChargeService } from './thingsboard.charge-service'

@Injectable()
export class ThingsboardService {
  client = new WebSocketClient()
  urlTB = process.env.THINGSBOARD
  headersTelco = {
    Authorization: 'Basic secret-hash',
    'Content-Type': 'application/json'
  }
  tbChargeService = new ThingsboardChargeService()
  constructor() {
    this.chargeClients()
  }

  async getBillingDetails(
    headers: { 'x-authorization': string },
    params: { [key: string]: number | string }
  ): Promise<Response> {
    try {
      await checkAuthUser(headers)

      const queryString = Object.keys(params)
        .map((key) => {
          return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
        })
        .join('&')

      return await axios
        .get(`http://esb-host:8280/proxy/v1.0.0/read/getBanFinanceAct?${queryString}`, {
          headers: this.headersTelco
        })
        .then((response) => response.data)
        .catch((e) => {
          throw new HttpException(
            {
              status: e.response.status,
              message: 'napi-proxy error -> ' + JSON.stringify(e.response.data)
            },
            e.response.status
          )
        })
    } catch (e) {
      console.log(e.message)
      throw new HttpException(
        {
          status: e.status,
          message: e.message
        },
        e.status
      )
    }
  }

  async chargeBilling(headersTB: TBHeaders, assetId: string): Promise<Response> {
    try {
      if (!headersTB || !headersTB['X-Authorization']) throw new HttpException({ message: 'no headers passed' }, 400)
      if (!assetId) throw new HttpException({ message: 'no assetId passed' }, 400)

      const telemetry: { key: string; value: number | string }[] = await axios
        .get(`${this.urlTB}/api/plugins/telemetry/ASSET/${assetId}/values/attributes/SERVER_SCOPE`, {
          headers: headersTB
        })
        .then((response) => response.data)
        .catch((e) => {
          console.log(e.response)
          throw new HttpException(
            {
              message: 'tb error -> ' + e.response?.data?.message
            },
            e.response?.status
          )
        })
      const ban = telemetry.find((item) => item.key == 'BAN')?.value
      if (!ban) throw new HttpException({ message: 'no BAN found in thingsboard telemetry' }, 400)
      const phone = telemetry.find((item) => item.key == 'phone')?.value
      if (!phone) throw new HttpException({ message: 'no phone found in thingsboard telemetry' }, 400)

      const timeseries: { charge: { ts: number; value: string | number }[] } = await axios
        .get(`${this.urlTB}/api/plugins/telemetry/ASSET/${assetId}/values/timeseries`, {
          headers: headersTB
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
      const raw = JSON.stringify({
        sourceId: 'iot',
        subscriberNo: '7053005047',
        ben: 0,
        featureCode: 'BSSTN',
        //rate: +timeseries.charge[0].value,
        rate: 300,
        taxInd: 'N',
        totalCount: '1'
      })
      console.log(raw)
      return await axios
        .post(`http://napi-proxy:8280/telco-billing/1.0.0/bans/${ban}/charge`, raw, { headers: this.headersTelco })
        .then((response) => response.data)
        .catch((e) => {
          throw new HttpException(
            {
              status: e.response.status,
              message: 'telco-billing error -> ' + JSON.stringify(e.response.data)
            },
            e.response.status
          )
        })
    } catch (e) {
      console.log(e.message)
      throw new HttpException(
        {
          status: e.status ? e.status : 500,
          message: e.message
        },
        e.status ? e.status : 500
      )
    }
  }

  async chargeClients(): Promise<void> {
    this.getCustomers(async (data: { data: { entityId: { id: string } }[] }) => {
      if (!data) return
      const arr = data.data
      const headers = await getHeaders()
      const results = await this.tbChargeService.chargeGroupClients(arr)
      results.forEach(async (result, id) => {
        //setTimeout(async () => {
        const res = await this.chargeBilling(headers, result.assetId)
        console.log(res)
        //}, id * 5000)
      })
    })
  }

  async getCustomers(callback: any): Promise<void> {
    try {
      const token = await getToken()
      this.client.connect(`wss://iot.test.kz/api/ws/plugins/telemetry?token=${token}`)
      this.client.on('connect', (connection) => {
        connection.on('message', (message) => {
          const { data } = JSON.parse(message.utf8Data as string)
          callback(data)
          //console.dir(data.data, { depth: 5 })
        })
        connection.on('error', (err) => {
          console.log('error ->', err)
        })
        const data = {
          entityDataCmds: [
            {
              cmdId: 1,
              latestCmd: {
                keys: [
                  { type: 'ATTRIBUTE', key: 'tarifName' },
                  { type: 'ATTRIBUTE', key: 'priceTG' },
                  { type: 'TIME_SERIES', key: 'charge' }
                ]
              },
              query: {
                entityFields: [
                  { type: 'ENTITY_FIELD', key: 'name' },
                  { type: 'ENTITY_FIELD', key: 'label' },
                  { type: 'ENTITY_FIELD', key: 'additionalInfo' }
                ],
                latestValues: [
                  { type: 'ATTRIBUTE', key: 'tarifName' },
                  { type: 'ATTRIBUTE', key: 'priceTG' },
                  { type: 'TIME_SERIES', key: 'charge' }
                ],
                entityFilter: {
                  assetNameFilter: '',
                  assetType: 'customerSetup',
                  resolveMultiple: true,
                  type: 'assetType'
                },
                pageLink: {
                  dynamic: true,
                  page: 0,
                  pageSize: 100
                }
              }
            }
          ]
        }
        connection.sendUTF(JSON.stringify(data), (err) => {
          if (err) console.log(err)
        })
      })

      this.client.on('connectFailed', (e) => {
        console.log(e)
      })
    } catch (e) {
      console.log(e.message)
    }
  }
}
