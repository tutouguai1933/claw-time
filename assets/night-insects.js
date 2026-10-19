/* Long stereo field: independent insects and irregular choruses, never a timer tone. */
(function(g){
 'use strict';
 function render(ctx,options={}){
  const sr=16000,duration=90,b=ctx.createBuffer(2,sr*duration,sr),left=b.getChannelData(0),right=b.getChannelData(1);
  let seed=(options.seed??Math.floor(Math.random()*4294967295))>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},range=(a,z)=>a+(z-a)*random();
  let windL=0,windR=0;for(let i=0;i<left.length;i++){windL=.994*windL+.006*(random()*2-1);windR=.994*windR+.006*(random()*2-1);left[i]=windL*.025;right[i]=windR*.025;}
  function insect(start,length,pan,gain){
   const frequency=range(1800,4100),bend=range(-120,140),wander=range(-.24,.24);let position=0;
   while(position<length){
    const chirp=range(.028,.105),rest=range(.025,.14),begin=start+position,phase=random()*Math.PI*2;
    for(let j=0;j<chirp*sr;j++){
     const t=j/sr,at=Math.floor(begin*sr)+j;if(at>=left.length)break;
     const event=Math.min(1,position/.4,(length-position)/.65),envelope=Math.sin(Math.PI*t/chirp)**1.7*Math.max(0,event);
     const f=frequency+bend*t/chirp,signal=Math.sin(2*Math.PI*f*t+phase+.28*Math.sin(2*Math.PI*73*t))+.22*Math.sin(2*Math.PI*f*1.98*t+phase);
     const p=Math.max(-.95,Math.min(.95,pan+wander*Math.sin(position*.6))),amplitude=gain*(.6+.4*Math.sin(position*.8+phase)**2)*envelope;
     left[at]+=signal*amplitude*Math.sqrt((1-p)/2);right[at]+=signal*amplitude*Math.sqrt((1+p)/2);
    }
    position+=chirp+rest;
   }
  }
  let cursor=range(.5,1.5),lastPan=random()<.5?-.75:.75;
  while(cursor<duration-2){
   const chorus=random()<.34,count=chorus?Math.floor(range(3,6)):1,length=chorus?range(3.5,7.5):range(.55,2.7);
   for(let voice=0;voice<count;voice++){const pan=chorus?range(-.95,.95):lastPan*range(.65,1.15);insect(cursor+range(0,.5),length*range(.7,1),pan,chorus?range(.015,.031):range(.025,.065));}
   lastPan=-lastPan;cursor+=length+range(1.3,6.8);
  }
  for(let i=0;i<left.length;i++){const t=i/sr,fade=Math.sin(Math.min(1,t/.2,(duration-t)/.3)*Math.PI/2)**2;left[i]=Math.tanh(left[i])*fade;right[i]=Math.tanh(right[i])*fade;}
  return b;
 }
 g.NightInsects={render};
})(globalThis);
