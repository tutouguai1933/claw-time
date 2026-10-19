// Mechanical preparation only; both originals were created with built-in ImageGen.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PNG}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs'));
const root=path.resolve(__dirname,'../assets/companion-art/fish-v2');
const files=[['tank-source.png','tank.png'],['fish-source.png','fish.png']];
const manifest=[];
for(const [input,output] of files){
 const im=PNG.sync.read(fs.readFileSync(path.join(root,input)));let x0=im.width,y0=im.height,x1=0,y1=0;
 for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]>8){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 // Crop transparent margins, preserving the generated alpha and every painted pixel.
 const margin=12,w=x1-x0+1,h=y1-y0+1,out=new PNG({width:w+margin*2,height:h+margin*2});
 PNG.bitblt(im,out,x0,y0,w,h,margin,margin);
 const bytes=PNG.sync.write(out);fs.writeFileSync(path.join(root,output),bytes);
 manifest.push({input,output,width:out.width,height:out.height,sourceBounds:[x0,y0,w,h],sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({generator:'built-in image_gen',assets:manifest},null,2)+'\n');
console.log('Prepared square tank and independent fish, original alpha preserved.');
