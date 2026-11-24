/* Community look cards, shared by community.html and member.html. Needs store.js and report.js. */
(function () {
  var HANGER = '<svg class="hanger" viewBox="0 0 56 30" aria-hidden="true"><path d="M28 2a4 4 0 1 1 4 4l-4 4L2 28h52L28 10" fill="none" stroke="#A67C52" stroke-width="2.5" stroke-linejoin="round"/></svg>';
  window.Cards = {
    card: function (l) {
      var e = Store.esc;
      return '<article class="look">' + HANGER +
        '<figure><img src="' + e(l.url) + '" width="' + l.width + '" height="' + l.height + '" alt="' + e(l.title) + ', shared by ' + e(l.author) + '" loading="lazy" decoding="async"></figure>' +
        '<div class="tag"><h3>' + e(l.title) + '</h3>' +
        '<span class="hand">by <a href="member.html?u=' + encodeURIComponent(l.uid || '') + '">' + e(l.author) + '</a></span>' +
        '<div class="row" style="gap:6px"><a class="hold" href="fitting-room.html?add=com:' + encodeURIComponent(l.id) + '">Try on</a>' +
        '<button class="hold" data-report="com:' + e(l.id) + '" data-t="' + e(l.title) + '">Report</button></div></div></article>';
    }
  };
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-report]'); if (b) Report.open(b.dataset.report, b.dataset.t);
  });
})();
