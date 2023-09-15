if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const { encode } = require('url-encode-decode')
const fs = require('fs/promises')
const dayjs = require('dayjs')

class CensysAPI {
  constructor(accessToken) {
    this.accessToken = accessToken
  }

  // 發請求獲取服務資訊
  async request(url) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.accessToken}`,
        }})

      return response.json()
    } catch (err) {
      console.log(err)
    }
  }

  // 重組自己想獲取的特徵
  async search(servicePattern_Encode) {
    try {
      const url = `https://search.censys.io/api/v2/hosts/search?q=${servicePattern_Encode}&per_page=100`
      const firResponse = await this.request(url)
      const dataObject = {}

      dataObject.total = firResponse.result.total
      dataObject.data = firResponse.result.hits.map(data => ({
        ip: data.ip,
        country: data.location.country,
        services: data.services
      }))
      
      let nextLink = firResponse.result.links.next
      if (!nextLink) return dataObject

      while(true) {
        const nextUrl = `https://search.censys.io/api/v2/hosts/search?q=${servicePattern_Encode}&per_page=100&cursor=${nextLink}`
        const response = await this.request(nextUrl)

        response.result.hits.forEach(data => {
          dataObject.data.push({
            ip: data.ip,
            country: data.location.country,
            services: data.services
          })
        })

        nextLink = response.result.links.next
        if (!nextLink) return dataObject
      }
    } catch (err) {
      console.log(err)
    }
  }

  // 分類統計國別
  countryStatistic(dataObject) {
    try {
      const countries = []
      dataObject.data.forEach(data => {
        if (!countries.find(({ value }, index) => {
          if (value === data.country) {
            countries[index].count += 1
            return true
          }
        }) ) countries.push({ "count": 1, "value": data.country })
      })

      return countries
    } catch (err) {
      console.log(err)
    }
  }

  // 輸出檔案
  async writeFile(servicePattern_Encode) {
    try {
      const dataObject = await this.search(servicePattern_Encode)
      const newDataObject = {
        total: dataObject.total,
        country: this.countryStatistic(dataObject),
        data: dataObject.data
      }

      await fs.appendFile(`./files/${dayjs().format('YYYY-MM-DD')}.json`, JSON.stringify(newDataObject))
    } catch (err) {
      console.log(err)
    }
  }
}

const accessToken = process.env.ACCESS_TOKEN
const censysAPI = new CensysAPI(accessToken)

const servicePattern = ''
const servicePattern_Encode = encode(servicePattern)
censysAPI.writeFile(servicePattern_Encode)
