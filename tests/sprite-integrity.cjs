const assert=require('node:assert/strict');
module.exports=function cleanFigure(p,label){
 const seen=new Uint8Array(p.width*p.height),components=[];
 for(let z=0;z<seen.length;z++){
  if(seen[z]||p.data[z*4+3]<=8)continue;const queue=[z];seen[z]=1;
  for(let i=0;i<queue.length;i++){const n=queue[i],x=n%p.width,y=Math.floor(n/p.width);for(const next of [x?n-1:-1,x<p.width-1?n+1:-1,y?n-p.width:-1,y<p.height-1?n+p.width:-1])if(next>=0&&!seen[next]&&p.data[next*4+3]>8){seen[next]=1;queue.push(next);}}
  if(queue.length>=20)components.push(queue.length);
 }
 assert.equal(components.length,1,label+': no detached pieces of neighbouring sprites');
};
