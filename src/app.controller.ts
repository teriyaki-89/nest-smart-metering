import { Controller, Get, Header } from '@nestjs/common'
import { AppService } from './app.service'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get()
  @Header('custom', 'customValue')
  getHello(): { state: string } {
    return this.appService.getHello()
  }
}
