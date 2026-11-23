/* Sutairu core. Day/evening theme, and the data layer.
   Real accounts when config.js has your Supabase keys; otherwise demo mode (this browser only). */
(function () {
  var C = window.SUTAIRU_CONFIG || {}, DEF = 'On hold';
  var live = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  var sb = live ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  function L(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function W(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function rid() { return Math.random().toString(36).slice(2, 10); }
  function ck(r) { if (r.error) throw r.error; return r.data; }
  var S = { mode: live ? 'supabase' : 'demo', DEF: DEF };
  S.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  function demo() { return L('sutairu-demo-data', { closets: [], holds: [] }); }

  S.user = async function () {
    if (!live) return L('sutairu-demo-in', false) ? L('sutairu-demo-user', null) : null;
    var s = (await sb.auth.getSession()).data.session, u = s && s.user;
    return u ? { id: u.id, email: u.email, name: (u.user_metadata && u.user_metadata.name) || u.email.split('@')[0], since: u.created_at } : null;
  };
  S.signUp = async function (name, email, pw) {
    if (!live) { W('sutairu-demo-user', { id: 'demo', name: name, email: email, since: new Date().toISOString() }); W('sutairu-demo-in', true); return { needsConfirm: false }; }
    var r = await sb.auth.signUp({ email: email, password: pw, options: { data: { name: name } } });
    if (r.error) throw r.error;
    return { needsConfirm: !r.data.session };
  };
  S.signIn = async function (email, pw) {
    if (!live) {
      var u = L('sutairu-demo-user', null);
      if (!u || u.email !== email) throw new Error('No demo membership with that email yet. Open one first.');
      W('sutairu-demo-in', true); return;
    }
    var r = await sb.auth.signInWithPassword({ email: email, password: pw });
    if (r.error) throw r.error;
  };
  S.signOut = async function () { if (live) await sb.auth.signOut(); else W('sutairu-demo-in', false); };

  S.closets = async function () {
    if (!live) {
      var d = demo();
      if (!d.closets.length) { d.closets.push({ id: rid(), name: DEF }); W('sutairu-demo-data', d); }
      return d.closets;
    }
    var rows = ck(await sb.from('closets').select('id,name').order('created_at'));
    if (!rows.length) rows = ck(await sb.from('closets').insert({ name: DEF }).select('id,name'));
    return rows;
  };
  S.createCloset = async function (name) {
    if (!live) { var d = demo(), c = { id: rid(), name: name }; d.closets.push(c); W('sutairu-demo-data', d); return c; }
    return ck(await sb.from('closets').insert({ name: name }).select('id,name').single());
  };
  S.deleteCloset = async function (id) {
    if (!live) { var d = demo(); d.closets = d.closets.filter(function (c) { return c.id !== id; }); d.holds = d.holds.filter(function (h) { return h.closet_id !== id; }); W('sutairu-demo-data', d); return; }
    ck(await sb.from('closets').delete().eq('id', id));
  };
  S.holds = async function () {
    if (!live) return demo().holds;
    return ck(await sb.from('holds').select('closet_id,look_id'));
  };
  S.hold = async function (closetId, lookId) {
    if (!live) {
      var d = demo();
      if (!d.holds.some(function (h) { return h.closet_id === closetId && h.look_id === lookId; })) d.holds.push({ closet_id: closetId, look_id: lookId });
      W('sutairu-demo-data', d); return;
    }
    ck(await sb.from('holds').upsert({ closet_id: closetId, look_id: lookId }, { onConflict: 'closet_id,look_id' }));
  };
  S.unhold = async function (closetId, lookId) {
    if (!live) { var d = demo(); d.holds = d.holds.filter(function (h) { return !(h.closet_id === closetId && h.look_id === lookId); }); W('sutairu-demo-data', d); return; }
    ck(await sb.from('holds').delete().eq('closet_id', closetId).eq('look_id', lookId));
  };
  S.outfits = async function () {
    if (!live) return demo().outfits || [];
    return ck(await sb.from('outfits').select('id,name,items,updated_at').order('updated_at', { ascending: false }));
  };
  S.saveOutfit = async function (name, items, id) {
    var now = new Date().toISOString();
    if (!live) {
      var d = demo(), o = null; d.outfits = d.outfits || [];
      if (id) o = d.outfits.filter(function (x) { return x.id === id; })[0] || null;
      if (o) { o.name = name; o.items = items; o.updated_at = now; }
      else { o = { id: rid(), name: name, items: items, updated_at: now }; d.outfits.unshift(o); }
      W('sutairu-demo-data', d); return o;
    }
    var row = { name: name, items: items, updated_at: now };
    if (id) return ck(await sb.from('outfits').update(row).eq('id', id).select('id,name,items').single());
    return ck(await sb.from('outfits').insert(row).select('id,name,items').single());
  };
  S.deleteOutfit = async function (id) {
    if (!live) { var d = demo(); d.outfits = (d.outfits || []).filter(function (x) { return x.id !== id; }); W('sutairu-demo-data', d); return; }
    ck(await sb.from('outfits').delete().eq('id', id));
  };
  // Holds made while logged out (saved in this browser) move into the first closet at login.
  S.migrate = async function () {
    var ids = L('sutairu-holds', []); if (!ids.length) return;
    var cl = await S.closets();
    for (var i = 0; i < ids.length; i++) await S.hold(cl[0].id, ids[i]);
    try { localStorage.removeItem('sutairu-holds'); } catch (e) {}
  };
  window.Store = S;

  if (typeof document !== 'undefined') {
    var root = document.documentElement, tb = document.getElementById('theme');
    try { var th = localStorage.getItem('sutairu-theme'); if (th) root.setAttribute('data-theme', th); } catch (e) {}
    if (tb) tb.onclick = function () {
      var n = getComputedStyle(root).getPropertyValue('--bg').trim() === '#2A1418' ? 'light' : 'dark';
      root.setAttribute('data-theme', n); try { localStorage.setItem('sutairu-theme', n); } catch (e) {}
    };
  }
})();
