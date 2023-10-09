if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const { encode } = require('url-encode-decode')
const fs = require('fs')
const dayjs = require('dayjs')

class CensysAPI {
  constructor(accessToken) {
    this.accessToken = accessToken
  }

  // 發請求獲取服務資訊
  async get(url) {
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

  // Censys Search API
  async search(servicePattern_Encode) {
    try {
      const url = `https://search.censys.io/api/v2/hosts/search?q=${servicePattern_Encode}&per_page=100`
      const firResponse = await this.get(url)
      
      let nextLink = firResponse.result.links.next
      if (!nextLink) return firResponse

      while(true) {
        const nextUrl = `https://search.censys.io/api/v2/hosts/search?q=${servicePattern_Encode}&per_page=100&cursor=${nextLink}`
        const response = await this.get(nextUrl)

        firResponse.result.hits.push(...response.result.hits)

        nextLink = response.result.links.next
        if (!nextLink) return firResponse
      }
    } catch (err) {
      console.log(err)
    }
  }

  // 獲取需要的選項
  async searchCustomization(servicePattern_Encode) {
    try {
      const result = await this.search(servicePattern_Encode)
      const dataObject = {}
      dataObject.data = result.result.hits.map(data => ({
        ip: data.ip,
        country: data.location.country,
        services: data.services
      }))
  
      const newDataObject = {
        total: result.result.total,
        country: this.countryStatistic(dataObject),
        data: dataObject.data
      }
  
      return newDataObject
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

  // 建立資料夾
  Makedirs(path, options) {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, options)
    }
  }

  // 輸出檔案
  async writeFile(payloads) {
    try {
      this.Makedirs('files', { recursive: true })
      await fs.promises.appendFile(`./files/${dayjs().format('YYYY-MM-DD')}.json`, JSON.stringify(payloads))
    } catch (err) {
      console.log(err)
    }
  }
}

async function main() {
  const accessToken = process.env.ACCESS_TOKEN
  const censysAPI = new CensysAPI(accessToken)
  
  const servicePattern = ''
  const servicePattern_Encode = encode(servicePattern)
  censysAPI.writeFile(await censysAPI.searchCustomization(servicePattern_Encode))
}

main()