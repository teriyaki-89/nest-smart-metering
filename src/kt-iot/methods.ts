import { Commands, Package } from './kt-iot.types'
import { connection, IMessage } from 'websocket'
import { MyWinstonLogger } from 'src/winston/winston-logger.service'

import { Providers } from './models/Providers.entity'
import { Cities } from './models/Cities.entity'
import { Resources } from './models/Resources.entity'
import { Devices } from './models/Devices.entity'
import { In, Repository } from 'typeorm'

import TbHanlder from '../kt-iot/tb-hanlder'
import { convertPackageToTelemetry } from '../kt-iot/parser'

export function getConnectionsList(connection: connection, logger: MyWinstonLogger): void {
  const data = JSON.stringify({
    cmd: Commands.connections_list,
    operation_id: 'string'
  })
  sendRequest(data, connection, logger)
}

export async function getDevices(connection: connection, logger: MyWinstonLogger, deveui: string): Promise<void> {
  try {
    const data = JSON.stringify({
      cmd: Commands.get_devices_req,
      operation_id: 'string',
      devEui: deveui
    })
    sendRequest(data, connection, logger)
  } catch (e) {
    throw Error(e.message)
  }
}

export async function selectAlmatySuDevicesFromDatabase(
  connection: connection,
  logger: MyWinstonLogger,
  DevicesRepo: Repository<Devices>,
  ProvidersRepo: Repository<Providers>,
  CitiesRepo: Repository<Cities>,
  ResourcesRepo: Repository<Resources>
): Promise<[Devices[], Devices[]]> {
  try {
    const almatySuId = (await ProvidersRepo.findOne({ nameru: 'АлматыСу' }))?.id
    const cityId = (await CitiesRepo.findOne({ nameru: 'Алматы' }))?.id
    const resourceId = (await ResourcesRepo.findOne({ nameru: 'Холодная вода' }))?.id
    const relatedMeters = await DevicesRepo.find({
      devicetype: 'meter',
      providerid: almatySuId,
      cityid: cityId,
      resourceid: resourceId,
      istracked: true
    })
    const devIds = relatedMeters.map(({ id }) => id)
    const devEuis = relatedMeters.map(({ deveui }) => deveui)
    const devices = await DevicesRepo.find({
      where: [{ id: In(devIds) }, { devicetype: 'modem', deveui: In(devEuis) }]
    })
    const filteredDevices = devices.filter((item) => item.devicetype == 'modem')
    await queryKtIotDevices(connection, logger, filteredDevices)
    return [devices, filteredDevices]
  } catch (e) {
    throw Error(e.message)
  }
}

export async function queryKtIotDevices(
  connection: connection,
  logger: MyWinstonLogger,
  devices: Devices[]
): Promise<void> {
  try {
    devices.forEach((item) => {
      if (item.deveui && item.deveui.length == 16) {
        const start = item.lasttimestamp
          ? new Date(item.lasttimestamp)
          : new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) // за один месяц
        const end = new Date()
        const data = JSON.stringify({
          cmd: Commands.get_data_req,
          operation_id: 'string',
          limit: 100000,
          devEui: item.deveui,
          date_from: start.toISOString(),
          date_to: end.toISOString()
        })
        sendRequest(data, connection, logger)
      }
    })
  } catch (e) {
    throw new Error(e.message)
  }
}

export function subscribeToRealtime(connection: connection, logger: MyWinstonLogger): void {
  const data = JSON.stringify({
    cmd: Commands.consume_req
  })
  sendRequest(data, connection, logger)
}

export function sendRequest(data: string, connection: connection, logger: MyWinstonLogger): void | false {
  if (process.env.NODE_ENV == 'testing') return
  if (!connection) {
    console.log('no connection')
    logger.log('no connection')
    return false
  }
  connection.sendUTF(data, (err) => {
    if (err) logger.log(err.message)
  })
}

export function closeConnection(connection: connection): boolean {
  connection?.close()
  return true
}

export async function getDictionaries(
  ProvidersRepo: Repository<Providers>,
  CitiesRepo: Repository<Cities>,
  ResourcesRepo: Repository<Resources>
): Promise<{ providers: Providers[]; cities: Cities[]; resources: Resources[] }> {
  try {
    const promises = []
    promises.push(ProvidersRepo.find())
    promises.push(CitiesRepo.find())
    promises.push(ResourcesRepo.find())
    const result = await Promise.all(promises)
    return {
      providers: result[0],
      cities: result[1],
      resources: result[2]
    }
  } catch (e) {
    throw Error(e.detail)
  }
}

export async function handleMessage(
  message: IMessage,
  connection: connection,
  logger: MyWinstonLogger,
  tbHanlder: TbHanlder,
  DevicesRepo: Repository<Devices>,
  devices: Devices[],
  UpdatedDevices: Set<number>,
  packages: Package[][],
  counter: { value: number },
  restart: { value: boolean }
): Promise<void> {
  try {
    if (message.type === 'utf8') {
      const pack = JSON.parse(message.utf8Data as string)
      switch (pack.cmd) {
        case Commands.get_data_resp:
          if (pack.dataList && pack.dataList.length) {
            const [payload, devs] = convertPackageToTelemetry(pack.dataList, devices, UpdatedDevices)
            if (payload[0]?.telemetry?.length) {
              packages.push(payload)
              devices = devs
            }
          }
          if (pack.dataList) {
            counter.value--
          }
          if (counter.value == 0) {
            //console.dir({ packages }, { depth: 6 })
            if (packages.length) {
              logger.log('ok to upload')
              const result = await uploadTelemetryToTB(packages, tbHanlder, logger)
              console.log(result)
              logger.log('uploaded tepemetry: ' + result)
            } else logger.log('nothing to upload')
            const devicesForSaving = devices.filter((item) => UpdatedDevices.has(item.id))
            await DevicesRepo.save(devicesForSaving)
            clearStateVars()
          }
          break
        case Commands.consume_resp:
          subscribeToRealtime(connection, logger)
          break
      }
    }
  } catch (e) {
    clearStateVars()
    throw new Error(e.message)
  }
  function clearStateVars(): void {
    packages.length = 0
    devices.length = 0
    restart.value = closeConnection(connection as connection)
    UpdatedDevices.clear()
  }
}

export async function uploadTelemetryToTB(
  packages: Package[][],
  tbHanlder: TbHanlder,
  logger: MyWinstonLogger
): Promise<number[]> {
  let uploadedCnt = 0
  const uploadingAmount = packages.length
  for (const pack of packages) {
    try {
      const status = await tbHanlder?.upload(pack)
      if (status == 200) {
        uploadedCnt++
      } else console.dir({ status })
      // if (this.uploader!.client?.connected) {
      //   this.uploader!.publish(pack)
      // }
    } catch (e) {
      logger.log(e.message)
    }
  }
  return [uploadedCnt, uploadingAmount]
}
