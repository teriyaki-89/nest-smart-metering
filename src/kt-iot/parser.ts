import { metersConfig, Counters } from './config/meters'
import { Package, DecodedMeter, MetersInterface, MeterPackage, ObjectList } from './kt-iot.types'
import { Devices } from './models/Devices.entity'

function findMeterType(devEui: string): number {
  const novouchet = devEui.match('^70B')
  if (novouchet) return Counters.novouchet
  return Counters.betar
}

export function convertPackageToTelemetry(
  data: ObjectList[],
  devices: Devices[],
  UpdatedDevices: Set<number>
): [Package[], Devices[]] {
  const devEui = data[0].devEui as string
  const type = findMeterType(devEui as string)
  const config = metersConfig.find((i) => i.name == Counters[type]) as MetersInterface
  const relatedDevs = devices.filter((item) => item.deveui == devEui && item.istracked)

  const payload: Package[] = []

  data.forEach((item: any) => {
    const packTime = new Date(item.time)
    relatedDevs.forEach((relDev, id) => {
      const index = devices.findIndex((i) => i == relDev)
      UpdatedDevices.add(relDev.id)
      if (!devices[index].lasttimestamp || packTime.getTime() > devices[index].lasttimestamp.getTime()) {
        devices[index].lasttimestamp = packTime
        if (!payload[id]) {
          payload[id] = {
            type: relDev.devicetype,
            deviceName: relDev.devicename,
            deviceType: relDev.devicetype,
            groupName: relDev.devicegroup,
            telemetry: []
          }
        }
        if (relDev.devicetype == 'modem') {
          payload[id].telemetry.push({
            ts: packTime.getTime(),
            values: {
              devEui: item.devEui,
              rssi: item.rssi,
              lsnr: item.lsnr
            }
          })
        } else {
          const buf = Buffer.from(item.data as string, 'hex')
          const packet = config?.devices.find((item) => item.type == 'meter' && item.port == relDev.port)
            ?.package as MeterPackage[]
          if (packet) {
            const meterPayload = decodeData(config, packet, buf, packTime.getTime())
            // console.dir(mdevice.package, { depth: 10 })
            // console.log('-------------')
            if (Object.keys(meterPayload).length) payload[id].telemetry.push(meterPayload)
          }
        }
      }
    })
  })
  return [payload, devices]
}

export function decodeData(meter: MetersInterface, pack: MeterPackage[], buf: Buffer, timestamp: number): ObjectList {
  if (buf.length !== meter.bytes) return {}
  const decoded: DecodedMeter = {}

  const telemetry = {
    ts: null as number | null,
    values: {} as ObjectList
  }

  let counter = 0
  pack.forEach((cur: MeterPackage) => {
    const addition = cur.start ? cur.start : cur.length
    let data: number = buf[meter.readFunction](cur.start ? cur.start : counter, cur.length)

    let mappedRow = {}
    let formatted = 0

    if (cur.mapping && !cur.dependsAttr) {
      const check = cur.mapping.find((i) => i.equals == data)
      if (check) {
        mappedRow = check
        formatted = check.format ? check.format(check.res) : check.res
      }
    }

    if (!cur.mapping) {
      formatted = cur.format ? cur.format(data) : data
    }

    if (cur.attr == 'time') {
      telemetry.ts = formatted
      if (meter.name == Counters[Counters.novouchet]) {
        // для новоучета так как время там неправильно отображалось
        telemetry.ts = timestamp
      }
      counter = counter + addition
      return
    }

    if (cur.hidden) {
      decoded[cur.attr] = { hidden: true, value: formatted, mappedRow } // show only valid
    } else decoded[cur.attr] = { value: formatted, mappedRow }

    if (cur.dependsAttr) {
      const linkedRecord = decoded[cur.dependsAttr]
      const record = cur.mapping?.find((i) => i.dependValue == linkedRecord.mappedRow.equals)

      if (record.start && record.end) {
        data = buf[meter.readFunction](counter + record.start - 1, record.end - record.start + 1)
      }

      formatted = record.format ? record.format(data) : data
      decoded[cur.attr + '_' + record.attr] = { value: formatted, mappedRow }
    }

    counter = cur.start ? cur.start + cur.length : counter + addition
  })

  const values: { [key: string]: number | string | Date } = {}
  Object.keys(decoded).forEach((cur) => {
    values[cur] = decoded[cur].value
  })
  telemetry.values = values
  return telemetry
}
