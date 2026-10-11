/* Offline contract tests for the deployable HERO GA4 build.
 * The Google tag is never downloaded or evaluated. A small DOM executes only
 * HERO's consent and event code; dataLayer and script insertions are spies.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'analytics.js'), 'utf8');
const configSource = fs.readFileSync(path.join(root, 'analytics-config.js'), 'utf8');
const KEY = 'hero-analytics-consent-v1';
const ID = 'G-OFFLINE123';
const CAMPAIGN_KEYS = ['campaign_id', 'campaign_name', 'campaign_source', 'campaign_medium', 'campaign_term', 'campaign_content'];
const granted = () => JSON.stringify({ choice: 'granted', expires: Date.now() + 86400000 });
const denied = () => JSON.stringify({ choice: 'denied', expires: Date.now() + 86400000 });
const plain = value => JSON.parse(JSON.stringify(value));

class EventTarget {
  constructor() { this.listeners = Object.create(null); }
  addEventListener(type, fn, options) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push({ fn, once: !!(options && options.once) });
  }
  removeEventListener(type, fn) {
    this.listeners[type] = (this.listeners[type] || []).filter(item => item.fn !== fn);
  }
  dispatchEvent(input) {
    const event = input;
    if (!event.target) event.target = this;
    if (!event.preventDefault) event.preventDefault = () => { event.defaultPrevented = true; };
    if (!event.stopPropagation) event.stopPropagation = () => { event.stopped = true; };
    event.currentTarget = this;
    if (typeof this['on' + event.type] === 'function') this['on' + event.type].call(this, event);
    for (const item of [...(this.listeners[event.type] || [])]) {
      item.fn.call(this, event);
      if (item.once) this.removeEventListener(event.type, item.fn);
    }
    if (!event.stopped && event.bubbles !== false && this.parentNode) this.parentNode.dispatchEvent(event);
    return !event.defaultPrevented;
  }
}

function decode(value) {
  return value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

class Element extends EventTarget {
  constructor(tag, owner) {
    super();
    this.tagName = tag.toUpperCase();
    this.nodeName = this.tagName;
    this.nodeType = 1;
    this.ownerDocument = owner;
    this.attributes = Object.create(null);
    this.children = [];
    this.parentNode = null;
    this.hidden = false;
    this.disabled = false;
    this.style = { setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; } };
    this.dataset = new Proxy({}, {
      get: (_, name) => this.getAttribute('data-' + String(name).replace(/[A-Z]/g, s => '-' + s.toLowerCase())),
      set: (_, name, value) => { this.setAttribute('data-' + String(name).replace(/[A-Z]/g, s => '-' + s.toLowerCase()), value); return true; }
    });
    this.classList = {
      add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(' '); },
      remove: (...names) => { this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); },
      contains: name => this.className.split(/\s+/).includes(name),
      toggle: (name, force) => {
        const add = force === undefined ? !this.classList.contains(name) : force;
        this.classList[add ? 'add' : 'remove'](name);
        return add;
      }
    };
  }
  get id() { return this.getAttribute('id') || ''; }
  set id(value) { this.setAttribute('id', value); }
  get className() { return this.getAttribute('class') || ''; }
  set className(value) { this.setAttribute('class', value); }
  get src() { return this.getAttribute('src') || ''; }
  set src(value) { this.setAttribute('src', value); }
  get firstChild() { return this.children[0] || null; }
  get childNodes() { return this.children; }
  get parentElement() { return this.parentNode instanceof Element ? this.parentNode : null; }
  get isConnected() { return !!this.parentNode && (this.parentNode.nodeType === 9 || this.parentNode.isConnected); }
  get textContent() { return (this._text || '') + this.children.map(child => child.textContent || '').join(''); }
  set textContent(value) { this._text = String(value); this.children = []; }
  get innerHTML() { return this._html || ''; }
  set innerHTML(value) {
    this.children = [];
    this._text = '';
    this._html = String(value);
    const stack = [this];
    for (const token of String(value).match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) || []) {
      if (token.startsWith('<!--')) continue;
      if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
      if (token.startsWith('<')) {
        const match = token.match(/^<([\w-]+)\b([^>]*)>/);
        if (!match) continue;
        const child = this.ownerDocument.createElement(match[1]);
        for (const attr of match[2].matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s/>]+)))?/g)) {
          child.setAttribute(attr[1], decode(attr[2] ?? attr[3] ?? attr[4] ?? ''));
        }
        stack[stack.length - 1].appendChild(child);
        if (!/^(BR|HR|IMG|INPUT|LINK|META|SOURCE)$/.test(child.tagName) && !token.endsWith('/>')) stack.push(child);
      } else {
        stack[stack.length - 1]._text = (stack[stack.length - 1]._text || '') + decode(token);
      }
    }
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'hidden') this.hidden = true;
    if (name === 'disabled') this.disabled = true;
  }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; }
  hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name); }
  removeAttribute(name) { delete this.attributes[name]; if (name === 'hidden') this.hidden = false; if (name === 'disabled') this.disabled = false; }
  appendChild(child) {
    if (child.parentNode && child.parentNode.removeChild) child.parentNode.removeChild(child);
    this.children.push(child);
    child.parentNode = this;
    if (child.tagName === 'SCRIPT' && child.src && !this.ownerDocument.injectedScripts.includes(child)) this.ownerDocument.injectedScripts.push(child);
    return child;
  }
  append(...children) { children.forEach(child => this.appendChild(typeof child === 'string' ? this.ownerDocument.createTextNode(child) : child)); }
  prepend(...children) { [...children].reverse().forEach(child => this.insertBefore(child, this.firstChild)); }
  removeChild(child) { this.children = this.children.filter(item => item !== child); child.parentNode = null; return child; }
  insertBefore(child, reference) {
    const index = this.children.indexOf(reference);
    if (index < 0) return this.appendChild(child);
    if (child.parentNode && child.parentNode.removeChild) child.parentNode.removeChild(child);
    this.children.splice(index, 0, child); child.parentNode = this; return child;
  }
  replaceChildren(...children) { this.children.forEach(child => { child.parentNode = null; }); this.children = []; this.append(...children); }
  remove() { if (this.parentNode?.removeChild) this.parentNode.removeChild(this); }
  contains(target) { return target === this || this.children.some(child => child.contains?.(target)); }
  focus() { this.ownerDocument.activeElement = this; }
  click() { this.dispatchEvent({ type: 'click', isTrusted: true, button: 0, bubbles: true }); }
  showModal() { this.open = true; }
  close() { this.open = false; }
  matches(selector) {
    if (selector.includes(',')) return selector.split(',').some(part => this.matches(part.trim()));
    // The fixture only needs ordinary selectors used by HERO's shared scripts.
    const attrs = [...selector.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g)];
    const base = selector.replace(/\[[^\]]+\]/g, '');
    const tag = base.match(/^[\w-]+/);
    const id = base.match(/#([\w-]+)/);
    const classes = [...base.matchAll(/\.([\w-]+)/g)].map(match => match[1]);
    if (tag && this.tagName !== tag[0].toUpperCase()) return false;
    if (id && this.id !== id[1]) return false;
    if (classes.some(name => !this.classList.contains(name))) return false;
    return attrs.every(([, name, value]) => this.hasAttribute(name) && (value === undefined || this.getAttribute(name) === value));
  }
  querySelectorAll(selector) {
    const result = [];
    const visit = node => { for (const child of node.children || []) { if (child.matches?.(selector)) result.push(child); visit(child); } };
    visit(this);
    return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { for (let node = this; node instanceof Element; node = node.parentNode) if (node.matches(selector)) return node; return null; }
}

class Document extends EventTarget {
  constructor(options) {
    super();
    this.nodeType = 9;
    this.injectedScripts = [];
    this.visibilityState = options.hidden ? 'hidden' : 'visible';
    this.prerendering = options.prerendering || false;
    this.readyState = 'complete';
    this.documentElement = new Element('html', this);
    this.documentElement.parentNode = this;
    this.head = new Element('head', this);
    this.body = new Element('body', this);
    this.documentElement.append(this.head, this.body);
    this.activeElement = this.body;
    this.cookieWrites = [];
    this.cookies = new Map(Object.entries(options.cookies || {}));
  }
  createElement(tag) { return new Element(tag, this); }
  createTextNode(text) { return { nodeType: 3, textContent: String(text), parentNode: null }; }
  getElementById(id) { return this.querySelector('#' + id); }
  querySelectorAll(selector) { return this.documentElement.querySelectorAll(selector); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  get cookie() { return [...this.cookies].map(([name, value]) => name + '=' + value).join('; '); }
  set cookie(value) {
    this.cookieWrites.push(value);
    const [pair] = value.split(';');
    const index = pair.indexOf('=');
    const name = pair.slice(0, index).trim();
    if (/max-age\s*=\s*0|expires\s*=.*(?:1970|1969)/i.test(value)) this.cookies.delete(name);
    else this.cookies.set(name, pair.slice(index + 1));
  }
}

function boot(options = {}) {
  const document = new Document(options);
  const preference = document.createElement('button');
  preference.setAttribute('data-analytics-preferences', '');
  document.body.appendChild(preference);
  const stored = new Map(options.stored === undefined ? [] : [[KEY, options.stored]]);
  const storageReads = [];
  const storageWrites = [];
  const queryReads = [];
  const storage = {
    getItem(key) { storageReads.push(key); if (options.storageFailure) throw new Error('Storage blocked'); return stored.get(key) ?? null; },
    setItem(key, value) { storageWrites.push([key, value]); if (options.storageFailure) throw new Error('Storage blocked'); stored.set(key, value); },
    removeItem(key) { if (options.storageFailure) throw new Error('Storage blocked'); stored.delete(key); }
  };
  const timers = [];
  const window = new EventTarget();
  Object.assign(window, {
    HERO_ANALYTICS_CONFIG: { enabled: true, measurementId: ID, ...options.config },
    location: { protocol: 'https:', hostname: 'herolabsportsmedicine.com', pathname: '/', search: '', reload() { window.reloads = (window.reloads || 0) + 1; }, ...options.location },
    navigator: { ...options.navigator },
    localStorage: storage,
    document,
    fetch() { throw new Error('HERO must not make direct analytics requests'); },
    setTimeout(fn) { timers.push(fn); return timers.length; },
    clearTimeout() {},
    getComputedStyle: () => ({ display: 'block', visibility: 'visible' })
  });
  window.self = window;
  window.top = options.frame ? {} : window;
  window.window = window;
  document.location = window.location;
  document.defaultView = window;
  Object.defineProperty(window.location, 'search', { get() {
    queryReads.push('search');
    if (options.queryFailure) throw new Error('Query unavailable');
    return options.location?.search || '';
  } });
  // Consent storage and cookie deletion are intentional; unrelated input is not.
  for (const [object, fields] of [[document, ['title', 'referrer']], [window.location, ['hash']]]) {
    fields.forEach(field => Object.defineProperty(object, field, { get() { throw new Error('Private field read: ' + field); } }));
  }
  const videos = [];
  for (const id of options.videos || []) {
    const item = document.createElement('video');
    item.setAttribute('data-analytics-video', id);
    Object.assign(item, { duration: 100, seeking: false, paused: true, ended: false, readyState: 4, ranges: [] });
    Object.defineProperty(item, 'played', { get() { return { length: this.ranges.length, start: i => this.ranges[i][0], end: i => this.ranges[i][1] }; } });
    item.fire = type => { if (type === 'playing') item.paused = false; item.dispatchEvent({ type, bubbles: false, isTrusted: true }); };
    videos.push(item);
    document.body.appendChild(item);
  }
  const context = vm.createContext({
    window, document, navigator: window.navigator, localStorage: storage,
    URL, URLSearchParams, Date, Number, Math, Set, Map, Object, Array,
    setTimeout: window.setTimeout, clearTimeout: window.clearTimeout,
    Event: class { constructor(type, init) { this.type = type; Object.assign(this, init); } },
    CustomEvent: class { constructor(type, init) { this.type = type; Object.assign(this, init); } }
  });
  if (options.realConfig) vm.runInContext(configSource, context);
  vm.runInContext(source, context);
  const clickId = id => { const item = document.getElementById(id); assert.ok(item, 'Expected UI element #' + id); item.click(); };
  const load = () => {
    const script = document.injectedScripts.find(item => item.id === 'hero-google-analytics');
    assert.ok(script, 'Expected deferred Google script');
    script.dispatchEvent({ type: 'load', target: script, bubbles: false });
    return script;
  };
  const calls = () => plain(Array.from(window.dataLayer || [], item => Array.from(item)));
  const events = () => calls().filter(item => item[0] === 'event');
  const click = (kind, id, extra = {}) => {
    const target = document.createElement(extra.tagName || 'a');
    target.setAttribute('data-analytics', kind);
    target.setAttribute('data-analytics-id', id);
    if (extra.disabled) target.disabled = true;
    Object.defineProperty(target, 'href', { get() { throw new Error('Link destination must not be read'); } });
    const nested = document.createElement('span');
    target.appendChild(nested);
    document.body.appendChild(target);
    nested.dispatchEvent({ type: extra.type || 'click', isTrusted: extra.isTrusted !== false, button: extra.button || 0, bubbles: true });
    return target;
  };
  return {
    window, document, preference, stored, storageReads, storageWrites, queryReads, videos, calls, events, click, load,
    allow: () => clickId('hero-analytics-allow'),
    decline: () => clickId('hero-analytics-decline'),
    rerun: () => vm.runInContext(source, context),
    flushTimers: () => { while (timers.length) timers.shift()(); },
    fire: (type, fields = {}) => document.dispatchEvent({ type, isTrusted: true, bubbles: false, ...fields })
  };
}

const scripts = f => f.document.injectedScripts;
const pageviews = f => f.events().filter(call => call[1] === 'page_view');
const customEvents = f => f.events().filter(call => call[1] !== 'page_view');
function accept(f) { f.allow(); f.load(); return f; }

function newsletterQuery(subject = 'The HERO Brief: What helps recovery?') {
  return '?' + new URLSearchParams({utm_source: 'newsletter', utm_medium: 'email', utm_campaign: subject}).toString();
}

function contexts(f) { return f.calls().filter(call => call[0] === 'config' || call[0] === 'event').map(call => call[2]); }

test('approved October and November newsletter tuples map atomically to fixed GA4 campaign fields', () => {
  for (const [subject, label] of [
    ['The HERO Brief: What helps recovery?', 'hero_brief_2026_10'],
    ['The HERO Brief What helps recovery', 'hero_brief_2026_10'],
    ['The HERO Brief: More sleep, smarter fueling', 'hero_brief_2026_11'],
    ['The HERO Brief More sleep smarter fueling', 'hero_brief_2026_11']
  ]) {
    const f = accept(boot({location: {pathname: '/newsletter.html', search: newsletterQuery(subject)}}));
    f.click('inquiry', 'study-participation');
    assert.equal(pageviews(f).length, 1);
    for (const params of contexts(f)) {
      assert.deepEqual(Object.fromEntries(CAMPAIGN_KEYS.map(key => [key, params[key]])), {
        campaign_id: label, campaign_name: label, campaign_source: 'newsletter', campaign_medium: 'email',
        campaign_term: '', campaign_content: ''
      });
      assert.equal(params.page_location, 'https://herolabsportsmedicine.com/newsletter.html');
      assert.equal(params.page_referrer, '');
      assert.equal(params.page_title, 'The HERO Brief newsletter');
    }
    assert.equal(pageviews(f)[0][2].page_id, 'newsletter');
    assert.ok(!JSON.stringify(f.calls()).includes(subject));
  }
});

test('actual MailerLite October redirect label and date yield fixed campaign attribution only', () => {
  const search = '?utm_source=newsletter&utm_medium=email&utm_term=2026-10-11&utm_campaign=The+HERO+Brief+What+helps+recovery';
  const f = accept(boot({location: {pathname: '/newsletter.html', search}}));
  for (const params of contexts(f)) {
    assert.equal(params.campaign_id, 'hero_brief_2026_10');
    assert.equal(params.campaign_name, 'hero_brief_2026_10');
    assert.equal(params.campaign_source, 'newsletter');
    assert.equal(params.campaign_medium, 'email');
    assert.equal(params.campaign_term, '');
    assert.equal(params.campaign_content, '');
    assert.equal(params.page_location, 'https://herolabsportsmedicine.com/newsletter.html');
    assert.equal(params.page_referrer, '');
  }
  const serialized = JSON.stringify([contexts(f), f.storageWrites]);
  assert.ok(!serialized.includes('2026-10-11'));
  assert.ok(!serialized.includes('The HERO Brief What helps recovery'));
  assert.ok(!serialized.includes('utm_'));
});

test('unknown query values, MailerLite date terms, and subscriber identifiers never reach GA4 or storage', () => {
  const search = newsletterQuery() + '&utm_term=2026-10-13&utm_content=private-content&utm_id=raw-campaign-id' +
    '&email=reader%40example.com&subscriber_id=private-subscriber&token=private-token&unknown=private-unknown';
  const f = accept(boot({location: {search}}));
  f.click('study-cta', 'hero-study');
  const serialized = JSON.stringify([f.calls(), f.storageWrites, f.document.cookieWrites]);
  for (const secret of ['2026-10-13', 'private-content', 'raw-campaign-id', 'reader@example.com',
    'private-subscriber', 'private-token', 'private-unknown', 'utm_']) assert.ok(!serialized.includes(secret), secret);
  assert.deepEqual([...new Set(f.storageReads)], [KEY]);
  assert.ok(f.storageWrites.every(([key]) => key === KEY));
  assert.equal(f.document.cookieWrites.length, 0, 'attribution adds no cookies');
});

test('missing, unknown, partial, case-changed, whitespace, duplicate and malformed tuples fail closed', () => {
  const approved = newsletterQuery();
  const rejected = [
    '', '?utm_source=newsletter', '?utm_medium=email', '?utm_campaign=hero_brief_2026_10',
    approved.replace('utm_source=newsletter', 'utm_source=Newsletter'),
    approved.replace('utm_source=newsletter', 'utm_source=newsletter+'),
    approved.replace('utm_medium=email', 'utm_medium=social'),
    approved.replace('utm_medium=email', 'utm_medium=%20email'),
    newsletterQuery('The HERO Brief: What helps recovery? '),
    newsletterQuery('The HERO Brief: What helps recovery? reader@example.com'),
    newsletterQuery('The HERO Brief What helps recovery '),
    newsletterQuery('The HERO Brief What helps recovery?'),
    newsletterQuery('The HERO Brief: What helps recovery'),
    newsletterQuery('The HERO Brief What Helps Recovery'),
    newsletterQuery('The HERO Brief What helps recovery reader@example.com'),
    newsletterQuery('The HERO Brief More sleep smarter fueling '),
    newsletterQuery('The HERO Brief More sleep, smarter fueling'),
    newsletterQuery('The HERO Brief More Sleep Smarter Fueling'),
    newsletterQuery('The HERO Brief More sleep smarter fueling extra'),
    newsletterQuery('The HERO Brief What helps recovery') + '&utm_campaign=The+HERO+Brief+What+helps+recovery',
    newsletterQuery('The HERO Brief: A future issue'),
    newsletterQuery('hero_brief_2026_10'),
    approved + '&utm_source=newsletter', approved + '&%75tm_source=newsletter',
    approved + '&utm_medium=email', approved + '&utm_campaign=other',
    approved + '&utm_campaign=The+HERO+Brief%3A+What+helps+recovery%3F',
    approved.replace('utm_source=newsletter', 'utm_source=%'),
    approved.replace('utm_medium=email', 'utm_medium=%E0%A4%A'),
    approved + '&unknown=%ZZ', approved + '&%FF=unknown', approved + '&unknown=%ED%A0%80',
    approved + '&unknown=' + 'x'.repeat(8192)
  ];
  for (const search of rejected) {
    const f = accept(boot({location: {search}}));
    assert.equal(pageviews(f).length, 1, 'rejected attribution still permits consented canonical pageview');
    for (const params of contexts(f)) {
      assert.ok(CAMPAIGN_KEYS.every(key => params[key] === ''), search.slice(0, 200));
      assert.equal(params.page_location, 'https://herolabsportsmedicine.com/');
      assert.equal(params.page_referrer, '');
    }
  }
  const unavailable = accept(boot({queryFailure: true}));
  assert.ok(contexts(unavailable).every(params => CAMPAIGN_KEYS.every(key => params[key] === '')));
});

test('query parsing waits for consent and all newsletter privacy guards still suppress Google', () => {
  const f = boot({location: {pathname: '/newsletter.html', search: newsletterQuery()}});
  assert.deepEqual(f.queryReads, []);
  f.decline();
  assert.deepEqual(f.queryReads, []);
  f.preference.click();
  f.allow();
  assert.deepEqual(f.queryReads, [], 'query is not read while Google is loading');
  f.load();
  assert.deepEqual(f.queryReads, ['search']);
  for (const guard of [
    {navigator: {doNotTrack: '1'}}, {navigator: {globalPrivacyControl: true}},
    {navigator: {webdriver: true}}, {frame: true}, {prerendering: true},
    {location: {protocol: 'http:'}}, {location: {hostname: 'localhost'}},
    {location: {pathname: '/privacy.html'}}
  ]) {
    const blocked = boot({...guard, stored: granted(), location: {
      pathname: '/newsletter.html', search: newsletterQuery(), ...guard.location
    }});
    assert.equal(scripts(blocked).length, 0);
    assert.equal(blocked.events().length, 0);
    assert.deepEqual(blocked.queryReads, []);
  }
});

test('newsletter denial and withdrawal prevent campaign events and form input is never instrumented', () => {
  const options = {location: {pathname: '/newsletter.html', search: newsletterQuery()}};
  const refused = boot({...options, stored: denied()});
  assert.equal(scripts(refused).length, 0);
  assert.equal(refused.events().length, 0);
  assert.deepEqual(refused.queryReads, []);
  const f = accept(boot(options));
  const before = f.events().length;
  for (const type of ['input', 'change', 'submit', 'message']) f.fire(type, {data: 'reader@example.com'});
  assert.equal(f.events().length, before);
  assert.equal(customEvents(f).length, 0);
  f.preference.click();
  f.decline();
  f.click('inquiry', 'study-participation');
  f.fire('visibilitychange');
  assert.equal(f.events().length, before);
  assert.equal(f.window['ga-disable-' + ID], true);
  assert.equal(f.window.reloads, 1);
});

test('newsletter HTML loads shared consent assets in order and exposes preferences; privacy stays excluded', () => {
  const html = fs.readFileSync(path.join(root, 'newsletter.html'), 'utf8');
  assert.match(html, /href="analytics-consent\.css\?[^\"]+"/);
  assert.match(html, /<button[^>]+data-analytics-preferences[^>]+hidden>Analytics preferences<\/button>/);
  assert.ok(html.indexOf('src="analytics-config.js?') < html.indexOf('src="analytics.js?'));
  assert.match(html, /src="analytics-config\.js\?[^\"]+" defer/);
  assert.match(html, /src="analytics\.js\?v=20261011-mailerlite" defer/);
  assert.doesNotMatch(html, /data-analytics=(?:"|')/);
  const privacy = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8');
  assert.doesNotMatch(privacy, /<script[^>]+analytics/);
  assert.match(privacy, /hero_brief_2026_10/);
  assert.match(privacy, /hero_brief_2026_11/);
});

test('undecided visitors make no external request and receive explicit allow/decline controls', () => {
  const f = boot();
  assert.equal(scripts(f).length, 0);
  assert.equal(f.events().length, 0);
  assert.ok(f.document.getElementById('hero-analytics-panel'));
  assert.ok(f.document.getElementById('hero-analytics-allow'));
  assert.ok(f.document.getElementById('hero-analytics-decline'));
  f.click('inquiry', 'study-participation');
  assert.equal(f.events().length, 0);
  assert.equal(scripts(f).length, 0);
});

test('declining and a remembered refusal never load Google', () => {
  const f = boot();
  f.decline();
  assert.equal(JSON.parse(f.stored.get(KEY)).choice, 'denied');
  f.click('study-cta', 'hero-study');
  assert.equal(scripts(f).length, 0);
  const reload = boot({ stored: f.stored.get(KEY) });
  reload.click('inquiry', 'study-participation');
  assert.equal(scripts(reload).length, 0);
  assert.equal(reload.events().length, 0);
});

test('acceptance loads one fixed Google script and one manual pageview after load', () => {
  const f = boot();
  f.allow();
  assert.equal(scripts(f).length, 1);
  assert.equal(pageviews(f).length, 0, 'manual pageview waits for script load');
  const script = scripts(f)[0];
  const url = new URL(script.src);
  assert.equal(url.origin, 'https://www.googletagmanager.com');
  assert.equal(url.pathname, '/gtag/js');
  assert.equal(url.searchParams.get('id'), ID);
  assert.equal(script.id, 'hero-google-analytics');
  assert.equal(JSON.parse(f.stored.get(KEY)).choice, 'granted');
  f.load();
  f.rerun();
  f.fire('visibilitychange');
  f.preference.click();
  f.allow();
  assert.equal(scripts(f).length, 1);
  assert.equal(pageviews(f).length, 1);
});

test('remembered unexpired acceptance loads automatically; malformed and expired choices do not', () => {
  const f = boot({ stored: granted() });
  assert.equal(scripts(f).length, 1);
  f.load();
  assert.equal(pageviews(f).length, 1);
  for (const stored of ['true', '{broken', '{}', 'null', JSON.stringify({ choice: 'granted' }),
    JSON.stringify({ choice: 'granted', expires: Date.now() - 1 }), JSON.stringify({ choice: 'yes', expires: Date.now() + 86400000 })]) {
    const invalid = boot({ stored });
    assert.equal(scripts(invalid).length, 0, stored);
    assert.equal(invalid.events().length, 0, stored);
  }
});

test('withdrawal immediately disables Google and stops all subsequent manual events', () => {
  const f = accept(boot());
  const before = f.events().length;
  f.preference.click();
  f.decline();
  assert.equal(f.window['ga-disable-' + ID], true);
  assert.equal(JSON.parse(f.stored.get(KEY)).choice, 'denied');
  f.click('study-cta', 'hero-study');
  f.fire('visibilitychange');
  assert.equal(f.events().length, before);
  assert.equal(scripts(boot({ stored: f.stored.get(KEY) })).length, 0);
});

test('declining while the tag is loading prevents configuration/pageviews at load completion', () => {
  const f = boot();
  f.allow();
  f.preference.click();
  f.decline();
  f.load();
  assert.equal(f.window['ga-disable-' + ID], true);
  assert.equal(f.events().length, 0);
  assert.equal(f.calls().filter(call => call[0] === 'config').length, 0);
});

test('storage errors fail closed initially and still allow an explicit in-memory choice', () => {
  const f = boot({ storageFailure: true });
  assert.equal(scripts(f).length, 0);
  assert.doesNotThrow(() => accept(f));
  assert.equal(pageviews(f).length, 1);
  f.preference.click();
  assert.doesNotThrow(() => f.decline());
  assert.equal(f.window['ga-disable-' + ID], true);
  assert.deepEqual([...new Set(f.storageReads)], [KEY]);
  assert.ok(f.storageWrites.every(([key]) => key === KEY));
});

test('production HTTPS host/page allowlists block local, preview, admin, private, and unknown pages', () => {
  for (const pathname of ['/workspace/', '/workspace/index.html', '/admin.html', '/preview-premium.html', '/404.html',
    '/private/token123', '/googlefe5f1d63033d9213.html', '/unlisted.html', '/%69ndex.html', '/privacy.html']) {
    assert.equal(scripts(boot({ stored: granted(), location: { pathname } })).length, 0, pathname);
  }
  for (const hostname of ['localhost', '127.0.0.1', '192.168.1.10', 'preview.herolabsportsmedicine.com', 'evil.example']) {
    assert.equal(scripts(boot({ stored: granted(), location: { hostname } })).length, 0, hostname);
  }
  assert.equal(scripts(boot({ stored: granted(), location: { protocol: 'http:' } })).length, 0);
  assert.equal(scripts(boot({ stored: granted(), location: { hostname: 'www.herolabsportsmedicine.com' } })).length, 1);
  for (const pathname of ['/', '/index.html', '/magnesium-formulation-study.html', '/magnesium.html', '/cold-water-immersion.html',
    '/concussion.html', '/wearables.html', '/travel-circadian.html', '/cwi-amssm-2025.html', '/mgt-amssm-2026.html',
    '/concussion-amssm-2026.html', '/press.html', '/faq.html', '/newsletter.html']) {
    assert.equal(scripts(boot({ stored: granted(), location: { pathname } })).length, 1, pathname);
  }
});

test('disabled or invalid config cannot load an external tag', () => {
  assert.equal(scripts(boot({ stored: granted(), config: { enabled: false } })).length, 0);
  for (const measurementId of ['', 'UA-123-4', 'G-', 'G-X?secret=abc', 'https://evil.example', 'G-x', 'G-X\n', 'G-OFFLINE123\n']) {
    assert.equal(scripts(boot({ stored: granted(), config: { measurementId } })).length, 0, measurementId);
  }
});

test('privacy preferences, automation, frames, and prerendering override remembered acceptance', () => {
  for (const navigator of [{ doNotTrack: '1' }, { doNotTrack: 'yes' }, { msDoNotTrack: '1' },
    { globalPrivacyControl: true }, { webdriver: true }]) {
    const f = boot({ stored: granted(), navigator });
    assert.equal(scripts(f).length, 0, JSON.stringify(navigator));
    assert.equal(f.events().length, 0);
  }
  assert.equal(scripts(boot({ stored: granted(), frame: true })).length, 0);
  assert.equal(scripts(boot({ stored: granted(), prerendering: true })).length, 0);
});

test('GA configuration suppresses automatic pageviews and advertising and supplies fixed page context', () => {
  const f = accept(boot({ location: { pathname: '/index.html' } }));
  const config = f.calls().find(call => call[0] === 'config');
  assert.ok(config);
  assert.equal(config[1], ID);
  assert.equal(config[2].send_page_view, false);
  assert.equal(config[2].allow_google_signals, false);
  assert.equal(config[2].allow_ad_personalization_signals, false);
  assert.equal(config[2].page_location, 'https://herolabsportsmedicine.com/');
  assert.equal(config[2].page_referrer, '');
  assert.equal(config[2].page_title, 'HERO Lab home');
  const consent = f.calls().filter(call => call[0] === 'consent');
  assert.ok(consent.some(call => call[2].analytics_storage === 'granted'));
  assert.ok(consent.every(call => call[2].ad_storage === 'denied' && call[2].ad_user_data === 'denied' && call[2].ad_personalization === 'denied'));
  const pv = pageviews(f)[0][2];
  assert.equal(pv.page_location, 'https://herolabsportsmedicine.com/');
  assert.equal(pv.page_referrer, '');
  assert.equal(pv.page_title, 'HERO Lab home');
});

test('explicit allowlisted events count once, including nested targets, and untrusted input stays out', () => {
  const f = accept(boot());
  f.click('study-cta', 'hero-study');
  f.click('study-cta', 'hero-study');
  f.click('inquiry', 'athlete-participation');
  f.click('inquiry', 'concussion-participation');
  f.click('download', 'study-film-web');
  const good = customEvents(f);
  assert.equal(good.length, 4);
  assert.deepEqual(good.map(call => call[1]), ['hero_study_cta', 'hero_inquiry_click', 'hero_inquiry_click', 'hero_film_download']);
  for (const [kind, id, extra] of [['study-cta', 'email@example.com?token=secret'], ['unknown', 'hero-study'],
    ['__proto__', 'constructor'], ['inquiry', 'constructor'], ['inquiry', 'study-participation', { tagName: 'input' }],
    ['inquiry', 'study-participation', { tagName: 'button', disabled: true }],
    ['inquiry', 'study-participation', { isTrusted: false }], ['inquiry', 'study-participation', { type: 'auxclick', button: 2 }]]) {
    f.click(kind, id, extra);
  }
  assert.equal(customEvents(f).length, 4);
  const serialized = JSON.stringify(f.calls());
  assert.ok(!serialized.includes('email@example.com'));
  assert.ok(!serialized.includes('token=secret'));
  assert.ok(!serialized.includes('mailto:'));
  assert.ok(!serialized.includes('constructor'));
  for (const event of good) {
    assert.equal(event[2].page_id, 'home');
    assert.ok(Object.keys(event[2]).every(key => ['send_to', 'page_id', 'action_id', 'film_id', 'page_location', 'page_title', 'page_referrer', ...CAMPAIGN_KEYS].includes(key)), 'Unexpected custom parameter: ' + JSON.stringify(event));
  }
});

test('no preconsent click replay and no events after leaving the allowlisted page or enabling GPC', () => {
  const f = boot();
  f.click('study-cta', 'hero-study');
  accept(f);
  assert.equal(customEvents(f).length, 0);
  f.click('study-cta', 'hero-study');
  assert.equal(customEvents(f).length, 1);
  f.window.location.pathname = '/workspace/index.html';
  f.click('inquiry', 'study-participation');
  assert.equal(customEvents(f).length, 1);
  const gpc = accept(boot());
  gpc.window.navigator.globalPrivacyControl = true;
  gpc.click('inquiry', 'study-participation');
  assert.equal(customEvents(gpc).length, 0);
});

test('film milestones deduplicate across updates, replay, and duplicate players', () => {
  const f = accept(boot({ videos: ['study-film-web', 'study-film-web'] }));
  const [film, duplicate] = f.videos;
  film.fire('playing');
  film.fire('playing');
  for (const end of [24, 25, 25, 50, 75, 100]) { film.ranges = [[0, end]]; film.fire('timeupdate'); }
  film.fire('ended');
  film.fire('ended');
  duplicate.fire('playing');
  duplicate.ranges = [[0, 100]];
  duplicate.fire('ended');
  assert.equal(customEvents(f).length, 5);
  assert.deepEqual(customEvents(f).map(call => call[1]), ['hero_film_play', 'hero_film_progress', 'hero_film_progress', 'hero_film_progress', 'hero_film_complete']);
});

test('seeking to the end cannot claim watched milestones or completion', () => {
  const f = accept(boot({ videos: ['study-film-web'] }));
  const [film] = f.videos;
  film.fire('playing');
  film.ranges = [[0, 2], [99, 100]];
  film.fire('timeupdate');
  film.fire('ended');
  assert.equal(customEvents(f).length, 1);
  assert.equal(customEvents(f)[0][1], 'hero_film_play');
});

test('played segments count unique footage and invalid/unlisted media is rejected', () => {
  const f = accept(boot({ videos: ['study-film-web', 'unlisted-private-film'] }));
  const [film, unknown] = f.videos;
  unknown.fire('playing');
  assert.equal(customEvents(f).length, 0);
  film.fire('playing');
  film.ranges = [[0, 25]];
  for (let i = 0; i < 8; i++) film.fire('timeupdate');
  film.ranges = [[0, 25], [50, 75]];
  film.fire('ended');
  assert.equal(customEvents(f).length, 3);
  for (const duration of [0, -1, NaN, Infinity, 7201]) { film.duration = duration; film.fire('ended'); }
  film.duration = 100;
  for (const ranges of [[[-1, 100]], [[0, Infinity]], [[0, 101]], [[50, 1]]]) { film.ranges = ranges; film.fire('ended'); }
  assert.equal(customEvents(f).length, 3);
});

test('consent withdrawal in another tab stops collection and preserves unrelated cookies', () => {
  const f = accept(boot({ cookies: { hero_ga: 'one', hero_ga_OFFLINE123: 'two', session: 'keep', unrelated: 'keep' } }));
  f.stored.set(KEY, denied());
  f.window.dispatchEvent({ type: 'storage', key: KEY, newValue: f.stored.get(KEY), bubbles: false });
  assert.equal(f.window['ga-disable-' + ID], true);
  f.click('study-cta', 'hero-study');
  assert.equal(customEvents(f).length, 0);
  assert.ok(!f.document.cookies.has('hero_ga'));
  assert.ok(!f.document.cookies.has('hero_ga_OFFLINE123'));
  assert.equal(f.document.cookies.get('session'), 'keep');
  assert.equal(f.document.cookies.get('unrelated'), 'keep');
});

test('Google load failure leaves the site functional and permits one explicit retry', () => {
  const f = boot();
  f.allow();
  const failed = scripts(f)[0];
  assert.doesNotThrow(() => failed.dispatchEvent({ type: 'error', target: failed, bubbles: false }));
  assert.equal(f.events().length, 0);
  assert.equal(f.window['ga-disable-' + ID], true);
  f.preference.click();
  f.allow();
  assert.equal(scripts(f).length, 2);
  const retry = scripts(f)[1];
  assert.doesNotThrow(() => retry.dispatchEvent({ type: 'load', target: retry, bubbles: false }));
  assert.equal(pageviews(f).length, 1);
});

test('preconsent watched footage cannot be reported later as a new film milestone', () => {
  const f = boot({ videos: ['study-film-web'] });
  const [film] = f.videos;
  film.ranges = [[0, 60]];
  accept(f);
  film.fire('playing');
  film.fire('timeupdate');
  assert.deepEqual(customEvents(f).map(call => call[1]), ['hero_film_play']);
  film.ranges = [[0, 84]];
  film.fire('timeupdate');
  assert.equal(customEvents(f).length, 1);
  film.ranges = [[0, 85]];
  film.fire('timeupdate');
  assert.equal(customEvents(f).length, 2);
  assert.equal(customEvents(f)[1][2].percent_watched, 25);
  film.ranges = [[0, 100]];
  film.fire('ended');
  assert.equal(customEvents(f).length, 2, 'forty percent newly watched cannot count as complete');
});

test('late duration metadata cannot turn preconsent played ranges into watched milestones', () => {
  const f = boot({ videos: ['study-film-web'] });
  const [film] = f.videos;
  film.duration = NaN;
  film.ranges = [[0, 60]];
  accept(f);
  film.duration = 100;
  film.fire('loadedmetadata');
  film.fire('playing');
  film.fire('timeupdate');
  assert.deepEqual(customEvents(f).map(call => call[1]), ['hero_film_play']);
});

test('a film already playing when Google loads tracks only future footage and emits play once', () => {
  const f = boot({ videos: ['study-film-web'] });
  const [film] = f.videos;
  film.ranges = [[0, 60]];
  film.paused = false;
  film.ended = false;
  film.readyState = 4;
  f.allow();
  assert.equal(customEvents(f).length, 0, 'playback before consent/tag initialization must not be queued');
  f.load();
  assert.deepEqual(customEvents(f).map(call => call[1]), ['hero_film_play']);
  film.fire('timeupdate');
  film.ranges = [[0, 84]];
  film.fire('timeupdate');
  assert.equal(customEvents(f).length, 1, 'earlier footage cannot contribute to the 25% milestone');
  film.ranges = [[0, 85]];
  film.fire('timeupdate');
  assert.equal(customEvents(f).length, 2);
  assert.equal(customEvents(f)[1][1], 'hero_film_progress');
  assert.equal(customEvents(f)[1][2].percent_watched, 25);
  film.fire('playing');
  film.fire('timeupdate');
  assert.equal(customEvents(f).filter(call => call[1] === 'hero_film_play').length, 1);
  film.ranges = [[0, 100]];
  film.fire('ended');
  assert.equal(customEvents(f).length, 2, 'forty percent newly watched cannot count as complete');
});

test('paused, ended, or unready video is not mistaken for active playback when Google loads', () => {
  for (const state of [{ paused: true, ended: false, readyState: 4 },
    { paused: false, ended: true, readyState: 4 }, { paused: false, ended: false, readyState: 1 }]) {
    const f = boot({ videos: ['study-film-web'] });
    Object.assign(f.videos[0], state);
    accept(f);
    assert.equal(customEvents(f).length, 0, JSON.stringify(state));
  }
});

test('allowing from the preferences panel restores focus to its opener without reloading', () => {
  const f = boot({ stored: denied() });
  f.preference.focus();
  f.preference.click();
  assert.equal(f.document.activeElement.id, 'hero-analytics-decline');
  assert.equal(f.document.getElementById('hero-analytics-panel').hidden, false);
  f.allow();
  assert.equal(f.document.getElementById('hero-analytics-panel').hidden, true);
  assert.equal(f.document.activeElement, f.preference);
  assert.equal(f.window.reloads || 0, 0);
});

test('declining from the preferences panel restores focus to its opener without reloading', () => {
  const f = boot({ stored: denied() });
  f.preference.focus();
  f.preference.click();
  assert.equal(f.document.activeElement.id, 'hero-analytics-decline');
  f.decline();
  assert.equal(f.document.getElementById('hero-analytics-panel').hidden, true);
  assert.equal(f.document.activeElement, f.preference);
  assert.equal(f.window.reloads || 0, 0);
  assert.equal(scripts(f).length, 0);
});
