const cron = require('node-cron');
const puppeteer = require('puppeteer-core');
const { encrypt, decrypt } = require('./crypto-utils');

class Scheduler {
  constructor() {
    this.jobs = new Map();
    this.browser = null;
  }

  async init() {
    this.browser = await puppeteer.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: ['--no-sandbox']
    });
  }

  async addPublishJob(account, scheduleConfig) {
    if (!this.browser) await this.init();

    const job = cron.schedule(scheduleConfig.cronExpression, async () => {
      try {
        const page = await this.browser.newPage();
        await this.autoLogin(page, account);
        await this.publishContent(page, scheduleConfig.content);
        await page.close();
      } catch (error) {
        console.error(`Publish job failed for ${account.username}:`, error);
      }
    });

    this.jobs.set(account.id, job);
    return job;
  }

  async autoLogin(page, account) {
    const url = this.getPlatformUrl(account.platform);
    await page.goto(url, { waitUntil: 'networkidle2' });

    switch (account.platform) {
      case 'wechat':
        await page.type('#account', account.username);
        await page.type('#pwd', decrypt(account.password));
        await page.click('#loginBt');
        break;
      // 其他平台登录逻辑...
    }
  }

  getPlatformUrl(platform) {
    // ...同TabManager中的实现...
  }
}

module.exports = Scheduler;