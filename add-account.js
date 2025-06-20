// 添加账号页面的渲染进程代码
document.addEventListener('DOMContentLoaded', () => {
  const { electronAPI } = window;
  
  const addAccountForm = document.getElementById('add-account-form');
  const cancelBtn = document.getElementById('cancel-btn');
  
  // 提交表单
  addAccountForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const platform = document.getElementById('platform').value;
    const accountId = document.getElementById('account-id').value;
    const username = document.getElementById('username').value;
    const group = document.getElementById('group').value;
    
    // 验证输入
    if (!platform || !accountId || !username) {
      alert('所有字段都必须填写');
      return;
    }
    
    // 创建账号对象
    const account = {
      id: accountId,
      platform,
      username,
      password: '',
      description: '',
      group,
      createdAt: new Date().toISOString()
    };

    // 发送保存账号请求
    try {
      await electronAPI.saveAccount(account);
      alert('账号保存成功');
      window.close();
    } catch (error) {
      console.error('Error saving account:', error);
      alert('保存账号失败: ' + error.message);
    }
  });
  
  // 取消按钮
  cancelBtn.addEventListener('click', () => {
    window.close();
  });
});