(function () {
  var TOTAL_WEEKS = 6;
  var AVAILABLE_WEEKS = 5;
  var STORAGE_KEY = 'it004-progress';

  function getProgress() {
    var v = parseInt(localStorage.getItem(STORAGE_KEY), 10);
    return isNaN(v) ? 0 : v;
  }

  function setProgress(week) {
    if (week > getProgress()) {
      localStorage.setItem(STORAGE_KEY, String(week));
    }
  }

  var match = /week-(\d)\.html/.exec(location.pathname);
  if (match) {
    setProgress(parseInt(match[1], 10));
  }

  var cta = document.querySelector('[data-progress-cta]');
  var countEl = document.querySelector('[data-progress-count]');
  var barEl = document.querySelector('[data-progress-bar]');
  var percentEl = document.querySelector('[data-progress-percent]');

  if (cta || countEl || barEl || percentEl) {
    var done = Math.min(getProgress(), AVAILABLE_WEEKS);
    var nextWeek = done + 1;
    var ctaText, ctaHref;

    if (done === 0) {
      ctaText = 'Vào học Tuần 1';
      ctaHref = 'week-1.html';
    } else if (nextWeek <= AVAILABLE_WEEKS) {
      ctaText = 'Tiếp tục học Tuần ' + nextWeek;
      ctaHref = 'week-' + nextWeek + '.html';
    } else {
      ctaText = 'Ôn tập Tuần ' + AVAILABLE_WEEKS;
      ctaHref = 'week-' + AVAILABLE_WEEKS + '.html';
    }

    if (cta) {
      cta.setAttribute('href', ctaHref);
      cta.innerHTML = ctaText + ' <span>›</span>';
    }
    if (countEl) {
      countEl.innerHTML = done + '<span>/' + TOTAL_WEEKS + '</span>';
    }
    var percent = Math.round((done / TOTAL_WEEKS) * 100);
    if (barEl) {
      barEl.style.width = percent + '%';
    }
    if (percentEl) {
      percentEl.textContent = percent + '%';
    }
  }
})();
