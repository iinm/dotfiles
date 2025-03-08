import { chromium } from "playwright";

import { USER_DATA_DIR } from "./readWebPageByUserBrowserTool";

(async () => {
  await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
  });
})();
