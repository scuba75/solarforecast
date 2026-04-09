'use strict'
const log = require('./logger')
const fs = require('fs')

module.exports.set = async( data = {})=>{
  try{
    await fs.writeFileSync(`/app/data/solar-forecast.json`, JSON.stringify(data, null, 2))
    return true
  }catch(e){
    log.error(e)
  }
}
module.exports.get = async()=>{
  try{
    let obj = await fs.readFileSync(`/app/data/solar-forecast.json`)
    if(obj) return JSON.parse(obj)
  }catch(e){
    log.error(e)
  }
}
