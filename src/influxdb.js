import log from './logger.js'
import { dataList } from './dataList.js'
import { InfluxDB, Point } from '@influxdata/influxdb-client'

const timeZone = "America/New_York"
const INFLUX_TOKEN = process.env.INFLUX_TOKEN,
  INFLUX_URL = process.env.INFLUX_URL,
  INFLUX_ORG = process.env.INFLUX_ORG,
  INFLUX_BUCKET = process.env.INFLUX_BUCKET

function getTimeStamp(dateString, tzOffset) {
  let tzString = `${dateString.replace(' ', 'T')}${tzOffset}`
  return Math.floor((new Date(tzString)).getTime())
}

function getTZOffset(msgTime) {
  let array = msgTime.split('+'), offSetSymbol = '+'
  if (array?.length < 2) {
    array = msgTime.split('-')
    offSetSymbol = '-'
  }
  return `${offSetSymbol}${array[array.length - 1]}`
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
  return { today: getDate.format(today), tomorrow: getDate.format(tomorrow) }
}

let influxClient, influxWriteClient, client_ready

function write(id, device, value, unit_of_measurement, timeNow) {
  try {
    if (!influxClient || !influxWriteClient || !timeNow || !id || !device) return
    let influxMeasurement = unit_of_measurement || 'kWh'

    let data_point = new Point(influxMeasurement).tag('device', device).tag('id', id)
    data_point.floatField('value', value)
    data_point.timestamp(timeNow)
    influxWriteClient.writePoint(data_point)
  } catch (e) {
    log.error(e)
  }
}

function flush() {
  influxWriteClient.flush()
}

function getPower(date, hour, keys) {
  let dateTime = `${date} ${hour}:00:00`
  let power = dataList?.watt_hours_period[dateTime] || 0
  let array = keys.filter(function (x) {
    return x.startsWith(`${date} ${hour}`) && x !== dateTime
  })
  if (array?.length > 0) {
    for (let i in array) {
      if (!array[i] || !dataList?.watt_hours_period[array[i]]) continue
      power += dataList?.watt_hours_period[array[i]] || 0
    }
  }
  return { dateTime, power }
}

async function updateForcast() {
  try {
    if (!dataList?.time || !client_ready) return
    let tzOffset = getTZOffset(dataList.time)
    let dates = getDates()
    let keys = Object.keys(dataList?.watt_hours_period)
    let keySet = new Set(keys)
    for (let i = 0; i < 25; i++) {
      let hour = i?.toString()?.padStart(2, "0")
      let data = getPower(dates.today, hour, keys)
      if (!data?.power) continue
      let timeStamp = getTimeStamp(data.dateTime, tzOffset)
      if (!timeStamp) continue
      write('solar_forecast_hourly', 'solar_forecast', ((data.power || 0) / 1000)?.toFixed(2), 'kWh', timeStamp)
    }
    for (let i = 0; i < 25; i++) {
      let hour = i?.toString()?.padStart(2, "0")
      let data = getPower(dates.tomorrow, hour, keys)
      if (!data?.power) continue
      let timeStamp = getTimeStamp(data.dateTime, tzOffset)
      if (!timeStamp) continue
      write('solar_forecast_hourly', 'solar_forecast', ((data.power || 0) / 1000)?.toFixed(2), 'kWh', timeStamp)
    }
    influxWriteClient.flush()
  } catch (e) {
    log.error(e)
  }
}

async function sync() {
  try {
    await updateForcast()
    setTimeout(sync, 5000)
  } catch (e) {
    log.error(e)
    setTimeout(sync, 5000)
  }
}

function influxInit() {
  try {
    if (INFLUX_TOKEN && INFLUX_URL && INFLUX_ORG && INFLUX_BUCKET) {
      influxClient = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN })
      influxWriteClient = influxClient.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, 'ms')
      log.info(`Created influxdb client...`)
      client_ready = true
      sync()
      return
    }
    log.info(`no connection info for influxdb client. Skipping...`)
    return
  } catch (e) {
    setTimeout(influxInit, 5000)
    log.error(e)
  }
}

influxInit()

function status() {
  return client_ready
}

export default { write, flush, status }