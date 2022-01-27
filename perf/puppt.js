const puppeteer = require('puppeteer');

// modified from https://github.com/epiviz/epiviz-chart/blob/master/performance/benchmarks.js

(async () => {
    console.log("tenx.h5");

    let launchOptions = { headless: false, args: ['--start-maximized', "--enable-features=SharedArrayBuffer"] };

    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // set viewport and user agent (just in case for nice viewing)
    await page.setViewport({ width: 1200, height: 800 });

    // whatever port serve says when you run
    await page.goto('http://localhost:3000');

    // continue on the intro modal
    await page.waitForSelector('#introSubmit');
    await page.waitFor(1000);
    await page.evaluate(() => document.getElementById('introSubmit').click());

    console.log("click intro submit");
    // click the 10x tab
    await page.evaluate(() => document.getElementById('bp3-tab-title_undefined_tenx').click());
    await page.waitFor(1000);

    const inputUploadHandle = await page.$('#bp3-tab-panel_undefined_tenx > div > label > label > input[type=file]');
    inputUploadHandle.uploadFile("tenx.h5");
    await page.waitFor(1000);

    console.log("upload file");

    // trigger upload
    await page.evaluate(() => document.getElementById('analysisSubmit').click());

    console.log("click analysis submit");

    async function waitForEvent(eventName, seconds) {
        seconds = seconds || 30;
        return Promise.race([
            page.evaluate(function (eventName) {
                return new Promise(function (resolve, reject) {
                    document.addEventListener(eventName, function (e) {
                        resolve();
                    });
                });
            }, eventName),

            page.waitFor(seconds * 1000)
        ]);
    }

    console.log("waiting for the kana-done event...");
    await waitForEvent("kana-done", 25000);
    console.log("done!!!");

    const metrics = await page.metrics();
    console.log(JSON.stringify(metrics));
    await page.screenshot({path: 'test.png'});

    // close the browser
    await browser.close();
})();