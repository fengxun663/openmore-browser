const { BrowserView, BrowserWindow } = require('electron');

class TabManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.tabs = new Map();
    this.activeTabId = null;
    this.setupEvents();
  }

  setupEvents() {
    this.mainWindow.on('resize', () => this.resizeViews());
    this.mainWindow.on('closed', () => {
      this.tabs.forEach(view => {
        if (view && !view.isDestroyed()) {
          view.destroy();
        }
      });
    });
  }

  addTab(account) {
    const tabId = `tab_${Date.now()}`;
    const view = new BrowserView({
      webPreferences: {
        partition: `persist:${account.platform}_${account.id}`,
        sandbox: true,
        contextIsolation: true
      }
    });

    this.tabs.set(tabId, view);
    this.mainWindow.addBrowserView(view);
    this.activeTabId = tabId;
    this.resizeViews();

    view.webContents.loadURL(this.getPlatformUrl(account.platform));
    return tabId;
  }

  getPlatformUrl(platform) {
    const urls = {
      wechat: 'https://mp.weixin.qq.com',
      baidu: 'https://baijiahao.baidu.com',
      toutiao: 'https://mp.toutiao.com',
      weibo: 'https://weibo.com'
    };
    return urls[platform] || 'https://www.example.com';
  }

  resizeViews() {
    const [width, height] = this.mainWindow.getSize();
    const tabBarHeight = 40;
    
    this.tabs.forEach((view, tabId) => {
      const isActive = tabId === this.activeTabId;
      view.setBounds({
        x: 0,
        y: isActive ? tabBarHeight : height, // 隐藏非活动标签
        width,
        height: isActive ? height - tabBarHeight : 0
      });
      view.setAutoResize({ width: true, height: true });
    });
  }

  closeTab(tabId) {
    const view = this.tabs.get(tabId);
    if (view) {
      this.mainWindow.removeBrowserView(view);
      if (!view.isDestroyed()) {
        view.destroy();
      }
      this.tabs.delete(tabId);
    }
  }
}

module.exports = TabManager;