## Note

### Playwright

Install browser
```sh
npx playwright install chromium
```

```js
const { chromium } = require("playwright");

const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await page.goto("http://localhost")
```
