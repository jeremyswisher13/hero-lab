/* Optional HERO public-site analytics. Google loads only after consent.
 * Custom event values come from the constants below. See privacy.html.
 */
(function () {
  'use strict';

  var config = window.HERO_ANALYTICS_CONFIG;
  if (!config || config.enabled !== true || window.__heroAnalyticsStarted) return;
  if (typeof config.measurementId !== 'string' || !/^G-[A-Z0-9]{6,16}$/.test(config.measurementId)) return;

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
      'concussion-participation': 'Concussion research inquiry click',
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
  var consentKey = 'hero-analytics-consent-v1';
  var choice = readChoice();
  var loaded = false;
  var loading = false;
  var active = false;
  var preferencesOpener = null;
  var expiry = 180 * 24 * 60 * 60 * 1000;
  var disableKey = 'ga-disable-' + config.measurementId;
  window[disableKey] = true;

  function readChoice() {
    try {
      var saved = JSON.parse(window.localStorage.getItem(consentKey));
      if (saved && (saved.choice === 'granted' || saved.choice === 'denied') &&
          typeof saved.expires === 'number' && saved.expires > Date.now()) return saved.choice;
    } catch (_) { /* Storage is optional; no stored choice means no analytics. */ }
    return '';
  }
  function gtag() { window.dataLayer.push(arguments); }
  function clearCookies() {
    // Only our prefixed GA cookies; never touch other site cookies.
    document.cookie.split(';').forEach(function (part) {
      var name = part.trim().split('=')[0];
      if (!/^hero_ga(?:_|$)/.test(name)) return;
      ['', '; domain=' + window.location.hostname, '; domain=.' + window.location.hostname].forEach(function (domain) {
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax; Secure' + domain;
      });
    });
  }
  function stop() {
    active = false;
    window[disableKey] = true;
    seen = Object.create(null);
    clearCookies();
    // Unload Google's lifecycle listeners after withdrawal, including in another tab.
    if (loaded) window.location.reload();
  }
  function choose(value) {
    choice = value;
    try { window.localStorage.setItem(consentKey, JSON.stringify({choice: value, expires: Date.now() + expiry})); } catch (_) {}
    panel.hidden = true;
    if (preferencesOpener) preferencesOpener.focus();
    if (value === 'granted') start(); else stop();
  }
  function start() {
    if (choice !== 'granted' || !permitted() || loading || loaded) return;
    loading = true;
    var script = document.createElement('script');
    script.id = 'hero-google-analytics';
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + config.measurementId;
    // Queue privacy settings before the external script runs.
    window.dataLayer = window.dataLayer || [];
    gtag('consent', 'default', {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
    gtag('set', 'ads_data_redaction', true);
    script.onload = function () {
      loading = false;
      loaded = true;
      if (choice !== 'granted' || !permitted()) { stop(); return; }
      window[disableKey] = false;
      gtag('consent', 'update', {analytics_storage:'granted', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
      gtag('js', new Date());
      gtag('config', config.measurementId, {
        send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
        page_location: 'https://herolabsportsmedicine.com' + pagePath,
        page_title: page[1], page_referrer: '', cookie_prefix: 'hero',
        cookie_domain: 'none', cookie_expires: 15552000, cookie_update: false
      });
      active = true;
      pageview();
      instrumentFilms();
    };
    script.onerror = function () { loading = false; script.remove(); };
    document.head.appendChild(script);
  }
  var panel = document.createElement('section');
  panel.id = 'hero-analytics-panel';
  panel.className = 'hero-analytics-panel';
  panel.setAttribute('aria-labelledby', 'hero-analytics-title');
  panel.innerHTML = '<h2 id="hero-analytics-title">Optional website analytics</h2>' +
    '<p>With your permission, HERO Lab uses Google Analytics cookies to understand page visits, study-link clicks, and video engagement. We do not send email addresses, message contents, or research records.</p>' +
    '<p id="hero-analytics-status"></p><div class="hero-analytics-actions"><button type="button" id="hero-analytics-allow">Allow analytics</button>' +
    '<button type="button" id="hero-analytics-decline">Decline</button><a href="/privacy.html">Analytics privacy</a></div>';
  panel.hidden = !!choice;
  document.body.appendChild(panel);
  document.getElementById('hero-analytics-allow').addEventListener('click', function () { choose('granted'); });
  document.getElementById('hero-analytics-decline').addEventListener('click', function () { choose('denied'); });
  document.querySelectorAll('[data-analytics-preferences]').forEach(function (button) {
    button.hidden = false;
    button.addEventListener('click', function () {
      preferencesOpener = button;
      document.getElementById('hero-analytics-status').textContent = choice === 'granted' ? 'Analytics is allowed. You can withdraw your permission below.' : 'Analytics is currently off.';
      panel.hidden = false;
      document.getElementById('hero-analytics-decline').focus();
    });
  });
  window.addEventListener('storage', function (event) {
    if (event.key !== consentKey) return;
    choice = readChoice();
    if (choice !== 'granted') stop(); else start();
  });

  // Our custom payload never reads link destinations, page queries, titles,
  // referrers or form values. Google also collects standard session information.
  function send(path, title, event) {
    if (!active || choice !== 'granted' || !permitted() || document.visibilityState === 'hidden' || seen[path]) return;
    seen[path] = true;
    var params = { send_to: config.measurementId, page_id: page[0],
      page_location: 'https://herolabsportsmedicine.com' + pagePath, page_title: page[1], page_referrer: '' };
    var name = 'page_view';
    if (event) {
      var parts = path.split(':');
      if (parts[0] === 'film') {
        params.film_id = parts[1];
        name = parts[2] === 'play' ? 'hero_film_play' : parts[2] === 'complete' ? 'hero_film_complete' : 'hero_film_progress';
        if (name === 'hero_film_progress') params.percent_watched = Number(parts[2]);
      } else {
        name = {'study-cta':'hero_study_cta', inquiry:'hero_inquiry_click', download:'hero_film_download'}[parts[0]];
        params.action_id = parts[1];
      }
    }
    gtag('event', name, params);
  }

  function pageview() {
    if (!permitted() && active) { stop(); return; }
    send(pagePath, page[1], false);
  }
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

  function instrumentFilms() {
  document.querySelectorAll('video[data-analytics-video]').forEach(function (video) {
    var id = video.getAttribute('data-analytics-video');
    if (!has(films, id)) return;
    var started = false;

    function filmEvent(milestone, label) {
      send('film:' + id + ':' + milestone + ':' + page[0], films[id] + ' ' + label + ' | ' + page[1], true);
    }

    // TimeRanges records actual played segments, excluding skipped content.
    // Count unique footage watched; looping a quarter cannot become completion.
    function watchedSeconds(duration) {
      var ranges = video.played;
      if (!ranges || ranges.length > 256) return 0;
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
      return seconds;
    }
    // Capture old footage even if duration metadata is not available yet.
    var baselineSeconds = watchedSeconds(7200);
    function fractionWatched() {
      var duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0 || duration > 7200) return 0;
      return Math.max(0, watchedSeconds(duration) - baselineSeconds) / duration;
    }

    video.addEventListener('playing', function () {
      if (document.visibilityState === 'hidden') return;
      started = true;
      filmEvent('play', 'first play');
    });
    // Playback can already be active when the consented Google tag finishes loading.
    // The baseline above still excludes footage played before instrumentation.
    if (!video.paused && !video.ended && video.readyState >= 2 && document.visibilityState !== 'hidden') {
      started = true;
      filmEvent('play', 'playback active');
    }
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
  }
  if (choice === 'granted') start();
}());
