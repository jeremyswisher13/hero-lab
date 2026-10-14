/* Execute HERO's actual enhancement without a browser, network or provider code.
 * Native validity results are fixture inputs, not a replacement email validator.
 * Provider events are controlled spies; these tests do not prove deliverability.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'newsletter-form.js'), 'utf8');

class Element {
  constructor(tag, document) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = document;
    this.attributes = {};
    this.children = [];
    this.listeners = {};
    this.hidden = false;
    this.value = '';
    this.checked = false;
    this.classList = {
      contains: name => this.className.split(/\s+/).includes(name),
      add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(' '); },
      remove: (...names) => { this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); },
      toggle: (name, force) => {
        const add = force === undefined ? !this.classList.contains(name) : force;
        this.classList[add ? 'add' : 'remove'](name);
        return add;
      }
    };
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }
  get className() { return this.getAttribute('class') || ''; }
  set className(value) { this.setAttribute('class', value); }
  get id() { return this.getAttribute('id') || ''; }
  set id(value) { this.setAttribute('id', value); }
  get href() { return this.getAttribute('href'); }
  set href(value) { this.setAttribute('href', value); }
  get textContent() { return (this._text || '') + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this._text = String(value); this.children = []; }
  append(...children) { for (const child of children) { child.parentElement = this; this.children.push(child); } }
  prepend(child) { child.parentElement = this; this.children.unshift(child); }
  after(child) {
    const parent = this.parentElement;
    child.parentElement = parent;
    parent.children.splice(parent.children.indexOf(this) + 1, 0, child);
  }
  contains(target) { return this === target || this.children.some(child => child.contains(target)); }
  matches(selector) {
    const tag = selector.match(/^[\w-]+/);
    if (tag && this.tagName !== tag[0].toUpperCase()) return false;
    for (const [, name] of selector.matchAll(/\.([\w-]+)/g)) if (!this.classList.contains(name)) return false;
    for (const [, name, value] of selector.matchAll(/\[([\w-]+)="([^"]*)"\]/g)) if (this.getAttribute(name) !== value) return false;
    return true;
  }
  querySelectorAll(selector) {
    const parts = selector.split(/\s+/);
    const matches = element => {
      if (!element.matches(parts[parts.length - 1])) return false;
      let ancestor = element.parentElement;
      for (let i = parts.length - 2; i >= 0; i--) {
        while (ancestor && !ancestor.matches(parts[i])) ancestor = ancestor.parentElement;
        if (!ancestor) return false;
        ancestor = ancestor.parentElement;
      }
      return true;
    };
    const result = [];
    const visit = node => {
      for (const child of node.children) {
        if (matches(child)) result.push(child);
        visit(child);
      }
    };
    visit(this);
    return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
  focus() { this.ownerDocument.activeElement = this; }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  dispatch(type) {
    const event = {
      type,
      defaultPrevented: false,
      stopped: false,
      preventDefault() { this.defaultPrevented = true; },
      stopImmediatePropagation() { this.stopped = true; }
    };
    for (const callback of this.listeners[type] || []) {
      callback(event);
      if (event.stopped) break;
    }
    return event;
  }
}

function boot({ value = '', nativeValid = false, checked = false, online = true, ready = true } = {}) {
  const document = { createElement: tag => new Element(tag, document) };
  const root = document.createElement('div');
  document.querySelector = selector => root.querySelector(selector);
  const embed = document.createElement('div');
  embed.className = 'ml-embedded';
  embed.setAttribute('data-form', 'tn5fb0');
  root.append(embed);
  const form = document.createElement('form');
  form.className = 'ml-block-form';
  form.action = 'https://dashboard.mailerlite.com/jsonp/2676652/forms/200888505463735643/subscribe';
  embed.append(form);
  const emailGroup = document.createElement('div');
  emailGroup.className = 'ml-field-group';
  const email = document.createElement('input');
  email.setAttribute('type', 'email');
  email.setAttribute('aria-describedby', 'provider-email-hint');
  email.value = value;
  email.validity = { valid: nativeValid };
  emailGroup.append(email);
  const consentGroup = document.createElement('div');
  consentGroup.className = 'ml-form-checkboxRow ml-validate-required';
  const consent = document.createElement('input');
  consent.setAttribute('type', 'checkbox');
  consent.checked = checked;
  consentGroup.append(consent);
  form.append(emailGroup, consentGroup);
  const events = new Map();
  const timers = new Map();
  const observers = [];
  let timerId = 0;
  const providerDocument = { on(name, callback) { events.set(name, callback); return this; } };
  const window = {
    addEventListener() {},
    navigator: { onLine: online },
    location: { href: 'https://herolabsportsmedicine.com/newsletter.html' },
    setTimeout(callback) { timers.set(++timerId, callback); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    ml_jQuery: target => target === form ? { data: () => ready } : providerDocument
  };
  class MutationObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() {}
  }
  vm.runInNewContext(source, { document, window, MutationObserver, URL });
  let providerSubmissions = 0;
  form.addEventListener('submit', () => { providerSubmissions++; });
  return {
    document, window, form, email, consent, emailGroup, consentGroup,
    emailError: emailGroup.querySelector('.ml-field-error-message'),
    consentError: consentGroup.querySelector('.ml-field-error-message'),
    summary: form.querySelector('.hero-newsletter-error-summary'),
    serverError: form.querySelector('.ml-server-error'),
    help: form.querySelector('.hero-newsletter-signup-help'),
    get providerSubmissions() { return providerSubmissions; },
    submit() { return form.dispatch('submit'); },
    providerEvent(name, request, response, url = form.action) { events.get(name + '.heroNewsletter')?.({}, request, { url }, response); },
    expireTimers() { for (const callback of [...timers.values()]) callback(); },
    observeMutations() { for (const observer of observers) observer.callback(); }
  };
}

test('empty email and missing permission receive text, semantics and first-field focus', () => {
  const page = boot();
  assert.equal(page.submit().defaultPrevented, true);
  assert.equal(page.providerSubmissions, 0);
  assert.match(page.emailError.textContent, /Please enter your email/);
  assert.match(page.consentError.textContent, /Please confirm/);
  assert.equal(page.email.required, true);
  assert.equal(page.consent.required, true);
  assert.equal(page.email.getAttribute('aria-invalid'), 'true');
  assert.equal(page.summary.textContent, 'Please review 2 fields before continuing.');
  assert.equal(page.document.activeElement, page.email);
});

test('native-invalid email is distinguished from unsupported form syntax', () => {
  const page = boot({ value: 'name@', checked: true });
  page.submit();
  assert.match(page.emailError.textContent, /Enter a valid email address/);
  assert.doesNotMatch(page.emailError.textContent, /does not support/);
  assert.equal(page.email.value, 'name@');
  assert.equal(page.providerSubmissions, 0);
});

test('native-valid plus alias passes unchanged to the provider-owned handler', () => {
  const page = boot({ value: 'owner+qa@example.com', nativeValid: true, checked: true });
  assert.equal(page.submit().defaultPrevented, false);
  assert.equal(page.providerSubmissions, 1);
  assert.equal(page.email.value, 'owner+qa@example.com');
  assert.equal(page.emailError.textContent, '');
  assert.equal(page.summary.hidden, true);
});

test('native-valid apostrophe address gets a truthful limit and ordinary keyboard-reachable help link', () => {
  const address = "o'brien@example.com";
  const page = boot({ value: address, nativeValid: true, checked: true });
  assert.equal(page.submit().defaultPrevented, true);
  assert.equal(page.providerSubmissions, 0);
  assert.match(page.emailError.textContent, /This signup form does not support this email address format/);
  assert.doesNotMatch(page.emailError.textContent, /valid email|subscribed|enrolled/);
  assert.equal(page.email.value, address);
  assert.equal(page.help.hidden, false);
  const link = page.help.querySelector('a');
  assert.equal(link.href, 'mailto:jswisher@mednet.ucla.edu');
  assert.equal(link.getAttribute('tabindex'), null);
  assert.equal(link.textContent, 'Email HERO Lab for signup help');
  assert.match(page.email.getAttribute('aria-describedby'), /provider-email-hint/);
  assert.ok(page.email.getAttribute('aria-describedby').split(' ').includes(page.help.id));
});

test('other native-valid formats excluded by provider restriction also receive the compatibility message', () => {
  const page = boot({ value: 'owner!qa@example.com', nativeValid: true, checked: true });
  page.submit();
  assert.match(page.emailError.textContent, /does not support/);
  assert.equal(page.providerSubmissions, 0);
});

test('permission remains required for a supported email address', () => {
  const page = boot({ value: 'owner@example.com', nativeValid: true });
  page.submit();
  assert.equal(page.emailError.textContent, '');
  assert.match(page.consentError.textContent, /Please confirm/);
  assert.equal(page.document.activeElement, page.consent);
  assert.equal(page.providerSubmissions, 0);
});

test('editing an unsupported address and checking consent clears errors without auto-submitting', () => {
  const page = boot({ value: "o'brien@example.com", nativeValid: true });
  page.submit();
  page.email.value = 'owner+qa@example.com';
  page.email.dispatch('input');
  page.consent.checked = true;
  page.consent.dispatch('change');
  assert.equal(page.email.getAttribute('aria-invalid'), 'false');
  assert.equal(page.consent.getAttribute('aria-invalid'), 'false');
  assert.equal(page.summary.hidden, true);
  assert.equal(page.providerSubmissions, 0);
  assert.equal(page.submit().defaultPrevented, false);
});

test('not-ready provider blocks safely and announces a loading message', () => {
  const page = boot({ value: 'owner@example.com', nativeValid: true, checked: true, ready: false });
  assert.equal(page.submit().defaultPrevented, true);
  assert.match(page.serverError.textContent, /still loading/);
  assert.equal(page.serverError.classList.contains('d-none'), false);
  assert.equal(page.document.activeElement, page.serverError);
  assert.equal(page.providerSubmissions, 0);
});

test('offline browser blocks safely without entering the provider handler', () => {
  const page = boot({ value: 'owner@example.com', nativeValid: true, checked: true, online: false });
  assert.equal(page.submit().defaultPrevented, true);
  assert.match(page.serverError.textContent, /appear to be offline/);
  assert.equal(page.providerSubmissions, 0);
});

test('in-flight submission guard survives a timeout and clears after provider error', () => {
  const page = boot({ value: 'owner@example.com', nativeValid: true, checked: true });
  page.email.focus();
  page.submit();
  const request = {};
  page.providerEvent('ajaxSend', request);
  assert.equal(page.form.getAttribute('aria-busy'), 'true');
  assert.equal(page.submit().defaultPrevented, true);
  assert.equal(page.providerSubmissions, 1);
  page.expireTimers();
  assert.match(page.serverError.textContent, /could not confirm your signup yet/);
  assert.equal(page.form.getAttribute('aria-busy'), null);
  assert.equal(page.submit().defaultPrevented, true);
  page.providerEvent('ajaxError', request);
  assert.match(page.serverError.textContent, /check your connection and inbox/);
  assert.equal(page.submit().defaultPrevented, false);
  assert.equal(page.providerSubmissions, 2);
});

test('unrelated provider requests do not lock this form', () => {
  const page = boot({ value: 'owner@example.com', nativeValid: true, checked: true });
  page.submit();
  page.providerEvent('ajaxSend', {}, null, 'https://example.com/other');
  assert.equal(page.submit().defaultPrevented, false);
  assert.equal(page.form.getAttribute('aria-busy'), null);
});

test('provider success leaves confirmation behavior to MailerLite without inventing enrollment', () => {
  const page = boot({ value: 'owner@example.com', nativeValid: true, checked: true });
  page.submit();
  const request = {};
  page.providerEvent('ajaxSend', request);
  page.providerEvent('ajaxSuccess', request, { success: true });
  assert.equal(page.form.getAttribute('aria-busy'), null);
  assert.equal(page.serverError.textContent, '');
  assert.doesNotMatch(page.form.textContent, /you are subscribed|you are enrolled/i);
});

test('provider rejection without field text gets an honest help message, preserving provider text when present', () => {
  const page = boot({ value: 'owner@example.com', nativeValid: true, checked: true });
  page.submit();
  page.emailGroup.classList.add('ml-error');
  page.observeMutations();
  assert.match(page.emailError.textContent, /signup service could not accept/);
  assert.equal(page.email.value, 'owner@example.com');
  assert.equal(page.document.activeElement, page.email);
  page.emailError.textContent = 'Provider-specific explanation';
  page.observeMutations();
  assert.equal(page.emailError.textContent, 'Provider-specific explanation');
});
