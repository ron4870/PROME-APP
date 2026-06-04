const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173/login');
  await page.evaluate(() => {
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('userRole', 'admin');
  });

  await page.goto('http://localhost:5173/forms/local-purchase-order');
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
  process.exit(0);
})();
