const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
// 浏览窗口已经设置为自定义logo，登录状态正常，分组功能正常，下一步，实现浏览窗口多标签功能
const store = new Store({ 
    defaults: { 
        accounts: {},
        groups: []
    } 
});

let mainWindow;
const openBrowsers = {}; // { platform_id: window }

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        // 指定自定义图标路径
        icon: path.join(__dirname, 'img/icon.ico') 
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // 自定义菜单
    const template = [
        {
            label: '文件',
            submenu: [
                { label: '退出', role: 'quit' }
            ]
        },
        {
            label: '编辑',
            submenu: [
                { label: '撤销', role: 'undo' },
                { label: '重做', role: 'redo' },
                { type: 'separator' },
                { label: '剪切', role: 'cut' },
                { label: '复制', role: 'copy' },
                { label: '粘贴', role: 'paste' }
            ]
        },
        {
            label: '视图',
            submenu: [
                { label: '重新加载', role: 'reload' },
                { label: '开发者工具', role: 'toggleDevTools' }
            ]
        },
        {
            label: '窗口',
            submenu: [
                { label: '最小化', role: 'minimize' },
                { label: '关闭', role: 'close' }
            ]
        },
        {
            label: '帮助',
            submenu: [
                { label: '关于', click: () => { /* 可以添加关于窗口的逻辑 */ } }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function registerEvents() {
    ipcMain.handle('save-account', (event, account) => {
        const { platform, id } = account;
        const accounts = store.get('accounts', {});
        if (!accounts[platform]) accounts[platform] = {};
        accounts[platform][id] = account;
        store.set('accounts', accounts);
        mainWindow?.webContents.send('accounts-updated');
        return true;
    });

    ipcMain.handle('delete-account', (event, { platform, accountId }) => {
        const accounts = store.get('accounts', {});
        if (accounts[platform] && accounts[platform][accountId]) {
            delete accounts[platform][accountId];
            store.set('accounts', accounts);
            mainWindow?.webContents.send('accounts-updated');
        }
        return true;
    });

    ipcMain.handle('get-accounts', () => {
        return store.get('accounts', {});
    });

    ipcMain.handle('create-group', (event, groupName) => {
        const groups = store.get('groups', []);
        if (!groups.includes(groupName)) {
            groups.push(groupName);
            store.set('groups', groups);
        }
        return true;
    });

    ipcMain.handle('delete-group', (event, groupName) => {
        const groups = store.get('groups', []);
        const newGroups = groups.filter(group => group !== groupName);
        store.set('groups', newGroups);
        
        // 将该分组下的账号移至默认分组
        const accounts = store.get('accounts', {});
        for (const platform in accounts) {
            const platformAccounts = accounts[platform];
            for (const accountId in platformAccounts) {
                const account = platformAccounts[accountId];
                if (account.group === groupName) {
                    account.group = platform; // 移至平台默认分组
                }
            }
        }
        store.set('accounts', accounts);
        mainWindow?.webContents.send('accounts-updated');
        
        return true;
    });

    ipcMain.handle('get-groups', () => {
        return store.get('groups', []);
    });

	// 修改 main.js 中的 openBrowser 函数
	const puppeteer = require('puppeteer');

	ipcMain.handle('open-browser', async (event, account) => {
		const { platform, id, username, password } = account;
		const windowKey = `${platform}_${id}`;

		// 关闭其他账号窗口（只保留一个）
		for (const key in openBrowsers) {
			if (openBrowsers[key]) {
				openBrowsers[key].close();
			}
		}

		const partitionName = `persist:${windowKey}`;
		const browserWindow = new BrowserWindow({
			width: 1000,
			height: 800,
			webPreferences: {
				preload: path.join(__dirname, 'preload.js'),
				nodeIntegration: false,
				contextIsolation: true,
				partition: partitionName
			},
			// 添加自定义图标
			icon: path.join(__dirname, 'img/icon.ico') 
		});

		openBrowsers[windowKey] = browserWindow;

		browserWindow.on('closed', () => {
			delete openBrowsers[windowKey];
		});

		let url = 'https://www.example.com';
		if (platform === 'wechat') url = 'https://mp.weixin.qq.com';
		else if (platform === 'baidu') url = 'https://baijiahao.baidu.com';
		else if (platform === 'toutiao') url = 'https://mp.toutiao.com';

		browserWindow.loadURL(url).catch((error) => {
			console.error('Error loading URL:', error);
		});

		browserWindow.webContents.on('did-finish-load', async () => {
			const browser = await puppeteer.launch({ headless: false });
			const page = await browser.newPage();
			await page.goto(url);

			try {
				if (platform === 'wechat') {
					// 微信公众号登录输入框和按钮的选择器，需要根据实际情况调整
					await page.waitForSelector('#account');
					await page.type('#account', username);
					await page.waitForSelector('#pwd');
					await page.type('#pwd', password);
					await page.click('#loginBt');
				} else if (platform === 'baidu') {
					// 百家号登录输入框和按钮的选择器，需要根据实际情况调整
					await page.waitForSelector('#account');
					await page.type('#account', username);
					await page.waitForSelector('#password');
					await page.type('#password', password);
					await page.click('#login-button');
				} else if (platform === 'toutiao') {
					// 今日头条登录输入框和按钮的选择器，需要根据实际情况调整
					await page.waitForSelector('#username');
					await page.type('#username', username);
					await page.waitForSelector('#password');
					await page.type('#password', password);
					await page.click('#login-btn');
				}
			} catch (error) {
				console.error('Error during login:', error);
			}

			const currentURL = browserWindow.webContents.getURL();
			let status = 'unknown';

			// 自动判断登录状态
			if (platform === 'wechat') {
				status = currentURL.includes('home') ? 'logged-in' : 'not-logged-in';
			} else if (platform === 'baidu') {
				status = currentURL.includes('dashboard') ? 'logged-in' : 'not-logged-in';
			} else if (platform === 'toutiao') {
				status = currentURL.includes('profile') ? 'logged-in' : 'not-logged-in';
			}

			// 发送登录状态给主窗口
			mainWindow?.webContents.send('login-status', {
				platform,
				accountId: id,
				status
			});

			await browser.close();
		});
	});
}

app.whenReady().then(() => {
    createMainWindow();
    registerEvents();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});