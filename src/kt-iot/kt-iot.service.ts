import { Injectable } from '@nestjs/common'
import { client as WebSocketClient, connection } from 'websocket'
import { Package, Dictionaries } from './kt-iot.types'
import MqttUploader from './mqtt-uploader'
import TbHanlder from './tb-hanlder'

import { MyWinstonLogger } from '../winston/winston-logger.service'
import 'source-map-support/register' // source map
import {
  closeConnection,
  selectAlmatySuDevicesFromDatabase,
  getDictionaries as getDicts,
  handleMessage,
  queryKtIotDevices
} from './methods'

import { Providers } from './models/Providers.entity'
import { Cities } from './models/Cities.entity'
import { Resources } from './models/Resources.entity'
import { Devices } from './models/Devices.entity'
import { DevicesDto, DevicesDevEuiPortDto } from './models/Devices.dto'

import { InjectRepository } from '@nestjs/typeorm'
import { DeleteResult, Repository } from 'typeorm'

import { KTIotWebsocket } from './kt-iot.websocket'

@Injectable()
export class KTIotService {
  public client: WebSocketClient | null = null
  public mqttUploader: MqttUploader | null = null
  public tbHanlder: TbHanlder | null = null
  public connection: connection | null = null
  public devices: Devices[] = []
  public startInterval = 1000 * 60 * 60 * 1 // run once in an 12 hours
  public interval: NodeJS.Timeout = setInterval(() => this.init(), this.startInterval)
  public restart = { value: true }
  public counter = { value: 0 }
  public packages: Package[][] = []
  constructor(
    private logger: MyWinstonLogger,
    @InjectRepository(Providers) private readonly ProvidersRepo: Repository<Providers>,
    @InjectRepository(Cities) private readonly CitiesRepo: Repository<Cities>,
    @InjectRepository(Resources) private readonly ResourcesRepo: Repository<Resources>,
    @InjectRepository(Devices) private readonly DevicesRepo: Repository<Devices>
  ) {
    //this.uploader = new mqttUploader()
    this.init()
  }

  onModuleDestroy(): void {
    clearInterval(this.interval)
  }
  onApplicationShutdown(): void {
    clearInterval(this.interval)
  }

  async getDictionaries(): Promise<Dictionaries> {
    try {
      return await getDicts(this.ProvidersRepo, this.CitiesRepo, this.ResourcesRepo)
    } catch (e) {
      throw Error(e.message)
    }
  }

  async getMeters(devEui: string): Promise<DevicesDto[]> {
    try {
      const meters = await this.DevicesRepo.find({ deveui: devEui })
      return meters
    } catch (e) {
      throw Error(e.message)
    }
  }

  async addMeter(Devices: DevicesDto[]): Promise<DevicesDto[]> {
    try {
      const meters = await this.DevicesRepo.save(Devices)
      const filteredDevices = meters.filter((item) => item.devicetype == 'modem')
      this.devices = [...this.devices, ...meters]
      this.counter.value += filteredDevices.length
      const callback = () => queryKtIotDevices(this.connection as connection, this.logger, filteredDevices)
      if (process.env.NODE_ENV == 'testing') return meters
      if (this.connection?.connected) {
        callback()
      } else {
        this.initializeWebsocket(callback)
      }
      return meters
    } catch (e) {
      throw Error(e.message)
    }
  }

  async deleteMeter(params: DevicesDevEuiPortDto): Promise<DeleteResult> {
    try {
      const meters = await this.DevicesRepo.delete(params)
      return meters
    } catch (e) {
      throw Error(e.message)
    }
  }

  async init(): Promise<void> {
    if (process.env.NODE_ENV == 'testing') return
    if (!this.restart.value) return
    this.tbHanlder = new TbHanlder(this.logger)
    const cb = async () => {
      const result = await selectAlmatySuDevicesFromDatabase(
        this.connection as connection,
        this.logger,
        this.DevicesRepo,
        this.ProvidersRepo,
        this.CitiesRepo,
        this.ResourcesRepo
      )
      this.devices = result[0]
      if (!this.devices.length) closeConnection(this.connection as connection)
      this.counter.value = result[1].length
    }
    this.initializeWebsocket(cb)
  }

  initializeWebsocket(callback: () => void): WebSocketClient {
    const { client } = new KTIotWebsocket()

    client.on('connectFailed', (error) => {
      this.logger.log('Connect Error: ' + error.toString())
    })

    client.on('connect', async (connection) => {
      this.restart.value = false
      this.connection = connection
      this.logger.log('WebSocket Client Connected')

      connection.on('error', (error) => {
        this.logger.log('Connection Error: ' + error.toString())
        closeConnection(connection)
      })

      connection.on('close', () => {
        this.logger.log('echo-protocol Connection Closed')
      })

      const UpdatedDevices: Set<number> = new Set()

      connection.on('message', (message) =>
        handleMessage(
          message,
          this.connection as connection,
          this.logger,
          this.tbHanlder as TbHanlder,
          this.DevicesRepo,
          this.devices,
          UpdatedDevices,
          this.packages,
          this.counter,
          this.restart
        )
      )
      if (callback) callback()
    })
    return client
  }
}
