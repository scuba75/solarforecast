import log from '/app/src/logger.js';
import { MongoCache } from 'mongo-cache';


let MONGO_STATUS

const mongo = new MongoCache({
   connection_string: 'mongodb://mongo-home-internal.home.svc.cluster.local:27021?replicaSet=rs4&ssl=false&compressors=snappy&retryReads=true&retryWrites=true',
   db_name: 'solar_forecast'
})

function getKey(timeStamp, timeZone = "America/New_York"){
   try{
         const parts = Object.fromEntries(
            new Intl.DateTimeFormat("en-US", {
               timeZone,
               year: "numeric",
               month: "2-digit",
               day: "2-digit",
               hour: "2-digit",
               minute: "2-digit",
               second: "2-digit",
               hour12: false,
            })
               .formatToParts(new Date(timeStamp || Date.now()))
               .map(p => [p.type, p.value])
         );
         return `${parts.year}-${parts.month}-${parts.day}`;
   }catch(e){
      log.error(e)
   }
}

const collections = [
  { collection: 'daily', indexes: [
    { key: { TTL: 1 }, opts: { name: '_TTL', expireAfterSeconds: 30 * 24 * 3600 } }
  ] }
]
async function checkIndex(data){
    try{
        for(let i of data?.indexes){
            let status = await mongo.updateIndex( data.collection, i.key, i.opts )
            if(!status) return
        }
        return true;
    }catch(e){
        log.error(e)
    }
}
async function checkIndexes(){
    try{
       for(let i of collections){
            let status = await checkIndex(i);
            if(!status) return
       }
       return true;
    }catch(e){
        log.error(e)
    }
}

async function init(){
    try{
        let status = mongo.status()
        if(status) status = await checkIndexes()

        if(status){
            MONGO_STATUS = true
            return;
        }
        setTimeout(init, 5000);
    }catch(e){
        log.error(e)
        setTimeout(init, 5000);
    }
}
init();

function status(){
  return MONGO_STATUS;
};

async function get(){
   try{
      let key = getKey()
      if(!key) return
      return await mongo.get('daily', { _id: key }, { _id: 0, TTL: 0 })
   }catch(e){
      log.error(e)
   }
}
async function set(data) {
   try{
      if(!data) return
      let key = getKey()
      if(!key) return
      return await mongo.set('daily', { _id: key }, data)
   }catch(e){
      log.error(e)
   }
}
export default { status, set, get };