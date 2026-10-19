/* 显示层去底色：只移除与图像边缘连通的中性色，保留线稿内部的白色。
 * 原素材存放在 art-sources.js，预处理使用浏览器原生 Canvas，无网络依赖。
 */
const preparedArt = {};
function renderCutout(source, {lineArt=false}={}) {
 return new Promise((resolve,reject)=>{
  const image=new Image();image.onload=()=>{
   const canvas=document.createElement('canvas');
   const scale=Math.min(1,900/Math.max(image.width,image.height));
   const w=canvas.width=Math.round(image.width*scale),h=canvas.height=Math.round(image.height*scale);
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,w,h);
   const pixels=ctx.getImageData(0,0,w,h),data=pixels.data;
   const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
   const neutral=i=>{const p=i*4;return data[p+3]<20||(Math.min(data[p],data[p+1],data[p+2])>(lineArt?205:165)&&Math.max(data[p],data[p+1],data[p+2])-Math.min(data[p],data[p+1],data[p+2])<(lineArt?26:32));};
   const add=i=>{if(!seen[i]&&neutral(i)){seen[i]=1;queue[tail++]=i;}};
   for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
   while(head<tail){const i=queue[head++],x=i%w;data[i*4+3]=0;if(x>0)add(i-1);if(x<w-1)add(i+1);if(i>=w)add(i-w);if(i<w*(h-1))add(i+w);}
   // 部分原素材把轮廓内部的白色也抠成了透明。只恢复被轮廓包围的区域。
   if(lineArt)for(let i=0;i<w*h;i++)if(!seen[i]&&data[i*4+3]<20){const p=i*4;data[p]=data[p+1]=data[p+2]=data[p+3]=255;}
   // 去除与主体分离的细小边缘碎片，包含原图角落的生成标记。
   const visited=new Uint8Array(w*h);const components=[];
   for(let i=0;i<w*h;i++){
    if(visited[i]||data[i*4+3]<20)continue;
    head=0;tail=0;queue[tail++]=i;visited[i]=1;const part=[];
    while(head<tail){const n=queue[head++];part.push(n);const x=n%w;for(const k of [x>0?n-1:-1,x<w-1?n+1:-1,n>=w?n-w:-1,n<w*(h-1)?n+w:-1])if(k>=0&&!visited[k]&&data[k*4+3]>=20){visited[k]=1;queue[tail++]=k;}}
    components.push(part);
   }
   const largest=Math.max(0,...components.map(c=>c.length));
   components.forEach(c=>{if(c.length<largest*.035)c.forEach(i=>data[i*4+3]=0);});
   let left=w,top=h,right=0,bottom=0;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>20){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
   ctx.putImageData(pixels,0,0);
   if(right<left){resolve(source);return;}
   const result=document.createElement('canvas');result.width=right-left+5;result.height=bottom-top+5;
   result.getContext('2d').drawImage(canvas,left,top,right-left+1,bottom-top+1,2,2,right-left+1,bottom-top+1);
   resolve(result.toDataURL('image/png'));
  };image.onerror=()=>reject(new Error('素材无法读取'));image.src=source;
 });
}
const artReady=Promise.all(Object.entries(ART_SOURCES).map(async([key,source])=>{
 preparedArt[key]=await renderCutout(source,{lineArt:key==='beard'||key==='bib'});
}));
