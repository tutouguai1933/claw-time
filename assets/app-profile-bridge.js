/* Application state boundary for the local profile adapter. Load after app initialization. */
(function (global) {
  'use strict';
  if (global.AppProfileBridge) return;
  const copy = value => JSON.parse(JSON.stringify(value));
  let records = [], visitDays = [], personalInfo = normalizePersonalInfo(), community=CompanionProgress.normalize(), outfitTransforms = {}, restoring = false, startedTask = '', initialized = false, drawingEpoch = 0;
  const defaultState = {
    version: 1, petRosterVersion: 2, wardrobeVersion: 2, todayTasks: [], focusRecords: [], visitDays: [], plateFoodIdx: [0, 0, 0], petOutfits: {}, outfitColors: {}, outfitTransforms: {},
    curPet: 0, curTime: 1, curWeather: 0, curMode: 1, curShadow: 0, curScene: 0,
    dressPet: 0, homeFixed: false, homePicks: null, focusLen: 25, focusTask: 0, taskInput: '专注学习',
    coins: 220, rankClaimed: false, ownedOutfits: [0, 1, 2, 3], plazaApplied: [],
    roleAff: [0, 0, 0, 0, 0, 0], roleUnlock: [1, 1, 1, 1, 1, 1], extraUnlock: EXTRA_PETS.map((pet)=>pet.retired?0:1),
    drawnPets: [], customPets: [], personalInfo: normalizePersonalInfo(), community: CompanionProgress.normalize(), musicOn: true, soundOn: true, house: null,
    placed: [], nextDecId: 0, drawDraft: null,
    pk: { state: 0, applied: 0, myMinutes: 0, opponentMinutes: 0, done: false }
  };
  function readDraft() {
    try { const raw = localStorage.getItem(AccountManager.scopeKey(DRAW_KEY)); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }
  function getState() {
    recordVisit();
    return global.RosterMigration.normalize({
      version: 1, petRosterVersion: 2, wardrobeVersion: 2, todayTasks, focusRecords: records, visitDays, plateFoodIdx, petOutfits, outfitColors, outfitTransforms,
      curPet, curTime, curWeather, curMode, curShadow, curScene, dressPet, homeFixed, homePicks,
      focusLen, focusTask, taskInput: $('task-input').value, coins, rankClaimed, ownedOutfits, plazaApplied,
      roleAff: ROLE_AFF, roleUnlock: ROLE_UNLOCK, extraUnlock: EXTRA_UNLOCK, drawnPets: DRAWN_PETS,
      customPets: CUSTOM_PETS, personalInfo, community, musicOn, soundOn,
      house: global.HouseEditor ? HouseEditor.getSaved() : null,
      placed, nextDecId, drawDraft: readDraft(),
      pk: { state: pkState, applied: appliedPK, myMinutes: pkMyMin, opponentMinutes: pkOppMin, done: pkDone }
    }, PETS.length + EXTRA_PETS.length);
  }
  function replace(target, source) { target.splice(0, target.length, ...copy(source)); }
  function migrate(snapshot){
    const raw=copy(snapshot||{});
    // Six cats were appended to the old nine built-ins, ahead of user creations.
    if(raw.petRosterVersion!==2&&(raw.extraUnlock||[]).length<=3){
      const count=(raw.drawnPets||[]).length+(raw.customPets||[]).length;
      const shift=id=>Number.isInteger(id)&&id>=9&&id<9+count?id+6:id;
      for(const key of ['curPet','dressPet'])if(Number.isInteger(raw[key]))raw[key]=shift(raw[key]);
      if(Array.isArray(raw.homePicks))raw.homePicks=raw.homePicks.map(shift);
      if(raw.pk)raw.pk.applied=shift(raw.pk.applied);
      for(const key of ['petOutfits','outfitColors'])if(raw[key])raw[key]=Object.fromEntries(Object.entries(raw[key]).map(([id,value])=>[shift(Number(id)),value]));
      if(Array.isArray(raw.focusRecords))raw.focusRecords=raw.focusRecords.map(record=>({...record,petId:shift(record.petId)}));
      if(Array.isArray(raw.roleAff)&&raw.roleAff.length>9){const values=[];raw.roleAff.forEach((v,i)=>values[shift(i)]=v);raw.roleAff=values;}
    }
    if(raw.wardrobeVersion!==2){
      const owned=new Set(raw.ownedOutfits||[0,1,2,3]);
      for(const names of Object.values(raw.petOutfits||{}))for(const name of Array.isArray(names)?names:[]){const index=OUTFITS.findIndex(o=>o.name===name);if(index>=0)owned.add(index);}
      raw.ownedOutfits=[...owned];
    }
    raw.petRosterVersion=2;raw.wardrobeVersion=2;
    raw.extraUnlock=EXTRA_PETS.map((pet,i)=>pet.retired?0:raw.extraUnlock?.[i]??1);
    return global.RosterMigration.normalize(raw, PETS.length + EXTRA_PETS.length);
  }
  function setState(snapshot) {
    const state = Object.assign(copy(defaultState), migrate(snapshot));
    restoring = true;
    try {
      if (global.PetInteractions) PetInteractions.reset();
      drawingEpoch++;
      clearTimeout(global._petBubbleT); clearInterval(pkTimer); pkTimer = null;
      resetFocusState();
      todayTasks = state.todayTasks; records = state.focusRecords || [];
      personalInfo = normalizePersonalInfo(state.personalInfo);
      community=CompanionProgress.normalize(snapshot?.community,snapshot?.visitDays);
      // Previously placed locked decor is a permanent entitlement, even if later removed.
      for(const placed of state.house?.decor||[])if(['玩具鼠','彩虹挂画'].includes(placed.name)&&!community.decorOwned.includes(placed.name))community.decorOwned.push(placed.name);
      visitDays = [...new Set((state.visitDays || []).filter(day => /^\d{4}-\d{2}-\d{2}$/.test(day)))];
      recordVisit();
      plateFoodIdx = state.plateFoodIdx; draftFoodIdx = [...plateFoodIdx]; plateConfirmed = [false, false, false];
      petOutfits = state.petOutfits; homeFixed = state.homeFixed; homePicks = state.homePicks;
      outfitColors = state.outfitColors && typeof state.outfitColors === 'object' && !Array.isArray(state.outfitColors) ? state.outfitColors : {};
      outfitTransforms = state.outfitTransforms && typeof state.outfitTransforms === 'object' && !Array.isArray(state.outfitTransforms) ? copy(state.outfitTransforms) : {};
      replace(DRAWN_PETS, state.drawnPets); replace(CUSTOM_PETS, state.customPets);
      replace(ROLE_AFF, state.roleAff); replace(ROLE_UNLOCK, state.roleUnlock); replace(EXTRA_UNLOCK, state.extraUnlock);
      curPet = getPet(state.curPet) ? state.curPet : 0; dressPet = getPet(state.dressPet) ? state.dressPet : 0;
      curTime = state.curTime; curWeather = state.curWeather; curMode = state.curMode;
      curShadow = state.curShadow; curScene = state.curScene; focusLen = state.focusLen; focusTask = state.focusTask;
      focusSec = focusLen * 60; coins = state.coins; rankClaimed = state.rankClaimed;
      ownedOutfits = state.ownedOutfits; plazaApplied = state.plazaApplied;
      musicOn = state.musicOn; soundOn = state.soundOn;
      clearInterval(bgmFade); bgmAudio.pause(); if (!musicOn) bgmAudio.volume = 0;
      placed = state.placed; nextDecId = state.nextDecId;
      const pk = Object.assign({}, defaultState.pk, state.pk);
      pkState = pk.state; appliedPK = getPet(pk.applied) ? pk.applied : 0;
      pkMyMin = pk.myMinutes; pkOppMin = pk.opponentMinutes; pkDone = pk.done;
      tempDress = null; tempDressColors = null; drawing = false; pendingDraw = null; pendingParts = { head: null, tail: null, eye: null };
      markBoxes = []; markSel = null; layers = []; layerHist = []; activeLayer = 0;
      $('draw-wrap').querySelectorAll('canvas.layer-canvas').forEach(node => node.remove());
      const draftKey = AccountManager.scopeKey(DRAW_KEY);
      try { if (state.drawDraft) localStorage.setItem(draftKey, JSON.stringify(state.drawDraft)); else localStorage.removeItem(draftKey); }
      catch { throw new Error('保存失败：无法恢复当前账号画作草稿，请保留页面后重试。'); }
      document.querySelectorAll('.sheet-mask.show,.role-detail.show').forEach(node => node.classList.remove('show'));
      closeFocusTaskMenu(); foodPickOpen = false; document.body.classList.remove('food-selecting'); $('focus-stage').classList.remove('food-editing');
      $('task-input').value = state.taskInput;
      if (global.HouseEditor) HouseEditor.restore(state.house);
      updateLivingRoomBg(); renderSwap(); renderHome(); renderFocusPet(); renderRoles(); renderTasks();
      renderTray(); renderPlaced(); renderMine(); renderDots(); renderFriends(); renderPetPick(); renderPetDress(); renderPlateFoods();
      updateFocusClock(); layoutFocusWorld();
      document.querySelectorAll('.top-cap.left .mini-btn').forEach((node, index) => node.classList.toggle('active', index === curTime));
      document.querySelectorAll('.top-cap.right .mini-btn').forEach((node, index) => node.classList.toggle('active', index === curWeather));
      document.querySelectorAll('.mode-card').forEach((node, index) => node.classList.toggle('active', index === curMode));
      document.querySelectorAll('.chip[data-l]').forEach(node => node.classList.toggle('active', +node.dataset.l === focusLen));
      $('timer-num').nextElementSibling.textContent = '专注 ' + focusLen + ' 分钟 · ' + document.querySelectorAll('.mode-card')[curMode].querySelector('.m-name').textContent;
      const track = $('scene-track'); track.scrollTo({ left: curScene * track.querySelector('.scene-page').offsetWidth, behavior: 'instant' });
      $('pk-btn').textContent = pkState === 1 ? 'PK 进行中 · 今晚 24:00 结算' : pkDone ? '今日已结算 · 明天再 PK' : '发起今日 PK';
      $('pk-settle-btn').style.display = pkState === 1 ? 'block' : 'none';
      $('pk-react').classList.toggle('show', pkState === 1);
      $('pk-note').textContent = pkState === 1 ? '今天每完成一次专注都会计入 PK' : pkDone ? '今日已结算，明天再一起加油' : '完成专注，积累你的陪伴时光';
      renderPKBar(); if (pkState === 1) { pkCountdown(); pkTimer = setInterval(pkCountdown, 1000); } else $('pk-count').textContent = '今日 PK';
      updateStatistics();
      global.CommunityUI?.restored();global.PetPK?.restored();global.Soundscapes?.restored();global.RewardAccess?.restored();
    } finally { restoring = false; }
  }
  function canSwitch() {
    if (focusing || foodPickOpen || drawing || (global.HouseEditor && HouseEditor.isEditing())) return false;
    if (tempDress && JSON.stringify(tempDress) !== JSON.stringify(petOutfits[dressPet] || [])) return false;
    if (tempDressColors && JSON.stringify(tempDressColors) !== JSON.stringify(outfitColors[dressPet] || {})) return false;
    return !['draw-sheet', 'face-sheet'].some(id => $(id) && $(id).classList.contains('show'));
  }
  function persist() { if (!restoring && initialized) return AccountManager.persist(); return false; }
  function shiftPetReferences(start,offset){records=records.map(record=>Number.isInteger(record.petId)&&record.petId>=start?{...record,petId:record.petId+offset}:record);if(community.avatar.type==='pet'&&community.avatar.petId>=start)community.avatar.petId+=offset;if(community.pk?.mePet>=start)community.pk.mePet+=offset;}
  function updateCommunity(change){
    const before={community:copy(community),coins,roleUnlock:copy(ROLE_UNLOCK),extraUnlock:copy(EXTRA_UNLOCK),ownedOutfits:copy(ownedOutfits)};
    const next=copy(before);if(change(next)===false)return false;
    const apply=s=>{community=CompanionProgress.normalize(s.community);coins=s.coins;replace(ROLE_UNLOCK,s.roleUnlock);replace(EXTRA_UNLOCK,s.extraUnlock);ownedOutfits=copy(s.ownedOutfits);};
    apply(next);try{if(!persist())throw new Error('storage');}catch(_){apply(before);AccountManager.render();return false;}
    AccountManager.render();return true;
  }
  function normalizePersonalInfo(value={}) {
    const clean=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
    const age=String(value?.age??'').trim();
    return {displayName:clean(value?.displayName,20),age:/^\d{1,3}$/.test(age)&&Number(age)<=120?String(Number(age)):'',region:clean(value?.region,40),signature:clean(value?.signature,80)};
  }
  function savePersonalInfo(value) {
    if(!AccountManager.activeUser)return false;
    const before=personalInfo;personalInfo=normalizePersonalInfo(value);
    try{if(!persist())throw new Error('storage');return true;}catch(_){personalInfo=before;AccountManager.render();return false;}
  }
  const bridge = global.AppProfileBridge = { getState, setState, createDefaultState: () => copy(defaultState), canSwitch, persist, updateStatistics, shiftPetReferences, savePersonalInfo, updateCommunity };
  function dayKey(date) { return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); }
  function recordVisit() { const today = dayKey(new Date()); if (!visitDays.includes(today)) visitDays.push(today); }
  function minutes(record) { return Number.isFinite(record.minutes) && record.minutes > 0 ? record.minutes : 0; }
  genDaily = function (year, month) {
    const values = Array(new Date(year, month, 0).getDate()).fill(0);
    records.forEach(record => { const date = new Date(record.completedAt); if (date.getFullYear() === year && date.getMonth() + 1 === month) values[date.getDate() - 1] += minutes(record); });
    return values;
  };
  function updateStatistics() {
    recordVisit();
    totalH = records.reduce((sum, record) => sum + minutes(record), 0) / 60;
    const days = new Set(records.filter(record => minutes(record) > 0).map(record => dayKey(new Date(record.completedAt))));
    let streak = 0, cursor = new Date(); cursor.setHours(12, 0, 0, 0);
    if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
    const today = dayKey(new Date());
    const todayMin = records.filter(record => dayKey(new Date(record.completedAt)) === today).reduce((sum, record) => sum + minutes(record), 0);
    const summary = $('my-focus-summary'); if (summary) summary.textContent = '累计专注 ' + Number(totalH.toFixed(2)) + ' 小时 · 连续打卡 ' + streak + ' 天';
    const daily = $('my-focus-today'); if (daily) daily.textContent = '今日 ' + todayMin + ' 分钟';
    const affinity = $('my-affinity-value'); if (affinity) affinity.textContent = affLevel(ROLE_AFF[curPet] || 0) + ' · ' + (ROLE_AFF[curPet] || 0) + ' 分';
    const affinityTitle = $('my-affinity-title'); if (affinityTitle) affinityTitle.textContent = '与' + getPet(curPet).name + '的好感度';
    const currentLevel = ['陌生','眼熟','熟悉','亲密','挚友'].indexOf(affLevel(ROLE_AFF[curPet] || 0));
    document.querySelectorAll('.aff-level .lv').forEach((node, i) => node.classList.toggle('active', i <= currentLevel));
    if ($('my-login-days')) $('my-login-days').textContent = visitDays.length + '/30天';
    if ($('my-login-bar')) $('my-login-bar').style.width = Math.min(100, visitDays.length / 30 * 100) + '%';
    const myRank = RANK_DATA.find(entry => entry.name === '我'); if (myRank) myRank.hours = Number(totalH.toFixed(2)) + 'h';
    const rankRow = document.querySelector('#rank-list .me')?.closest('.rank-row');
    if (rankRow) rankRow.querySelector('.rk-h').textContent = Number(totalH.toFixed(2)) + 'h';
    renderLevel(); renderStat();
  }
  const originalFinish = finishFocus;
  finishFocus = function () {
    const elapsed = focusLen * 60 - focusSec;
    const record = focusing && elapsed >= 180 ? { completedAt: new Date().toISOString(), taskName: startedTask || $('float-task').textContent || $('task-input').value.trim() || '专注学习', minutes: Math.floor(elapsed / 60), petId: curPet, mode: curMode } : null;
    originalFinish.apply(this, arguments);
    if (record) records.push(record);
    startedTask = ''; updateStatistics(); persist();
  };
  const originalToggle = toggleFocus;
  toggleFocus = function () { if (!focusing) startedTask = $('task-input').value.trim() || '专注学习'; return originalToggle.apply(this, arguments); };
  persistTasks = persist;
  saveFoodPick = function () {
    if (!foodPickOpen) return;
    plateFoodIdx = [...draftFoodIdx]; closeFoodPick();
    if (persist()) toast(AccountManager.cloud?'菜品摆好啦，已保存，同步进度可在我的页面查看':'菜品摆好啦，已保存在当前本地账号');
  };
  saveDrawState = function () {
    try {
      const draft = { d: layers.map(layer => layer.el.toDataURL()), w: 280, h: 280, visible: layers.map(layer => layer.visible), pp: pendingParts };
      if (pendingDraw) { draft.pd = { ...pendingDraw }; delete draft.pd.out; }
      localStorage.setItem(AccountManager.scopeKey(DRAW_KEY), JSON.stringify(draft));
      persist();
    } catch { toast('保存失败：画作草稿未写入本机，请保留页面并重试。'); }
  };
  restoreDrawState = function () {
    const state = readDraft(); if (!state || !Array.isArray(state.d) || !state.d.length) return false;
    const epoch = ++drawingEpoch;
    if (state.pp) pendingParts = copy(state.pp);
    if (state.pd) {
      pendingDraw = copy(state.pd);
      const pending = pendingDraw, canvas = document.createElement('canvas'); canvas.width = canvas.height = 280;
      pending.out = canvas;
      const image = new Image();
      image.onload = () => { if (epoch === drawingEpoch && pendingDraw === pending) canvas.getContext('2d').drawImage(image, 0, 0, 280, 280); };
      image.src = pending.dataURL;
      applyStepUI(pending.step || 2);
    }
    state.d.forEach((url, index) => {
      const layer = layers[index]; if (!layer || !url) return;
      if (state.visible) layer.visible = state.visible[index] !== false;
      const image = new Image();
      image.onload = () => { if (epoch === drawingEpoch && layers.includes(layer)) layer.ctx.drawImage(image, 0, 0); };
      image.src = url;
    });
    syncLayerStack(); renderLayerBar(); return true;
  };
  // Old storage keys become read-only migration inputs. New writes go through the profile snapshot.
  const originalRenderMine = renderMine;
  renderMine = function () { originalRenderMine.apply(this, arguments); updateStatistics(); };
  [ 'saveDress', 'saveFace', 'addDrawnPet', 'finishDraw', 'saveDrawState', 'setTime', 'setWeather', 'setMode', 'setFocusLen', 'setFocusTask', 'pickPet', 'switchPet', 'setMadeHero', 'closeDetail', 'toggleHomePick', 'toggleMusic', 'toggleSound', 'claimRank', 'buyOutfit', 'applyBuddy', 'startPK', 'settlePK', 'goScene', 'updateDotsFromScroll', 'addItem', 'removeItem' ].forEach(name => {
    const original = global[name]; if (typeof original !== 'function') return;
    global[name] = function () { const result = original.apply(this, arguments); if (!restoring) { updateStatistics(); persist(); } return result; };
  });
  let queued = false;
  function scheduleSave(event) {
    // Account controls persist explicitly; rerendering on pointerup cancels their click.
    if (event?.target?.closest?.('#account-card,.account-dialog')) return;
    if (queued || restoring || !initialized) return;
    queued = true; queueMicrotask(() => { queued = false; if (!restoring) { updateStatistics(); persist(); } });
  }
  document.addEventListener('click', scheduleSave);
  document.addEventListener('change', scheduleSave);
  document.addEventListener('input', event => { if (event.target.id === 'task-input') scheduleSave(); });
  document.addEventListener('pointerup', scheduleSave);
  global.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && initialized) updateStatistics(); persist(); });
  // Migrate the unscoped drawing only once into the visitor profile, preserving the original backup.
  try {
    if (!localStorage.getItem('qingpeiban.profiles.v1')) {
      const oldDraft = localStorage.getItem(DRAW_KEY);
      if (oldDraft && !localStorage.getItem(AccountManager.scopeKey(DRAW_KEY))) localStorage.setItem(AccountManager.scopeKey(DRAW_KEY), oldDraft);
    }
  } catch { /* AccountManager.init displays storage failures without discarding the current app. */ }
  const now = new Date(); statY = now.getFullYear(); statM = now.getMonth() + 1;
  AccountManager.init(bridge).then(success => { initialized = success; if (success) updateStatistics(); });
})(window);
