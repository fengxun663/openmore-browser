const { app, BrowserWindow, ipcMain, Menu, session } = require('electron');
const path = require('path');
const Store = require('electron-store');
const crypto = require('crypto');
const { openPlatformWindow, closeAllWindows } = require('./browser-control');
const TabManager = require('./tab-manager');
const Scheduler = require('./scheduler');

// 加密配置
const algorithm = 'aes-256-cbc';
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || 'default-32-byte-secret-key-123456');
const IV_LENGTH = 16;

// 加密函数
function encrypt(text) {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(algorithm, ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    console.error('加密失败:', error);
    return '';
  }
}

// 解密函数
function decrypt(text) {
  if (!text) return '';
  try {
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('解密失败:', error);
    return '';
  }
}

// 数据存储
const store = new Store({
  name: 'account-manager',
  defaults: {
    accounts: {},
    groups: [],
    settings: {
      autoLogin: true,
      clearCacheOnExit: false
    }
  },
  encryptionKey: ENCRYPTION_KEY.toString('hex')
});

// 全局变量
let mainWindow;
let tabManager;
let scheduler;
let sharedBrowser = null;

// 创建主窗口
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    icon: path.join(__dirname, '../renderer/assets/img/icon.ico'),
    title: '多自媒体账号管理工具'
  });

  global.mainWindow = mainWindow;

  // 加载主页面
  mainWindow.loadFile(path.join(__dirname, '../views/index.html'));

  // 开发工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // 窗口关闭处理
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (store.get('settings.clearCacheOnExit')) {
      session.defaultSession.clearStorageData();
    }
  });

  // 自定义菜单
  buildApplicationMenu();
}

// 构建应用菜单
function buildApplicationMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        { 
          label: '新建窗口', 
          click: () => createMainWindow() 
        },
        { type: 'separator' },
        { 
          label: '退出', 
          role: 'quit' 
        }
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
        { label: '粘贴', role: 'paste' },
        { type: 'separator' },
        { label: '全选', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { type: 'separator' },
        { label: '开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        { label: '关闭', role: 'close' },
        { type: 'separator' },
        { label: '关闭所有浏览器窗口', click: () => closeAllWindows() }
      ]
    },
    {
      label: '帮助',
      submenu: [
        { 
          label: '关于', 
          click: () => {
            const aboutWindow = new BrowserWindow({
              width: 400,
              height: 300,
              parent: mainWindow,
              modal: true,
              resizable: false
            });
            aboutWindow.loadFile('about.html');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 注册IPC事件
function registerIPCEvents() {
  // 账号管理
  ipcMain.handle('save-account', async (event, account) => {
    try {
      account.password = encrypt(account.password);
      account.updatedAt = new Date().toISOString();
      
      const accounts = store.get('accounts', {});
      if (!accounts[account.platform]) {
        accounts[account.platform] = {};
      }
      
      accounts[account.platform][account.id] = account;
      store.set('accounts', accounts);
      
      mainWindow?.webContents.send('accounts-updated');
      return { success: true };
    } catch (error) {
      console.error('保存账号失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-account', async (event, { platform, accountId }) => {
    try {
      const accounts = store.get('accounts', {});
      if (accounts[platform]?.[accountId]) {
        delete accounts[platform][accountId];
        store.set('accounts', accounts);
        mainWindow?.webContents.send('accounts-updated');
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-accounts', () => {
    return store.get('accounts', {});
  });

  // 分组管理
  ipcMain.handle('create-group', async (event, groupName) => {
    try {
      const groups = store.get('groups', []);
      if (!groups.includes(groupName)) {
        groups.push(groupName);
        store.set('groups', groups);
        mainWindow?.webContents.send('groups-updated');
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-group', async (event, groupName) => {
    try {
      let groups = store.get('groups', []);
      groups = groups.filter(g => g !== groupName);
      store.set('groups', groups);

      // 迁移账号到默认分组
      const accounts = store.get('accounts', {});
      for (const platform in accounts) {
        for (const accountId in accounts[platform]) {
          if (accounts[platform][accountId].group === groupName) {
            accounts[platform][accountId].group = platform;
          }
        }
      }
      store.set('accounts', accounts);

      mainWindow?.webContents.send('accounts-updated');
      mainWindow?.webContents.send('groups-updated');
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-groups', () => {
    return store.get('groups', []);
  });

  // 浏览器控制
  if (!ipcMain.eventNames().includes('open-browser')) {
    ipcMain.handle('open-browser', async (event, account) => {
      try {
        const decryptedAccount = {
          ...account,
          password: decrypt(account.password)
        };
        return await openPlatformWindow(decryptedAccount);
      } catch (error) {
        console.error('打开浏览器失败:', error);
        throw error;
      }
    });
  }

  // 加密/解密
  ipcMain.handle('encrypt-password', (event, password) => {
    return encrypt(password);
  });

  ipcMain.handle('decrypt-password', (event, encrypted) => {
    return decrypt(encrypted);
  });

  // 定时任务
  ipcMain.handle('schedule-task', async (event, { account, scheduleConfig }) => {
    if (!scheduler) {
      scheduler = new Scheduler();
      await scheduler.init();
    }
    return await scheduler.addPublishJob(account, scheduleConfig);
  });
}

// 应用启动
app.whenReady().then(() => {
  createMainWindow();
  registerIPCEvents();
  tabManager = new TabManager(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// 应用退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (sharedBrowser) {
      sharedBrowser.close();
    }
    app.quit();
  }
});

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获异常:', error);
  if (mainWindow) {
    mainWindow.webContents.send('global-error', {
      message: '发生未预期错误',
      detail: error.message
    });
  }
});

// 导出测试用
module.exports = {
  encrypt,
  decrypt,
  createMainWindow
};