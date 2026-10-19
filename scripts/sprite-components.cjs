// Find complete alpha-connected figures; generated sheets do not have exact grid gutters.
function figures(png,columns,rows){
 const seen=new Uint8Array(png.width*png.height),parts=[];
 for(let start=0;start<seen.length;start++){
  if(seen[start]||png.data[start*4+3]<=8)continue;
  const queue=[start];seen[start]=1;let l=png.width,t=png.height,r=0,b=0;
  for(let i=0;i<queue.length;i++){
   const n=queue[i],x=n%png.width,y=Math.floor(n/png.width);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
   for(const next of [x?n-1:-1,x<png.width-1?n+1:-1,y?n-png.width:-1,y<png.height-1?n+png.width:-1])if(next>=0&&!seen[next]&&png.data[next*4+3]>8){seen[next]=1;queue.push(next);}
  }
  if(queue.length>5000)parts.push({bounds:[l,t,r-l+1,b-t+1],pixels:queue.length,indices:new Set(queue)});
 }
 if(parts.length!==columns*rows)throw Error('Expected '+columns*rows+' complete figures; found '+parts.length);
 parts.sort((a,b)=>a.bounds[1]-b.bounds[1]);const result=[];
 for(let row=0;row<rows;row++)result.push(...parts.slice(row*columns,(row+1)*columns).sort((a,b)=>a.bounds[0]-b.bounds[0]));
 return result;
}
module.exports={figures};
