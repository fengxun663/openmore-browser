const { BrowserWindow } = require('electron');

const openWindows = {};

function openPlatformWindow(account, onClose) {
  const { platform, id } = account;
  const key = `${platform}_${id}`;

  if (openWindows[key]) {
    openWindows[key].show();
    return;
  }

  const partitionName = `persist:${key}`;
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    show: true,
    webPreferences: {
      partition: partitionName
    }
  });

  let url = 'https://www.example.com';
  if (platform === 'wechat') url = 'https://mp.weixin.qq.com';
  else if (platform === '百家号') url = 'https://baijiahao.baidu.com';
  else if (platform === 'toutiao') url = 'https://mp.toutiao.com';
  else if (platform === '微博') url = 'https://weibo.com';

  win.loadURL(url);

  win.on('closed', () => {
    delete openWindows[key];
    if (onClose) onClose();
  });

  // 关闭其他窗口
  for (const otherKey in openWindows) {
    if (otherKey !== key && openWindows[otherKey]) {
      openWindows[otherKey].close();
    }
  }

  openWindows[key] = win;
}

module.exports = { openPlatformWindow };