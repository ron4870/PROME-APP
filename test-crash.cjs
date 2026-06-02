const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Set auth in localStorage before navigating
  await page.goto('http://localhost:4173');
  await page.evaluate(() => {
    localStorage.setItem('isAuthenticated', 'true');
  });
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:4173/forms/funds-requisition', { waitUntil: 'networkidle2' });
  
  await browser.close();
})();
