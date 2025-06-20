const { contextBridge, ipcRenderer } = require('electron');

// 暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 获取账号列表
    getAccounts: () => ipcRenderer.invoke('get-accounts'),

    // 保存账号
    saveAccount: (account) => ipcRenderer.invoke('save-account', account),

    // 删除账号
    deleteAccount: (data) => ipcRenderer.invoke('delete-account', data),

    // 分组管理
    createGroup: (groupName) => ipcRenderer.invoke('create-group', groupName),
    deleteGroup: (groupName) => ipcRenderer.invoke('delete-group', groupName),
    getGroups: () => ipcRenderer.invoke('get-groups'),

    onAccountsUpdated: (callback) => ipcRenderer.on('accounts-updated', callback),

    // 打开浏览器
    openBrowser: (account) => ipcRenderer.invoke('open-browser', account),

    // 登录状态检测
    onLoginStatus: (callback) => ipcRenderer.on('login-status', callback),

    // 监听账号更新事件
    onAccountsUpdated: (callback) => ipcRenderer.on('accounts-updated', callback),

    // 监听初始 URL
    onInitialUrl: (callback) => ipcRenderer.on('initial-url', callback)
});