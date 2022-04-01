import { MetersInterface } from '../../kt-iot.types'

enum Counters {
  betar,
  novouchet
}

const metersConfig: MetersInterface[] = [
  {
    name: Counters[0],
    bytes: 20,
    readFunction: 'readUIntLE',
    // deviceType: 'BetarDevice',
    devices: [
      {
        type: 'modem'
        // deviceName: (devEui: string): string => 'Betar-Vega modem ' + devEui,
        // deviceGroup: 'Kt-Iot-Betar modems'
      },
      {
        type: 'meter',
        // deviceName: (devEui: string): string => 'Betar-Vega meter ' + devEui,
        // deviceGroup: 'Kt-Iot-Betar meters',
        port: 1,
        package: [
          { length: 1, attr: 'packet_type' },
          { length: 1, attr: 'battery_level' },
          { length: 1, attr: 'temperature' },
          { length: 1, attr: 'has_magnetic_field' },
          { length: 1, attr: 'is_digital_indicator_blocked' },
          { length: 4, attr: 'time', format: (a: number): number => a * 1000 },
          { length: 1, attr: 'is_leaking' },
          { length: 1, attr: 'is_rupture' },
          { length: 4, attr: 'current_reading', format: (val: number): number => val / 10000 },
          { length: 1, attr: 'package_confirmation_setting' }, // (в куб.м умноженных на 10 000)
          { length: 1, attr: 'sending_period_setting' }, // 1 - 1 hour, 2 - 6 hours, 3 - 12 hours, 4 - 12 hours
          { length: 1, attr: 'rom_gather_period_setting' }, // 1 - 1 hour, 2 - 6 hours, 3 - 12 hours, 4 - 12 hours
          { length: 2, attr: 'timezone', format: (val: number): number => val / 60 }
        ]
      }
    ]
  },
  {
    name: Counters[1],
    bytes: 29,
    readFunction: 'readUIntBE',
    //deviceType: 'NovouchetDevice',
    devices: [
      {
        type: 'modem'
        // deviceName: (devEui: string): string => 'Novouchet modem ' + devEui,
        // deviceGroup: 'Kt-Iot-Novouchet modems'
      },
      {
        type: 'meter',
        // deviceName: (devEui: string): string => 'Novouchet meter ' + devEui + ' port 1',
        // deviceGroup: 'Kt-Iot-Novouchet meters',
        port: 1,
        package: [
          { length: 4, attr: 'time', format: (val: number): number => val * 1000 },
          ...prepateNovouchetSequence(4),
          { start: 28, length: 1, attr: 'temperature' }
        ]
      },
      {
        type: 'meter',
        // deviceName: (devEui: string): string => 'Novouchet meter ' + devEui + ' port 2',
        // deviceGroup: 'Kt-Iot-Novouchet meters',
        port: 2,
        package: [
          { length: 4, attr: 'time', format: (val: number): number => val * 1000 },
          ...prepateNovouchetSequence(10),
          { start: 28, length: 1, attr: 'temperature' }
        ]
      },
      {
        type: 'meter',
        // deviceName: (devEui: string): string => 'Novouchet meter ' + devEui + ' port 3',
        // deviceGroup: 'Kt-Iot-Novouchet meters',
        port: 3,
        package: [
          { length: 4, attr: 'time', format: (val: number): number => val * 1000 },
          ...prepateNovouchetSequence(16),
          { start: 28, length: 1, attr: 'temperature' }
        ]
      },
      {
        type: 'meter',
        // deviceName: (devEui: string): string => 'Novouchet meter ' + devEui + ' port 4',
        // deviceGroup: 'Kt-Iot-Novouchet meters',
        port: 4,
        package: [
          { length: 4, attr: 'time', format: (val: number): number => val * 1000 },
          ...prepateNovouchetSequence(22),
          { start: 28, length: 1, attr: 'temperature' }
        ]
      }
    ]
  }
]

function prepateNovouchetSequence(start?: number) {
  const sequence = [
    {
      start,
      length: 1,
      attr: 'entry antibounce_filter_time',
      mapping: [
        { equals: 1, res: '5ms' },
        { equals: 2, res: '100ms' },
        { equals: 3, res: '500ms' }
      ]
    },
    {
      length: 1,
      attr: 'entry multiple attrs',
      hidden: true,
      mapping: [
        { equals: 0, res: 'impulse_entry_state_1' },
        { equals: 1, res: 'temperature_sensor' },
        { equals: 2, res: 'close_circuit_signalisation' },
        { equals: 3, res: 'open_circuit_signalisation' },
        { equals: 4, res: 'entry_state' },
        { equals: 5, res: 'impulse_entry_state_2' }
      ]
    },
    {
      length: 4,
      attr: 'entry information',
      dependsAttr: 'entry multiple attrs',
      mapping: [
        { dependValue: 0, attr: 'impulse amount' },
        { dependValue: 1, attr: 'temperature', start: 3, end: 4, format: (val: number): number => val * 100 },
        { dependValue: 2, attr: 'close_circuit_signalisation', start: 4, end: 4 },
        { dependValue: 3, attr: 'open_circuit_signalisation', start: 4, end: 4 },
        { dependValue: 4, attr: 'entry_state', start: 4, end: 4 },
        { dependValue: 5, attr: 'impulse_amount_previous', start: 1, end: 4 }
      ]
    }
  ]
  return sequence
}

export { metersConfig, Counters }
