import log from './logger.js'
import getData from './getData.js'
import { dataList } from './dataList.js'
import updateData from './updateData.js'
import cache from './cache.js'
import updateSensors from './updateSensors.js'
import mqtt from './mqtt.js'

async function sync(){
  try {
    let res = await getData()
    if (res?.watts && res?.watt_hours_period) {
      log.info(`New Forecast Data recieved...`)
      await cache.set(res)
      dataList.watts = res.watts
      dataList.watt_hours_period = res.watt_hours_period
    }
    setTimeout(sync, 900 * 1000)
  } catch (e) {
    log.error(e)
    setTimeout(sync, 5000)
  }
}

async function start(){
  try {
    if(!cache.status()) return setTimeout(start, 5000)
    let data = await cache.get()
    if (data?.watts && data?.watt_hours_period) updateData(data)
    sync()
    checkMqtt()
  } catch (e) {
    log.error(e)
    setTimeout(start, 5000)
  }
}

function checkMqtt(){
  try {
    let status = mqtt.status()
    if (status) {
      updateSensors()
      return
    }
    setTimeout(checkMqtt, 5000)
  } catch (e) {
    log.error(e)
    setTimeout(checkMqtt, 5000)
  }
}

start();