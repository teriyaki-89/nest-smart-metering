import mqtt from 'mqtt'

import { ObjectList, Package } from './kt-iot.types'

const url = 'mqtt://iot.test.kz:1883'
const topic = 'kt-iot-topic'

class MQTTUploader {
  public client: mqtt.Client | null = null
  constructor() {
    this.connect()
  }

  connect(): void {
    this.client = mqtt.connect(url)
    this.client.subscribe(topic)
    this.client.on('connect', () => {
      console.log('connected  ' + this.client!.connected)
    })
    this.client.on('error', function (error) {
      console.log('Can`t connect' + error)
      process.exit(1)
    })
    this.client.on('message', function (topic, message, packet) {
      console.log('message is ' + message)
      console.log('topic is ' + topic)
    })
    this.client.subscribe(topic, (data) => {
      console.log(data)
    })
  }

  publish(payload: Package): Error | true {
    if (!this.client || !this.client.connected) {
      throw new Error('no connection')
    }

    const str = JSON.stringify(payload)
    this.client.publish(topic, str)
    return true
  }
}

export default MQTTUploader
