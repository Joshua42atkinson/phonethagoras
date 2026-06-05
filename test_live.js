const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log('Navigating to https://phonethagoras.com...');
  await page.goto('https://phonethagoras.com', { waitUntil: 'networkidle2' });
  
  console.log('Page loaded.');
  await browser.close();
})();
