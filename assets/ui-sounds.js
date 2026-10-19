/* Short liquid bubbles, synthesized locally so feedback also works offline. */
(()=>{
 'use strict';
 // Each bubble quickly opens into its resonance; the second nav bubble is lighter.
 const profiles={nav:{duration:.132,pulses:[[0,365,265,.063,.25],[.058,485,270,.06,.19]]},scene:{duration:.092,pulses:[[0,530,310,.073,.22]]},small:{duration:.062,pulses:[[0,450,205,.052,.061]]}};
 let context,lastPlayed=null,restoreTimer=null,restoreVolume=null,lastAt=-Infinity;
 function classify(el){return el?.closest('.tabbar')?'nav':el?.closest('.top-cap .mini-btn')?'scene':'small';}
 function render(kind,ctx){
  const profile=profiles[kind]||profiles.small,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*profile.duration),ctx.sampleRate),data=buffer.getChannelData(0);
  for(const [offset,start,rise,duration,gain] of profile.pulses){
   for(let i=Math.ceil(offset*ctx.sampleRate);i<data.length;i++){const t=i/ctx.sampleRate-offset;if(t>=duration)break;
    // A 9 ms curved rise makes a wet "bloop" without a sustained pitch slide.
    const phase=2*Math.PI*(start*t+rise*(t-.009*(1-Math.exp(-t/.009))));
    const attack=Math.sin(Math.min(1,t/.005)*Math.PI/2)**2,release=Math.sin(Math.min(1,(duration-t)/.018)*Math.PI/2)**2;
    const envelope=attack*Math.exp(-t/.018)*release;
    // A brief soft overtone gives the bubble a little sparkle without a sharp click.
    data[i]+=gain*envelope*(Math.sin(phase)+.18*Math.exp(-t/.014)*Math.sin(2*phase+.15)+.035*Math.exp(-t/.008)*Math.sin(3*phase));
   }
  }return buffer;
 }
 function duckMusic(){
  if(typeof bgmAudio==='undefined'||!musicOn||bgmAudio.paused||bgmAudio.volume<.025)return;
  if(restoreTimer)clearTimeout(restoreTimer);if(restoreVolume===null)restoreVolume=bgmAudio.volume;
  bgmAudio.volume=Math.min(bgmAudio.volume,.14);
  restoreTimer=setTimeout(()=>{if(musicOn&&!bgmAudio.paused&&restoreVolume!==null)bgmAudio.volume=restoreVolume;restoreVolume=null;restoreTimer=null;},250);
 }
 function play(kind='small'){
  if(typeof soundOn==='undefined'||!soundOn)return false;
  const now=performance.now();if(now-lastAt<28)return false;
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;
   context=context||new Audio();if(context.state==='suspended')context.resume().catch(()=>{});
   const source=context.createBufferSource();source.buffer=render(kind,context);source.connect(context.destination);source.start();source.onended=()=>source.disconnect();
   lastAt=now;lastPlayed={kind:profiles[kind]?kind:'small',at:Date.now()};duckMusic();window.Soundscapes?.duck();return true;
  }catch(_){return false;}
 }
 window.UiSounds={play,render,classify,last:()=>lastPlayed&&{...lastPlayed},state:()=>context?.state||'idle'};
})();
