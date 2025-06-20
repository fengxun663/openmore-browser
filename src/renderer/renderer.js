// 渲染账号列表
async function loadAccounts() {
    const accounts = await electronAPI.getAccounts();
    accountList.innerHTML = '';

    if (!accounts || Object.keys(accounts).length === 0) {
      const li = document.createElement('li');
      li.textContent = '暂无账号，请添加';
      li.style.color = '#888';
      accountList.appendChild(li);
      return;
    }

    // 按分组存储账号
    const groupedAccounts = {};
    for (const platform in accounts) {
      const platformAccounts = accounts[platform];
      for (const accountId in platformAccounts) {
        const account = platformAccounts[accountId];
        const group = account.group || platform; // 如果没有分组信息，使用平台作为分组
        if (!groupedAccounts[group]) {
          groupedAccounts[group] = [];
        }
        groupedAccounts[group].push(account);
      }
    }

    // 按分组显示账号
    for (const group in groupedAccounts) {
      const groupTitle = document.createElement('h4');
      groupTitle.textContent = group;
      accountList.appendChild(groupTitle);

      const groupList = document.createElement('ul');
      const groupAccounts = groupedAccounts[group];
      for (const account of groupAccounts) {
        const li = document.createElement('li');

        // 显示描述或账号名称
        const displayText = account.description ? account.description : account.username;

        // 状态显示
        const statusBadge = account.loggedIn
          ? '<span class="status-badge status-logged-in">已登录</span>'
          : '<span class="status-badge status-logged-out">未登录</span>';


        li.innerHTML = `
          <div>
            <span>${displayText}</span>
            ${statusBadge}
          </div>
          <div>
            <span class="delete-btn" onclick="deleteAccount('${account.platform}', '${account.id}')">×</span>
          </div>
        `;

        li.onclick = () => openBrowser(account);
        groupList.appendChild(li);
      }
      accountList.appendChild(groupList);
    }
  }