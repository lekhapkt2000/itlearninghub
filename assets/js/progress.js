(function () {
  var AVAILABLE_WEEKS = 5;
  var STORAGE_KEY = 'it004-progress';
  var IS_EN = document.documentElement.lang === 'en';

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

  if (cta) {
    var done = Math.min(getProgress(), AVAILABLE_WEEKS);
    var nextWeek = done + 1;
    var ctaText, ctaHref;

    if (done === 0) {
      ctaText = IS_EN ? 'Start Week 1' : 'Vào học Tuần 1';
      ctaHref = 'week-1.html';
    } else if (nextWeek <= AVAILABLE_WEEKS) {
      ctaText = IS_EN ? 'Continue to Week ' + nextWeek : 'Tiếp tục học Tuần ' + nextWeek;
      ctaHref = 'week-' + nextWeek + '.html';
    } else {
      ctaText = IS_EN ? 'Review Week ' + AVAILABLE_WEEKS : 'Ôn tập Tuần ' + AVAILABLE_WEEKS;
      ctaHref = 'week-' + AVAILABLE_WEEKS + '.html';
    }

    cta.setAttribute('href', ctaHref);
    cta.innerHTML = ctaText + ' <span>›</span>';
  }
})();
