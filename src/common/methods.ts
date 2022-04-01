import axios from 'axios'
import { HttpException } from '@nestjs/common'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { MyWinstonLogger } from '../winston/winston-logger.service'

const logger = new MyWinstonLogger()

export interface TBHeaders {
  'X-Authorization': string
}

export async function checkAuthUser(headers: { 'x-authorization': string }): Promise<Response> {
  if (!headers || !headers['x-authorization']) throw new Error('no headers passed')
  return await axios
    .get(`${process.env.THINGSBOARD}/api/auth/user`, {
      headers
    })
    .then((response) => response.data)
    .catch((e) => {
      throw new HttpException(
        {
          status: e.response.status,
          message: 'tb error -> ' + e.response.data.message
        },
        e.response.status
      )
    })
}
export async function getHeaders(): Promise<TBHeaders> {
  const token = await getToken()
  const headers = {
    'X-Authorization': 'Bearer ' + token
  }
  return headers
}

export async function getToken(): Promise<string> {
  try {
    const readFile = promisify(fs.readFile)
    const filePath = path.join(__dirname, '../../src/' + process.env.TOKEN_FILE)
    const fileData: { token: string; refreshToken: string } = JSON.parse(await readFile(filePath, 'utf8'))
    const data = fileData.token.split('.')
    const buff = Buffer.from(data[1], 'base64')
    const exp = JSON.parse(buff.toString('ascii')).exp

    if (Date.now() / 1000 < exp + 5 * 60) return fileData.token

    const newTokens = await extendToken(fileData)
    if (!newTokens) throw Error('Не получили токены')

    fs.writeFile(filePath, JSON.stringify(newTokens), (err) => {
      if (err) throw Error(err.message)
      logger.log('Обновили токен')
    })
    return newTokens.token
  } catch (e) {
    logger.error(e.message)
    throw Error(e.message)
  }
}

async function extendToken(headers: {
  token: string
  refreshToken: string
}): Promise<{ token: string; refreshToken: string }> {
  const { token, refreshToken } = headers
  return await axios
    .post(
      `${process.env.THINGSBOARD}/api/auth/token`,
      {
        refreshToken
      },
      { headers: { 'x-authorization': token } }
    )
    .then((d) => {
      return d.data
    })
    .catch((e) => {
      logger.error(e?.response.data.message ? e?.response.data.message : e.message)
    })
}
