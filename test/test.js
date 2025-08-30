
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.type('#user-input', 'Hello, world!');
  await page.click('#send-btn');
  await page.screenshot({ path: 'screenshot-after-send.png' });
  await browser.close();
})();
