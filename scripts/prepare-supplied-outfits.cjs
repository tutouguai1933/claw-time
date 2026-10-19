// Preserve supplied PNGs byte-for-byte; SVG viewBoxes trim only transparent margins.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PNG}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs'));
const root=path.resolve(__dirname,'..'),dest=path.join(root,'assets/outfits'),input=process.argv[2]||path.join(process.env.USERPROFILE,'Desktop');
const names=[['red-cap','小红帽'],['student-scarf','三好学生围巾'],['umbrella','伞'],['earmuffs','耳暖'],['cape','帅气披风'],['fluffy-scarf','毛绒围巾'],['raincoat','雨衣'],['birthday','今天我生日'],['santa','圣诞帽']];
fs.mkdirSync(path.join(dest,'sources'),{recursive:true});fs.mkdirSync(path.join(dest,'references'),{recursive:true});
const manifest=[];
for(const [id,name] of names){const file=fs.readFileSync(path.join(input,name+'.png')),png=PNG.sync.read(file);let x0=png.width,y0=png.height,x1=0,y1=0;for(let y=0;y<png.height;y++)for(let x=0;x<png.width;x++)if(png.data[(y*png.width+x)*4+3]>8){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const bounds=[Math.max(0,x0-2),Math.max(0,y0-2),Math.min(png.width,x1+3)-Math.max(0,x0-2),Math.min(png.height,y1+3)-Math.max(0,y0-2)];
 fs.writeFileSync(path.join(dest,'sources',name+'.png'),file);
 fs.writeFileSync(path.join(dest,id+'.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+bounds.join(' ')+'" width="'+bounds[2]+'" height="'+bounds[3]+'"><image width="'+png.width+'" height="'+png.height+'" href="data:image/png;base64,'+file.toString('base64')+'"/></svg>\n');
 manifest.push({id,name,source:'sources/'+name+'.png',display:id+'.svg',bounds,sha256:crypto.createHash('sha256').update(file).digest('hex')});
}
for(const [source,target] of [['9b3a927c8b84487bfb91dfa8dc932931.png','birthday-umbrella-cape.png'],['ed9b73cc502b54a551ac044657fc7964.png','santa.png'],['11d8fa8056572e899ebe5675507537fd.jpg','cap-scarves-earmuffs-raincoat.jpg']])fs.copyFileSync(path.join(input,source),path.join(dest,'references',target));
fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log('Prepared '+manifest.length+' supplied outfits; original alpha, white filling and raincoat translucency preserved.');
