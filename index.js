require('dotenv').config()
const puppeteer = require('puppeteer')
const { getMonth, parse } = require('date-fns')
const fetch = require('node-fetch')

const LOCATION = 'BahnhofplatzKatschhof'
const START_URL = `https://qtermin.de/${LOCATION}`;

// const SERVICE_1 = 'Ausweise / Reisepässe – Wohnsitz im Inland (ID/passport for germans)'
const SERVICE_1 = 'Ausweise / Reisepässe – Wohnsitz im Ausland'

// const SERVICE_2 = 'Ausweis: Beantragung (Personen ab 16 Jahren)';
const SERVICE_2 = 'Ausweis: Beantragung (Personen ab 16 Jahren, Wohnsitz Ausland)'
// const SERVICE_2 = 'Ausweis: Aushändigung (Wohnsitz Ausland)'

const MIN_MONTH = 9; // 0: January, 1: February, etc...

const telegramToken = process.env.TELEGRAM_API_TOKEN
const chatId = process.env.TELEGRAM_CHAT_ID




async function notifyMobilePhone(message) {
  try {
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      })
    })
  } catch(e) {
    logger.error(e)
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], });
  const page = await browser.newPage();
  await page.goto(START_URL, {
    waitUntil: 'networkidle2',
  });

  const clickElWithText = async (elem, text) => {
    let linkHandler = await page.$x(`//${elem}[contains(text(), '${text}')]`)
    
    if (linkHandler.length == 0) {
      return false
    }
  
    let el = linkHandler[0]
    await el.click()
    return true
  }

  const end = async (str) => {
    if (str) {
      log(str)
    }
    await browser.close();
  }

  if (!(await clickElWithText('h1', SERVICE_1)))  {
    return await end(`Could not find: ${SERVICE_1}`)
  }

  if (!(await clickElWithText('div', SERVICE_2)))  {
    return await end(`Could not find: ${SERVICE_2}`)
  }

  // Next
  await page.click("#bp1")

  try {
    const dateElement = await page.waitForSelector(".slotsHeader", { timeout: 4000 })

    const earliestDate = await page.evaluate(el => el.textContent, dateElement) // e.g. Montag, 07.10.2024
    const fixedEarliestDate = earliestDate.replace(/[^0-9.]/g, '')
    const date = parse(fixedEarliestDate, 'dd.MM.yyyy', new Date())
    const month = getMonth(date)
    if (month <= MIN_MONTH) {
      // SUCCESS
      return await notifyMobilePhone(`Termin gefunden! ${earliestDate}\n\n${START_URL}`)
    }
    log('no success')
  } catch(e) {
    log('no success')
    await end()
  }

  await end()
})();

function log(text) {
  const currentDate = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  console.log(`[${currentDate}] ${text}`)
}


