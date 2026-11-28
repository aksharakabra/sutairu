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
  var profDone = false;
  var S = { mode: live ? 'supabase' : 'demo', DEF: DEF };
  S.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  function demo() { return L('sutairu-demo-data', { closets: [], holds: [] }); }

  S.user = async function () {
    if (!live) return L('sutairu-demo-in', false) ? L('sutairu-demo-user', null) : null;
    var s = (await sb.auth.getSession()).data.session, u = s && s.user;
    if (!u) return null;
    var nm = u.user_metadata && u.user_metadata.name;
    if (!profDone) { // make sure this member has a public profile row (name only)
      profDone = true;
      sb.from('profiles').upsert({ user_id: u.id, name: String(nm || 'Member').slice(0, 40) }, { onConflict: 'user_id', ignoreDuplicates: true }).then(function () {}, function () {});
    }
    return { id: u.id, email: u.email, name: nm || u.email.split('@')[0], since: u.created_at };
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
  /* ---- community: shared looks, review, reports ---- */
  var COLS = 'id,user_id,author_name,title,tags,mood,season,image_path,width,height,status,review_note,created_at';
  function norm(r) {
    return { id: r.id, uid: r.user_id, title: r.title, tags: r.tags || [], mood: r.mood, season: r.season, author: r.author_name, width: r.width, height: r.height,
      status: r.status, note: r.review_note || '', created: r.created_at, url: sb.storage.from('looks').getPublicUrl(r.image_path).data.publicUrl };
  }
  // Demo mode only: two clearly labelled sample members so following can be tried. Switch off in config.js.
  var SEED = [
    { id: 'seed-da02', uid: 'demo-mira', author: 'Mira (sample)', title: 'Wool coat on the steps', tags: ["coat", "boots", "brown"], mood: 'dreamy', season: 'winter', width: 900, height: 1413, status: 'approved', note: '', created: '2026-01-01T00:00:00Z', url: 'images/thumb/da02.webp' },
    { id: 'seed-s18', uid: 'demo-mira', author: 'Mira (sample)', title: 'Crisp white shirt', tags: ["white shirt", "cream shorts", "linen"], mood: 'elegant', season: 'summer', width: 485, height: 720, status: 'approved', note: '', created: '2026-01-01T00:00:00Z', url: 'images/thumb/s18.webp' },
    { id: 'seed-w20', uid: 'demo-jun', author: 'Jun (sample)', title: 'Camel coat, autumn street', tags: ["camel coat", "black trousers", "loafers"], mood: 'elegant', season: 'winter', width: 474, height: 820, status: 'approved', note: '', created: '2026-01-01T00:00:00Z', url: 'images/thumb/w20.webp' },
    { id: 'seed-s26', uid: 'demo-jun', author: 'Jun (sample)', title: 'Mint tee, khaki trousers', tags: ["mint tee", "khaki trousers", "sneakers"], mood: 'breezy', season: 'summer', width: 736, height: 1305, status: 'approved', note: '', created: '2026-01-01T00:00:00Z', url: 'images/thumb/s26.webp' }
  ];
  function seeds() { return C.SAMPLE_MEMBERS === false ? [] : SEED; }
  function mine() { return (demo().looks || []).map(function (l) { l.uid = l.uid || 'demo'; return l; }); }
  function allLooks() { return mine().slice().reverse().concat(seeds()); }
  S.isModerator = async function () {
    if (!live) return !!(await S.user());
    var r = await sb.from('moderators').select('user_id').maybeSingle();
    return !r.error && !!r.data;
  };
  S.communityLooks = async function () {
    if (!live) return allLooks().filter(function (l) { return l.status === 'approved'; });
    return ck(await sb.from('community_looks').select(COLS).eq('status', 'approved').order('created_at', { ascending: false }).limit(120)).map(norm);
  };
  S.myLooks = async function () {
    if (!live) return mine().slice().reverse();
    var u = await S.user();
    return ck(await sb.from('community_looks').select(COLS).eq('user_id', u.id).order('created_at', { ascending: false })).map(norm);
  };
  S.looksByIds = async function (ids) {
    if (!live) return allLooks().filter(function (l) { return ids.indexOf(l.id) > -1; });
    return ck(await sb.from('community_looks').select(COLS).in('id', ids)).map(norm);
  };
  S.submitLook = async function (m, blob, dataUrl) {
    var u = await S.user(); if (!u) throw new Error('Open a membership first.');
    if (!live) {
      var d = demo(); d.looks = d.looks || [];
      var row = { id: rid(), uid: 'demo', title: m.title, tags: m.tags, mood: m.mood, season: m.season, author: u.name, width: m.width, height: m.height, status: 'approved', note: '', created: new Date().toISOString(), url: dataUrl };
      d.looks.push(row);
      try { localStorage.setItem('sutairu-demo-data', JSON.stringify(d)); } catch (e) { throw new Error('This browser’s storage is full. Remove a look first.'); }
      return row;
    }
    var path = u.id + '/' + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : rid() + rid()) + '.webp';
    var up = await sb.storage.from('looks').upload(path, blob, { contentType: 'image/webp', upsert: false });
    if (up.error) throw up.error;
    var r = await sb.from('community_looks').insert({ author_name: u.name, title: m.title, tags: m.tags, mood: m.mood, season: m.season, image_path: path, width: m.width, height: m.height }).select(COLS).single();
    if (r.error) { await sb.storage.from('looks').remove([path]); throw r.error; }
    return norm(r.data);
  };
  S.deleteLook = async function (id) {
    if (!live) {
      var d = demo(); d.looks = (d.looks || []).filter(function (l) { return l.id !== id; });
      d.reports = (d.reports || []).filter(function (r) { return r.look_ref !== 'com:' + id; }); W('sutairu-demo-data', d); return;
    }
    var g = ck(await sb.from('community_looks').select('image_path').eq('id', id).maybeSingle());
    ck(await sb.from('community_looks').delete().eq('id', id));
    if (g) await sb.storage.from('looks').remove([g.image_path]);
  };
  S.reviewLook = async function (id, status, note) {
    if (!live) { var d = demo(); (d.looks || []).forEach(function (l) { if (l.id === id) { l.status = status; l.note = note || ''; } }); W('sutairu-demo-data', d); return; }
    ck(await sb.from('community_looks').update({ status: status, review_note: note || '' }).eq('id', id));
  };
  S.report = async function (ref, reason, note) {
    var u = await S.user(); if (!u) throw new Error('Open a membership to send a report.');
    if (!live) {
      var d = demo(); d.reports = d.reports || [];
      if (d.reports.some(function (r) { return r.look_ref === ref; })) throw new Error('You already reported this one. Thank you.');
      d.reports.push({ id: rid(), look_ref: ref, reason: reason, note: note || '', status: 'open', created_at: new Date().toISOString() });
      W('sutairu-demo-data', d); return;
    }
    var r = await sb.from('reports').insert({ look_ref: ref, reason: reason, note: note || '' });
    if (r.error) { if (r.error.code === '23505') throw new Error('You already reported this one. Thank you.'); throw r.error; }
  };
  S.reports = async function () {
    if (!live) return (demo().reports || []).filter(function (r) { return r.status === 'open'; });
    return ck(await sb.from('reports').select('id,look_ref,reason,note,created_at').eq('status', 'open').order('created_at'));
  };
  S.resolveReports = async function (ref) {
    if (!live) { var d = demo(); (d.reports || []).forEach(function (r) { if (r.look_ref === ref) r.status = 'resolved'; }); W('sutairu-demo-data', d); return; }
    ck(await sb.from('reports').update({ status: 'resolved' }).eq('look_ref', ref).eq('status', 'open'));
  };

  /* ---- profiles and follows ---- */
  S.profile = async function (uid) {
    if (!uid) return null;
    if (!live) {
      var me = await S.user(); if (me && me.id === uid) return { name: me.name };
      var sd = seeds().filter(function (l) { return l.uid === uid; })[0]; return sd ? { name: sd.author } : null;
    }
    var r = await sb.from('profiles').select('name').eq('user_id', uid).maybeSingle();
    return r.data || null;
  };
  S.memberLooks = async function (uid) {
    if (!live) return allLooks().filter(function (l) { return l.uid === uid && l.status === 'approved'; });
    return ck(await sb.from('community_looks').select(COLS).eq('user_id', uid).eq('status', 'approved').order('created_at', { ascending: false })).map(norm);
  };
  S.follows = async function () {
    if (!live) return demo().follows || [];
    return ck(await sb.from('follows').select('followee_id')).map(function (r) { return r.followee_id; });
  };
  async function who(uid) {
    var me = await S.user(); if (!me) throw new Error('Open a membership to follow.');
    if (me.id === uid) throw new Error('You can’t follow yourself.');
  }
  S.follow = async function (uid) {
    await who(uid);
    if (!live) { var d = demo(); d.follows = d.follows || []; if (d.follows.indexOf(uid) < 0) d.follows.push(uid); W('sutairu-demo-data', d); return; }
    var r = await sb.from('follows').insert({ followee_id: uid });
    if (r.error && r.error.code !== '23505') throw r.error;
  };
  S.unfollow = async function (uid) {
    await who(uid);
    if (!live) { var d = demo(); d.follows = (d.follows || []).filter(function (x) { return x !== uid; }); W('sutairu-demo-data', d); return; }
    ck(await sb.from('follows').delete().eq('followee_id', uid));
  };
  S.followerCount = async function (uid) {
    if (!live) return (demo().follows || []).indexOf(uid) > -1 ? 1 : 0;
    var r = await sb.rpc('follower_count', { target: uid }); return r.error ? 0 : (r.data || 0);
  };
  S.followingLooks = async function () {
    var ids = await S.follows(); if (!ids.length) return [];
    if (!live) return allLooks().filter(function (l) { return l.status === 'approved' && ids.indexOf(l.uid) > -1; });
    return ck(await sb.from('community_looks').select(COLS).eq('status', 'approved').in('user_id', ids).order('created_at', { ascending: false }).limit(120)).map(norm);
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
