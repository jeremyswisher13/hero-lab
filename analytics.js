/* HERO public-site engagement. See the external analytics handoff notes.
 * Uses GoatCounter's documented /count protocol, deliberately avoiding
 * count.js, whose default payload also includes location.search.
 */
(function () {
  'use strict';

  var config = window.HERO_ANALYTICS_CONFIG;
  if (!config || config.enabled !== true || window.__heroAnalyticsStarted) return;
  if (typeof config.endpoint !== 'string' ||
      !/^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.goatcounter\.com\/count$/.test(config.endpoint)) return;
  if (typeof window.fetch !== 'function') return;

  var hosts = ['herolabsportsmedicine.com', 'www.herolabsportsmedicine.com'];
  var pages = {
    '/': ['home', 'HERO Lab home'],
    '/index.html': ['home', 'HERO Lab home'],
    '/magnesium-formulation-study.html': ['magnesium-formulation-study', 'Magnesium formulation study'],
    '/magnesium.html': ['magnesium', 'Magnesium and sleep evidence'],
    '/cold-water-immersion.html': ['cold-water-immersion', 'Cold water immersion evidence'],
    '/concussion.html': ['concussion', 'Concussion evidence'],
    '/wearables.html': ['wearables', 'Wearable technology evidence'],
    '/travel-circadian.html': ['travel-circadian', 'Athlete travel and circadian evidence'],
    '/cwi-amssm-2025.html': ['cwi-amssm-2025', 'Cold water immersion AMSSM 2025'],
    '/mgt-amssm-2026.html': ['mgt-amssm-2026', 'MgT athlete trial results'],
    '/concussion-amssm-2026.html': ['concussion-amssm-2026', 'Early resistance exercise in concussion'],
    '/press.html': ['press', 'HERO Lab press and media'],
    '/faq.html': ['faq', 'HERO Lab frequently asked questions']
  };
  var clicks = {
    'study-cta': {
      'nav-participate': 'Navigation participation link',
      'banner-study': 'Study announcement link',
      'hero-study': 'Home study link',
      'study-timeline': 'Study timeline link',
      'study-outcomes': 'Study outcomes link',
      'study-explore': 'Explore study link',
      'study-participate': 'Study participation section link',
      'contact-study': 'Contact section study link',
      'evidence-participate': 'Evidence page participation link'
    },
    inquiry: {
      'study-participation': 'Study participation inquiry click',
      'athlete-participation': 'Athlete participation inquiry click',
      'research-collaboration': 'Research collaboration inquiry click',
      partnership: 'Partnership inquiry click'
    },
    download: {
      'study-film-web': 'Website film download click',
      'study-film-vertical': 'Vertical film download click'
    }
  };
  var films = {
    'study-film-web': 'Website study film',
    'study-film-vertical': 'Vertical study film'
  };
  var has = function (obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); };
  var initialPath = window.location.pathname;
  if (!has(pages, initialPath)) return;
  var page = pages[initialPath];
  var pagePath = page[0] === 'home' ? '/' : initialPath;

  function permitted() {
    var nav = window.navigator;
    var dnt = [nav.doNotTrack, window.doNotTrack, nav.msDoNotTrack];
    return config.enabled === true && window.location.protocol === 'https:' &&
      hosts.indexOf(window.location.hostname) !== -1 &&
      window.location.pathname === initialPath && window.top === window.self &&
      !nav.webdriver && nav.globalPrivacyControl !== true &&
      !dnt.some(function (value) { return value === '1' || value === 'yes'; }) &&
      !document.prerendering && document.visibilityState !== 'prerender';
  }
  if (!permitted()) return;
  window.__heroAnalyticsStarted = true;
  var seen = Object.create(null);

  // Only constants from the allowlists above reach this transport. No hrefs,
  // document titles, referrers, URL queries, form fields, or visitor IDs.
  function send(path, title, event) {
    if (!permitted() || document.visibilityState === 'hidden' || seen[path]) return;
    seen[path] = true;
    var params = new URLSearchParams({ p: path, t: title, rnd: Math.random().toString(36).slice(2, 10) });
    if (event) params.set('e', 'true');
    try {
      window.fetch(config.endpoint + '?' + params.toString(), {
        method: 'GET', mode: 'no-cors', credentials: 'omit', cache: 'no-store',
        keepalive: true, referrerPolicy: 'no-referrer'
      }).catch(function () { /* Blocking or network failure must not affect the site. */ });
    } catch (_) { /* Unsupported transport options must not affect the site. */ }
  }

  function pageview() { send(pagePath, page[1], false); }
  pageview();
  document.addEventListener('visibilitychange', pageview);

  function click(event) {
    if (event.isTrusted === false || (event.type === 'auxclick' && event.button !== 1)) return;
    var node = event.target;
    if (!node || typeof node.closest !== 'function') return;
    var target = node.closest('[data-analytics][data-analytics-id]');
    if (!target || !/^(A|BUTTON)$/.test(target.tagName) || target.disabled) return;
    var kind = target.getAttribute('data-analytics');
    var id = target.getAttribute('data-analytics-id');
    if (!has(clicks, kind) || !has(clicks[kind], id)) return;
    send(kind + ':' + id + ':' + page[0], clicks[kind][id] + ' | ' + page[1], true);
  }
  document.addEventListener('click', click, true);
  document.addEventListener('auxclick', click, true);

  document.querySelectorAll('video[data-analytics-video]').forEach(function (video) {
    var id = video.getAttribute('data-analytics-video');
    if (!has(films, id)) return;
    var started = false;

    function filmEvent(milestone, label) {
      send('film:' + id + ':' + milestone + ':' + page[0], films[id] + ' ' + label + ' | ' + page[1], true);
    }

    // TimeRanges records actual played segments, excluding skipped content.
    // Count unique footage watched; looping a quarter cannot become completion.
    function fractionWatched() {
      var duration = video.duration;
      var ranges = video.played;
      if (!Number.isFinite(duration) || duration <= 0 || duration > 7200 ||
          !ranges || ranges.length > 256) return 0;
      var seconds = 0;
      var previousEnd = 0;
      for (var i = 0; i < ranges.length; i += 1) {
        var start = ranges.start(i);
        var end = ranges.end(i);
        if (!Number.isFinite(start) || !Number.isFinite(end) ||
            start < 0 || end < start || end > duration + 0.5) return 0;
        seconds += Math.max(0, Math.min(end, duration) - Math.max(start, previousEnd));
        previousEnd = Math.max(previousEnd, end);
      }
      return seconds / duration;
    }

    video.addEventListener('playing', function () {
      if (document.visibilityState === 'hidden') return;
      started = true;
      filmEvent('play', 'first play');
    });
    function progress(event) {
      if (!started || video.seeking) return;
      var fraction = fractionWatched();
      [25, 50, 75].forEach(function (percent) {
        if (fraction >= percent / 100) filmEvent(String(percent), percent + '% watched');
      });
      // Ended alone can result from seeking. Require almost all footage too;
      // 5% tolerance accommodates the browser's media-range rounding.
      if (event.type === 'ended' && fraction >= 0.95) filmEvent('complete', 'completed');
    }
    video.addEventListener('timeupdate', progress);
    video.addEventListener('ended', progress);
  });
}());
