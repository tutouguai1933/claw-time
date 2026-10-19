/* Retire fish without reindexing saved characters or rewriting focus history. */
(function (global) {
  'use strict';
  function normalize(snapshot, builtInCount = 15) {
    const state = JSON.parse(JSON.stringify(snapshot || {}));
    const retired = new Set([8]);
    const drawings = Array.isArray(state.drawnPets) ? state.drawnPets : [];
    const custom = Array.isArray(state.customPets) ? state.customPets : [];
    drawings.concat(custom).forEach((pet, index) => {
      if (pet && (pet.kind === 'fish' || pet.retired)) {
        pet.retired = true;
        retired.add(builtInCount + index);
      }
    });
    for (const key of ['curPet', 'dressPet']) if (retired.has(state[key])) state[key] = 0;
    if (state.pk && retired.has(state.pk.applied)) state.pk.applied = 0;
    if(state.community?.avatar?.type==='pet'&&retired.has(state.community.avatar.petId))state.community.avatar.petId=0;
    if(state.community?.pk&&retired.has(state.community.pk.mePet))state.community.pk.mePet=0;
    if (Array.isArray(state.homePicks)) state.homePicks = state.homePicks.filter(id => !retired.has(id));
    if (Array.isArray(state.extraUnlock)) state.extraUnlock[2] = 0;
    return state;
  }
  global.RosterMigration = {normalize};
})(window);
