if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const { encode } = require('url-encode-decode')
const fs = require('fs/promises')
const dayjs = require('dayjs')

const servicePattern = ''
const servicePattern_Encode = encode(servicePattern)
const accessToken = process.env.ACCESS_TOKEN

// 發請求獲取服務資訊
async function Request(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${accessToken}`,
      }})

    return response.json()
  } catch (err) {
    console.log(err)
  }
}

// 重組自己想獲取的特徵
async function getData() {
  try {
    const url = `https://search.censys.io/api/v2/hosts/search?q=${servicePattern_Encode}&per_page=100`
    const firResponse = await Request(url)
    const dataObject = {}

    dataObject.total = firResponse.result.total
    dataObject.data = firResponse.result.hits.map(data => ({
      ip: data.ip,
      country: data.location.country
    }))

    let nextLink = firResponse.result.links.next
    if (!nextLink) return dataObject

    while(true) {
      const nextUrl = `https://search.censys.io/api/v2/hosts/search?q=${servicePattern_Encode}&per_page=100&cursor=${nextLink}`
      const response = await Request(nextUrl)

      response.result.hits.forEach(data => {
        dataObject.data.push({
          ip: data.ip,
          country: data.location.country
        })
      })

      nextLink = response.result.links.next
      if (!nextLink) return dataObject
    }
  } catch (err) {
    console.log(err)
  }
}

// 輸出檔案
async function writeFile() {
  try {
    const result = await getData()
    await fs.appendFile(`./files/${dayjs().format('YYYY-MM-DD')}.json`, JSON.stringify(result))
  } catch (err) {
    console.log(err)
  }
}

writeFile()
