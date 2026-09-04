import log from './logger.js'
import { dataList } from './dataList.js'
import mqtt from './mqtt.js'
import sensorConfig from './sensorConfig.json' with { type: 'json' }
import influxdb from './influxdb.js'

const timeZone = "America/New_York"

function getTimeStamp(dateString, msgTime) {
  let array = msgTime.split('+'), offSetSymbol = '+'
  if (array?.length < 2) {
    array = msgTime.split('-')
    offSetSymbol = '-'
  }
  let tzString = `${dateString.replace(' ', 'T')}${offSetSymbol}${array[array.length - 1]}`
  return Math.floor((new Date(tzString)).getTime())
}

const getDate = new Intl.DateTimeFormat("en-CA", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const getTime = new Intl.DateTimeFormat("en-CA", {
  timeZone,
  hour: "2-digit",
  hour12: false,
})

function getDates() {
  let today = new Date()
  let tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  let currentHour = +getTime.format(today)
  return { today: getDate.format(today), tomorrow: getDate.format(tomorrow), currentHour: currentHour }
}

function getDailyProduction(date, currentHour) {
  if (!date) return

  let res = {}, peakValue = 0, peakTime, currentHourProduction = 0, nextHourProduction = 0, remaingProduction = 0, noonProduction = 0, total = 0, nextHour
  if (currentHour) nextHour = currentHour + 1
  for (let i = 1; i < 25; i++) {
    let str1 = `${date} ${i?.toString()?.padStart(2, '0')}:00:00`, str2 = `${date} ${i?.toString()?.padStart(2, '0')}:30:00`
    let value = (dataList?.watt_hours_period[str1] || 0) + (dataList?.watt_hours_period[str2] || 0)
    if (value > 0) {
      res[str1] = value
      if (value > peakValue) {
        peakValue = value
        peakTime = `${i?.toString()?.padStart(2, '0')}:00`
      }
      total += value
      if (i == currentHour) currentHourProduction = value
      if (i == nextHour) nextHourProduction = value
      if (i > currentHour) remaingProduction += value
      if (i == 12) noonProduction = value
    }
  }
  return { production: res, peakValue: peakValue, peakTime: peakTime, peakDate: date, total: ((total || 0) / 1000), currentHour: ((currentHourProduction || 0) / 1000), nextHour: ((nextHourProduction || 0) / 1000), remaining: ((remaingProduction || 0) / 1000), noon: noonProduction || 0 }
}

async function registerSensors() {
  try {
    for (let i in sensorConfig) {
      if (!i || !sensorConfig[i]) continue
      await mqtt.registerSensor(i, sensorConfig[i]?.name, sensorConfig[i]?.opts)
    }
    log.info('All sensors created')
    //setTimeout(sync, 1000)
    sync()
  } catch (e) {
    log.error(e)
  }
}

function sync() {
  try {
    let dates = getDates()
    let todayProduction = getDailyProduction(dates.today, dates.currentHour)
    let tomorrowProduction = getDailyProduction(dates.tomorrow)
    for (let i in sensorConfig) {
      if (sensorConfig[i].day == 'today') mqtt.sendSensorValue(sensorConfig[i].id, todayProduction[`${sensorConfig[i].value_name}`]?.toString())
      if (sensorConfig[i].day == 'tomorrow') mqtt.sendSensorValue(sensorConfig[i].id, tomorrowProduction[`${sensorConfig[i].value_name}`]?.toString())
    }
    setTimeout(sync, 60 * 1000)
  } catch (e) {
    setTimeout(sync, 5000)
    log.error(e)
  }
}

export default function () {
  registerSensors()
}