'use strict'
const log = require('./logger')
const getData = require('./getData')
const { dataList } = require('./dataList')
const updateData = require('./updateData')
const cache = require('./cache')
const updateSensors = require('./updateSensors')
const mqtt = require('./mqtt')

const sync = async()=>{
  try{
    let res = await getData()
    if(res?.watts && res?.watt_hours_period){
      log.info(`New Forcast Data recieved...`)
      await cache.set(res)
      dataList.watts = res.watts
      dataList.watt_hours_period = res.watt_hours_period
    }
    setTimeout(sync, 900 * 1000)
  }catch(e){
    log.error(e)
    setTimeout(sync, 5000)
  }
}
const start = async()=>{
  try{
    let data = await cache.get()
    if(data?.watts && data?.watt_hours_period) updateData(data)
    sync()
    checkMqtt()
  }catch(e){
    log.error(e)
  }
}
const checkMqtt = ()=>{
  try{
    let status = mqtt.status()
    if(status){
      updateSensors()
      return
    }
    setTimeout(checkMqtt, 5000)
  }catch(e){
    log.error(e)
    setTimeout(checkMqtt, 5000)
  }
}
start()
