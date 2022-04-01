import { Test, TestingModule } from '@nestjs/testing'
import { KtIotController } from '../../kt-iot/kt-iot.controller'
import { KTIotService } from '../../kt-iot/kt-iot.service'
import { MyWinstonLogger } from '../../winston/winston-logger.service'
import { Providers } from '../../kt-iot/models/Providers.entity'
import { Cities } from '../../kt-iot/models/Cities.entity'
import { Resources } from '../../kt-iot/models/Resources.entity'
import { Devices } from '../../kt-iot/models/Devices.entity'
import { DatabaseModule } from '../../database/database.module'
import { DevicesDto, DevicesDevEuiPortDto } from '../../kt-iot/models/Devices.dto'

import { TypeOrmModule } from '@nestjs/typeorm'
import { closeConnection } from '../../kt-iot/methods'
import { connection } from 'websocket'
import { decodeData } from '../../kt-iot/parser'
import { metersConfig, Counters } from '../../kt-iot/config/meters'
import { Package, DecodedMeter, MetersInterface, MeterPackage, ObjectList } from '../../kt-iot/kt-iot.types'

jest.useFakeTimers()

describe('KtIotController and ktIotService', () => {
  let ktIotController: KtIotController
  let ktIotService: KTIotService
  let app: TestingModule

  beforeEach(() => {
    jest.useFakeTimers()
  })
  beforeAll(async () => {
    //const { client, connection } = await KTIotWebsocket.init()
    app = await Test.createTestingModule({
      controllers: [KtIotController],
      providers: [KTIotService, MyWinstonLogger],
      imports: [DatabaseModule, TypeOrmModule.forFeature([Providers, Cities, Resources, Devices])]
    }).compile()

    ktIotController = app.get<KtIotController>(KtIotController)
    ktIotService = await app.get<KTIotService>(KTIotService)
  })

  afterAll(() => {
    app.close()
  })

  describe('test methods.ts', () => {
    it('test onApplicationShutdown', async () => {
      const connection = ktIotService.connection
      expect(closeConnection(connection as connection)).toEqual(true)
    })
  })

  describe('test parser.ts', () => {
    it('test ', async () => {
      const type = 0
      const config = metersConfig.find((i) => i.name == Counters[type]) as MetersInterface
      const packet = config?.devices.find((item) => item.type == 'meter' && item.port == 1)?.package as MeterPackage[]
      const buffer = Buffer.from('01531300001080AC600100EE9C44000003036801', 'hex')
      const timestamp = new Date('2021-05-25 04:08:41+0000').getTime()
      const object = decodeData(config, packet, buffer, timestamp)
      //console.log(object)
      expect(object).toHaveProperty('ts')
      expect(object).toHaveProperty('values')
    })
  })

  describe('test ktIotService', () => {
    it('test onApplicationShutdown', async () => {
      expect(ktIotService.onApplicationShutdown()).toEqual(undefined)
    })
  })

  describe('test KtIotController', () => {
    it('should return array of dictionaries', async () => {
      const dicts = await ktIotController.getDictionaries()
      const IsProvidersArray = Array.isArray(dicts.providers)
      expect(IsProvidersArray).toBe(true)
      const IsCitiesArray = Array.isArray(dicts.cities)
      expect(IsCitiesArray).toBe(true)
      const IsResourcesArray = Array.isArray(dicts.resources)
      expect(IsResourcesArray).toBe(true)
    })

    it('should throw on wrong getMeters', async () => {
      expect.assertions(2)
      try {
        await ktIotController.getMeters('123')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(error).toHaveProperty('message')
      }
    })

    it('should throw on wrong addMeter', async () => {
      expect.assertions(2)
      try {
        await ktIotController.addMeter([{}] as DevicesDto[])
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(error).toHaveProperty('message')
      }
    })

    test('crud operations on devices', async () => {
      const data: DevicesDto[] = [
        {
          devicetype: 'modem',
          deveui: '70B3D52790004DDB',
          devicename: 'test modem 70B3D52790004DDB',
          devicegroup: '123',
          cityid: 1,
          istracked: true,
          lasttimestamp: new Date('2021-03-05')
        },
        {
          devicetype: 'meter',
          deveui: '70B3D52790004DDB',
          devicename: 'test meter 70B3D52790004DDB port 1',
          port: 1,
          devicegroup: '123',
          resourceid: 2,
          cityid: 1,
          providerid: 1,
          istracked: true,
          lasttimestamp: new Date('2021-03-05')
        },
        {
          devicetype: 'meter',
          deveui: '70B3D52790004DDB',
          devicename: 'test meter 70B3D52790004DDB port 3',
          port: 3,
          devicegroup: '123',
          resourceid: 2,
          cityid: 1,
          providerid: 1,
          istracked: true,
          lasttimestamp: new Date('2021-03-05')
        }
      ]
      const resultAdd = await ktIotController.addMeter(data)
      expect(Array.isArray(resultAdd)).toBe(true)
      expect(resultAdd.length).toEqual(3)
      const deveui = '70B3D52790004DDB'

      const resultGet = await ktIotController.getMeters(deveui)
      expect(resultGet.length).toEqual(resultAdd.length)
      resultGet.map((item) => {
        expect(item).toHaveProperty('id')
      })

      const params: DevicesDevEuiPortDto = { deveui }
      const resultDelete = await ktIotController.deleteMeter(params)
      expect(resultDelete.affected).toEqual(resultAdd.length)
    })
  })
})
