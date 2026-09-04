let logLevel = process.env.LOG_LEVEL || 'info';
//logLevel = 'debug'
const timestampFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Etc/GMT+5',
  hour12: false,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

function getTimeStamp(timestamp = Date.now()) {
  return timestampFormatter.format(new Date(timestamp));
}

function error(err){
  try{
    console.error(`${getTimeStamp(Date.now())} ERROR ${err}`)
    if(err?.stack && logLevel == 'debug') console.error(err)
  }catch(e){
    console.error(e)
  }
}
function info(msg){
  try{
    console.log(`${getTimeStamp(Date.now())} INFO ${msg}`)
  }catch(e){
    console.error(e)
  }
}
function debug(msg){
  try{
    if(logLevel?.toLowerCase() !== 'debug') return
    console.log(`${getTimeStamp(Date.now())} DEBUG ${msg}`)
  }catch(e){
    console.error(e)
  }
}
export default { info, error, debug }
