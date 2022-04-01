import { Providers } from './models/Providers.entity'
import { Cities } from './models/Cities.entity'
import { Resources } from './models/Resources.entity'

export type ObjectList = {
  [key: string]: string | number | Date | boolean | ObjectList[] | ObjectList | null | []
}

export interface Dictionaries {
  providers: Providers[]
  cities: Cities[]
  resources: Resources[]
}

export interface Package {
  id?: string
  type: 'modem' | 'meter'
  deviceName: string
  deviceType: string
  groupName: string
  telemetry: ObjectList[]
}
export interface Telemetry {
  modem: ObjectList
  meters: ObjectList[]
}


export interface DecodedMeter {
  [key: string]: { value: string | number | Date; hidden?: boolean; mappedRow: { [key: string]: string | number } }
}
export interface MeterPackage {
  start?: number
  length: number
  attr: string
  format?: (val: number) => number
  mapping?: any[]
  dependsAttr?: string
  hidden?: boolean
}

export interface MetersInterface {
  name: string
  bytes: number
  readFunction: 'readUIntBE' | 'readUIntLE'
  deviceType?: string
  devices: {
    type: 'modem' | 'meter'
    deviceName?: (par: string) => string
    port?: number
    package?: MeterPackage[]
    deviceGroup?: string
  }[]
}

export enum Commands {
  get_devices_req = 'get_devices_req',
  get_devices_resp = 'get_devices_resp',
  get_data_req = 'get_data_req',
  get_data_resp = 'get_data_resp',
  consume_req = 'consume_req',
  consume_resp = 'consume_resp',
  connections_list = 'connections_list'
}
