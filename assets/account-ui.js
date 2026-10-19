(function (global) {
  'use strict';
  let store, bridge, busy = false, switching = false, initialized = false, message = '', failed = false, dialog, previousFocus;
  const api = {
    ready: Promise.resolve(false),
    get cloud() { return !!global.CLAW_CONFIG?.cloud; },
    get syncStatus() { return api.cloud ? store?.status : 'local'; },
    get activeUser() { return store ? store.user : null; },
    init(value) {
      api.ready = Promise.resolve().then(async () => {
        bridge = value;
        store = api.cloud ? new CloudProfileStore(() => { if (initialized) api.render(); }) : new ProfileStore();
        switching = true;
        const snapshot = await store.init(bridge.getState(), bridge.createDefaultState());
        bridge.setState(snapshot);
        initialized = true;
        message = '';
        if (api.cloud) store.resume();
        return true;
      }).catch(error => { report(error, true); return false; }).finally(() => { switching = false; api.render(); });
      return api.ready;
    },
    persist() {
      if (switching) return !api.cloud;
      if (!initialized) return false;
      try { const hadMessage = message || failed; store.save(bridge.getState()); message = ''; failed = false; if (hadMessage) api.render(); return true; }
      catch (error) { report(error.code === 'PROFILE_CONFLICT' ? error : new Error('保存失败：本机存储不可用或空间不足，请保留当前页面后重试。'), true); return false; }
    },
    scopeKey(base) { return base + ':profile:' + (store && store.user ? store.user.id : 'guest'); },
    register(username, password, importGuest = false) { return operate(async () => { if (api.cloud) return switchCloud('register', username, password, importGuest); const user = await store.credentials(username, password); return switchAccount(user.id, user); }); },
    login(username, password) { return operate(async () => api.cloud ? switchCloud('login', username, password) : switchAccount(await store.authenticate(username, password))); },
    logout() { return operate(async () => api.cloud ? switchCloud('logout') : switchAccount(null)); },
    flush() { return api.cloud ? store.flush() : Promise.resolve(api.persist()); },
    reloadCloud() { return operate(async () => { switching = true; try { applyCloudState(await store.reload()); message = ''; return store.user; } finally { switching = false; } }); },
    render() {
      const card = document.getElementById('account-card');
      if (!card) return;
      card.replaceChildren();
      const info=bridge&&bridge.getState().personalInfo;
      const title = element('strong', api.activeUser ? info?.displayName||api.activeUser.username : '游客小屋');
      const summary=document.getElementById('personal-profile-summary');if(summary)summary.textContent=api.activeUser?(info?.displayName||'去完善'):'登录后填写';
      const syncText = {guest:'游客记录仅保存在当前浏览器',synced:'已同步到云端',pending:'已保存到本机，等待同步',syncing:'正在同步到云端',offline:'网络连接失败，修改已保存在本机',conflict:'其他设备已更新存档，本机副本已保留',expired:'登录已过期或账号已切换，请重新登录'};
      const hint = element('p', api.cloud ? syncText[store?.status] || '正在连接服务器' : '仅保存在当前浏览器 · 暂无云端同步');
      hint.setAttribute('role', 'status');
      const action = element('button', api.activeUser ? '切换账号' : '登录 / 注册');
      action.type = 'button'; action.className = 'account-primary'; action.onclick = api.show;
      card.append(title, hint, action);
      if (api.cloud && store?.user && store.recoverableOutboxes?.some(entry => entry.key !== store.outboxKey)) {
        card.append(element('p', '本机还保留了其他窗口的待同步副本，可导出备份。'));
        const copies = element('button', '导出待同步副本'); copies.type = 'button'; copies.className = 'account-secondary'; copies.onclick = downloadBackup; card.append(copies);
      }
      if (api.cloud && store && ['offline','conflict','expired'].includes(store.status)) {
        const backup = element('button', '导出本机备份'); backup.type = 'button'; backup.className = 'account-secondary'; backup.onclick = downloadBackup; card.append(backup);
        if (store.status === 'conflict') { const reload = element('button', '重新载入云端'); reload.type = 'button'; reload.className = 'account-secondary'; reload.onclick = () => { if (confirm('本机副本会保留为备份，然后载入云端最新存档。继续吗？')) api.reloadCloud().catch(() => {}); }; card.append(reload); }
        if (store.status === 'offline') { const retry = element('button', '重试同步'); retry.type = 'button'; retry.className = 'account-secondary'; retry.onclick = () => api.flush().catch(() => {}); card.append(retry); }
      }
      if (api.activeUser) { const out = element('button', '退出到游客'); out.type = 'button'; out.className = 'account-secondary'; out.onclick = () => api.logout().catch(() => {}); card.append(out); }
      if (message) { const status = element('p', message); status.className = failed ? 'account-error' : 'account-status'; status.setAttribute('role', failed ? 'alert' : 'status'); card.append(status); }
    },
    show() {
      const body = openDialog('陪伴从你的账号开始');
      body.append(element('p', api.cloud ? '注册服务器账号，在不同设备登录后继续你的陪伴记录。已有本地账号需要重新注册为服务器账号。' : '账号和陪伴记录仅保存在这台设备的当前浏览器中。清理浏览器数据会丢失记录，请勿使用重要账号的口令。'));
      const form = document.createElement('form');
      const nameLabel = element('label', '账号名');
      const name = document.createElement('input'); name.name = 'username'; name.autocomplete = 'username'; name.minLength = 2; name.maxLength = 24; name.required = true; nameLabel.append(name);
      const passLabel = element('label', api.cloud ? '密码' : '本地口令');
      const password = document.createElement('input'); password.name = 'password'; password.type = 'password'; password.autocomplete = 'current-password'; password.minLength = api.cloud ? 8 : 6; password.maxLength = 128; password.required = true; passLabel.append(password);
      const importGuest = document.createElement('input'); importGuest.type = 'checkbox'; importGuest.className = 'account-import-check';
      const importLabel = element('label', ''); importLabel.className = 'account-import'; importLabel.append(importGuest, document.createTextNode('注册时导入当前游客记录'));
      const error = element('p', ''); error.className = 'account-error'; error.setAttribute('role', 'alert');
      const login = element('button', '登录账号'); login.type = 'submit'; login.className = 'account-primary'; login.value = 'login';
      const register = element('button', '注册新账号'); register.type = 'submit'; register.className = 'account-secondary'; register.value = 'register';
      form.append(nameLabel, passLabel, error, login, register);
      if (api.cloud && !api.activeUser) form.insertBefore(importLabel, error);
      form.onsubmit = async event => {
        event.preventDefault();
        login.disabled = register.disabled = true;
        try { await (event.submitter && event.submitter.value === 'register' ? api.register(name.value, password.value, importGuest.checked) : api.login(name.value, password.value)); closeDialog(); }
        catch (reason) { error.textContent = reason.message; }
        finally { login.disabled = register.disabled = false; password.value = ''; }
      };
      body.append(form, element('small', api.cloud ? '新账号默认从空白开始；仅勾选导入时继承游客记录。' : '第一个本地账号会继承当前游客数据；之后的新账号从空白开始。'));
      requestAnimationFrame(() => name.focus());
    },
    showProfile() {
      if(!api.activeUser){api.show();return;}
      const owner=api.activeUser.id,info=bridge.getState().personalInfo||{},body=openDialog('个人资料'),form=document.createElement('form');
      global.CommunityUI?.profileControl(body);
      for(const [key,label,max]of [['displayName','名字',20],['age','年龄',3],['region','地区',40],['signature','个人签名',80]]){
        const row=element('label',label),input=document.createElement(key==='signature'?'textarea':'input');input.name=key;input.maxLength=max;input.value=info[key]||'';
        if(key==='age'){input.type='number';input.min='0';input.max='120';input.step='1';}else if(key==='displayName')input.autocomplete='nickname';
        row.append(input);form.append(row);
      }
      const error=element('p','');error.className='account-error';error.setAttribute('role','alert');const save=element('button','保存资料');save.type='submit';save.className='account-primary';form.append(error,save);
      form.onsubmit=event=>{event.preventDefault();if(api.activeUser?.id!==owner){error.textContent='账号已切换，请重新打开资料。';return;}const value=Object.fromEntries(new FormData(form));if(!bridge.savePersonalInfo(value)){error.textContent='保存失败，请重试。';return;}closeDialog();api.render();};body.append(form);
    },
    showHistory() {
      const body = openDialog('我的专注记录');
      const records = bridge && bridge.getState().focusRecords || [];
      if (!records.length) body.append(element('p', '还没有专注记录，完成一次专注后会留在这里。'));
      [...records].reverse().forEach(record => {
        const row = element('div', ''); row.className = 'account-record';
        const date = record.completedAt || record.date || record.startedAt || record.timestamp;
        const parsed = date ? new Date(date) : null;
        row.append(element('strong', String(record.taskName || record.taskTitle || record.title || '一次专注')));
        const duration = record.minutes ?? record.durationMinutes ?? (record.durationSeconds != null ? Math.round(record.durationSeconds / 60) : null);
        row.append(element('p', (parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleString('zh-CN') : '已完成') + (duration != null ? ' · ' + duration + ' 分钟' : '')));
        body.append(row);
      });
    }
  };
  async function switchCloud(action, username, password, importGuest) {
    switching = true;
    try {
      const next = action === 'logout' ? await store.logout() : await store.authenticate(action, username, password, importGuest);
      applyCloudState(next); store.resume(); return store.user;
    } finally { switching = false; }
  }
  function applyCloudState(snapshot) {
    try { bridge.setState(snapshot); }
    catch (error) { initialized = false; store.setStatus('expired', '账号已验证，但存档显示失败。请保留本机数据并刷新页面重试。'); throw error; }
  }
  function downloadBackup() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({user: api.activeUser, snapshot: bridge.getState(), pendingCopies: api.cloud ? store.recoverableOutboxes : undefined, exportedAt: new Date().toISOString()}, null, 2)], {type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'claw-time-backup.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function element(tag, text) { const node = document.createElement(tag); node.textContent = text; return node; }
  function report(error, storage) { failed = true; message = storage && !/保存失败/.test(error.message) ? '保存失败：' + error.message : error.message; api.render(); }
  async function operate(work) {
    await api.ready;
    if (!initialized) throw new Error('账号存储尚未准备好，请保留当前页面并重试。');
    if (busy) throw new Error('正在切换账号，请稍候。');
    if (bridge.canSwitch && !bridge.canSwitch()) { const error = new Error('请先结束当前专注或确认 / 取消编辑，再切换账号。'); report(error); throw error; }
    busy = true;
    try { const result = await work(); message = ''; failed = false; api.render(); return result; }
    catch (error) { report(error); throw error; }
    finally { busy = false; }
  }
  function switchAccount(id, user) {
    if (bridge.canSwitch && !bridge.canSwitch()) throw new Error('请先结束当前专注或确认 / 取消编辑，再切换账号。');
    const oldState = bridge.getState(), oldId = store.activeId;
    switching = true;
    try {
      let next;
      try { next = store.switchTo(id, oldState, user, bridge.createDefaultState()); }
      catch (error) { if (error.code === 'PROFILE_CONFLICT' || /存在/.test(error.message)) throw error; throw new Error('保存失败：无法保存当前记录，已取消账号切换。'); }
      try { bridge.setState(next); }
      catch (error) { try { store.restoreSession(oldId); } finally { bridge.setState(oldState); } throw error; }
      return store.user;
    } finally { switching = false; }
  }
  function closeDialog() { if (dialog) { dialog.close(); dialog.remove(); dialog = null; } if (previousFocus && previousFocus.isConnected) previousFocus.focus(); }
  function openDialog(title) {
    closeDialog(); previousFocus = document.activeElement;
    dialog = document.createElement('dialog'); dialog.className = 'account-dialog';
    const close = element('button', '×'); close.className = 'account-close'; close.type = 'button'; close.setAttribute('aria-label', '关闭'); close.onclick = closeDialog;
    const heading = element('h2', title); heading.id = 'account-dialog-title'; dialog.setAttribute('aria-labelledby', heading.id);
    dialog.append(close, heading); dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(); } });
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
    document.body.append(dialog); dialog.showModal(); return dialog;
  }
  global.AccountManager = api;
})(window);
