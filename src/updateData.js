import { dataList } from './dataList.js'

export default function (data = {}) {
  if (!data?.watts || !data?.watt_hours_period) return

  for (let i in data) {
    if (!data[i]) continue
    dataList[i] = data[i]
  }
}