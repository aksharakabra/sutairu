(function () {
  var D = window.CATALOG, IM = window.IMGS || {};
  var $ = function (s) { return document.querySelector(s); };
  var HEX = {black:'#1C1213',charcoal:'#46484e',grey:'#8c8c91',white:'#f0f0f0',cream:'#eee4d0',beige:'#d2bea0',camel:'#b08050',brown:'#64422d',burgundy:'#6e1428',red:'#be232d',blush:'#e8b9b5',pink:'#e278a0',orange:'#dc7832',mustard:'#cda532',olive:'#696e3c',sage:'#8fa68a',green:'#327846',teal:'#286e73',sky:'#96bee1',denim:'#466496',navy:'#19234b',lavender:'#aa96c8',purple:'#643278'};

  // Seeded shuffle so the feed feels mixed, but is the same every visit.
  var seed = 7, items = D.slice();
  function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
  for (var i = items.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = items[i]; items[i] = items[j]; items[j] = t; }

  var BUD = window.BUDGET || {}, PR = window.PRODUCTS || {};
  function tok(s) { return s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); }
  items.forEach(function (c) { c._t = tok([c.title, c.category, c.mood, c.season, c.styleFor === 'any' ? 'unisex' : c.styleFor, c.tags.join(' '), c.colours.join(' '), BUD[c.id] || ''].join(' ')); });
  var SYN = { cosy: 'cozy', gray: 'grey', maroon: 'burgundy', tan: 'camel', womens: 'women', mens: 'men', girls: 'women', boys: 'men' };
  function words(q) { return tok(q).map(function (w) { return SYN[w] || w; }); }
  function hit(c, w) {
    var s = w.length > 3 && w.slice(-1) === 's' ? w.slice(0, -1) : null;
    return c._t.some(function (t) { return t.indexOf(w) === 0 || (s && t.indexOf(s) === 0); });
  }
  function score(c, ws) {
    var t = c.title.toLowerCase(), g = c.tags.join(' ').toLowerCase();
    return ws.reduce(function (n, w) { return n + 1 + (t.indexOf(w) > -1 ? 3 : 0) + (g.indexOf(w) > -1 ? 2 : 0); }, 0);
  }
  var STORES = [
    ['Meesho', function (q) { return 'https://www.meesho.com/search?q=' + encodeURIComponent(q); }],
    ['Amazon', function (q) { return 'https://www.amazon.in/s?k=' + encodeURIComponent(q); }],
    ['Flipkart', function (q) { return 'https://www.flipkart.com/search?q=' + encodeURIComponent(q); }],
    ['Myntra', function (q) { return 'https://www.myntra.com/' + encodeURIComponent(q.trim().toLowerCase().replace(/\s+/g, '-')); }]
  ];
  var GARMENT = /\b(?:coat|overcoat|blazer|waistcoat|vest|tie|shirt|tee|t-shirt|trousers|pants|jeans|shorts|skirt|knit|sweater|sweatshirt|cardigan|jacket|shacket|hoodie|polo|turtleneck|henley|top|dress|boots|sneakers|heels|loafers|flats|bag|tote|backpack|cap|hat|beanie|scarf|belt|gloves|sunglasses|cargo|co-ord|tank|crop)s?\b/i;
  function shopBox(c) {
    var mine = (PR[c.id] || []).filter(function (p) { return /^https?:\/\//i.test(p.url || ''); }).map(function (p) {
      return '<a class="piece" href="' + Store.esc(p.url) + '" target="_blank" rel="noopener noreferrer"><span>' + Store.esc(p.name) + '</span><span class="hand">' + Store.esc((p.price || '') + (p.price && p.store ? ' at ' : '') + (p.store || '')) + '</span></a>';
    }).join('');
    var who = c.styleFor === 'any' ? '' : c.styleFor + ' ';
    var ps = c.tags.filter(function (t) { return GARMENT.test(t); }).slice(0, 4); if (!ps.length) ps = [c.title];
    var rows = ps.map(function (t) {
      var links = STORES.map(function (s) { return '<a class="chip chip--sm" href="' + s[1](who + t) + '" target="_blank" rel="noopener noreferrer">' + s[0] + '</a>'; }).join('');
      return '<div class="piece"><span>' + Store.esc(t) + '</span><span class="chips">' + links + '</span></div>';
    }).join('');
    return '<details class="shopbox"><summary class="btn btn--ghost">Shop this look</summary>' + (mine ? '<p class="hand">Picked for this look</p>' + mine : '') +
      '<p class="hand">Find similar pieces</p>' + rows + '<p class="fine">Each link opens that store’s own search in a new tab. Prices and stock are theirs.</p></details>';
  }

  // Holds are saved in this browser. Cluster 4 moves them to real accounts.
  var holds = [];
  try { holds = JSON.parse(localStorage.getItem('sutairu-holds') || '[]'); } catch (e) {}
  var user = null, closets = [], target = null, all = [];
  var st = { rack: 'All', mood: '', who: '', clean: false, q: '', col: '', bud: '' }, cur = [], idx = 0;

  function save() { try { localStorage.setItem('sutairu-holds', JSON.stringify(holds)); } catch (e) {} }
  function has(id) { return user ? all.some(function (x) { return x.closet_id === target && x.look_id === id; }) : holds.indexOf(id) > -1; }
  function count() { if (!user) return holds.length; var s = {}; all.forEach(function (x) { s[x.look_id] = 1; }); return Object.keys(s).length; }
  function src(c, k) { return IM[c.id] || 'images/' + c[k]; }
  function alt(c) { return c.title + ', ' + c.tags.slice(0, 3).join(', '); }
  function label(on) { return on ? 'On hold for you' : 'Put it on hold'; }

  var HANGER = '<svg class="hanger" viewBox="0 0 56 30" aria-hidden="true"><path d="M28 2a4 4 0 1 1 4 4l-4 4L2 28h52L28 10" fill="none" stroke="#A67C52" stroke-width="2.5" stroke-linejoin="round"/></svg>';

  function card(c) {
    var on = has(c.id);
    return '<article class="look">' + HANGER +
      '<figure><button class="open" data-id="' + c.id + '" aria-label="Open ' + c.title + '"><img src="' + src(c, 'thumb') + '" width="' + c.width + '" height="' + c.height + '" alt="' + alt(c) + '" loading="lazy" decoding="async"></button></figure>' +
      '<div class="tag"><h3>' + c.title + '</h3><span class="hand">' + c.mood + '</span><button class="hold" data-hold="' + c.id + '" aria-pressed="' + on + '">' + label(on) + '</button></div></article>';
  }

  function render() {
    var ws = words(st.q);
    cur = items.filter(function (c) {
      return (st.rack === 'All' || c.category === st.rack) && (!st.mood || c.mood === st.mood) &&
        (!st.who || c.styleFor === st.who || c.styleFor === 'any') &&
        (!st.col || c.colours.indexOf(st.col) > -1) && (!st.bud || BUD[c.id] === st.bud) &&
        !(st.clean && (c.sourceType === 'Screenshot' || c.sourceType === 'Collage')) &&
        ws.every(function (w) { return hit(c, w); });
    });
    if (ws.length) cur.sort(function (a, b) { return score(b, ws) - score(a, ws); });
    $('#feed').innerHTML = cur.map(card).join('');
    $('#count').textContent = cur.length + (cur.length === 1 ? ' look' : ' looks');
    $('#empty').hidden = cur.length > 0;
  }

  function ui() {
    $('#holds').textContent = '♡ ' + count() + ' on hold';
    document.querySelectorAll('[data-hold]').forEach(function (b) {
      var on = has(b.dataset.hold); b.setAttribute('aria-pressed', on); b.textContent = label(on);
    });
  }
  async function toggle(id) {
    try {
      if (user) {
        if (has(id)) { await Store.unhold(target, id); all = all.filter(function (x) { return !(x.closet_id === target && x.look_id === id); }); }
        else { await Store.hold(target, id); all.push({ closet_id: target, look_id: id }); }
      } else { var k = holds.indexOf(id); if (k > -1) holds.splice(k, 1); else holds.push(id); save(); }
    } catch (e) { alert('Tangled thread. That didn’t save, try again?'); }
    ui();
  }

  var dlg = $('#dlg');
  function show(i) {
    if (!cur.length) return;
    idx = (i + cur.length) % cur.length;
    var c = cur[idx], on = has(c.id);
    var more = cur.filter(function (x) { return x.category === c.category && x.id !== c.id; }).slice(0, 4);
    var chips = [c.mood, c.season].concat(c.tags.slice(0, 5)).map(function (x) { return '<button class="chip chip--sm" data-q="' + Store.esc(x) + '" title="Search for ' + Store.esc(x) + '">' + x + '</button>'; }).join('');
    var dots = c.colours.map(function (n) { return '<i style="background:' + HEX[n] + '" title="' + n + '"></i>'; }).join('');
    dlg.innerHTML = '<div class="stitch modal-in"><button class="icon-btn x" data-close aria-label="Close">×</button>' +
      '<div class="polaroid"><img src="' + src(c, 'full') + '" width="' + c.width + '" height="' + c.height + '" alt="' + alt(c) + '"><span>' + c.title + '</span></div>' +
      '<div class="det"><p class="hand">' + c.category + '</p><h2 id="dt">' + c.title + '</h2>' +
      '<div class="chips">' + chips + '</div>' +
      '<div class="row" style="align-items:center"><span class="hand">Colours</span><span class="dots">' + dots + '</span></div>' +
      (BUD[c.id] ? '<p class="hand">Budget: ' + Store.esc(BUD[c.id]) + '</p>' : '') + (c.sourceType === 'Screenshot' ? '<p class="hand">This is a screenshot of someone else’s post. It’s a placeholder until it’s replaced.</p>' : '') +
      '<div class="row"><button class="btn" data-hold="' + c.id + '" aria-pressed="' + on + '">' + label(on) + '</button>' +
      '<a class="btn btn--ghost" href="fitting-room.html?add=' + c.id + '">Try in the fitting room</a></div>' + shopBox(c) +
      (more.length ? '<div><p class="hand">More from this rack</p><div class="more">' + more.map(function (x) { return '<button data-go="' + x.id + '" aria-label="' + x.title + '"><img src="' + src(x, 'thumb') + '" alt=""></button>'; }).join('') + '</div></div>' : '') +
      '<div class="row"><button class="btn btn--ghost" data-step="-1">‹ Previous</button><button class="btn btn--ghost" data-step="1">Next ›</button></div>' +
      '<button class="linklike" data-report="cat:' + c.id + '" data-t="' + Store.esc(c.title) + '">Report this look</button></div></div>';
    if (!dlg.open) dlg.showModal();
  }
  function indexOf(id) { return cur.findIndex(function (c) { return c.id === id; }); }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.report) Report.open(b.dataset.report, b.dataset.t);
    else if (b.dataset.hold) toggle(b.dataset.hold);
    else if (b.classList.contains('open')) show(indexOf(b.dataset.id));
    else if (b.dataset.go) show(indexOf(b.dataset.go));
    else if (b.dataset.step) show(idx + Number(b.dataset.step));
    else if (b.hasAttribute('data-close')) dlg.close();
    else if (b.dataset.q !== undefined) { st.q = b.dataset.q; $('#q').value = st.q; if (dlg.open) dlg.close(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else if (b.dataset.col) {
      st.col = st.col === b.dataset.col ? '' : b.dataset.col;
      document.querySelectorAll('.dot').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.col === st.col); });
      render();
    } else if (b.id === 'reset') {
      st = { rack: 'All', mood: '', who: '', clean: false, q: '', col: '', bud: '' };
      ['#q', '#mood', '#who', '#bud'].forEach(function (s) { $(s).value = ''; });
      $('#clean').setAttribute('aria-pressed', false);
      document.querySelectorAll('[data-rack]').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.rack === 'All'); });
      document.querySelectorAll('.dot').forEach(function (x) { x.setAttribute('aria-pressed', false); });
      render();
    } else if (b.dataset.rack) {
      st.rack = b.dataset.rack;
      document.querySelectorAll('[data-rack]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      render();
    } else if (b.id === 'clean') { st.clean = !st.clean; b.setAttribute('aria-pressed', st.clean); render(); }
  });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  document.addEventListener('keydown', function (e) {
    if (!dlg.open) return;
    if (e.key === 'ArrowRight') show(idx + 1);
    if (e.key === 'ArrowLeft') show(idx - 1);
  });

  var moods = []; D.forEach(function (c) { if (moods.indexOf(c.mood) < 0) moods.push(c.mood); }); moods.sort();
  $('#mood').innerHTML += moods.map(function (m) { return '<option value="' + m + '">' + m.charAt(0).toUpperCase() + m.slice(1) + '</option>'; }).join('');
  $('#mood').onchange = function () { st.mood = this.value; render(); };
  $('#who').onchange = function () { st.who = this.value; render(); };
  var tm; $('#q').oninput = function () { var v = this.value; clearTimeout(tm); tm = setTimeout(function () { st.q = v; render(); }, 120); };
  var cc = {}; D.forEach(function (c) { c.colours.forEach(function (n) { cc[n] = (cc[n] || 0) + 1; }); });
  $('#dots').innerHTML = Object.keys(cc).sort(function (a, b) { return cc[b] - cc[a]; }).slice(0, 12).map(function (n) { return '<button class="dot" data-col="' + n + '" aria-pressed="false" aria-label="' + n + '" title="' + n + '" style="background:' + HEX[n] + '"></button>'; }).join('');
  var ORDER = ['Under ₹1000', '₹1000 to ₹2000', 'Splurge (₹2000+)'], bands = ORDER.filter(function (b) { return Object.keys(BUD).some(function (k) { return BUD[k] === b; }); });
  if (bands.length) { $('#bud').hidden = false; $('#bud').innerHTML += bands.map(function (b) { return '<option>' + b + '</option>'; }).join(''); }
  $('#bud').onchange = function () { st.bud = this.value; render(); };

  function pick() {
    $('#cl').hidden = false;
    $('#closet').innerHTML = closets.map(function (c) { return '<option value="' + c.id + '"' + (c.id === target ? ' selected' : '') + '>' + Store.esc(c.name) + '</option>'; }).join('') + '<option value="__new">＋ New closet…</option>';
  }
  $('#closet').onchange = async function () {
    if (this.value === '__new') {
      var n = (prompt('Name your new closet') || '').trim();
      if (n) { var c = await Store.createCloset(n); closets.push(c); target = c.id; }
      pick();
    } else target = this.value;
    render(); ui();
  };

  render(); ui();
  Store.user().then(function (u) {
    if (!u) return;
    user = u; var me = $('#me'); me.textContent = 'Wardrobe'; me.href = 'wardrobe.html';
    return Promise.all([Store.closets(), Store.holds()]).then(function (r) {
      closets = r[0]; all = r[1]; target = closets[0].id; pick(); render(); ui();
    });
  }).catch(function (e) { console.error(e); });
})();
