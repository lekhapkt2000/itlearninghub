(function () {
  // TODO: replace with your deployed Google Apps Script Web App URL
  // (script.google.com > Deploy > New deployment > Web app >
  //  Execute as: Me, Who has access: Anyone > copy the /exec URL here)
  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/REPLACE_WITH_YOUR_DEPLOYMENT_ID/exec';

  document.querySelectorAll('.access-gate').forEach(function (gate) {
    var course = gate.dataset.accessCourse || '';
    var resource = gate.dataset.accessResource || '';
    var storageKey = 'access:' + course;

    var locked = gate.querySelector('.access-locked');
    var unlocked = gate.querySelector('.access-unlocked');
    var form = gate.querySelector('.access-form');
    var input = gate.querySelector('.access-input');
    var submitBtn = gate.querySelector('.access-submit');
    var errorEl = gate.querySelector('.access-error');
    var logoutBtn = gate.querySelector('.access-logout');

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
          '&resource=' + encodeURIComponent(resource);

        fetch(url)
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (data.ok) {
              try { localStorage.setItem(storageKey, code); } catch (e) {}
              unlock();
            } else {
              errorEl.textContent = data.message || 'Mã truy cập không hợp lệ.';
            }
          })
          .catch(function () {
            errorEl.textContent = 'Không thể kết nối máy chủ xác thực. Vui lòng thử lại.';
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
