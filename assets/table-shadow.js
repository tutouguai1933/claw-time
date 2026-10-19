/* A tabletop projection of the selected companion-at-the-table identity. */
(function (global) {
  'use strict';
  if (global.TableShadow) return;
  const ns = 'http://www.w3.org/2000/svg';
  // World coordinates follow the untouched 1344 × 2912 table illustration.
  const tabletop = 'M0 1494 Q672 1378 1344 1512 L1344 2415 Q672 2570 0 2415 Z';
  const shapes = [
    // Broad round heads and tiny soft shoulders keep the projected identities chibi.
    'M620 2306 C546 2293 494 2243 492 2168 C486 2106 516 2058 556 2039 Q540 2012 568 2008 L611 2024 Q622 1982 651 2009 L674 2029 C765 2009 841 2068 842 2159 C847 2241 797 2292 717 2306 L716 2324 Q794 2335 815 2402 L875 2630 L460 2630 L520 2402 Q541 2335 620 2324 Z',
    // A rounded short bob ends beside the cheeks; the narrow neck stays clear below it.
    'M641 2320 C613 2320 586 2305 574 2286 Q562 2308 537 2301 C510 2296 493 2277 491 2249 L488 2176 C482 2075 553 1998 669 1998 C785 1998 856 2075 850 2176 L847 2249 C845 2277 826 2296 801 2301 Q776 2308 764 2286 C751 2305 725 2320 695 2320 L695 2343 Q765 2348 787 2413 L835 2630 L501 2630 L549 2413 Q570 2348 641 2343 Z',
    'M617 2307 C533 2287 481 2224 492 2149 C501 2078 570 2037 669 2037 C766 2037 835 2078 845 2149 C856 2224 801 2287 718 2307 L718 2326 Q797 2339 816 2406 L870 2630 L464 2630 L520 2406 Q539 2339 617 2326 Z M552 2076 Q544 2028 526 2014 C492 2029 473 1987 498 1970 Q529 1949 544 1988 Q574 2017 575 2060 Z M760 2062 Q766 2017 793 1988 Q808 1950 837 1970 C863 1989 841 2030 809 2014 Q790 2030 784 2079 Z',
    'M616 2311 C530 2298 483 2246 492 2169 L491 1986 Q493 1969 509 1982 L589 2046 Q669 2024 747 2046 L824 1982 Q843 1967 844 1988 L844 2169 C851 2246 801 2298 719 2311 L719 2329 Q795 2340 812 2405 L868 2630 L467 2630 L523 2405 Q540 2340 616 2329 Z',
    'M615 2310 Q549 2303 516 2266 C504 2301 466 2304 451 2271 Q434 2228 464 2128 C476 2085 497 2058 534 2073 C571 2029 620 2011 669 2011 C719 2011 770 2031 802 2073 C839 2058 861 2085 873 2128 Q904 2228 886 2271 C871 2304 833 2301 821 2266 Q787 2303 721 2310 L721 2329 Q796 2341 813 2406 L868 2630 L466 2630 L522 2406 Q540 2341 615 2329 Z',
    'M616 2312 C536 2295 490 2242 494 2167 C442 2148 440 2099 467 2072 C496 2044 535 2055 551 2081 Q599 2043 669 2043 Q738 2043 785 2081 C804 2054 842 2044 870 2072 C896 2102 894 2149 843 2167 C848 2242 802 2295 719 2312 L719 2330 Q795 2342 812 2408 L869 2630 L466 2630 L522 2408 Q539 2342 616 2330 Z'
  ];
  function normalized(index) {return Number.isInteger(index) && index >= 0 && index < shapes.length ? index : 0;}
  function render() {
    const world = document.getElementById('focus-world');
    if (!world) return null;
    const index = normalized(typeof curShadow === 'number' ? curShadow : 0);
    let layer = world.querySelector('#table-shadow');
    if (!layer) {
      layer = document.createElementNS(ns, 'svg');
      layer.id = 'table-shadow';
      layer.classList.add('table-shadow');
      layer.setAttribute('viewBox', '0 0 1344 2912');
      layer.setAttribute('aria-hidden', 'true');
      layer.setAttribute('focusable', 'false');
      layer.innerHTML = '<defs><clipPath id="table-shadow-surface" clipPathUnits="userSpaceOnUse"><path d="' + tabletop + '"></path></clipPath><filter id="table-shadow-soften" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="8"></feGaussianBlur></filter></defs><g clip-path="url(#table-shadow-surface)"><g filter="url(#table-shadow-soften)" fill="#8b7764"><path class="table-shadow-shape"></path></g></g>';
      const background = world.querySelector('.table-bg');
      if (background) background.after(layer); else world.prepend(layer);
    }
    layer.dataset.shadow = String(index);
    layer.dataset.shadowName = typeof SHADOWS !== 'undefined' ? SHADOWS[index] : String(index);
    layer.querySelector('.table-shadow-shape').setAttribute('d', shapes[index]);
    return layer;
  }
  function bindChoices() {
    const row = document.getElementById('avatar-row');
    if (!row) return;
    [...row.children].slice(0, shapes.length).forEach((button, index) => {
      // These six basic identities are choices, independent of earned outfits and roles.
      button.classList.remove('locked');
      button.classList.toggle('active', index === curShadow);
      button.dataset.shadow = String(index);
      button.setAttribute('role', 'button');
      button.setAttribute('tabindex', '0');
      button.setAttribute('aria-label', '选择' + SHADOWS[index] + '影子');
      button.setAttribute('aria-pressed', String(index === curShadow));
      // Preview the same silhouette as the table, with one shared framing and color.
      const icon = document.createElementNS(ns, 'svg');
      icon.setAttribute('viewBox', '430 1950 480 700');
      icon.setAttribute('width', '40'); icon.setAttribute('height', '40');
      icon.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', shapes[index]); path.setAttribute('fill', '#7A6A5A');
      icon.append(path); button.querySelector('svg')?.replaceWith(icon);
      button.onclick = () => select(index);
      button.onkeydown = event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault(); select(index);
      };
    });
  }
  function select(index) {
    if (!Number.isInteger(index) || index < 0 || index >= shapes.length) return false;
    curShadow = index;
    if (typeof global.renderMine === 'function') global.renderMine(); else {bindChoices(); render();}
    if (global.AppProfileBridge) global.AppProfileBridge.persist();
    return true;
  }
  global.TableShadow = {render, select};
  const originalMine = global.renderMine;
  if (typeof originalMine === 'function') {
    global.renderMine = function () {
      const result = originalMine.apply(this, arguments);
      bindChoices(); render(); return result;
    };
  }
  const originalFocusPet = global.renderFocusPet;
  if (typeof originalFocusPet === 'function') {
    global.renderFocusPet = function () {
      const result = originalFocusPet.apply(this, arguments);
      render(); return result;
    };
  }
  // Account snapshot restoration calls both wrapped renderers after restoring curShadow.
  bindChoices(); render();
})(window);
