// src/main/browser-control.js
const { BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const puppeteer = require('puppeteer');

const openWindows = {};

async function openPlatformWindow(account, onClose) {
    const { platform, id, username, password } = account;
    const windowKey = `${platform}_${id}`;

    // 如果窗口已存在则聚焦
    if (openWindows[windowKey]) {
        openWindows[windowKey].show();
        openWindows[windowKey].focus();
        return { success: true, windowKey };
    }

    // 创建隔离的浏览器会话
    const partitionName = `persist:${windowKey}`;
    const ses = session.fromPartition(partitionName);

    // 清除旧缓存
    await ses.clearStorageData();
    await ses.clearCache();
    await ses.clearHostResolverCache();

    // 创建浏览器窗口
    const browserWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        show: true,
        webPreferences: {
            preload: path.join(__dirname, '../renderer/preload.js'),
            partition: partitionName,
            sandbox: true,
            contextIsolation: true,
            webSecurity: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, '../../assets/img/icon.ico'),
        title: `${platform} - ${username}`
    });

    // 设置平台特定URL
    let platformUrl = 'https://www.example.com';
    switch (platform) {
        case 'wechat':
            platformUrl = 'https://mp.weixin.qq.com';
            break;
        case 'baidu':
            platformUrl = 'https://baijiahao.baidu.com';
            break;
        case 'toutiao':
            platformUrl = 'https://mp.toutiao.com';
            break;
        case 'weibo':
            platformUrl = 'https://weibo.com';
            break;
        case 'douyin':
            platformUrl = 'https://www.douyin.com';
            break;
    }

    // 加载目标URL
    await browserWindow.loadURL(platformUrl).catch(err => {
        console.error(`加载URL失败: ${err.message}`);
        browserWindow.loadFile('error.html');
    });

    // 存储窗口引用
    openWindows[windowKey] = browserWindow;

    // 窗口关闭处理
    browserWindow.on('closed', () => {
        delete openWindows[windowKey];
        if (typeof onClose === 'function') {
            onClose();
        }
    });

    // 自动登录处理
    browserWindow.webContents.on('did-finish-load', async () => {
        try {
            const browser = await puppeteer.launch({
                executablePath: getChromePath(),
                headless: false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    `--user-data-dir=${path.join(app.getPath('userData'), 'puppeteer')}`
                ]
            });

            const page = await browser.newPage();
            await page.goto(platformUrl, { waitUntil: 'networkidle2' });

            // 平台特定的登录逻辑
            switch (platform) {
                case 'wechat':
                    await page.waitForSelector('#account', { timeout: 5000 });
                    await page.type('#account', username);
                    await page.type('#pwd', password);
                    await page.click('#loginBt');
                    break;
                case 'baidu':
                    await page.waitForSelector('.username', { timeout: 5000 });
                    await page.type('.username', username);
                    await page.type('.password', password);
                    await page.click('.pass-button-submit');
                    break;
                case 'toutiao':
                    await page.waitForSelector('input[name="username"]', { timeout: 5000 });
                    await page.type('input[name="username"]', username);
                    await page.type('input[name="password"]', password);
                    await page.click('button[type="submit"]');
                    break;
            }

            // 登录状态检测
            const currentUrl = browserWindow.webContents.getURL();
            let loginStatus = 'unknown';
            if (currentUrl.includes('dashboard') || currentUrl.includes('home')) {
                loginStatus = 'logged-in';
            }

            // 通知主窗口登录状态
            if (global.mainWindow) {
                global.mainWindow.webContents.send('login-status', {
                    platform,
                    accountId: id,
                    status: loginStatus
                });
            }

            await browser.close();
        } catch (error) {
            console.error('自动登录失败:', error);
        }
    });

    // 关闭其他同平台窗口
    Object.keys(openWindows).forEach(key => {
        if (key !== windowKey && key.startsWith(`${platform}_`)) {
            openWindows[key].close();
        }
    });

    return { success: true, windowKey };
}

function getChromePath() {
    // 各平台Chrome路径检测逻辑
    if (process.platform === 'win32') {
        return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    } else if (process.platform === 'darwin') {
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }
    return '/usr/bin/google-chrome';
}

function closeAllWindows() {
    Object.values(openWindows).forEach(win => {
        if (win && !win.isDestroyed()) {
            win.close();
        }
    });
}

module.exports = {
    openPlatformWindow,
    closeAllWindows,
    getOpenWindows: () => ({ ...openWindows })
};