class AccountCache {
  constructor() {
    this.cache = {
      accounts: null,
      groups: null,
      lastUpdated: {
        accounts: 0,
        groups: 0
      }
    };
    this.TTL = 5 * 60 * 1000; // 5分钟缓存
  }

  async getAccounts(forceRefresh = false) {
    if (forceRefresh || 
        !this.cache.accounts || 
        Date.now() - this.cache.lastUpdated.accounts > this.TTL) {
      this.cache.accounts = await window.electronAPI.getAccounts();
      this.cache.lastUpdated.accounts = Date.now();
    }
    return this.cache.accounts;
  }

  async getGroups(forceRefresh = false) {
    if (forceRefresh || 
        !this.cache.groups || 
        Date.now() - this.cache.lastUpdated.groups > this.TTL) {
      this.cache.groups = await window.electronAPI.getGroups();
      this.cache.lastUpdated.groups = Date.now();
    }
    return this.cache.groups;
  }

  clear() {
    this.cache = {
      accounts: null,
      groups: null,
      lastUpdated: {
        accounts: 0,
        groups: 0
      }
    };
  }
}

module.exports = AccountCache;