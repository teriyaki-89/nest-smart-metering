import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from './app.module'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'

import { MyWinstonLogger } from './winston/winston-logger.service'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: new MyWinstonLogger()
  })

  // cors
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204
  })

  const host = '0.0.0.0'
  const port: number = parseInt(<string>process.env.PORT, 10) || 0
  const options = new DocumentBuilder()
    .setTitle('IOT api')
    .setDescription('The  API description')
    .setVersion('1.0')
    //.addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, options)
  SwaggerModule.setup('api', app, document)

  await app.listen(port, host)
}
bootstrap()
