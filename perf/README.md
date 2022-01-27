From the App directory
- generate App build 
    `npm run build`
- copy any dataset to the perf directory
    I'm using the tenx.h5 for this
- Install puppeteer/serve
    `npm install -g puppeteer serve`
- serve the html pages
    `serve -s build`

From the perf directory
- run the puppeteer script
    `node puppt.js`

- comment out launchOptions in the script for headless mode