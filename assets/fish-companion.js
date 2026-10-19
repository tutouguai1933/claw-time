/* The aquarium stays still; only its resident and the resident's outfits swim. */
(()=>{
 'use strict';
 const art='assets/companion-art/fish-v2/';
 const escape=s=>String(s||'金鱼').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function renderBase(size,name='金鱼'){
  return '<span class="fish-tank" style="width:'+size+'px;height:'+size+'px" role="img" aria-label="'+escape(name)+'在方形鱼缸里游泳"><img class="fish-tank-glass" src="'+art+'tank.png" alt="" draggable="false"><span class="fish-water"><span class="fish-swimmer"><span class="fish-facing"><img class="fish-resident" src="'+art+'fish.png" alt="'+escape(name)+'" draggable="false"><span class="fish-outfits" style="width:'+size+'px;height:'+size+'px"></span></span></span></span></span>';
 }
 function withOutfits(base,lay,size){return base.replace('<span class="fish-outfits" style="width:'+size+'px;height:'+size+'px"></span>','<span class="fish-outfits" style="width:'+size+'px;height:'+size+'px">'+lay+'</span>');}
 window.FishTank={renderBase,withOutfits};
})();
