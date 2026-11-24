/* "Report this look" dialog, shared by the shop floor and the community page. Needs store.js. */
(function () {
  var REASONS = [
    ['inappropriate', 'Not safe or appropriate'], ['copyright', 'The photo isn’t theirs, or permission is missing'],
    ['harassment', 'Harassment or hate'], ['spam', 'Spam or advertising'], ['not_fashion', 'Not about fashion'], ['other', 'Something else']
  ];
  var dlg = document.createElement('dialog');
  dlg.className = 'modal small'; dlg.setAttribute('aria-labelledby', 'rt');
  document.body.appendChild(dlg);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

  window.Report = {
    open: async function (ref, title) {
      var u = await Store.user();
      var head = '<h2 id="rt">Report this look</h2><p class="hand">' + Store.esc(title || '') + '</p>';
      if (!u) {
        dlg.innerHTML = '<div class="stitch pad">' + head + '<p>Please open a membership to send a report. It helps us keep the shop kind.</p><div class="row"><a class="btn" href="join.html">Open a membership</a><button class="btn btn--ghost" type="button" data-x>Close</button></div></div>';
      } else {
        dlg.innerHTML = '<form class="stitch pad">' + head +
          '<label>What’s wrong?<select class="field" id="rr">' + REASONS.map(function (r) { return '<option value="' + r[0] + '">' + r[1] + '</option>'; }).join('') + '</select></label>' +
          '<label>Anything we should know? (optional)<textarea class="field" id="rn" maxlength="300" rows="3"></textarea></label>' +
          '<p class="hand" id="rm" role="status" aria-live="polite"></p>' +
          '<div class="row"><button class="btn" type="submit" id="rs">Send report</button><button class="btn btn--ghost" type="button" data-x>Cancel</button></div></form>';
        var f = dlg.querySelector('form');
        f.onsubmit = async function (e) {
          e.preventDefault(); var s = dlg.querySelector('#rs'), m = dlg.querySelector('#rm'); s.disabled = true;
          try {
            await Store.report(ref, dlg.querySelector('#rr').value, dlg.querySelector('#rn').value.trim());
            m.textContent = 'Thank you. We’ll take a look.'; s.hidden = true; dlg.querySelector('[data-x]').textContent = 'Close';
          } catch (err) { m.textContent = (err && err.message) || 'Tangled thread. Try again?'; s.disabled = false; }
        };
      }
      dlg.querySelector('[data-x]').onclick = function () { dlg.close(); };
      dlg.showModal();
    }
  };
})();
