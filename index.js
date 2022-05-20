require('dotenv').config()
const puppeteer = require('puppeteer')
const { getMonth, parse } = require('date-fns')
const fetch = require('node-fetch')

const LOCATION = 'BahnhofplatzKatschhof'
const START_URL = `https://qtermin.de/${LOCATION}`;

const SERVICE_1 = 'Ausweise / Reisepässe – Wohnsitz im Inland (ID/passport for germans)'
const SERVICE_2 = 'Ausweis: Beantragung (Personen ab 16 Jahren)';

const MIN_MONTH = 5; // 0: January, 1: February, etc...

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
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(START_URL, {
    waitUntil: 'networkidle2',
  });

  const clickDivWithText = async text => {
    let linkHandler = await page.$x(`//div[contains(text(), '${text}')]`)
    
    if (linkHandler.length == 0) {
      return false
    }
  
    let el = linkHandler[0]
    await el.click()
    return true
  }

  const end = async (str) => {
    console.log(str)
    await browser.close();
  }

  if (!(await clickDivWithText(SERVICE_1)))  {
    return await end(`Could not find: ${SERVICE_1}`)
  }

  if (!(await clickDivWithText(SERVICE_2)))  {
    return await end(`Could not find: ${SERVICE_2}`)
  }

  // Next
  await page.click("#bp1")

  try {
    const dateElement = await page.waitForSelector(".slotsHeader", { timeout: 4000 })
    const earliestDate = await page.evaluate(el => el.textContent, dateElement)
    const date = parse(earliestDate, 'dd.MM.yyyy', new Date())
    const month = getMonth(date)
    if (month <= MIN_MONTH) {
      // SUCCESS
      await notifyMobilePhone(`Termin gefunden! ${earliestDate}`)
    } else {
      // No success :(
      console.log("no success")
    }
  } catch(e) {
    await notifyMobilePhone(`Something failed: ${e}`)
    await end("waiting for ui-datepicker exceeded")
  }

  await end()
})();


