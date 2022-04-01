import { Controller, Param, Body, Post, Get, HttpException, Headers, Query } from '@nestjs/common'
import { ThingsboardService } from './thingsboard.service'
import axios from 'axios'
import { TBHeaders } from '../common/methods'

@Controller()
export class ThingsboardController {
  constructor(private readonly thingsboardService: ThingsboardService) {}
  @Post('/billing/charge/:assetId')
  chargeBilling(@Param('assetId') assetId: string, @Headers() headers: TBHeaders): Promise<Response> {
    return this.thingsboardService.chargeBilling(headers, assetId)
  }
  @Get('billing/details') checkDetails(
    @Headers() headers: { 'x-authorization': string },
    @Query() query: { [key: string]: number | string }
  ): Promise<Response> {
    return this.thingsboardService.getBillingDetails(headers, query)
  }

  @Get('/check/asset/:assetId') async checkAsset(
    @Param('assetId') assetId: string,
    @Headers() headersTB: { 'x-authorization': string }
  ): Promise<Response> {
    try {
      if (!headersTB || !headersTB['x-authorization']) throw new Error('no headers passed')
      const headers = {
        'x-authorization': headersTB['x-authorization']
      }
      const url = process.env.THINGSBOARD
      return await axios
        .get(`${url}/api/asset/${assetId}`, {
          headers
        })
        .then((res) => res.data)
    } catch (e) {
      throw new HttpException(
        {
          status: e.response.status,
          error: e.response.data.message
        },
        e.response.status
      )
    }
  }
}
