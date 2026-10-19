/* Personality-driven feedback. Classic-script globals are resolved only when called. */
(function () {
  'use strict';
  const kinds = ['play', 'cling', 'share', 'bicker', 'sulk', 'reconcile', 'grumble'];
  const expressions = {play: 2, cling: 1, share: 2, bicker: 0, sulk: 1, reconcile: 2, grumble: 0};
  // Keep the prototype's short, direct home dialogue; traits choose different orders.
  const voices = [
    ['汪！','蹭蹭你！','想要零食！','陪我玩！','哼！','❤️','嘿嘿～'],
    ['蹭！','蹭蹭你！','❤️','别戳我！','哼！','嘿嘿～','想吃！'],
    ['摇尾巴~','蹭！','想要零食！','别戳我！','哼！','嘿嘿！','陪我玩！'],
    ['陪我玩！','蹭！','想吃！','别戳我！','哼！','嘿嘿！','汪！'],
    ['嘿嘿！','蹭蹭你！','❤️','别戳我！','哼！','开心！','摇尾巴~'],
    ['想吃！','想要零食！','❤️','别戳我！','哼！','嘿嘿～','开心！']
  ];
  const meetings = ['蹭蹭','抢玩具','一起看窗外','追尾巴','分享零食','打滚','互相闻闻','扑蝴蝶'];
  const reconciliations = ['拉爪和好','拉手和好啦','碰爪和好','碰爪，和好','嗯，和好','吃完和好'];
  const sceneVoices = {
    play: [['追尾巴呀！','一起打滚！'],['轻轻玩呀','我跟着你'],['抓不到我～','藏好玩具啦'],['来比比呀！','这次我先来'],['陪你玩一会','接招，嘿！'],['玩完吃点？','饼干捉迷藏！']],
    bicker: [['玩具轮流嘛','我还没玩够'],['别抢嘛…','轻一点呀'],['嘿，被发现了','这回让给你'],['哼，我先的！','不许抢玩具！'],['哼，幼稚','我才没生气'],['留我一口！','不许抢饭饭！']],
    eat: [['一起开饭啦','分你小饼干'],['你先吃呀','给你一小口'],['藏了点零食','偷偷分给你'],['这口让给你','别抢，慢慢吃'],['顺便分你点','吃饭也要帅'],['开饭开饭！','再来一碗！']],
    reconcile: [['拉爪和好！','还是好朋友'],['拉手和好啦','不生气啦…'],['碰爪和好','下次不偷啦'],['碰爪，和好','哼，好了啦'],['嗯，和好','勉强原谅你'],['吃完和好','分你最后一口']]
  };
  const aliases = {
    cheerful: 0, happy: 0, sunny: 0, '开朗': 0,
    shy: 1, timid: 1, '害羞': 1,
    sneaky: 2, mischievous: 2, '偷偷摸摸': 2,
    grumpy: 3, feisty: 3, angry: 3, '暴躁': 3,
    cool: 4, aloof: 4, '装酷': 4, '装酷耍帅': 4,
    foodie: 5, hungry: 5, '贪吃': 5
  };
  const fallback = {};
  let histories = new WeakMap();
  let epoch = 0;
  const active = new WeakMap();
  const activeViews = new Map();
  const journeys = new Map();
  const emotionLines = new Map();
  const options = {random: Math.random, onSolo: null, onPair: null, onEncounter: null};
  function profile(pet) {
    const named = typeof pet.personality === 'string' ? aliases[pet.personality.toLowerCase()] : undefined;
    return Number.isInteger(named) ? named : Number.isInteger(pet.trait) && pet.trait >= 0 && pet.trait < 6 ? pet.trait : 0;
  }
  function normalize(value) {
    if (typeof value === 'string' && value.trim()) return {kind: 'play', text: value, expression: 2};
    if (!value || typeof value.text !== 'string' || !value.text.trim()) return null;
    return {kind: kinds.includes(value.kind) ? value.kind : 'play', text: value.text,
      expression: [0, 1, 2].includes(value.expression) ? value.expression : 2,
      ...([0, 1, 2].includes(value.otherExpression) ? {otherExpression: value.otherExpression} : {}),
      ...(typeof value.otherText === 'string' ? {otherText: value.otherText} : {}),
      ...(typeof value.motion === 'string' ? {motion: value.motion} : {})};
  }
  function pool(pet, context) {
    const custom = pet.reactions;
    const selected = Array.isArray(custom) ? custom : custom && (custom[context] || custom.default);
    const items = (Array.isArray(selected) ? selected : selected ? [selected] : []).map(normalize).filter(Boolean);
    if (items.length) return items;
    const scene = context.startsWith('pk:') && context.slice(3);
    if (sceneVoices[scene]) return sceneVoices[scene][profile(pet)].map(text => ({
      kind: scene === 'eat' ? 'share' : scene, text, expression: scene === 'bicker' ? 0 : 2, motion: 'hop'
    }));
    if (context === 'arrival' && typeof pet.line === 'string' && pet.line.trim()) {
      const text = Array.from(pet.line.replace(/[「」“”"‘’]/g,'').replace(/（[^）]*）|\([^)]*\)/g,'').trim()).slice(0,12).join('');
      if(text)return [{kind:'cling',text,expression:1,motion:'sway'}];
    }
    return kinds.map((kind, index) => {
      let text = context === 'pair' ? meetings[(index+profile(pet))%meetings.length] : voices[profile(pet)][index];
      if (context === 'pair' && ['bicker', 'sulk', 'grumble'].includes(kind)) text = sceneVoices.bicker[profile(pet)][index % 2];
      if (text === '汪！' && pet.kind && pet.kind !== 'dog') text = pet.kind === 'cat' ? '喵～' : '蹭蹭你！';
      return {kind, text, expression: expressions[kind], motion: kind === 'sulk' ? 'sway' : 'hop'};
    });
  }
  function randomIndex(length) {
    const value = Number(options.random());
    return Math.floor(Math.max(0, Math.min(.999999, Number.isFinite(value) ? value : 0)) * length);
  }
  function choose(pet, context, otherPet) {
    pet = pet && typeof pet === 'object' ? pet : fallback;
    context = typeof context === 'string' ? context : 'touch';
    const choices = pool(pet, context);
    let history = histories.get(pet);
    if (!history) {history = {states: new Map(), last: ''}; histories.set(pet, history);}
    const key = context + (otherPet ? ':pair' : ':solo');
    let state = history.states.get(key);
    const signature = choices.map(item => item.kind + ':' + item.text).join('|');
    if (!state || state.signature !== signature) {state = {remaining: [], signature}; history.states.set(key, state);}
    if (!state.remaining.length) state.remaining = choices.slice();
    let available = state.remaining.filter(item => item.text !== history.last);
    if (!available.length && choices.some(item => item.text !== history.last)) {
      state.remaining = choices.slice();
      available = state.remaining.filter(item => item.text !== history.last);
    }
    if (!available.length) available = state.remaining;
    const picked = available[randomIndex(available.length)];
    state.remaining.splice(state.remaining.indexOf(picked), 1); history.last = picked.text;
    const result = {...picked};
    if (otherPet) {
      const replies = pool(otherPet, context);
      let reply = replies.find(item => item.kind === result.kind) || replies[randomIndex(replies.length)];
      if(reply.text===result.text){const alternatives=replies.filter(item=>item.text!==result.text);if(alternatives.length)reply=alternatives[randomIndex(alternatives.length)];}
      result.otherText = result.otherText || reply.text;
      result.otherExpression = result.otherExpression === undefined ? reply.expression : result.otherExpression;
    }
    return result;
  }
  function resolve(pid) {return typeof getPet === 'function' ? getPet(pid) || fallback : fallback;}
  function live(el) {return el && el.isConnected !== false;}
  function foreground() {return typeof document === 'undefined' || !document.hidden;}
  function speaking(host) {return host.dataset.petMood && host.dataset.petMood !== 'idle';}
  function clearEmotion(host) {
    const effect = emotionLines.get(host);
    if (!effect) return;
    clearTimeout(effect.timer); effect.node.remove(); emotionLines.delete(host);
  }
  function emote(host, kind) {
    clearEmotion(host);
    if (!live(host) || !foreground() || !['bicker', 'sulk', 'grumble'].includes(kind) ||
      typeof document === 'undefined' || !document.createElement) return null;
    const node = document.createElement('span');
    node.className = 'pet-emotion-lines'; node.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) node.append(document.createElement('i'));
    host.append(node);
    const effect = {node, timer: setTimeout(() => clearEmotion(host), 1450)};
    emotionLines.set(host, effect);
    return node;
  }
  function expression(pid, host, value, size) {
    const dressed = host.querySelector('.dressed');
    if (dressed && typeof petDressedExpr === 'function') {
      // Reuse the app's renderer so every saved outfit remains attached.
      const mask=dressed.style.maskImage,clip=dressed.style.clipPath;
      dressed.outerHTML = petDressedExpr(pid, size, false, value);
      const next=host.querySelector('.dressed');if(next){if(mask)next.style.maskImage=mask;if(clip)next.style.clipPath=clip;}
    }
    if (host.dataset) host.dataset.petExpression = String(value);
  }
  function feedback(host, bubble, reaction, pid, size) {
    if (!live(host)) return;
    if (window.PetRoom) window.PetRoom.stopIdle(host);
    const ticket = {};
    active.set(host, ticket);
    activeViews.set(host, bubble);
    expression(pid, host, reaction.expression, size);
    if (bubble) {bubble.textContent = reaction.text; bubble.classList.add('show');}
    host.classList.add('talk');
    if (host.dataset) host.dataset.petMood = reaction.kind;
    emote(host, reaction.kind);
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motion = reaction.motion === 'sway' ? 'pet-motion-sway' : 'pet-motion-hop';
    host.classList.remove('pet-motion-hop'); host.classList.remove('pet-motion-sway');
    if (!reduced) host.classList.add(motion);
    const ownEpoch = epoch;
    setTimeout(() => {
      if (epoch !== ownEpoch || active.get(host) !== ticket) return;
      activeViews.delete(host);
      if (!live(host)) return;
      host.classList.remove('talk'); host.classList.remove(motion);
      if (bubble) bubble.classList.remove('show');
      if (host.dataset) delete host.dataset.petMood;
      if (host.dataset) delete host.dataset.petVoiceSide;
    }, 3400);
    return ticket;
  }
  function solo(pid, host, bubble, context) {
    if (!live(host) || !foreground()) return null;
    if (context === 'idle' && host.dataset && (host.dataset.petEncounter || host.dataset.petIdle)) return null;
    if (host.dataset && !host.dataset.petEncounter) delete host.dataset.petVoiceSide;
    const reaction = choose(resolve(pid), context || 'touch');
    if (!context || context === 'touch') reaction.motion = 'hop';
    feedback(host, bubble || host.querySelector('.cb'), reaction, pid, host.id === 'home-sprite-wrap' ? 110 : 60);
    if (typeof options.onSolo === 'function') options.onSolo(pid, reaction, context || 'touch', host);
    return reaction;
  }
  function pair(a, b, container) {
    if (!foreground() || !a || !b || a === b || !live(a.el) || !live(b.el) || !container ||
      !container.contains(a.el) || !container.contains(b.el)) return null;
    const reaction = choose(resolve(a.dogIdx), 'pair', resolve(b.dogIdx));
    a.el.dataset.petVoiceSide = 'first'; b.el.dataset.petVoiceSide = 'second';
    a.expr = reaction.expression; b.expr = reaction.otherExpression;
    const bubble=c=>c.bubble||c.el.querySelector('.cb'),size=c=>c.el.id==='home-sprite-wrap'?110:60;
    const firstTicket = feedback(a.el, bubble(a), reaction, a.dogIdx, size(a));
    const secondTicket = feedback(b.el, bubble(b), {
      ...reaction, text: reaction.otherText, expression: reaction.otherExpression
    }, b.dogIdx, size(b));
    // Little disagreements always receive a gentle reconciliation, scoped to this scene.
    if (['bicker', 'sulk', 'grumble'].includes(reaction.kind)) {
      const ownEpoch = epoch;
      setTimeout(() => {
        if (epoch !== ownEpoch || !foreground() || !live(a.el) || !live(b.el) || !container.contains(a.el) ||
          !container.contains(b.el) || active.get(a.el) !== firstTicket || active.get(b.el) !== secondTicket) return;
        const replyA = {kind: 'reconcile', text: reconciliations[profile(resolve(a.dogIdx))], expression: 2, motion: 'hop'};
        const replyB = {...replyA, text: reconciliations[profile(resolve(b.dogIdx))]};
        a.expr = 2; b.expr = 2;
        feedback(a.el, bubble(a), replyA, a.dogIdx, size(a));
        feedback(b.el, bubble(b), replyB, b.dogIdx, size(b));
      }, 2300);
    }
    if (typeof options.onPair === 'function') options.onPair(a, b, reaction);
    return reaction;
  }
  function encounter(a, b, container) {
    if (!foreground() || !a || !b || a === b || !live(a.el) || !live(b.el) || !container ||
      !container.contains(a.el) || !container.contains(b.el) || journeys.has(a.el) || journeys.has(b.el) || speaking(a.el) || speaking(b.el)) return null;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return pair(a, b, container);
    const ownEpoch = epoch;
    // Move a little toward a shared point; keep each pet in its own part of the room.
    const nudge = (from, to, limit) => from + Math.max(-limit, Math.min(limit, (to - from) * .3));
    const destinations = [
      {x: nudge(a.home.x, b.home.x, 12), y: nudge(a.home.y, b.home.y, 6)},
      {x: nudge(b.home.x, a.home.x, 12), y: nudge(b.home.y, a.home.y, 6)}
    ];
    const session = {a, b, destinations};
    const valid = () => epoch === ownEpoch && live(a.el) && live(b.el) && container.contains(a.el) &&
      container.contains(b.el) && journeys.get(a.el) === session && journeys.get(b.el) === session;
    const goTo = (c, x, y) => {
      // The original artwork stays visible most of the time, in either direction.
      c.el.dataset.petFacing = randomIndex(100) < 38 ? 'left' : 'right';
      c.el.dataset.petWalking = 'true';
      c.el.style.transition = 'left 2s ease-in-out, top 2s ease-in-out';
      c.el.style.transform = 'translate(0,0)';
      c.el.style.left = x + '%'; c.el.style.top = y + '%';
    };
    [a, b].forEach(c => {
      if(window.PetRoom)window.PetRoom.stopIdle(c.el);
      journeys.set(c.el, session); c.el.dataset.petEncounter = 'true';
    });
    goTo(a, destinations[0].x, destinations[0].y);
    goTo(b, destinations[1].x, destinations[1].y);
    setTimeout(() => {
      if (!valid()) return;
      [a, b].forEach(c => {delete c.el.dataset.petWalking;});
      pair(a, b, container);
    }, 2050);
    setTimeout(() => {
      if (!valid()) return;
      goTo(a, a.home.x, a.home.y); goTo(b, b.home.x, b.home.y);
    }, 4450);
    setTimeout(() => {
      if (!valid()) return;
      [a, b].forEach(c => {
        journeys.delete(c.el); delete c.el.dataset.petEncounter; delete c.el.dataset.petWalking;
        delete c.el.dataset.petFacing; c.el.style.transition = '';
      });
    }, 6500);
    // Integrations can animate nearby toys while guarding their delayed work with isCurrent().
    session.isCurrent = valid;
    if (typeof options.onEncounter === 'function') options.onEncounter(a, b, session);
    return session;
  }
  function group(actors, container, plan) {
    if (!foreground() || !container || !plan || actors.length < 2 || actors.some(c => !c || !live(c.el) || !container.contains(c.el) || journeys.has(c.el) || speaking(c.el))) return null;
    const ownEpoch = epoch, reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const starts=actors.map((c,i)=>c.stationary?0:i*680+randomIndex(200));
    const speeds=actors.map((_,i)=>1+i*.09);
    let finish;
    const session = {a: actors[0], b: actors[1], actors, routes: plan.routes, destinations: plan.destinations,worldDestinations:plan.worldDestinations,
      arrivalMs: reduced ? 0 : Math.max(...actors.map((c,i)=>c.stationary?0:starts[i]+plan.travelMs*speeds[i])), toyId: plan.toyId, finished: new Promise(resolve => {finish = resolve;})};
    session.cancel = () => finish(false);
    const valid = session.isCurrent = () => ownEpoch === epoch && actors.every(c => live(c.el) && container.contains(c.el) && journeys.get(c.el) === session);
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    actors.forEach(c => {if(window.PetRoom)window.PetRoom.stopIdle(c.el);journeys.set(c.el, session); c.el.dataset.petEncounter = 'true';});
    function clean() {
      actors.forEach(c => {journeys.delete(c.el); ['petEncounter','petWalking','petFacing','petRoomPhase','petToy'].forEach(k => delete c.el.dataset[k]); c.el.style.transition = '';});
    }
    async function travel(routes, phase) {
      await Promise.all(actors.map(async(c,i)=>{
        if(c.stationary)return;
        c.el.dataset.petRoomPhase='waiting';await delay(starts[i]);if(!valid())return;
        c.el.dataset.petRoomPhase=phase;c.el.dataset.petWalking='true';c.el.dataset.petFacing=randomIndex(100)<38?'left':'right';c.el.style.transform='translate(0,0)';
        c.el.style.setProperty('--pet-step-period',[.48,.61,.54][i%3]+'s');
        const duration=plan.travelMs*speeds[i]/routes[i].length;
        for(const at of routes[i]){if(!valid())return;c.el.style.transition='left '+duration+'ms ease-in-out, top '+duration+'ms ease-in-out';c.el.style.left=at.x+'%';c.el.style.top=at.y+'%';await delay(duration);}
        if(valid())delete c.el.dataset.petWalking;
      }));
      return valid();
    }
    (async () => {
      if (!reduced && !await travel(plan.routes, 'outbound')) return;
      if (!valid()) return;
      actors.forEach(c => {c.el.dataset.petRoomPhase = 'meeting';});
      pair(actors[0], actors[1], container);
      if (actors[2]) {
        const c = actors[2];let reaction = choose(resolve(c.dogIdx), 'pair', resolve(actors[0].dogIdx));
        const spoken=actors.slice(0,2).map(a=>a.el.querySelector('.cb').textContent);
        if(spoken.includes(reaction.text)){const alternatives=pool(resolve(c.dogIdx),'pair').filter(item=>!spoken.includes(item.text));if(alternatives.length)reaction={...alternatives[randomIndex(alternatives.length)]};}
        c.el.dataset.petVoiceSide = 'third'; feedback(c.el,c.el.querySelector('.cb'),reaction,c.dogIdx,60);
      }
      if (typeof plan.onMeet === 'function') plan.onMeet(session);
      await delay(plan.stayMs || 3600);
      if (!valid()) return;
      if (!reduced) {
        const back = plan.routes.map((route,i) => [...route.slice(0,-1).reverse(), {...actors[i].home}]);
        if (!await travel(back,'returning')) return;
      }
      if (!valid()) return;
      clean(); finish(true);
    })().finally(() => {
      actors.forEach(c => {if (journeys.get(c.el) === session) journeys.delete(c.el);});
      finish(false);
    });
    if (typeof options.onEncounter === 'function') options.onEncounter(actors[0],actors[1],session);
    return session;
  }
  window.PetInteractions = {
    choose, solo, pair, encounter, group, emote,
    configure(settings) {
      if (!settings) return;
      ['random', 'onSolo', 'onPair', 'onEncounter'].forEach(key => {if (Object.prototype.hasOwnProperty.call(settings, key)) options[key] = settings[key];});
      if (typeof options.random !== 'function') options.random = Math.random;
    },
    // Call when switching profiles; pending timers cannot affect the next account.
    reset() {
      epoch++; histories = new WeakMap();
      emotionLines.forEach((_, host) => clearEmotion(host));
      if (window.PetRoom) PetRoom.reset();
      journeys.forEach(session => {
        if (session.cancel) session.cancel();
        (session.actors || [session.a, session.b]).forEach(c => {
          if (!live(c.el)) return;
          if(!c.stationary){c.el.style.transition = 'none';c.el.style.left = c.home.x + '%'; c.el.style.top = c.home.y + '%';}
          ['petEncounter', 'petWalking', 'petFacing', 'petRoomPhase', 'petToy'].forEach(key => {delete c.el.dataset[key];});
        });
      });
      journeys.clear();
      activeViews.forEach((bubble, host) => {
        if (!live(host)) return;
        ['talk', 'pet-motion-hop', 'pet-motion-sway'].forEach(name => host.classList.remove(name));
        if (host.dataset) delete host.dataset.petMood;
        if (host.dataset) delete host.dataset.petVoiceSide;
        if (bubble) {bubble.textContent = ''; bubble.classList.remove('show');}
      });
      activeViews.clear();
    }
  };
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', () => {
    if (document.hidden) emotionLines.forEach((_, host) => clearEmotion(host));
  });
})();
