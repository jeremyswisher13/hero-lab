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
const newsletterSource = fs.readFileSync(path.join(root, 'newsletter-form.js'), 'utf8');
const configSource = fs.readFileSync(path.join(root, 'analytics-config.js'), 'utf8');
const KEY = 'hero-analytics-consent-v1';
const SOURCE_KEY = 'hero-signup-source-v1';
const SOURCE_LIFETIME = 30 * 60 * 1000;
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
    if (!event.stopImmediatePropagation) event.stopImmediatePropagation = () => { event.immediateStopped = true; event.stopped = true; };
    event.currentTarget = this;
    if (typeof this['on' + event.type] === 'function') this['on' + event.type].call(this, event);
    for (const item of [...(this.listeners[event.type] || [])]) {
      item.fn.call(this, event);
      if (item.once) this.removeEventListener(event.type, item.fn);
      if (event.immediateStopped) break;
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
  after(child) {
    const parent = this.parentNode;
    const next = parent.children[parent.children.indexOf(this) + 1];
    parent.insertBefore(child, next);
  }
  contains(target) { return target === this || this.children.some(child => child.contains?.(target)); }
  focus() { this.ownerDocument.activeElement = this; }
  click() { this.dispatchEvent({ type: 'click', isTrusted: true, button: 0, bubbles: true }); }
  showModal() { this.open = true; }
  close() { this.open = false; }
  matches(selector) {
    if (selector.includes(' ')) {
      const parts = selector.split(/\s+/);
      if (!this.matches(parts.pop())) return false;
      let ancestor = this.parentElement;
      while (parts.length) {
        const part = parts.pop();
        while (ancestor && !ancestor.matches(part)) ancestor = ancestor.parentElement;
        if (!ancestor) return false;
        ancestor = ancestor.parentElement;
      }
      return true;
    }
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
  const clock = options.clock || (options.now === undefined ? null : {now: options.now});
  const FixtureDate = clock === null ? Date : class extends Date {
    constructor(...args) { super(...(args.length ? args : [clock.now])); }
    static now() { return clock.now; }
  };
  const document = new Document(options);
  const preference = document.createElement('button');
  preference.setAttribute('data-analytics-preferences', '');
  document.body.appendChild(preference);
  const stored = options.localStore || new Map(options.stored === undefined ? [] : [[KEY, options.stored]]);
  const sessionStore = options.sessionStore || new Map();
  const storageReads = [];
  const storageWrites = [];
  const queryReads = [];
  const sessionReads = [];
  const sessionWrites = [];
  const sessionRemovals = [];
  const storage = {
    getItem(key) { storageReads.push(key); if (options.storageFailure) throw new Error('Storage blocked'); return stored.get(key) ?? null; },
    setItem(key, value) { storageWrites.push([key, value]); if (options.storageFailure) throw new Error('Storage blocked'); stored.set(key, value); },
    removeItem(key) { if (options.storageFailure) throw new Error('Storage blocked'); stored.delete(key); }
  };
  const sessionStorage = {
    getItem(key) { sessionReads.push(key); if (options.sessionFailure) throw new Error('Session storage blocked'); return sessionStore.get(key) ?? null; },
    setItem(key, value) { sessionWrites.push([key, value]); if (options.sessionFailure) throw new Error('Session storage blocked'); sessionStore.set(key, value); },
    removeItem(key) { sessionRemovals.push(key); if (options.sessionFailure) throw new Error('Session storage blocked'); sessionStore.delete(key); }
  };
  const timers = [];
  const providerEvents = new Map();
  const observers = [];
  const window = new EventTarget();
  Object.assign(window, {
    HERO_ANALYTICS_CONFIG: { enabled: true, measurementId: ID, ...options.config },
    location: { protocol: 'https:', hostname: 'herolabsportsmedicine.com', pathname: '/', search: '', reload() { window.reloads = (window.reloads || 0) + 1; }, ...options.location },
    navigator: { onLine: true, ...options.navigator },
    localStorage: storage,
    sessionStorage,
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
  let embed, form, email, permission, sourceInput;
  if (options.newsletter) {
    embed = document.createElement('div');
    embed.className = 'ml-embedded';
    embed.setAttribute('data-form', 'tn5fb0');
    form = document.createElement('form');
    form.className = 'ml-block-form';
    form.action = 'https://dashboard.mailerlite.com/jsonp/2676652/forms/200888505463735643/subscribe';
    const emailGroup = document.createElement('div');
    emailGroup.className = 'ml-field-group';
    email = document.createElement('input');
    email.setAttribute('type', 'email');
    email.value = 'private-reader@example.com';
    email.validity = {valid: true};
    emailGroup.append(email);
    const permissionGroup = document.createElement('div');
    permissionGroup.className = 'ml-form-checkboxRow ml-validate-required';
    permission = document.createElement('input');
    permission.setAttribute('type', 'checkbox');
    permission.checked = true;
    permissionGroup.append(permission);
    form.append(emailGroup, permissionGroup);
    if (options.sourceField !== false) {
      sourceInput = document.createElement('input');
      sourceInput.setAttribute('type', 'hidden');
      sourceInput.setAttribute('name', 'fields[hero_signup_source]');
      sourceInput.value = 'untrusted-provider-default';
      form.append(sourceInput);
    }
    if (!options.delayedForm) embed.append(form);
    document.body.append(embed);
    const providerDocument = {on(name, callback) {providerEvents.set(name, callback); return this;}};
    window.ml_jQuery = target => target === form ? {data: () => options.providerReady !== false} : providerDocument;
  }
  class MutationObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  }
  const context = vm.createContext({
    window, document, navigator: window.navigator, localStorage: storage, sessionStorage,
    URL, URLSearchParams, Date: FixtureDate, Number, Math, Set, Map, Object, Array, MutationObserver,
    setTimeout: window.setTimeout, clearTimeout: window.clearTimeout,
    Event: class { constructor(type, init) { this.type = type; Object.assign(this, init); } },
    CustomEvent: class { constructor(type, init) { this.type = type; Object.assign(this, init); } }
  });
  if (options.realConfig) vm.runInContext(configSource, context);
  if (options.newsletter && options.formFirst) vm.runInContext(newsletterSource, context);
  vm.runInContext(source, context);
  if (options.newsletter && !options.formFirst) vm.runInContext(newsletterSource, context);
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
    sessionStore, sessionReads, sessionWrites, sessionRemovals,
    form, email, permission, sourceInput,
    get placementInput() { return form?.querySelectorAll('input[type="hidden"]').find(input => input.getAttribute('name') === 'fields[hero_signup_placement]'); },
    injectForm: () => { embed.append(form); observers.filter(item => item.target === embed && !item.disconnected).forEach(item => item.callback()); },
    submit: () => { const event = {type: 'submit', bubbles: false}; form.dispatchEvent(event); return event; },
    providerEvent: (name, request, response, url = form.action) => providerEvents.get(name + '.heroNewsletter')?.({}, request, {url}, response),
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
    ['The HERO Brief What helps recovery ', 'hero_brief_2026_10'],
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

test('actual MailerLite October redirect ending in plus preserves the approved single trailing space', () => {
  const url = 'https://herolabsportsmedicine.com/newsletter.html?utm_source=newsletter&utm_medium=email&utm_term=2026-10-11&utm_campaign=The+HERO+Brief+What+helps+recovery+';
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('utm_campaign'), 'The HERO Brief What helps recovery ');
  const search = parsed.search;
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
  // A real gtag initialization date can coincide with the query date sentinel.
  // Freeze the fixture clock while retaining the scan of every call and write.
  const now = Date.parse('2026-01-02T03:04:05Z');
  const f = accept(boot({location: {search}, now}));
  f.click('study-cta', 'hero-study');
  assert.deepEqual(f.calls().filter(call => call[0] === 'js'), [['js', new Date(now).toISOString()]]);
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
    newsletterQuery(' The HERO Brief What helps recovery'),
    newsletterQuery(' The HERO Brief What helps recovery '),
    newsletterQuery('The HERO Brief What helps recovery  '),
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
  assert.deepEqual(f.queryReads, ['search'], 'consented context is captured independently of Google readiness');
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
  assert.match(html, /src="analytics\.js\?v=20261018-signup-sources" defer/);
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
    '/concussion-amssm-2026.html', '/press.html', '/faq.html', '/newsletter.html',
    '/newsletter-archive.html', '/hero-brief-2026-10-13.html']) {
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

const SIGNUP_SOURCES = [
  ['instagram', 'social', 'story', 'instagram_story'],
  ['instagram', 'social', 'bio', 'instagram_bio'],
  ['email', 'signature', 'signature', 'email_signature'],
  ['event', 'qr', 'talk', 'event_talk'],
  ['event', 'qr', 'print', 'event_print']
];
function signupQuery(source = 'instagram', medium = 'social', content = 'story') {
  return '?' + new URLSearchParams({utm_source: source, utm_medium: medium, utm_campaign: 'hero_brief_signup', utm_content: content});
}
function signupBoot(options = {}) {
  return boot({...options, newsletter: true, location: {pathname: '/newsletter.html', search: signupQuery(), ...options.location}});
}
const signupEvents = f => f.events().filter(call => /^hero_newsletter_/.test(call[1]));
function beginRequest(f) {
  assert.equal(f.submit().defaultPrevented, undefined);
  const request = {};
  f.providerEvent('ajaxSend', request);
  return request;
}

test('five approved signup tuples map to fixed campaigns and optional source labels in either script order', () => {
  for (const formFirst of [false, true]) for (const [source, medium, content, label] of SIGNUP_SOURCES) {
    const f = signupBoot({formFirst, location: {search: signupQuery(source, medium, content)}});
    assert.equal(f.sourceInput.value, 'not_recorded');
    assert.deepEqual(f.queryReads, []);
    f.allow();
    assert.equal(f.sourceInput.value, label, 'source follows consent before provider serialization or Google readiness');
    assert.equal(f.events().length, 0);
    f.load();
    for (const params of contexts(f)) {
      assert.deepEqual(Object.fromEntries(CAMPAIGN_KEYS.map(key => [key, params[key]])), {
        campaign_id: 'hero_brief_signup', campaign_name: 'hero_brief_signup', campaign_source: source,
        campaign_medium: medium, campaign_term: '', campaign_content: content
      });
    }
    assert.deepEqual(f.queryReads, ['search'], 'only one consented query read on the signup page');
    assert.equal(f.storageWrites.length, 1);
    assert.equal(f.storageWrites[0][0], KEY, 'local storage contains only consent');
    assert.deepEqual(f.sessionWrites.map(([key, value]) => [key, JSON.parse(value).source]), [[SOURCE_KEY, label]]);
  }
});

test('signup recruitment tuples reject missing, duplicate, encoded duplicate, mismatched and malformed values', () => {
  const good = signupQuery();
  const rejected = [
    '', '?utm_source=instagram', good.replace('&utm_content=story', ''),
    good.replace('utm_source=instagram', 'utm_source=Instagram'),
    good.replace('utm_source=instagram', 'utm_source=instagram+'),
    good.replace('utm_medium=social', 'utm_medium=qr'),
    good.replace('utm_campaign=hero_brief_signup', 'utm_campaign=HERO_brief_signup'),
    good.replace('utm_content=story', 'utm_content=bio+'),
    signupQuery('email', 'signature', 'bio'), signupQuery('event', 'qr', 'story'),
    signupQuery('instagram', 'social', 'reader@example.com'),
    good + '&utm_source=instagram', good + '&%75tm_source=instagram',
    good + '&utm_medium=social', good + '&utm_campaign=hero_brief_signup',
    good + '&utm_content=story', good + '&%75tm_content=story',
    good + '&unknown=%ZZ', good + '&unknown=%ED%A0%80', good + '&unknown=' + 'x'.repeat(8192)
  ];
  for (const search of rejected) {
    const f = accept(signupBoot({location: {search}}));
    assert.equal(f.sourceInput.value, 'not_recorded', search.slice(0, 100));
    assert.ok(contexts(f).every(params => CAMPAIGN_KEYS.every(key => params[key] === '')));
  }
  const unreadable = accept(signupBoot({queryFailure: true}));
  assert.equal(unreadable.sourceInput.value, 'not_recorded');
  const otherPage = accept(boot({location: {search: good}}));
  assert.equal(otherPage.window.HERO_NEWSLETTER_ANALYTICS, undefined);
  assert.ok(contexts(otherPage).every(params => params.campaign_id === 'hero_brief_signup'));
  assert.equal(JSON.parse(otherPage.sessionStore.get(SOURCE_KEY)).source, 'instagram_story');
});

function journeyState() {
  const clock = {now: Date.parse('2026-10-18T12:00:00Z')};
  const consentExpires = clock.now + 86400000;
  return {clock, localStore: new Map([[KEY, JSON.stringify({choice: 'granted', expires: consentExpires})]]),
    sessionStore: new Map(), consentExpires};
}
function savedSource(state, source = 'instagram_story') {
  return JSON.stringify({source, expires: state.clock.now + SOURCE_LIFETIME, consentExpires: state.consentExpires});
}

test('approved recruitment is captured on every public landing page without waiting for Google', () => {
  const paths = ['/', '/index.html', '/magnesium-formulation-study.html', '/magnesium.html', '/cold-water-immersion.html',
    '/concussion.html', '/wearables.html', '/travel-circadian.html', '/cwi-amssm-2025.html', '/mgt-amssm-2026.html',
    '/concussion-amssm-2026.html', '/press.html', '/faq.html', '/newsletter.html', '/newsletter-archive.html',
    '/hero-brief-2026-10-13.html'];
  for (const pathname of paths) {
    const state = journeyState();
    const f = boot({...state, location: {pathname, search: signupQuery('event', 'qr', 'talk')}});
    assert.equal(f.events().length, 0, pathname);
    assert.equal(scripts(f).length, 1, pathname);
    assert.deepEqual(JSON.parse(state.sessionStore.get(SOURCE_KEY)), {
      source: 'event_talk', expires: state.clock.now + SOURCE_LIFETIME, consentExpires: state.consentExpires
    }, pathname);
  }
});

test('a tagged visit survives research and archive detours into a late provider form with independent placement', () => {
  for (const formFirst of [false, true]) {
    const state = journeyState();
    state.localStore.clear();
    const landing = boot({...state, location: {search: signupQuery() + '&email=private-reader%40example.com&token=private-token'}});
    assert.equal(state.sessionStore.size, 0);
    assert.deepEqual(landing.queryReads, []);
    landing.allow();
    assert.equal(landing.events().length, 0, 'capture does not depend on Google load');
    const original = state.sessionStore.get(SOURCE_KEY);
    state.clock.now += 5 * 60 * 1000;
    const research = boot({...state, location: {pathname: '/wearables.html'}});
    state.clock.now += 5 * 60 * 1000;
    const archive = boot({...state, location: {pathname: '/newsletter-archive.html'}});
    assert.equal(state.sessionStore.get(SOURCE_KEY), original);
    assert.deepEqual([...research.sessionWrites, ...archive.sessionWrites], [], 'internal pages do not extend attribution');
    const signup = signupBoot({...state, formFirst, delayedForm: true, location: {search: '?hero_signup_placement=archive_body'}});
    signup.injectForm();
    assert.equal(signup.sourceInput.value, 'instagram_story');
    assert.equal(signup.placementInput.value, 'archive_body');
    signup.load();
    const request = beginRequest(signup);
    signup.providerEvent('ajaxSuccess', request, {success: true});
    assert.deepEqual(signupEvents(signup).map(call => call[1]), ['hero_newsletter_submit', 'hero_newsletter_accepted']);
    assert.ok(contexts(signup).every(params => CAMPAIGN_KEYS.every(key => params[key] === '')),
      'saved source and current placement do not manufacture a current GA campaign');
    const serialized = JSON.stringify([landing.sessionWrites, research.sessionWrites, archive.sessionWrites, signup.sessionWrites, signup.calls()]);
    for (const secret of ['private-reader', 'private-token', 'utm_', 'hero_signup_placement', 'archive_body']) assert.ok(!serialized.includes(secret), secret);
  }
});

test('source expiry is fixed at the tagged landing, never extended by navigation, reads or repeated permission', () => {
  const state = journeyState();
  const landing = boot({...state, location: {search: signupQuery()}});
  const original = state.sessionStore.get(SOURCE_KEY);
  state.clock.now += 20 * 60 * 1000;
  const signup = signupBoot({...state, location: {search: ''}});
  assert.equal(signup.window.HERO_NEWSLETTER_ANALYTICS.source(), 'instagram_story');
  assert.equal(state.sessionStore.get(SOURCE_KEY), original);
  state.clock.now += 10 * 60 * 1000;
  assert.equal(signup.window.HERO_NEWSLETTER_ANALYTICS.source(), 'not_recorded');
  assert.equal(state.sessionStore.has(SOURCE_KEY), false);
  beginRequest(signup);
  assert.equal(signup.sourceInput.value, 'not_recorded', 'the actual request uses the expired result');
  const late = signupBoot({...state, location: {search: signupQuery()}});
  late.decline();
  state.clock.now += SOURCE_LIFETIME;
  late.allow();
  assert.equal(late.window.HERO_NEWSLETTER_ANALYTICS.source(), 'not_recorded', 'late consent cannot extend the original landing');
  assert.equal(state.sessionStore.has(SOURCE_KEY), false);
  assert.equal(landing.events().length, 0);
});

test('an explicit campaign replaces or clears prior source while untagged queries preserve it', () => {
  const rejected = ['?utm_source=instagram', '?utm_content=story', '?UTM_SOURCE=instagram',
    signupQuery() + '&utm_source=instagram', signupQuery().replace('utm_content=story', 'utm_content=unknown'),
    '?utm_campaign=unknown', newsletterQuery(), '?unknown=%ZZ'];
  for (const search of rejected) {
    const state = journeyState();
    state.sessionStore.set(SOURCE_KEY, savedSource(state));
    const f = signupBoot({...state, location: {search: search + '&hero_signup_placement=home_nav'}});
    assert.equal(f.sourceInput.value, 'not_recorded', search);
    assert.equal(state.sessionStore.has(SOURCE_KEY), false, search);
    if (search === newsletterQuery()) {
      f.load();
      assert.ok(contexts(f).every(params => params.campaign_id === 'hero_brief_2026_10'));
    }
  }
  const state = journeyState();
  state.sessionStore.set(SOURCE_KEY, savedSource(state));
  const replacement = signupBoot({...state, location: {search: signupQuery('event', 'qr', 'print')}});
  assert.equal(replacement.sourceInput.value, 'event_print');
  assert.equal(JSON.parse(state.sessionStore.get(SOURCE_KEY)).source, 'event_print');
  const internal = signupBoot({...state, location: {search: '?hero_signup_placement=home_hero&unrelated=private-token'}});
  assert.equal(internal.sourceInput.value, 'event_print');
  assert.equal(internal.placementInput.value, 'home_hero');
});

test('session storage accepts only fixed source records for the current consent epoch and fails closed', () => {
  const badRecords = [
    '{bad json', 'null', '[]', '{}',
    {source: 'reader@example.com'}, {source: 'instagram_story', expires: 'later'},
    {source: 'instagram_story', expires: 0}, {source: 'instagram_story', consentExpires: 0},
    {source: 'instagram_story', token: 'private-token'}
  ];
  for (const bad of badRecords) {
    const state = journeyState();
    const base = JSON.parse(savedSource(state));
    state.sessionStore.set(SOURCE_KEY, typeof bad === 'string' ? bad : JSON.stringify({...base, ...bad}));
    const f = signupBoot({...state, location: {search: ''}});
    assert.equal(f.sourceInput.value, 'not_recorded');
    assert.equal(state.sessionStore.has(SOURCE_KEY), false);
    assert.deepEqual(f.sessionWrites, []);
  }
  for (const failure of [{sessionFailure: true}, {storageFailure: true}, {storageFailure: true, sessionFailure: true}]) {
    const f = signupBoot(failure);
    f.allow();
    assert.equal(f.sourceInput.value, 'instagram_story', 'current approved tuple works without persistence');
    assert.equal(f.sessionStore.size, 0);
    const next = signupBoot({...failure, stored: f.stored.get(KEY), location: {search: ''}});
    assert.equal(next.sourceInput.value, 'not_recorded');
  }
});

test('withdrawal, privacy guards and consent expiry clear source and prevent stale recovery after regrant', () => {
  for (const guard of [{navigator: {globalPrivacyControl: true}}, {navigator: {doNotTrack: '1'}},
    {navigator: {msDoNotTrack: 'yes'}}, {frame: true}, {prerendering: true}]) {
    const state = journeyState();
    state.sessionStore.set(SOURCE_KEY, savedSource(state));
    const f = signupBoot({...state, ...guard});
    assert.equal(f.sourceInput.value, 'not_recorded');
    assert.equal(state.sessionStore.has(SOURCE_KEY), false);
    assert.deepEqual(f.queryReads, []);
  }
  for (const otherTab of [false, true]) {
    const state = journeyState();
    const oldSource = savedSource(state);
    state.sessionStore.set(SOURCE_KEY, oldSource);
    const f = signupBoot({...state, location: {search: ''}});
    assert.equal(f.sourceInput.value, 'instagram_story');
    if (otherTab) {
      state.localStore.set(KEY, JSON.stringify({choice: 'denied', expires: state.clock.now + 86400001}));
      f.window.dispatchEvent({type: 'storage', key: KEY, bubbles: false});
    } else f.decline();
    assert.equal(f.sourceInput.value, 'not_recorded');
    assert.equal(state.sessionStore.has(SOURCE_KEY), false);
    f.allow();
    assert.equal(f.sourceInput.value, 'not_recorded');
    state.sessionStore.set(SOURCE_KEY, oldSource); // A dormant tab missed the withdrawal event.
    const dormant = signupBoot({...state, location: {search: ''}});
    assert.equal(dormant.sourceInput.value, 'not_recorded');
    assert.equal(state.sessionStore.has(SOURCE_KEY), false, 'old consent epoch cannot be reused');
  }
  for (const runtimeGuard of ['globalPrivacyControl', 'doNotTrack']) {
    const state = journeyState();
    state.sessionStore.set(SOURCE_KEY, savedSource(state));
    const f = signupBoot({...state, location: {search: ''}});
    f.window.navigator[runtimeGuard] = runtimeGuard === 'doNotTrack' ? '1' : true;
    beginRequest(f);
    assert.equal(f.sourceInput.value, 'not_recorded');
    assert.equal(state.sessionStore.has(SOURCE_KEY), false);
  }
  const state = journeyState();
  state.sessionStore.set(SOURCE_KEY, savedSource(state));
  const f = signupBoot({...state, location: {search: ''}});
  state.clock.now = state.consentExpires;
  beginRequest(f);
  assert.equal(f.sourceInput.value, 'not_recorded');
  assert.equal(state.sessionStore.has(SOURCE_KEY), false);
});

test('BFCache restoration reconciles source changes without replaying the old tagged landing', () => {
  for (const originalSearch of ['', signupQuery()]) {
    const state = journeyState();
    boot({...state, location: {search: signupQuery()}});
    const signup = signupBoot({...state, location: {search: originalSearch}});
    const originalExpiry = JSON.parse(state.sessionStore.get(SOURCE_KEY)).expires;
    assert.equal(signup.sourceInput.value, 'instagram_story');
    const originalReads = signup.queryReads.length;
    signup.window.dispatchEvent({type: 'pageshow', persisted: false, bubbles: false});
    assert.equal(signup.queryReads.length, originalReads, 'normal initial pageshow does not reparse the query');
    boot({...state, location: {pathname: '/wearables.html', search: '?utm_source=unknown'}});
    assert.equal(state.sessionStore.has(SOURCE_KEY), false);
    signup.window.dispatchEvent({type: 'pageshow', persisted: true, bubbles: false});
    assert.equal(signup.sourceInput.value, 'not_recorded');
    beginRequest(signup);
    assert.equal(signup.sourceInput.value, 'not_recorded', 'Back cannot restore cleared source before provider serialization');
    assert.equal(state.sessionStore.has(SOURCE_KEY), false, 'the original approved URL is not captured again');
    state.clock.now += 5 * 60 * 1000;
    boot({...state, location: {pathname: '/magnesium.html', search: signupQuery('event', 'qr', 'print')}});
    const replacement = state.sessionStore.get(SOURCE_KEY);
    signup.window.dispatchEvent({type: 'pageshow', persisted: true, bubbles: false});
    assert.equal(signup.sourceInput.value, 'event_print', 'the latest session evidence replaces cached memory');
    assert.equal(state.sessionStore.get(SOURCE_KEY), replacement, 'restoration does not extend expiry');
    assert.ok(JSON.parse(replacement).expires > originalExpiry);
  }
});

test('BFCache restoration rereads consent, guards and expiry before exposing either private form label', () => {
  for (const change of ['denied', 'expired', 'epoch', 'gpc', 'sourceExpired']) {
    const state = journeyState();
    boot({...state, location: {search: signupQuery()}});
    const signup = signupBoot({...state, location: {search: '?hero_signup_placement=home_nav'}});
    signup.load();
    const request = beginRequest(signup);
    if (change === 'denied') state.localStore.set(KEY, JSON.stringify({choice: 'denied', expires: state.consentExpires}));
    if (change === 'expired') state.clock.now = state.consentExpires;
    if (change === 'epoch') state.localStore.set(KEY, JSON.stringify({choice: 'granted', expires: state.consentExpires + 1}));
    if (change === 'gpc') signup.window.navigator.globalPrivacyControl = true;
    if (change === 'sourceExpired') state.clock.now += SOURCE_LIFETIME;
    signup.window.dispatchEvent({type: 'pageshow', persisted: true, bubbles: false});
    assert.equal(signup.sourceInput.value, 'not_recorded', change);
    assert.equal(state.sessionStore.has(SOURCE_KEY), false, change);
    assert.equal(signup.placementInput.value, ['denied', 'expired', 'gpc'].includes(change) ? 'not_recorded' : 'home_nav', change);
    signup.providerEvent('ajaxSuccess', request, {success: true});
    assert.deepEqual(signupEvents(signup).map(call => call[1]), ['hero_newsletter_submit'], 'a restored page does not accept an old request callback');
  }
  const state = journeyState();
  state.localStore.clear();
  const oldUnconsented = signupBoot({...state, location: {search: signupQuery()}});
  const later = boot({...state, location: {pathname: '/wearables.html', search: signupQuery('event', 'qr', 'talk')}});
  later.allow();
  const laterSource = state.sessionStore.get(SOURCE_KEY);
  oldUnconsented.window.dispatchEvent({type: 'pageshow', persisted: true, bubbles: false});
  assert.equal(oldUnconsented.sourceInput.value, 'event_talk', 'restoring an unread old URL does not recapture it');
  assert.equal(state.sessionStore.get(SOURCE_KEY), laterSource);
});

test('internal placements remain independent of source evidence, session storage and GA campaigns', () => {
  const placements = ['home_hero', 'home_nav', 'home_section', 'home_footer',
    'wearables_nav', 'wearables_inline', 'wearables_footer', 'magnesium_nav', 'magnesium_inline', 'magnesium_footer',
    'cwi_nav', 'cwi_inline', 'cwi_footer', 'concussion_nav', 'concussion_inline', 'concussion_footer',
    'travel_nav', 'travel_inline', 'travel_footer', 'archive_nav', 'archive_body', 'archive_footer',
    'issue_nav', 'issue_body', 'issue_footer'];
  for (const placement of placements) {
    const f = accept(signupBoot({location: {search: '?hero_signup_placement=' + placement}}));
    assert.equal(f.sourceInput.value, 'not_recorded');
    assert.equal(f.placementInput.value, placement);
    assert.equal(f.sessionStore.size, 0);
    assert.ok(contexts(f).every(params => CAMPAIGN_KEYS.every(key => params[key] === '')));
    assert.ok(!JSON.stringify(f.calls()).includes(placement));
  }
  for (const query of ['', '?hero_signup_placement=unknown', '?hero_signup_placement=Home_nav',
    '?hero_signup_placement=home_nav+', '?hero_signup_placement=reader%40example.com',
    '?hero_signup_placement=home_nav&hero_signup_placement=home_nav',
    '?hero_signup_placement=home_nav&%68ero_signup_placement=home_nav']) {
    const f = accept(signupBoot({location: {search: query + (query ? '&' : '?') + signupQuery().slice(1)}}));
    assert.equal(f.sourceInput.value, 'instagram_story');
    assert.equal(f.placementInput.value, 'not_recorded');
    assert.ok(contexts(f).every(params => params.campaign_id === 'hero_brief_signup'));
    assert.ok(f.sessionWrites.every(([, value]) => !value.includes('hero_signup_placement')));
  }
  const undecided = signupBoot({location: {search: '?hero_signup_placement=home_nav'}});
  assert.equal(undecided.placementInput.value, 'not_recorded');
  assert.deepEqual(undecided.queryReads, []);
  undecided.allow();
  assert.equal(undecided.placementInput.value, 'home_nav');
  undecided.decline();
  assert.equal(undecided.placementInput.value, 'not_recorded');
});

test('denial and privacy guards leave optional signup source unrecorded and do not read the query', () => {
  for (const guard of [
    {stored: denied()}, {navigator: {doNotTrack: '1'}}, {navigator: {globalPrivacyControl: true}},
    {navigator: {webdriver: true}}, {frame: true}, {prerendering: true},
    {config: {enabled: false}}, {location: {hostname: 'localhost'}}, {location: {protocol: 'http:'}}
  ]) {
    const f = signupBoot({stored: granted(), ...guard});
    assert.equal(f.sourceInput.value, 'not_recorded');
    assert.deepEqual(f.queryReads, []);
    const request = beginRequest(f);
    f.providerEvent('ajaxSuccess', request, {success: true});
    assert.equal(signupEvents(f).length, 0);
    assert.equal(scripts(f).length, 0);
  }
});

test('only the actual valid provider request counts submit, and strict provider success counts accepted once', () => {
  const f = accept(signupBoot());
  f.submit();
  assert.deepEqual(signupEvents(f), [], 'a valid local submit without AJAX is not measured');
  f.flushTimers();
  const unrelated = {};
  f.providerEvent('ajaxSend', unrelated, null, 'https://example.com/unrelated');
  f.providerEvent('ajaxSuccess', unrelated, {success: true});
  const request = beginRequest(f);
  assert.deepEqual(signupEvents(f).map(call => call[1]), ['hero_newsletter_submit']);
  f.providerEvent('ajaxSend', request);
  f.providerEvent('ajaxSuccess', {}, {success: true});
  assert.equal(f.submit().defaultPrevented, true, 'pending duplicate attempt remains blocked');
  f.providerEvent('ajaxSuccess', request, {success: true, email: 'private-response@example.com'});
  f.providerEvent('ajaxSuccess', request, {success: true});
  const repeat = beginRequest(f);
  f.providerEvent('ajaxSuccess', repeat, {success: true});
  assert.deepEqual(signupEvents(f).map(call => call[1]), ['hero_newsletter_submit', 'hero_newsletter_accepted']);
  const serialized = JSON.stringify([f.calls(), f.storageWrites]);
  for (const secret of ['private-reader', 'private-response', 'dashboard.mailerlite', 'utm_', 'untrusted-provider-default']) assert.ok(!serialized.includes(secret), secret);
  for (const call of signupEvents(f)) assert.deepEqual(Object.keys(call[2]).sort(), [
    'send_to', 'page_id', 'page_location', 'page_title', 'page_referrer', ...CAMPAIGN_KEYS
  ].sort());
  assert.ok(!f.events().some(call => /confirmed/.test(call[1])));
});

test('invalid, offline, unready, expired local attempt and unsolicited matching AJAX never count signup stages', () => {
  for (const options of [{providerReady: false}, {navigator: {onLine: false}}, {}]) {
    const f = accept(signupBoot(options));
    if (!options.providerReady && !options.navigator) f.email.validity.valid = false;
    assert.equal(f.submit().defaultPrevented, true);
    f.providerEvent('ajaxSend', {});
    assert.equal(signupEvents(f).length, 0);
  }
  const expired = accept(signupBoot());
  expired.submit();
  expired.flushTimers();
  const request = {};
  expired.providerEvent('ajaxSend', request);
  expired.providerEvent('ajaxSuccess', request, {success: true});
  assert.equal(signupEvents(expired).length, 0);
});

test('provider rejections, confirmation prompts, transport errors and completion alone never count accepted', () => {
  for (const [name, response] of [
    ['ajaxSuccess', {}], ['ajaxSuccess', {success: false}], ['ajaxSuccess', {success: 'true'}],
    ['ajaxSuccess', {fieldsToConfirm: ['email']}], ['ajaxError', {success: true}], ['ajaxComplete', {success: true}]
  ]) {
    const f = accept(signupBoot());
    const request = beginRequest(f);
    f.providerEvent(name, request, response);
    assert.deepEqual(signupEvents(f).map(call => call[1]), ['hero_newsletter_submit']);
    const retry = beginRequest(f);
    f.providerEvent('ajaxSuccess', retry, {success: true});
    assert.deepEqual(signupEvents(f).map(call => call[1]), ['hero_newsletter_submit', 'hero_newsletter_accepted']);
  }
});

test('late consent or tag readiness never replays signup submit or accepted stages', () => {
  for (const state of ['undecided', 'denied', 'loading']) {
    const f = signupBoot({stored: state === 'denied' ? denied() : undefined});
    if (state === 'loading') f.allow();
    const request = beginRequest(f);
    if (state !== 'loading') f.allow();
    f.load();
    f.providerEvent('ajaxSuccess', request, {success: true});
    assert.equal(signupEvents(f).length, 0, state);
    const future = beginRequest(f);
    f.providerEvent('ajaxSuccess', future, {success: true});
    assert.deepEqual(signupEvents(f).map(call => call[1]), ['hero_newsletter_submit', 'hero_newsletter_accepted']);
  }
});

test('withdrawal resets source before serialization and prevents pending acceptance, including another tab', () => {
  for (const otherTab of [false, true]) {
    const f = accept(signupBoot());
    const request = beginRequest(f);
    if (otherTab) {
      f.stored.set(KEY, denied());
      f.window.dispatchEvent({type: 'storage', key: KEY, bubbles: false});
    } else f.decline();
    assert.equal(f.sourceInput.value, 'not_recorded');
    f.providerEvent('ajaxSuccess', request, {success: true});
    const later = beginRequest(f);
    f.providerEvent('ajaxSuccess', later, {success: true});
    assert.deepEqual(signupEvents(f).map(call => call[1]), ['hero_newsletter_submit']);
  }
  const gpc = accept(signupBoot());
  const pending = beginRequest(gpc);
  gpc.window.navigator.globalPrivacyControl = true;
  gpc.providerEvent('ajaxSuccess', pending, {success: true});
  beginRequest(gpc);
  assert.equal(gpc.sourceInput.value, 'not_recorded');
  assert.deepEqual(signupEvents(gpc).map(call => call[1]), ['hero_newsletter_submit']);
});

test('source metadata adds the native hidden input to cached embeds and sanitizes it before every serialization', () => {
  const sourceInputs = f => f.form.querySelectorAll('input[type="hidden"]').filter(input => input.getAttribute('name') === 'fields[hero_signup_source]');
  const missing = accept(signupBoot({sourceField: false}));
  assert.equal(sourceInputs(missing).length, 1);
  assert.equal(sourceInputs(missing)[0].value, 'instagram_story');
  const request = beginRequest(missing);
  missing.providerEvent('ajaxSuccess', request, {success: true});
  assert.equal(signupEvents(missing).length, 2);
  const f = accept(signupBoot({location: {search: signupQuery() + '&email=private-query%40example.com&token=private-token'}}));
  f.sourceInput.value = 'private-input@example.com';
  beginRequest(f);
  assert.equal(f.sourceInput.value, 'instagram_story');
  assert.ok(!JSON.stringify([f.calls(), f.storageWrites]).includes('private-'));
  const duplicate = f.document.createElement('input');
  duplicate.setAttribute('type', 'hidden');
  duplicate.setAttribute('name', 'fields[hero_signup_source]');
  duplicate.value = 'private-duplicate';
  f.form.append(duplicate);
  f.submit();
  assert.equal(sourceInputs(f).length, 1);
});

test('a provider form injected after consent receives the fixed source and keeps one enhancement', () => {
  for (const formFirst of [false, true]) {
    const f = signupBoot({formFirst, delayedForm: true});
    f.allow();
    f.load();
    f.injectForm();
    assert.equal(f.sourceInput.value, 'instagram_story');
    assert.equal(f.form.querySelectorAll('.hero-newsletter-error-summary').length, 1);
    const request = beginRequest(f);
    f.providerEvent('ajaxSuccess', request, {success: true});
    assert.equal(signupEvents(f).length, 2);
  }
});

test('source is fixed before the provider submit listener serializes and starts AJAX', () => {
  const f = accept(signupBoot());
  const request = {};
  let serializedSource;
  f.form.addEventListener('submit', () => {
    serializedSource = f.sourceInput.value;
    f.providerEvent('ajaxSend', request);
  });
  f.sourceInput.value = 'private-altered-default';
  f.submit();
  assert.equal(serializedSource, 'instagram_story');
  assert.deepEqual(signupEvents(f).map(call => call[1]), ['hero_newsletter_submit']);
  f.providerEvent('ajaxSuccess', request, {success: true});
  assert.equal(signupEvents(f).length, 2);
});

test('an eligible visible signup may be accepted after switching tabs, without accepting hidden starts', () => {
  const f = accept(signupBoot());
  const request = beginRequest(f);
  f.document.visibilityState = 'hidden';
  f.providerEvent('ajaxSuccess', request, {success: true});
  assert.deepEqual(signupEvents(f).map(call => call[1]), ['hero_newsletter_submit', 'hero_newsletter_accepted']);
  f.providerEvent('ajaxSuccess', request, {success: true});
  assert.equal(signupEvents(f).length, 2);
  const hiddenStart = accept(signupBoot());
  hiddenStart.document.visibilityState = 'hidden';
  const hiddenRequest = beginRequest(hiddenStart);
  hiddenStart.document.visibilityState = 'visible';
  hiddenStart.providerEvent('ajaxSuccess', hiddenRequest, {success: true});
  assert.equal(signupEvents(hiddenStart).length, 0);
  const withdrawn = accept(signupBoot());
  const revokedRequest = beginRequest(withdrawn);
  withdrawn.document.visibilityState = 'hidden';
  withdrawn.decline();
  withdrawn.providerEvent('ajaxSuccess', revokedRequest, {success: true});
  assert.deepEqual(signupEvents(withdrawn).map(call => call[1]), ['hero_newsletter_submit']);
});
