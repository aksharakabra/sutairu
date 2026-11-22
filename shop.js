(function () {
  var D = window.CATALOG, IM = window.IMGS || {};
  var $ = function (s) { return document.querySelector(s); };
  var HEX = {black:'#1C1213',charcoal:'#46484e',grey:'#8c8c91',white:'#f0f0f0',cream:'#eee4d0',beige:'#d2bea0',camel:'#b08050',brown:'#64422d',burgundy:'#6e1428',red:'#be232d',blush:'#e8b9b5',pink:'#e278a0',orange:'#dc7832',mustard:'#cda532',olive:'#696e3c',sage:'#8fa68a',green:'#327846',teal:'#286e73',sky:'#96bee1',denim:'#466496',navy:'#19234b',lavender:'#aa96c8',purple:'#643278'};

  // Seeded shuffle so the feed feels mixed, but is the same every visit.
  var seed = 7, items = D.slice();
  function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
  for (var i = items.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = items[i]; items[i] = items[j]; items[j] = t; }

  // Holds are saved in this browser. Cluster 4 moves them to real accounts.
  var holds = [];
  try { holds = JSON.parse(localStorage.getItem('sutairu-holds') || '[]'); } catch (e) {}
  var user = null, closets = [], target = null, all = [];
  var st = { rack: 'All', mood: '', who: '', clean: false }, cur = [], idx = 0;

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
    cur = items.filter(function (c) {
      return (st.rack === 'All' || c.category === st.rack) && (!st.mood || c.mood === st.mood) &&
        (!st.who || c.styleFor === st.who || c.styleFor === 'any') &&
        !(st.clean && (c.sourceType === 'Screenshot' || c.sourceType === 'Collage'));
    });
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
    var chips = [c.mood, c.season].concat(c.tags.slice(0, 5)).map(function (x) { return '<span class="chip chip--static">' + x + '</span>'; }).join('');
    var dots = c.colours.map(function (n) { return '<i style="background:' + HEX[n] + '" title="' + n + '"></i>'; }).join('');
    dlg.innerHTML = '<div class="stitch modal-in"><button class="icon-btn x" data-close aria-label="Close">×</button>' +
      '<div class="polaroid"><img src="' + src(c, 'full') + '" width="' + c.width + '" height="' + c.height + '" alt="' + alt(c) + '"><span>' + c.title + '</span></div>' +
      '<div class="det"><p class="hand">' + c.category + '</p><h2 id="dt">' + c.title + '</h2>' +
      '<div class="chips">' + chips + '</div>' +
      '<div class="row" style="align-items:center"><span class="hand">Colours</span><span class="dots">' + dots + '</span></div>' +
      (c.sourceType === 'Screenshot' ? '<p class="hand">This is a screenshot of someone else’s post. It’s a placeholder until it’s replaced.</p>' : '') +
      '<div class="row"><button class="btn" data-hold="' + c.id + '" aria-pressed="' + on + '">' + label(on) + '</button>' +
      '<button class="btn btn--ghost" disabled title="Coming soon">Fitting room</button><button class="btn btn--ghost" disabled title="Coming soon">Shop this look</button></div>' +
      (more.length ? '<div><p class="hand">More from this rack</p><div class="more">' + more.map(function (x) { return '<button data-go="' + x.id + '" aria-label="' + x.title + '"><img src="' + src(x, 'thumb') + '" alt=""></button>'; }).join('') + '</div></div>' : '') +
      '<div class="row"><button class="btn btn--ghost" data-step="-1">‹ Previous</button><button class="btn btn--ghost" data-step="1">Next ›</button></div></div></div>';
    if (!dlg.open) dlg.showModal();
  }
  function indexOf(id) { return cur.findIndex(function (c) { return c.id === id; }); }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.hold) toggle(b.dataset.hold);
    else if (b.classList.contains('open')) show(indexOf(b.dataset.id));
    else if (b.dataset.go) show(indexOf(b.dataset.go));
    else if (b.dataset.step) show(idx + Number(b.dataset.step));
    else if (b.hasAttribute('data-close')) dlg.close();
    else if (b.dataset.rack) {
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
