/* Minimal PNG-backed Canvas adapter for rendering the real creator SVG in Node/sharp.
 * This never edits production assets and does not launch a browser. */
const {PNG}=require(require('node:path').join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs'));
class Canvas{
 constructor(){this.width=1;this.height=1;this.data=null;}
 getContext(){const owner=this;return {
  createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),
  drawImage(img,_x,_y,w,h){const source=img.pixels,out=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=Math.max(0,Math.min(source.width-1,(x+.5)*source.width/w-.5)),sy=Math.max(0,Math.min(source.height-1,(y+.5)*source.height/h-.5)),xx=Math.floor(sx),yy=Math.floor(sy),fx=sx-xx,fy=sy-yy;let a=0,r=0,g=0,b=0;for(const[u,v,k]of[[xx,yy,(1-fx)*(1-fy)],[Math.min(source.width-1,xx+1),yy,fx*(1-fy)],[xx,Math.min(source.height-1,yy+1),(1-fx)*fy],[Math.min(source.width-1,xx+1),Math.min(source.height-1,yy+1),fx*fy]]){const i=(v*source.width+u)*4,z=source.data[i+3]/255*k;a+=z;r+=source.data[i]*z;g+=source.data[i+1]*z;b+=source.data[i+2]*z;}out.set([a?r/a:0,a?g/a:0,a?b/a:0,a*255],(y*w+x)*4);}owner.data=out;},
  getImageData:()=>({width:owner.width,height:owner.height,data:new Uint8ClampedArray(owner.data)}),
  putImageData(pixels){owner.data=new Uint8ClampedArray(pixels.data);}
 };}
 toDataURL(){return 'data:image/png;base64,'+PNG.sync.write({width:this.width,height:this.height,data:Buffer.from(this.data)}).toString('base64');}
}
class Image{set src(url){this.pixels=PNG.sync.read(Buffer.from(url.split(',')[1],'base64'));queueMicrotask(()=>this.onload());}}
module.exports={Image,document:{createElement:()=>new Canvas(),querySelectorAll:()=>[]}};
