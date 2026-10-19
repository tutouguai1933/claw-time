const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../assets/ui-sounds.js'),'utf8'),sandbox);
const sampleRate=48000,ctx={sampleRate,createBuffer:(_,length)=>{const data=new Float32Array(length);return {duration:length/sampleRate,getChannelData:()=>data};}};
function measure(kind){
 const buffer=sandbox.window.UiSounds.render(kind,ctx),data=buffer.getChannelData(0);
 let energy=0,mean=0,peak=0,lateEnergy=0,maxStep=0;
 for(let i=0;i<data.length;i++){const value=data[i];energy+=value*value;mean+=value;peak=Math.max(peak,Math.abs(value));if(i/sampleRate>.14)lateEnergy+=value*value;if(i)maxStep=Math.max(maxStep,Math.abs(value-data[i-1]));}
 const crossings=[];for(let i=1;i<data.length;i++)if(data[i-1]<0&&data[i]>=0&&i/sampleRate<.04)crossings.push(i/sampleRate);
 const pitchAt=index=>1/(crossings[index+1]-crossings[index]);
 const energyBetween=(start,end)=>data.slice(start*sampleRate,end*sampleRate).reduce((total,value)=>total+value*value,0);
 // Inspect the first bubble through a Hann window, excluding the nav's second attack.
 let spectralEnergy=0,brightEnergy=0;
 for(let frequency=100;frequency<=4000;frequency+=25){let real=0,imaginary=0;for(let i=0;i<1920;i++){const sample=(data[i]||0)*Math.sin(Math.PI*i/1919)**2,phase=2*Math.PI*frequency*i/sampleRate;real+=sample*Math.cos(phase);imaginary+=sample*Math.sin(phase);}const power=real*real+imaginary*imaginary;spectralEnergy+=power;if(frequency>=1000)brightEnergy+=power;}
 return {duration:buffer.duration,rms:Math.sqrt(energy/data.length),mean:mean/data.length,peak,maxStep,lateEnergyFraction:lateEnergy/energy,pitch:(crossings.length-1)/(crossings.at(-1)-crossings[0]),pitchRise:pitchAt(crossings.length-2)/pitchAt(0),brightness:brightEnergy/spectralEnergy,secondBubbleEnergy:energyBetween(.06,.09),gapEnergy:energyBetween(.033,.053),start:data[0],end:data.at(-1)};
}
const nav=measure('nav'),scene=measure('scene'),small=measure('small');
assert.ok(nav.duration<=.15,'navigation bubbles finish within 150 ms, avoiding the old long sliding whistle');
assert.ok(scene.duration<=.11,'scene feedback is a quick liquid pop');
assert.ok(nav.lateEnergyFraction<.001,'navigation has no audible lingering tail');
assert.ok(nav.pitch>=570&&nav.pitch<=700,'navigation resonance is a little clearer while staying rounded');
assert.ok(scene.pitch>=760&&scene.pitch<=900,'scene resonance gains a little clarity');
assert.ok(nav.brightness>.0015&&scene.brightness>.0015,'a quiet brief upper harmonic adds clarity to the bubbles');
assert.ok(nav.brightness<.05&&scene.brightness<.05,'upper harmonics remain subtle rather than piercing');
assert.ok(scene.pitch>nav.pitch*1.15,'scene bubble has a clearly different pitch');
assert.ok(nav.pitchRise>1.08&&scene.pitchRise>1.08,'bubbles briefly rise into resonance instead of making the old descending laser slide');
assert.ok(nav.secondBubbleEnergy>nav.gapEnergy*2,'navigation has two separate bouncy bubble attacks');
assert.ok(nav.rms>small.rms*2&&scene.rms>small.rms*1.5,'secondary controls stay quieter');
for(const [kind,stats] of Object.entries({nav,scene,small})){
 assert.ok(stats.peak>.01&&stats.peak<.5,`${kind} has useful headroom`);
 assert.ok(Math.abs(stats.mean)<.001,`${kind} has no audible DC offset`);
 assert.ok(stats.maxStep<.035,`${kind} has no sharp sample edges`);
 assert.ok(Math.abs(stats.start)<.0001&&Math.abs(stats.end)<.0001,`${kind} starts and ends softly`);
}
console.log('PASS short warm bubble waveforms, distinct scene pitch, quiet secondary controls, smooth edges and headroom',JSON.stringify({nav,scene,small}));
