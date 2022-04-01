import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  getHello(): { state: string } {
    return { state: 'ok' }
  }
}
