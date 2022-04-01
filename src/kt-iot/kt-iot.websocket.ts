import { Injectable } from '@nestjs/common'
import { client as WebSocketClient } from 'websocket'
import cas from 'ssl-root-cas'
import HttpsProxyAgent from 'https-proxy-agent'
import https from 'https'

@Injectable()
export class KTIotWebsocket {
  client: WebSocketClient
  constructor() {
    this.client = new WebSocketClient()
    this.init()
  }
  async init(): Promise<void> {
    const token = process.env.TOKEN
    const KtUrl = `wss://kt-iot.kz/ws/v2/?app_id=E5B148D6&token=${token}`
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'
    interface CaList extends Buffer {
      addFile(file: string): Buffer[]
    }
    try {
      const caList = cas.create() as CaList
      const path = process.env.PROJECT_PATH
      caList.addFile(path + 'certs/chain.crt')
      caList.addFile(path + 'certs/test-kz-chain.crt')

      if (process.env.NODE_ENV == 'production') {
        const proxy = JSON.parse(process.env.PROXY as string)
        const agent = new HttpsProxyAgent(proxy)
        const requestOptions = {
          agent,
          ca: caList
        }
        this.client.connect(KtUrl, undefined, undefined, undefined, requestOptions)
      } else {
        this.client.connect(KtUrl, undefined, undefined, undefined, {
          agent: new https.Agent({
            ca: caList
          })
        })
      }
    } catch (e) {
      console.log(e.message)
    }
  }
}
