import mqtt from 'mqtt'
import log from './logger.js'

let connectMsg = false, status = false
const MQTT_HOST = process.env.MQTT_HOST || 'mqtt-broker'
const MQTT_PORT = process.env.MQTT_PORT || '1883'
const MQTT_USER = process.env.MQTT_USER || 'hassio'
const MQTT_PASS = process.env.MQTT_PASS || 'hassio'
const DEVICE_NAME = process.env.DEVICE_NAME || 'Solar Forecast'
const connectUrl = `mqtt://${MQTT_HOST}:${MQTT_PORT}`
console.log(connectUrl)

const client = mqtt.connect(connectUrl, {
  clientId: `mqtt_${DEVICE_NAME}`,
  clean: true,
  keepalive: 60,
  connectTimeout: 4000,
  username: MQTT_USER,
  password: MQTT_PASS,
  reconnectPeriod: 1000,
})

client.on('connect', function () {
  if (!connectMsg) {
    connectMsg = true
    status = true
    log.info('MQTT Connection successful...')
  }
})

function getStatus() {
  return status
}

function publish(topic, message, retain = false) {
  return new Promise(function (resolve, reject) {
    client.publish(topic, message, { qos: 1, retain: retain }, function (error) {
      if (error) reject(error)
      resolve()
    })
  })
}

function registerSensor(id, name, opts) {
  if (!id || !name || !opts) return
  let device_name = DEVICE_NAME?.toLowerCase()?.replace(/ /g, '_')
  return new Promise(function (resolve, reject) {
    let payload = {
      name: `${DEVICE_NAME} ${name}`,
      state_topic: `${device_name}/${id}/state`,
      uniq_id: `${id}`,
      device: {
        ids: [`${device_name}`],
        name: `${DEVICE_NAME}`
      }
    }
    client.publish(`homeassistant/sensor/${device_name}_${id}/config`, JSON.stringify({ ...payload, ...opts }), { qos: 1, retain: true }, function (error, packet) {
      if (error) reject(error)
      resolve()
    })
  })
}

function sendSensorValue(id, value, retain = false) {
  if (!id || !value) return
  let device_name = DEVICE_NAME?.toLowerCase()?.replace(/ /g, '_')
  return new Promise(function (resolve, reject) {
    client.publish(`${device_name}/${id}/state`, value, { qos: 1, retain: true }, function (error) {
      if (error) reject(error)
      resolve()
    })
  })
}

export default { status: getStatus, publish, registerSensor, sendSensorValue }