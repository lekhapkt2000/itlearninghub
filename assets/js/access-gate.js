(function () {
  // Deployed Google Apps Script Web App (script.google.com > Deploy >
  // Manage deployments) backing the access-code validation.
  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzl_MDfTRkxNExa--NscWG4HPI7ioAN0QImDGLDyk66UFuXaUo1Zrwi_qvwoIjrS5Vu/exec';

  // Apps Script Web Apps don't send an Access-Control-Allow-Origin header,
  // so a plain fetch() gets blocked by CORS. JSONP (loading the response
  // via a <script> tag) sidesteps that entirely.
  //
  // The /exec URL 302-redirects to script.googleusercontent.com, and a
  // cold Apps Script instance can take several seconds to spin up, so on
  // a slow mobile connection a single attempt can time out even though
  // the backend is fine - hence the generous timeout and one automatic
  // retry before surfacing an error to the student.
  function jsonpOnce(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var callbackName = '__accessGateCb' + Date.now() + Math.floor(Math.random() * 1e6);
      var script = document.createElement('script');
      var timer = setTimeout(function () {
        cleanup();
        reject(new Error('timeout'));
      }, timeoutMs);

      function cleanup() {
        clearTimeout(timer);
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[callbackName] = function (data) {
        cleanup();
        resolve(data);
      };

      script.src = url + '&callback=' + callbackName;
      script.onerror = function () {
        cleanup();
        reject(new Error('script load error'));
      };
      document.body.appendChild(script);
    });
  }

  function jsonp(url) {
    return jsonpOnce(url, 20000).catch(function () {
      // One retry after a short pause - covers transient mobile-network
      // blips and Apps Script cold starts without making the student
      // wait through two full 20s timeouts back to back.
      return new Promise(function (resolve) { setTimeout(resolve, 800); })
        .then(function () { return jsonpOnce(url, 20000); });
    });
  }

  // A gate can be nested inside another gate's unlocked content (e.g. an
  // answer key that only appears once the exam paper gate is open). Plain
  // gate.querySelector('.access-logout') would then match whichever gate's
  // element happens to come first in document order - not necessarily this
  // gate's own. Scope each lookup to elements that aren't inside a nested
  // child gate.
  function scopedQuery(root, selector) {
    var nestedGates = root.querySelectorAll('.access-gate');
    var candidates = root.querySelectorAll(selector);
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      var insideNested = false;
      for (var j = 0; j < nestedGates.length; j++) {
        if (nestedGates[j] !== root && nestedGates[j].contains(el)) { insideNested = true; break; }
      }
      if (!insideNested) return el;
    }
    return null;
  }

  document.querySelectorAll('.access-gate').forEach(function (gate) {
    var course = gate.dataset.accessCourse || '';
    var resource = gate.dataset.accessResource || '';
    var week = gate.dataset.accessWeek || '';
    // Scoped per week (not just per course): a code for week 3 must not
    // silently unlock week 2's gate just because both are IT004.
    var storageKey = 'access:' + course + ':' + (week || resource || 'default');

    var locked = scopedQuery(gate, '.access-locked');
    var unlocked = scopedQuery(gate, '.access-unlocked');
    var form = scopedQuery(gate, '.access-form');
    var input = scopedQuery(gate, '.access-input');
    var submitBtn = scopedQuery(gate, '.access-submit');
    var errorEl = scopedQuery(gate, '.access-error');
    var logoutBtn = scopedQuery(gate, '.access-logout');

    function unlock() {
      locked.hidden = true;
      unlocked.hidden = false;
    }

    function lock() {
      locked.hidden = false;
      unlocked.hidden = true;
    }

    try {
      if (localStorage.getItem(storageKey)) unlock();
    } catch (e) {}

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var code = (input.value || '').trim();
        if (!code) return;

        errorEl.textContent = '';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang kiểm tra...';

        var url = APPS_SCRIPT_URL + '?action=validate' +
          '&code=' + encodeURIComponent(code) +
          '&course=' + encodeURIComponent(course) +
          '&resource=' + encodeURIComponent(resource) +
          '&week=' + encodeURIComponent(week);

        jsonp(url)
          .then(function (data) {
            if (data.ok) {
              try { localStorage.setItem(storageKey, code); } catch (e) {}
              unlock();
            } else {
              errorEl.textContent = data.message || 'Mã truy cập không hợp lệ.';
            }
          })
          .catch(function () {
            errorEl.textContent = 'Không thể kết nối máy chủ xác thực. Kiểm tra kết nối mạng (wifi/4G) rồi thử lại.';
          })
          .finally(function () {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Xác nhận mã <span>›</span>';
          });
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        try { localStorage.removeItem(storageKey); } catch (e) {}
        if (input) input.value = '';
        lock();
      });
    }
  });
})();
