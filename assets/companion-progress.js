/* Serializable account identity and earned progress; no browser storage or DOM. */
(function(g){
 'use strict';
 const titles=['初见伙伴','百时同桌','暖心饭搭子','默契小分队','晨昏相伴','半千知己','专注守望者','时光收藏家','长情旅伴','相伴如初','千时挚友'].map((name,i)=>({id:'hours-'+i*100,name,hours:i*100}));
 const rewards=[{id:'day-2',days:2,pets:[1],label:'伙伴·奶糖'},{id:'day-3',days:3,pets:[5,11],label:'伙伴·饭团、煤球'},{id:'day-5',days:5,pets:[13],label:'伙伴·布丁'},{id:'day-7',days:7,outfits:['三好学生围巾'],label:'三好学生围巾'},{id:'day-14',days:14,outfits:['毛绒围巾'],label:'毛绒围巾'},{id:'day-30',days:30,outfits:['小红帽','耳暖'],label:'小红帽、耳暖装扮'}];
 function validDate(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00');return !Number.isNaN(+d)&&dayKey(d)===s;}
 function dayKey(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
 function normalize(value,legacy=[]){
  const v=value&&typeof value==='object'?value:{},days=v.version===1?v.checkinDays:legacy,a=v.avatar||{};
  const avatar=a.type==='image'&&typeof a.data==='string'&&a.data.length<240000&&/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(a.data)?{type:'image',data:a.data}:{type:'pet',petId:Number.isInteger(a.petId)&&a.petId>=0?a.petId:0};
  return {version:1,avatar,rewardClaims:[...new Set((Array.isArray(v.rewardClaims)?v.rewardClaims:[]).filter(x=>typeof x==='string'&&x.length<48))],decorOwned:[...new Set((Array.isArray(v.decorOwned)?v.decorOwned:[]).filter(x=>['玩具鼠','彩虹挂画'].includes(x)))],audio:{sceneOn:v.audio?.sceneOn!==false,sceneVolume:Number.isFinite(v.audio?.sceneVolume)?Math.max(0,Math.min(.3,v.audio.sceneVolume)):.12,focusTrack:['none','piano','rain','library','grass','night'].includes(v.audio?.focusTrack)?v.audio.focusTrack:'piano',focusVolume:Number.isFinite(v.audio?.focusVolume)?Math.max(0,Math.min(.4,v.audio.focusVolume)):.22},checkinDays:[...new Set((Array.isArray(days)?days:[]).filter(validDate))].sort(),claimed:[...new Set((Array.isArray(v.claimed)?v.claimed:[]).filter(id=>rewards.some(r=>r.id===id)))],titleId:titles.some(t=>t.id===v.titleId)?v.titleId:null,pk:v.pk&&typeof v.pk==='object'?{day:validDate(v.pk.day)?v.pk.day:null,mePet:Number.isInteger(v.pk.mePet)?v.pk.mePet:0}:null};
 }
 function sign(state,day=dayKey()){const days=state.checkinDays;if(!validDate(day)||days.includes(day)||days.some(d=>d>day))return {ok:false,days:days.length};days.push(day);days.sort();return {ok:true,days:days.length};}
 const due=s=>rewards.filter(r=>r.days<=s.checkinDays.length&&!s.claimed.includes(r.id));
 const earned=h=>titles.filter(t=>t.hours<=Math.max(0,Number(h)||0));
 g.CompanionProgress={titles,rewards,normalize,sign,due,earned,dayKey};
})(globalThis);
