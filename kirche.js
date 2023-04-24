require('dotenv').config()
const puppeteer = require('puppeteer')
const { getMonth, parse } = require('date-fns')
const fetch = require('node-fetch')

const telegramToken = process.env.TELEGRAM_API_TOKEN
const chatId = process.env.TELEGRAM_CHAT_ID

const START_URL = `https://justiztermine.nrw.de/`;

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
  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], });
    const page = await browser.newPage();
    await page.goto(START_URL, {
      waitUntil: 'networkidle2',
    });
  
    await page.select('#citizen_court', '40');
    await page.waitForTimeout(200);
    await page.select('#citizen_legalService', '12');
    await page.waitForTimeout(200);
    await page.click('#select_court_legalService')

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  
    const elements = await page.$$eval('.no-appointments-header', elements => {
      return elements.map(element => element.textContent);
    });
  
    if (elements.length !== 1) {
      await notifyMobilePhone(`Kein Termin gefunden`)
    } else {
      await notifyMobilePhone(`Termin gefunden!`)
    }
  
    await browser.close();
  } catch(e) {
    console.log(e)
  }
})();