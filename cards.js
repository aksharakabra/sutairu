/* Community look cards, shared by community.html and member.html. Needs store.js and report.js. */
(function () {
  var HANGER = '<svg class="hanger" viewBox="0 0 56 30" aria-hidden="true"><path d="M28 2a4 4 0 1 1 4 4l-4 4L2 28h52L28 10" fill="none" stroke="#A67C52" stroke-width="2.5" stroke-linejoin="round"/></svg>';
  // Holds for community looks use the id "com:<id>", the same table and browser list the shop floor uses.
  var user = null, closets = [], all = [], target = null, guest = [];
  try { guest = JSON.parse(localStorage.getItem('sutairu-holds') || '[]'); } catch (e) {}
  function has(id) { return user ? all.some(function (x) { return x.closet_id === target && x.look_id === id; }) : guest.indexOf(id) > -1; }
  function label(on) { return on ? 'On hold for you' : 'Put it on hold'; }
  function ui() {
    document.querySelectorAll('[data-hold]').forEach(function (b) { var on = has(b.dataset.hold); b.setAttribute('aria-pressed', on); b.textContent = label(on); });
  }
  async function toggle(id) {
    try {
      if (user) {
        if (!target) throw new Error('no closet');
        if (has(id)) { await Store.unhold(target, id); all = all.filter(function (x) { return !(x.closet_id === target && x.look_id === id); }); }
        else { await Store.hold(target, id); all.push({ closet_id: target, look_id: id }); }
      } else {
        var k = guest.indexOf(id); if (k > -1) guest.splice(k, 1); else guest.push(id);
        localStorage.setItem('sutairu-holds', JSON.stringify(guest));
      }
    } catch (e) { alert('Tangled thread. That didn’t save, try again?'); }
    ui();
  }
  Store.user().then(function (u) {
    if (!u) return;
    return Promise.all([Store.closets(), Store.holds()]).then(function (r) {
      user = u; closets = r[0]; all = r[1]; target = closets.length ? closets[0].id : null;
      var sel = document.getElementById('closet');
      if (sel) {
        document.getElementById('cl').hidden = false;
        sel.innerHTML = closets.map(function (c) { return '<option value="' + Store.esc(c.id) + '">' + Store.esc(c.name) + '</option>'; }).join('');
        sel.onchange = function () { target = this.value; ui(); };
      }
      ui();
    });
  }).catch(function (e) { console.error(e); });

  window.Cards = {
    ui: ui,
    card: function (l) {
      var e = Store.esc;
      return '<article class="look">' + HANGER +
        '<figure><img src="' + e(l.url) + '" width="' + l.width + '" height="' + l.height + '" alt="' + e(l.title) + ', shared by ' + e(l.author) + '" loading="lazy" decoding="async"></figure>' +
        '<div class="tag"><h3>' + e(l.title) + '</h3>' +
        '<span class="hand">by <a href="member.html?u=' + encodeURIComponent(l.uid || '') + '">' + e(l.author) + '</a></span>' +
        '<div class="row" style="gap:6px"><button class="hold" data-hold="com:' + e(l.id) + '" aria-pressed="' + has('com:' + l.id) + '">' + label(has('com:' + l.id)) + '</button><a class="hold" href="fitting-room.html?add=com:' + encodeURIComponent(l.id) + '">Try on</a>' +
        '<button class="hold" data-report="com:' + e(l.id) + '" data-t="' + e(l.title) + '">Report</button></div></div></article>';
    }
  };
  document.addEventListener('click', function (ev) {
    var h = ev.target.closest('[data-hold]'); if (h) { toggle(h.dataset.hold); return; }
    var b = ev.target.closest('[data-report]'); if (b) Report.open(b.dataset.report, b.dataset.t);
  });
})();
