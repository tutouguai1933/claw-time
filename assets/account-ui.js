(function (global) {
  'use strict';
  let store, bridge, busy = false, switching = false, initialized = false, message = '', failed = false, dialog, previousFocus;
  const api = {
    ready: Promise.resolve(false),
    get activeUser() { return store ? store.user : null; },
    init(value) {
      api.ready = Promise.resolve().then(() => {
        bridge = value;
        store = new ProfileStore();
        switching = true;
        const snapshot = store.init(bridge.getState());
        bridge.setState(snapshot);
        initialized = true;
        message = '';
        return true;
      }).catch(error => { report(error, true); return false; }).finally(() => { switching = false; api.render(); });
      return api.ready;
    },
    persist() {
      if (switching) return true;
      if (!initialized) return false;
      try { store.save(bridge.getState()); message = ''; failed = false; api.render(); return true; }
      catch (error) { report(error.code === 'PROFILE_CONFLICT' ? error : new Error('保存失败：本机存储不可用或空间不足，请保留当前页面后重试。'), true); return false; }
    },
    scopeKey(base) { return base + ':profile:' + (store && store.user ? store.user.id : 'guest'); },
    register(username, password) { return operate(async () => { const user = await store.credentials(username, password); return switchAccount(user.id, user); }); },
    login(username, password) { return operate(async () => switchAccount(await store.authenticate(username, password))); },
    logout() { return operate(async () => switchAccount(null)); },
    render() {
      const card = document.getElementById('account-card');
      if (!card) return;
      card.replaceChildren();
      const info=bridge&&bridge.getState().personalInfo;
      const title = element('strong', api.activeUser ? info?.displayName||api.activeUser.username : '游客小屋');
      const summary=document.getElementById('personal-profile-summary');if(summary)summary.textContent=api.activeUser?(info?.displayName||'去完善'):'登录后填写';
      const hint = element('p', '仅保存在当前浏览器 · 暂无云端同步');
      const action = element('button', api.activeUser ? '切换账号' : '登录 / 注册');
      action.type = 'button'; action.className = 'account-primary'; action.onclick = api.show;
      card.append(title, hint, action);
      if (api.activeUser) { const out = element('button', '退出到游客'); out.type = 'button'; out.className = 'account-secondary'; out.onclick = () => api.logout().catch(() => {}); card.append(out); }
      if (message) { const status = element('p', message); status.className = failed ? 'account-error' : 'account-status'; status.setAttribute('role', failed ? 'alert' : 'status'); card.append(status); }
    },
    show() {
      const body = openDialog('陪伴从你的账号开始');
      body.append(element('p', '账号和陪伴记录仅保存在这台设备的当前浏览器中。清理浏览器数据会丢失记录，请勿使用重要账号的口令。'));
      const form = document.createElement('form');
      const nameLabel = element('label', '账号名');
      const name = document.createElement('input'); name.name = 'username'; name.autocomplete = 'username'; name.minLength = 2; name.maxLength = 24; name.required = true; nameLabel.append(name);
      const passLabel = element('label', '本地口令');
      const password = document.createElement('input'); password.name = 'password'; password.type = 'password'; password.autocomplete = 'current-password'; password.minLength = 6; password.maxLength = 128; password.required = true; passLabel.append(password);
      const error = element('p', ''); error.className = 'account-error'; error.setAttribute('role', 'alert');
      const login = element('button', '登录账号'); login.type = 'submit'; login.className = 'account-primary'; login.value = 'login';
      const register = element('button', '注册新账号'); register.type = 'submit'; register.className = 'account-secondary'; register.value = 'register';
      form.append(nameLabel, passLabel, error, login, register);
      form.onsubmit = async event => {
        event.preventDefault();
        login.disabled = register.disabled = true;
        try { await (event.submitter && event.submitter.value === 'register' ? api.register(name.value, password.value) : api.login(name.value, password.value)); closeDialog(); }
        catch (reason) { error.textContent = reason.message; }
        finally { login.disabled = register.disabled = false; password.value = ''; }
      };
      body.append(form, element('small', '第一个本地账号会继承当前游客数据；之后的新账号从空白开始。'));
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
