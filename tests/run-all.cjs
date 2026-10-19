const {spawnSync}=require('node:child_process');
const path=require('node:path');
const suites=['review-regression','task-meal-followup','scene-portrait-nav','account-store','account-multitab','profile-integration','pet-personality','pet-interaction-browser','pet-walking-browser','house-editor','original-scene-fidelity','table-shadow','room-decor','drawn-expression','pet-room','room-lighting','drawn-home','quiet-room','focus-night-followup','ui-sounds','clean-scene-assets','bubble-audio','cushion-refine','cute-controls','new-outfits','cat-art','cat-roster','wardrobe-commerce','weather-prototype','pet-idle-cadence','partner-portraits','cat-face-colors','fish-tank','cat-identity-browser','creation-simplified','retired-fish','profile-gift-shop','window-scene-repair'];
suites.push('weather-time-swap','companion-progress','community-browser','pet-pk','soundscapes');
suites.push('night-insects','earned-rewards','wardrobe-all-partners','reptile-art','approved-cats');
suites.push('cat-outfit-fit','outfit-adjuster','outfit-adjuster-browser','breed-creator','breed-expression-browser','breed-packed-frames','pet-emotion-lines','pet-pk-cadence','pet-automatic-scenes','house-support','pet-support-placement','furniture-support-browser');
suites.push('breed-pose-integrity','breed-highlights');
for(const suite of suites){
 console.log('\nRUN '+suite);
 const run=spawnSync(process.execPath,[path.join(__dirname,suite+'.cjs')],{stdio:'inherit',timeout:120000,windowsHide:true});
 if(run.error||run.status!==0){console.error(run.error||suite+' failed');process.exit(run.status||1);}
}
console.log('\nRESULT all '+suites.length+' suites passed');
