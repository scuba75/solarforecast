'use strict'
const log = require('./logger')
const { dataList } = require('./dataList')
const mqtt = require('./mqtt')
const timeZone = "America/New_York";
const sensorConfig = require('./sensorConfig.json')
const influxdb = require('./influxdb')

function getTimeStamp(dateString, msgTime){
  let array = msgTime.split('+'), offSetSymbol = '+'
  if(array?.length < 2){
    array = msgTime.split('-')
    offSetSymbol = '-'
  }
  let tzString = `${dateString.replace(' ', 'T')}${offSetSymbol}${array[array.length-1]}`
  return Math.floor((new Date(tzString)).getTime())
}
const getDate = new Intl.DateTimeFormat("en-CA", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const getTime = new Intl.DateTimeFormat("en-CA", {
  timeZone,
  hour: "2-digit",
  hour12: false,
});
const getDates = ()=>{
  let today = new Date()
  let tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  let currentHour = +getTime.format(today)
  return { today: getDate.format(today), tomorrow: getDate.format(tomorrow), currentHour: currentHour }
}

const getDailyProduction = (date, currentHour) => {
  if(!date) return

  let res = {}, peakValue = 0, peakTime, currentHourProduction = 0, nextHourProduction = 0, remaingProduction = 0, noonProduction = 0, total = 0, nextHour
  if(currentHour) nextHour = currentHour + 1
  for(let i = 1;i<25;i++){
    let str1 = `${date} ${i?.toString()?.padStart(2, '0')}:00:00`, str2 = `${date} ${i?.toString()?.padStart(2, '0')}:30:00`
    let value = (dataList?.watt_hours_period[str1] || 0) + (dataList?.watt_hours_period[str2] || 0)
    if(value > 0){
      res[str1] = value
      if(value > peakValue){
        peakValue = value
        peakTime = `${i?.toString()?.padStart(2, '0')}:00`
      }
      total += value
      if(i == currentHour) currentHourProduction = value
      if(i == nextHour) nextHourProduction = value
      if(i > currentHour) remaingProduction += value
      if(i == 12) noonProduction = value
    }
  }
  return { production: res, peakValue: peakValue, peakTime: peakTime, peakDate: date, total: ((total || 0) / 1000), currentHour: ((currentHourProduction || 0) / 1000), nextHour: ((nextHourProduction || 0) / 1000), remaining: ((remaingProduction || 0) / 1000), noon: noonProduction || 0 }
}
const registerSensors = async()=>{
  try{
    for(let i in sensorConfig){
      if(!i || !sensorConfig[i]) continue
      await mqtt.registerSensor(i, sensorConfig[i]?.name, sensorConfig[i]?.opts)
    }
    log.info('All sensors created')
    //setTimeout(sync, 1000)
    sync()
  }catch(e){
    log.error(e)
  }
}
const sync = ()=>{
  try{
    let dates = getDates()
    let todayProduction = getDailyProduction(dates.today, dates.currentHour)
    let tomorrowProduction = getDailyProduction(dates.tomorrow)
    for(let i in sensorConfig){
      if(sensorConfig[i].day == 'today') mqtt.sendSensorValue(sensorConfig[i].id, todayProduction[`${sensorConfig[i].value_name}`]?.toString())
      if(sensorConfig[i].day == 'tomorrow') mqtt.sendSensorValue(sensorConfig[i].id, tomorrowProduction[`${sensorConfig[i].value_name}`]?.toString())
    }
    setTimeout(sync, 60 * 1000)
  }catch(e){
    setTimeout(sync, 5000)
    log.error(e)
  }
}
const test = async() =>{
  let dates = getDates()
  let todayProduction = getDailyProduction(dates.today, dates.currentHour)
  mqtt.sendSensorValue('today_noon_production', todayProduction.noon?.toString(), false)
  console.log(`Today Noon Production: ${todayProduction.noon} Wh`)
  console.log(`Next Hour Production: ${todayProduction.nextHour / 1000} kWh`)
  console.log(`This Hour Production: ${todayProduction.currentHour / 1000} kWh`)
  console.log(`Today Remaining Production: ${todayProduction.remaining / 1000} kWh`)
  console.log(`Today Total Production: ${todayProduction.total / 1000} kWh`)
  console.log(`Today Peak Time: ${todayProduction.peak.date} ${todayProduction.peak.time}`)
  let tomorrowProduction = getDailyProduction(dates.tomorrow)
  mqtt.sendSensorValue('tomorrow_noon_production', tomorrowProduction.noon?.toString(), false)
  console.log(`Tomorrow Noon Production: ${tomorrowProduction.noon} Wh`)
  console.log(`Tomorrow Total Production: ${tomorrowProduction.total / 1000} kWh`)
  console.log(`Tomorrow Peak Time: ${tomorrowProduction.peak.date} ${tomorrowProduction.peak.time}`)
}
module.exports = ()=>{
  registerSensors()
}
