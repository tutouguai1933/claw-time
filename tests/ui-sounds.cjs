const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve(__dirname,'../current_project.html')).href,{waitUntil:'domcontentloaded'});await p.evaluate(()=>AccountManager.ready);
 assert.equal(await p.evaluate(()=>typeof window.UiSounds?.play),'function','button feedback audio is implemented');
 const audio=await p.evaluate(()=>{const ctx=new OfflineAudioContext(1,44100,44100),summary={};for(const kind of ['nav','scene','small']){const b=UiSounds.render(kind,ctx),d=b.getChannelData(0);summary[kind]={rms:Math.sqrt(d.reduce((n,v)=>n+v*v,0)/d.length),length:d.length,peak:Math.max(...d.map(Math.abs)),start:d[0],end:d[d.length-1]};}return summary;});
 assert.notEqual(audio.nav.length,audio.scene.length);assert.ok(audio.nav.rms>audio.small.rms*2);assert.ok(audio.scene.rms>audio.small.rms*1.5);Object.values(audio).forEach(a=>{assert.ok(a.peak<1&&a.peak>.01);assert.ok(Math.abs(a.start)<.001&&Math.abs(a.end)<.001);});
 await p.locator('.tab').first().click();assert.equal(await p.evaluate(()=>UiSounds.last()?.kind),'nav');
 await p.locator('.top-cap.left .mini-btn').first().click();assert.equal(await p.evaluate(()=>UiSounds.last()?.kind),'scene');
 await p.locator('.side-dock .sd-btn').last().click();assert.equal(await p.evaluate(()=>UiSounds.last()?.kind),'small');
 const disabled=await p.evaluate(()=>{toggleSound(false);const before=UiSounds.last().at;playBoop();return {played:UiSounds.play('nav'),same:UiSounds.last().at===before};});assert.equal(disabled.played,false);assert.equal(disabled.same,true);
 await p.evaluate(()=>{toggleSound(true);musicOn=true;bgmAudio.volume=.25;});
 const wav=Buffer.alloc(44+44100*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(44100,24);wav.writeUInt32LE(88200,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(88200,40);for(let i=0;i<44100;i++)wav.writeInt16LE(Math.sin(i/44100*Math.PI*2*180)*1800,44+i*2);
 await p.evaluate(source=>{bgmAudio.src=source;bgmAudio.loop=true;document.querySelectorAll('.sheet-mask.show').forEach(e=>e.classList.remove('show'));},'data:audio/wav;base64,'+wav.toString('base64'));
 await p.locator('.tab').first().click();await p.waitForTimeout(450);await p.evaluate(()=>{clearInterval(bgmFade);bgmAudio.volume=.25;});
 await p.locator('.top-cap.left .mini-btn').nth(1).click();
 const mixed=await p.evaluate(()=>({paused:bgmAudio.paused,volume:bgmAudio.volume,kind:UiSounds.last().kind,state:UiSounds.state()}));assert.equal(mixed.paused,false);assert.equal(mixed.kind,'scene');assert.equal(mixed.state,'running');assert.ok(mixed.volume>0&&mixed.volume<.25,'music stays audible with a short space for feedback');
 await p.waitForTimeout(350);assert.equal(await p.evaluate(()=>bgmAudio.volume),.25,'music restores its previous volume');
 for(const kind of ['nav','scene','small']){
  const withMusic=await p.evaluate(kind=>{clearInterval(bgmFade);bgmAudio.volume=.25;return {played:UiSounds.play(kind),paused:bgmAudio.paused,volume:bgmAudio.volume,last:UiSounds.last().kind};},kind);
  assert.equal(withMusic.played,true,`${kind} feedback plays over active music`);assert.equal(withMusic.paused,false);assert.equal(withMusic.last,kind);assert.equal(withMusic.volume,.14,'music is gently ducked');
  await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>bgmAudio.volume),.25,`${kind} restores the music volume`);
 }
 await p.evaluate(()=>toggleSound(false));
 for(const kind of ['nav','scene','small'])assert.equal(await p.evaluate(kind=>UiSounds.play(kind),kind),false,`${kind} respects disabled audio`);
 assert.deepEqual(errors,[]);console.log('PASS button audio: distinct rounded nav/scene pops, quieter small controls, live music mix/recovery, sound preference, no clipping');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
