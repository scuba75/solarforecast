'use strict'
const log = require('./logger')
const fetch = require('node-fetch')
const API_KEY = process.env.API_KEY, LATITUDE = process.env.LATITUDE, LONGITUDE = process.env.LONGITUDE, PLANE_DECLINATION = process.env.PLANE_DECLINATION, AZIMUTH = process.env.AZIMUTH, KWP = process.env.KWP


let retryCount = +process.env.CLIENT_RETRY_COUNT || 6

const parseResponse = async(res)=>{
  try{
    if(!res) return
    if (res?.status?.toString().startsWith('5')) {
      throw('Bad status code '+res.status)
    }
    let body

    if (res?.status === 204) {
      body = null
    } else if (res?.headers?.get('Content-Type')?.includes('application/json')) {
      body = await res?.json()
    } else {
      body = await res?.text()
    }
    return {
      status: res?.status,
      body: body
    }
  }catch(e){
    throw(e);
  }
}

const apiRequest = async(uri, opts = {})=>{
  try{
    let res = await fetch(uri, opts)
    return await parseResponse(res)
  }catch(e){
    if(e?.name) return { error: e.name, message: e.message }
    if(e?.status) return await parseResponse(e)
    throw(e)
  }
}

const requestWithRetry = async(uri, opts = {}, count = 0)=>{
  try{
    let res = await apiRequest(uri, opts)
    if(res?.error === 'FetchError'){
      if(count < retryCount){
        count++
        return await requestWithRetry(uri, opts, count)
      }else{
        throw(`tried request ${count} time(s) and errored with ${res.error} : ${res.message}`)
      }
    }
    return res
  }catch(e){
    throw(e)
  }
}
module.exports = async()=>{
  try{
    let uri = `https://api.forecast.solar/${API_KEY}/estimate/${LATITUDE}/${LONGITUDE}/${PLANE_DECLINATION}/${AZIMUTH}/${KWP}`
    let res = await requestWithRetry(uri, { timeout: 30000, compress: true, method: 'GET' })
    return res?.body?.result
  }catch(e){
    log.error(e);
  }
}
