const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..');
const migrationPath = path.join(root, 'assets/roster-migration.js');

function testMigration() {
  assert.ok(fs.existsSync(migrationPath), 'retired fish snapshots need a reusable migration boundary');
  const context = {window: {}};
  vm.runInNewContext(fs.readFileSync(migrationPath, 'utf8'), context);
  const normalize = snapshot => JSON.parse(JSON.stringify(context.window.RosterMigration.normalize(snapshot)));
  const old = {
    petRosterVersion: 2, curPet: 8, dressPet: 17, homePicks: [0,8,9,14,15,16,17,18],
    extraUnlock: [1,1,1,1,1,1,1,1,1], drawnPets: [{name:'画作',kind:'drawn'}],
    customPets: [{name:'旧猫',kind:'cat'}, {name:'旧鱼',kind:'fish',custom:true}, {name:'旧狗',kind:'dog'}],
    petOutfits: {8:['今天我生日'],17:['雨衣'],18:['小红帽']}, outfitColors: {8:{birthday:'pink'}},
    focusRecords: [{petId:8,minutes:7},{petId:17,minutes:9},{petId:18,minutes:3}],
    todayTasks: [{name:'继续学习',done:false}], coins: 365, roleAff: [42], pk: {applied:17,state:1,myMinutes:7}
  };
  const snapshot = JSON.stringify(old), migrated = normalize(old);
  assert.equal(migrated.curPet, 0);
  assert.equal(migrated.dressPet, 0);
  assert.deepEqual(migrated.pk, {applied:0,state:1,myMinutes:7});
  assert.deepEqual(migrated.homePicks, [0,9,14,15,16,18], 'stable cat/drawing/custom IDs survive fish retirement');
  assert.equal(migrated.extraUnlock[2], 0);
  assert.equal(migrated.customPets[1].retired, true);
  for (const key of ['focusRecords','petOutfits','outfitColors','todayTasks','coins','roleAff'])
    assert.deepEqual(migrated[key], old[key], key + ' history must survive');
  assert.equal(JSON.stringify(old), snapshot, 'migration does not mutate its input backup');
  assert.deepEqual(normalize(migrated), migrated, 'repeated snapshot restore is safe');
  assert.equal(normalize({...old,curPet:14,dressPet:18,homePicks:null,pk:{applied:15}}).curPet, 14);
  assert.equal(normalize({...old,curPet:14,dressPet:18,homePicks:null,pk:{applied:15}}).dressPet, 18);
  assert.equal(normalize({...old,homePicks:null}).homePicks, null);
  console.log('PASS retired fish migration: stable IDs, safe selections, retained history, immutable backup and idempotence');
}

async function testBrowser() {
  const {chromium} = require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
  const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}}), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(root,'current_project.html')).href,{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>AccountManager.ready);
    const catalogNames=await page.evaluate(()=>[getPet(9).name,getPet(14).name]);
    const restored = await page.evaluate(()=>{
      const state = AppProfileBridge.createDefaultState();
      state.curPet=8;state.dressPet=8;state.pk.applied=8;state.homeFixed=true;state.homePicks=[0,8,9,14,15,16,17];
      state.drawnPets=[{name:'历史画作',kind:'drawn',trait:0,breed:'画作',dataURL:ART_SOURCES.beard}];
      state.customPets=[{name:'历史鱼',kind:'fish',custom:true,color:'#f0b45a',face:0,acc:0,trait:0,breed:'捏脸宠物'},
        {name:'历史猫',kind:'cat',custom:true,color:'#fff',face:0,acc:0,trait:0,breed:'捏脸宠物'}];
      state.extraUnlock[2]=1;state.petOutfits={8:['今天我生日'],16:['雨衣'],17:['小红帽']};
      state.outfitColors={8:{birthday:'pink'}};state.coins=456;
      state.focusRecords=[{petId:8,minutes:7,completedAt:new Date().toISOString(),taskName:'旧鱼专注'},
        {petId:16,minutes:9,completedAt:new Date().toISOString(),taskName:'旧捏脸专注'}];
      AppProfileBridge.setState(state);AppProfileBridge.persist();
      return AppProfileBridge.getState();
    });
    assert.equal(restored.curPet,0);assert.equal(restored.dressPet,0);assert.equal(restored.pk.applied,0);
    assert.deepEqual(restored.homePicks,[0,9,14,15,17]);assert.equal(restored.extraUnlock[2],0);
    assert.deepEqual(restored.focusRecords.map(record=>record.petId),[8,16]);
    assert.deepEqual(restored.petOutfits,{8:['今天我生日'],16:['雨衣'],17:['小红帽']});
    assert.deepEqual(restored.outfitColors,{8:{birthday:'pink'}});assert.equal(restored.coins,456);
    assert.equal(await page.evaluate(()=>getPet(8)==null&&!petUnlocked(8)&&getPet(16)==null&&!petUnlocked(16)),true);
    assert.deepEqual(await page.evaluate(()=>[getPet(9).name,getPet(14).name,getPet(15).name,getPet(17).name]),[...catalogNames,'历史画作','历史猫']);
    await page.evaluate(()=>{go('home');renderRoles();renderPetPick();openOverview();});
    assert.equal(await page.locator('.fish-tank,.fish-resident,.balcony-companion').count(),0);
    assert.equal(await page.locator('[data-pet-id="8"],[data-pet-id="16"]').count(),0);
    assert.equal(await page.locator('#pet-pick .pp').count(),await page.evaluate(()=>allPets().reduce((n,_,i)=>n+(getPet(i)?1:0),0)),'retired companions leave no locked placeholder in the wardrobe');
    await page.reload({waitUntil:'domcontentloaded'});await page.evaluate(()=>AccountManager.ready);
    const persisted=await page.evaluate(()=>AppProfileBridge.getState());
    assert.equal(persisted.curPet,0);assert.equal(persisted.extraUnlock[2],0);
    assert.deepEqual(persisted.focusRecords,restored.focusRecords);
    assert.deepEqual(persisted.customPets,restored.customPets);
    assert.equal(await page.evaluate(async()=>(await AccountManager.register('历史甲','history-a-123')).username),'历史甲');
    assert.equal(await page.evaluate(async()=>(await AccountManager.register('历史乙','history-b-123')).username),'历史乙');
    assert.deepEqual(await page.evaluate(()=>AppProfileBridge.getState().focusRecords),[],'another account starts with its own history');
    assert.equal(await page.evaluate(async()=>(await AccountManager.login('历史甲','history-a-123')).username),'历史甲');
    const account=await page.evaluate(()=>AppProfileBridge.getState());
    assert.deepEqual(account.focusRecords,restored.focusRecords,'account switching preserves both retired fish records');
    assert.deepEqual(account.petOutfits,restored.petOutfits);
    assert.deepEqual(account.customPets,restored.customPets);
    assert.equal(account.coins,456);
    await page.evaluate(()=>AccountManager.showHistory());
    assert.equal(await page.locator('.account-record').count(),2,'retired fish records remain readable');
    assert.ok((await page.locator('.account-dialog').textContent()).includes('旧鱼专注'));
    await page.locator('.account-dialog [aria-label="关闭"]').click();
    const direct=await page.evaluate(()=>{
      curPet=8;dressPet=16;appliedPK=8;homePicks=[0,8,16,17];EXTRA_UNLOCK[2]=1;
      const state=AppProfileBridge.getState();AppProfileBridge.setState(state);return state;
    });
    assert.equal(direct.curPet,0);assert.equal(direct.dressPet,0);assert.equal(direct.pk.applied,0);
    assert.deepEqual(direct.homePicks,[0,17]);assert.equal(direct.extraUnlock[2],0,'serializing direct old selections cannot reactivate fish');
    const legacy=await page.evaluate(()=>{
      const state=AppProfileBridge.createDefaultState();delete state.petRosterVersion;
      state.extraUnlock=[1,1,1];state.curPet=10;state.dressPet=11;state.pk.applied=9;state.homePicks=[0,8,9,10,11];
      state.drawnPets=[{name:'旧版画作',kind:'drawn',trait:0,breed:'画作',dataURL:ART_SOURCES.beard}];
      state.customPets=[{name:'旧版鱼',kind:'fish',custom:true,color:'#f0b45a',face:0,acc:0,trait:0,breed:'捏脸宠物'},
        {name:'旧版猫',kind:'cat',custom:true,color:'#fff',face:0,acc:0,trait:0,breed:'捏脸宠物'}];
      state.focusRecords=[{petId:8,minutes:3},{petId:10,minutes:4},{petId:11,minutes:5}];
      AppProfileBridge.setState(state);const saved=AppProfileBridge.getState();
      return {cur:saved.curPet,dress:saved.dressPet,pk:saved.pk.applied,picks:saved.homePicks,history:saved.focusRecords.map(r=>r.petId),
        drawing:getPet(15).name,cat:getPet(17).name,retired:saved.customPets[0].retired};
    });
    assert.deepEqual(legacy,{cur:0,dress:17,pk:15,picks:[0,15,17],history:[8,16,17],drawing:'旧版画作',cat:'旧版猫',retired:true},
      'existing pre-cat migration runs once before fish retirement and preserves the original character references');
    assert.deepEqual(errors,[]);
    console.log('PASS retired fish application restore, reload and account switching: no fish UI, stable remaining characters and preserved focus history');
  } finally { await browser.close(); }
}

(async()=>{testMigration();if(!process.argv.includes('--unit'))await testBrowser();})().catch(error=>{console.error(error);process.exitCode=1;});
