import { Controller, Post, Get, Patch, Body, Param, Delete, HttpException, HttpStatus, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiProperty } from '@nestjs/swagger'

import { KTIotService } from './kt-iot.service'
import { DevicesDevEuiPortDto, DevicesDto } from './models/Devices.dto'
import { ValidationPipe } from '../validation.pipe'
import { DeleteResult, InsertResult } from 'typeorm'
import { Dictionaries } from '../kt-iot/kt-iot.types'

@ApiTags('kt-iot')
@Controller('kt-iot')
export class KtIotController {
  constructor(private readonly ktIot: KTIotService) {}
  @ApiOperation({ summary: 'Получение справочников' })
  @ApiResponse({
    status: 200,
    description: 'Получение справочников'
  })
  @Get('/dictionaries')
  async getDictionaries(): Promise<Dictionaries> {
    try {
      return await this.ktIot.getDictionaries()
    } catch (e) {
      return e.message
    }
  }

  @ApiOperation({ summary: 'Получение счетчиков по devEui' })
  @Get('/meter')
  async getMeters(@Query('deveui') deveui: string): Promise<DevicesDto[]> {
    try {
      deveui = deveui.replace(/\"/g, '')
      if (deveui.length !== 16) throw new Error('deveui должен быть равен 16 символам')
      const devices = await this.ktIot.getMeters(deveui)
      return devices
    } catch (e) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          message: e.message
        },
        HttpStatus.FORBIDDEN
      )
    }
  }

  @ApiOperation({ summary: 'Регистрация счетчика' })
  @Post('/meter')
  async addMeter(@Body(new ValidationPipe()) meters: DevicesDto[]): Promise<DevicesDto[]> {
    try {
      const devices = await this.ktIot.addMeter(meters)
      return devices
    } catch (e) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          message: e.message
        },
        HttpStatus.FORBIDDEN
      )
    }
  }

  @ApiOperation({ summary: 'Снятие регистрации счетчиков по deveui и port' })
  @Delete('/meter')
  async deleteMeter(@Body(new ValidationPipe()) params: DevicesDevEuiPortDto): Promise<DeleteResult> {
    try {
      if (params.deveui.length !== 16) throw new Error('deveui должен быть равен 16 символам')
      const genId = await this.ktIot.deleteMeter(params)
      return genId
    } catch (e) {
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          message: e.message
        },
        HttpStatus.FORBIDDEN
      )
    }
  }
}
