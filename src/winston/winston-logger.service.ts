import winston from 'winston'

const logger = winston.createLogger({
  level: 'verbose',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' }
})

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple()
    })
  )
}

//export default logger

import { LoggerService } from '@nestjs/common'

export class MyWinstonLogger implements LoggerService {
  log(message: string): void {
    //logger.log('info', new Date().toString() + ' -> ' + message)
    console.log('info', new Date().toString() + ' -> ' + message)
    /* your implementation */
  }
  error(message: string): void {
    //logger.log('error', new Date().toString() + ' -> ' + message)
    console.log('error', new Date().toString() + ' -> ' + message)
    /* your implementation */
  }
  warn(message: string): void {
    //logger.log('warn', new Date().toString() + ' -> ' + message)
    console.log('warn', new Date().toString() + ' -> ' + message)
    /* your implementation */
  }
  debug(message: string): void {
    //logger.log('debug', new Date().toString() + ' -> ' + message)
    console.log('debug', new Date().toString() + ' -> ' + message)
    /* your implementation */
  }
  verbose(message: string): void {
    //logger.log('verbose', new Date().toString() + ' -> ' + message)
    console.log('verbose', new Date().toString() + ' -> ' + message)
    /* your implementation */
  }
}
