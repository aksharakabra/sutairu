(function () {
  var $ = function (s) { return document.querySelector(s); };
  var D = window.CATALOG, IM = window.IMGS || {}, byId = {}, MAX = 12;
  D.forEach(function (c) { byId[c.id] = c; });
  function src(c, k) { return c.url || IM[c.id] || 'images/' + c[k]; }
  function rid() { return Math.random().toString(36).slice(2, 9); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function say(m) { $('#msg').textContent = m; }

  var board = $('#board'), items = [], els = {}, sel = null, drag = null, oid = null, user = null, saved = [];
  function find(u) { return items.filter(function (i) { return i.u === u; })[0]; }

  /* ---- the mirror ---- */
  var selui = document.createElement('div'); selui.className = 'selui'; selui.hidden = true;
  selui.innerHTML = '<button class="h del" aria-label="Remove selected look">×</button><button class="h tw" tabindex="-1" aria-label="Twist and stretch">↻</button>';
  board.appendChild(selui);
  function ui() {
    var it = find(sel), e = it && els[it.u];
    if (!e) { selui.hidden = true; return; }
    selui.hidden = false; selui.style.left = e.style.left; selui.style.top = e.style.top; selui.style.width = e.style.width;
    selui.style.height = e.offsetHeight + 'px'; selui.style.transform = e.style.transform; selui.style.zIndex = 999;
  }
  function place(it) {
    var e = els[it.u]; if (!e) return;
    e.style.left = it.x * 100 + '%'; e.style.top = it.y * 100 + '%'; e.style.width = it.w * 100 + '%';
    e.style.transform = 'translate(-50%,-50%) rotate(' + it.r + 'deg)';
    e.style.zIndex = items.indexOf(it) + 1; e.classList.toggle('sel', it.u === sel); if (it.u === sel) ui();
  }
  function sync() {
    Object.keys(els).forEach(function (u) { if (!find(u)) { els[u].remove(); delete els[u]; } });
    items.forEach(function (it) {
      if (els[it.u]) return;
      var c = byId[it.id], e = document.createElement('div');
      e.className = 'it'; e.tabIndex = 0; e.dataset.u = it.u; e.setAttribute('role', 'group'); e.setAttribute('aria-label', c.title);
      e.innerHTML = '<img draggable="false" src="' + src(c, 'full') + '" width="' + c.width + '" height="' + c.height + '" alt="' + Store.esc(c.title) + '">';
      board.appendChild(e); els[it.u] = e;
    });
    items.forEach(place); ui(); $('#hint').hidden = items.length > 0;
  }
  function select(u) { sel = u; items.forEach(place); ui(); }
  function front(it) { items.splice(items.indexOf(it), 1); items.push(it); items.forEach(place); }
  function back(it) { items.splice(items.indexOf(it), 1); items.unshift(it); items.forEach(place); }
  function remove(it) { items.splice(items.indexOf(it), 1); if (sel === it.u) sel = null; sync(); }
  function add(id, x, y) {
    if (!byId[id]) return;
    if (items.length >= MAX) { say('The mirror is full. Remove a look to make room.'); return; }
    var it = { u: rid(), id: id, x: x != null ? clamp(x, .1, .9) : .5 + (Math.random() - .5) * .2, y: y != null ? clamp(y, .1, .9) : .5 + (Math.random() - .5) * .2, w: .42, r: Math.round((Math.random() - .5) * 10) };
    items.push(it); sel = it.u; sync(); say(byId[id].title + ' is on the mirror.');
  }

  board.addEventListener('pointerdown', function (e) {
    var t = e.target, el = t.closest('.it'), onUi = t.closest('.selui');
    var it = onUi ? find(sel) : el ? find(el.dataset.u) : null;
    if (!it) { select(null); return; }
    if (t.closest('.del')) return;
    select(it.u); if (!onUi) { front(it); els[it.u].focus({ preventScroll: true }); }
    var r = board.getBoundingClientRect();
    if (t.closest('.tw')) {
      var cx = r.left + it.x * r.width, cy = r.top + it.y * r.height;
      drag = { m: 'tw', it: it, cx: cx, cy: cy, a0: Math.atan2(e.clientY - cy, e.clientX - cx), d0: Math.hypot(e.clientX - cx, e.clientY - cy) || 1, r0: it.r, w0: it.w };
    } else drag = { m: 'mv', it: it, sx: e.clientX, sy: e.clientY, x0: it.x, y0: it.y };
    board.setPointerCapture(e.pointerId); e.preventDefault();
  });
  board.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var r = board.getBoundingClientRect(), it = drag.it;
    if (drag.m === 'mv') { it.x = clamp(drag.x0 + (e.clientX - drag.sx) / r.width, 0, 1); it.y = clamp(drag.y0 + (e.clientY - drag.sy) / r.height, 0, 1); }
    else {
      var a = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx), d = Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy);
      it.w = clamp(drag.w0 * d / drag.d0, .12, 1.3); it.r = drag.r0 + (a - drag.a0) * 180 / Math.PI;
    }
    place(it);
  });
  ['pointerup', 'pointercancel'].forEach(function (t) { board.addEventListener(t, function () { drag = null; }); });
  board.addEventListener('click', function (e) { if (e.target.closest('.del') && find(sel)) remove(find(sel)); });
  board.addEventListener('focusin', function (e) { var el = e.target.closest('.it'); if (el && e.target === el) select(el.dataset.u); });
  board.addEventListener('keydown', function (e) {
    var el = e.target.closest('.it'); if (!el || e.target !== el) return;
    var it = find(el.dataset.u), s = e.shiftKey ? .04 : .01, k = e.key, h = true;
    if (k === 'ArrowLeft') it.x = clamp(it.x - s, 0, 1); else if (k === 'ArrowRight') it.x = clamp(it.x + s, 0, 1);
    else if (k === 'ArrowUp') it.y = clamp(it.y - s, 0, 1); else if (k === 'ArrowDown') it.y = clamp(it.y + s, 0, 1);
    else if (k === '+' || k === '=') it.w = clamp(it.w * 1.05, .12, 1.3); else if (k === '-') it.w = clamp(it.w / 1.05, .12, 1.3);
    else if (k === '[') it.r -= 5; else if (k === ']') it.r += 5;
    else if (k === 'PageUp') front(it); else if (k === 'PageDown') back(it);
    else if (k === 'Delete' || k === 'Backspace') remove(it); else h = false;
    if (h) { e.preventDefault(); place(it); }
  });
  board.addEventListener('dragover', function (e) { e.preventDefault(); });
  board.addEventListener('drop', function (e) {
    e.preventDefault(); var id = e.dataTransfer.getData('text/plain'), r = board.getBoundingClientRect();
    add(id, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  });
  function cur() { return find(sel); }
  $('#fwd').onclick = function () { if (cur()) front(cur()); else say('Tap a look on the mirror first.'); };
  $('#bck').onclick = function () { if (cur()) back(cur()); else say('Tap a look on the mirror first.'); };
  $('#rm').onclick = function () { if (cur()) remove(cur()); else say('Tap a look on the mirror first.'); };
  $('#clr').onclick = function () { items = []; sel = null; sync(); say('The mirror is clear.'); };
  $('#new').onclick = function () { items = []; sel = null; oid = null; $('#name').value = 'Untitled look'; sync(); say('A fresh board.'); };

  /* ---- the closet rack ---- */
  var cl = [], hs = [], comList = [];
  function loadCommunity() {
    return Store.communityLooks().then(function (list) {
      comList = list.map(function (l) { byId['com:' + l.id] = { id: 'com:' + l.id, title: l.title, width: l.width, height: l.height, url: l.url, tags: [], colours: [] }; return 'com:' + l.id; });
    }).catch(function () {});
  }
  function idsFor(v) {
    var seen = {}, out = [];
    function push(id) { if (!seen[id]) { seen[id] = 1; out.push(id); } }
    if (v === '__all') D.forEach(function (c) { push(c.id); });
    else if (v === '__com') comList.forEach(push);
    else if (v === '__local') { try { JSON.parse(localStorage.getItem('sutairu-holds') || '[]').forEach(push); } catch (e) {} }
    else hs.forEach(function (h) { if (h.closet_id === v) push(h.look_id); });
    return out.filter(function (id) { return byId[id]; });
  }
  function rack() {
    var ids = idsFor($('#src').value);
    $('#rack').innerHTML = ids.length ? ids.map(function (id) {
      var c = byId[id]; return '<button draggable="true" data-add="' + id + '" aria-label="Add ' + Store.esc(c.title) + '" title="' + Store.esc(c.title) + '"><img src="' + src(c, 'thumb') + '" alt=""></button>';
    }).join('') : '<p class="fine">Nothing here yet. Put looks on hold in the shop, or pull from the whole shop.</p>';
  }
  $('#rack').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) add(b.dataset.add); });
  $('#rack').addEventListener('dragstart', function (e) { var b = e.target.closest('button'); if (b) e.dataTransfer.setData('text/plain', b.dataset.add); });
  $('#src').onchange = rack;
  function options() {
    var o = [];
    if (user) cl.forEach(function (c) { o.push([c.id, c.name, idsFor(c.id).length]); });
    else { var n = idsFor('__local').length; if (n) o.push(['__local', 'On hold (this browser)', n]); }
    var first = o.filter(function (x) { return x[2] > 0; })[0];
    if (comList.length) o.push(['__com', 'Community shelf', comList.length]);
    o.push(['__all', 'The whole shop', D.length]);
    $('#src').innerHTML = o.map(function (x) { return '<option value="' + x[0] + '">' + Store.esc(x[1]) + ' (' + x[2] + ')</option>'; }).join('');
    $('#src').value = first ? first[0] : '__all'; rack();
  }

  /* ---- saved looks ---- */
  function refreshSaved() {
    return Store.outfits().then(function (list) {
      saved = list;
      $('#saved').innerHTML = list.length ? list.map(function (o) {
        return '<div class="tag" style="margin:0 0 10px"><h3>' + Store.esc(o.name) + '</h3><span class="hand">' + o.items.length + (o.items.length === 1 ? ' look' : ' looks') + '</span>' +
          '<div class="row" style="gap:6px"><button class="hold" data-open="' + o.id + '">Open</button><button class="hold" data-delo="' + o.id + '">Delete</button></div></div>';
      }).join('') : '<p class="fine">Nothing saved yet. Build a look and press Save.</p>';
    });
  }
  $('#saved').addEventListener('click', async function (e) {
    var b = e.target.closest('button'); if (!b) return;
    try {
      if (b.dataset.open) {
        var o = saved.filter(function (x) { return x.id === b.dataset.open; })[0]; if (!o) return;
        items = o.items.filter(function (i) { return byId[i.id]; }).map(function (i) { return { u: rid(), id: i.id, x: i.x, y: i.y, w: i.w, r: i.r }; });
        oid = o.id; sel = null; $('#name').value = o.name; sync(); say('Opened “' + o.name + '”.');
      } else if (b.dataset.delo && confirm('Delete this saved look?')) {
        await Store.deleteOutfit(b.dataset.delo); if (oid === b.dataset.delo) oid = null; await refreshSaved();
      }
    } catch (err) { say('Tangled thread. Try again?'); }
  });
  $('#save').onclick = async function () {
    if (!user) { say('Open a membership to save looks. You can still download this one as an image.'); return; }
    if (!items.length) { say('Put at least one look on the mirror first.'); return; }
    var name = $('#name').value.trim() || 'Untitled look';
    try {
      var o = await Store.saveOutfit(name, items.map(function (i) { return { id: i.id, x: +i.x.toFixed(4), y: +i.y.toFixed(4), w: +i.w.toFixed(4), r: Math.round(i.r) }; }), oid);
      oid = o.id; say('Saved “' + name + '”. Hung in your wardrobe.'); refreshSaved();
    } catch (err) { say('Tangled thread. That didn’t save, try again?'); }
  };

  /* ---- download as image, with a hang tag ---- */
  $('#export').onclick = async function () {
    if (!items.length) { say('Put a look on the mirror first.'); return; }
    var W = 900, H = 1200, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var x = cv.getContext('2d'), name = $('#name').value.trim() || 'Untitled look';
    x.fillStyle = '#FBF6EA'; x.fillRect(0, 0, W, H);
    try {
      var imgs = await Promise.all(items.map(function (it) {
        return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.crossOrigin = 'anonymous'; im.src = src(byId[it.id], 'full'); });
      }));
      items.forEach(function (it, i) {
        var im = imgs[i], w = it.w * W, h = w * im.naturalHeight / im.naturalWidth, b = w * .014;
        x.save(); x.translate(it.x * W, it.y * H); x.rotate(it.r * Math.PI / 180);
        x.shadowColor = 'rgba(42,20,24,.28)'; x.shadowBlur = 18; x.fillStyle = '#fff'; x.fillRect(-w / 2, -h / 2, w, h);
        x.shadowColor = 'transparent'; x.drawImage(im, -w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b); x.restore();
      });
      x.setLineDash([12, 9]); x.strokeStyle = '#A67C52'; x.lineWidth = 3; x.strokeRect(24, 24, W - 48, H - 48); x.setLineDash([]);
      x.save(); x.translate(60, H - 130); x.rotate(-.05); x.fillStyle = '#D8BE96'; x.strokeStyle = '#A67C52'; x.lineWidth = 2;
      x.beginPath(); if (x.roundRect) x.roundRect(0, 0, 340, 92, [6, 22, 6, 6]); else x.rect(0, 0, 340, 92); x.fill(); x.stroke();
      x.fillStyle = '#FBF6EA'; x.beginPath(); x.arc(24, 24, 6, 0, 7); x.fill(); x.stroke();
      x.fillStyle = '#3B2428'; x.font = 'italic 500 28px Fraunces, Georgia, serif'; x.fillText(name.slice(0, 22), 44, 42);
      x.fillStyle = '#7E0A21'; x.font = '500 24px Caveat, cursive'; x.fillText('Sutairu fitting room', 44, 76); x.restore();
      var blob = await new Promise(function (r) { cv.toBlob(r, 'image/png'); });
      if (!blob) throw new Error('empty');
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = (name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'look') + '.png'; a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); say('Your look is downloading.');
    } catch (err) { say('Couldn’t make the image here. Browsers block this when a page is opened straight from a folder. Open the site through a local server or your hosted address and it will work.'); }
  };

  /* ---- start ---- */
  options();
  var want = new URLSearchParams(location.search).get('add');
  loadCommunity().then(function () {
    options();
    if (want && byId[want]) { add(want); try { history.replaceState(null, '', location.pathname); } catch (e) {} }
  });
  Store.user().then(function (u) {
    if (!u) return;
    user = u; var me = $('#me'); me.textContent = 'Wardrobe'; me.href = 'wardrobe.html';
    return Promise.all([Store.closets(), Store.holds()]).then(function (r) {
      cl = r[0]; hs = r[1]; options(); return refreshSaved();
    });
  }).catch(function (e) { console.error(e); });
})();
