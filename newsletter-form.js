/* Accessible validation for the public MailerLite embed.
 * Valid submissions continue through MailerLite's own double opt-in flow.
 */
(() => {
  'use strict';

  const embed = document.querySelector('.ml-embedded[data-form="tn5fb0"]');
  if (!embed) return;

  function enhanceForm() {
    const form = embed.querySelector('form.ml-block-form');
    const email = form?.querySelector('input[type="email"]');
    const consent = form?.querySelector('.ml-form-checkboxRow.ml-validate-required input[type="checkbox"]');
    if (!form || !email || !consent) return false;

    // Our text errors replace browser bubbles, while retaining required semantics.
    form.noValidate = true;
    let attempted = false;
    let pendingRequest = null;
    let requestTimer;
    let observedProvider;
    const pendingMessage = 'We could not confirm your signup yet. Please check your inbox for a confirmation email and wait before trying again.';

    const summary = document.createElement('p');
    summary.className = 'hero-newsletter-error-summary';
    summary.setAttribute('role', 'alert');
    summary.setAttribute('aria-live', 'assertive');
    summary.setAttribute('aria-atomic', 'true');
    summary.hidden = true;
    form.prepend(summary);

    const requiredNote = document.createElement('p');
    requiredNote.className = 'hero-newsletter-required-note';
    requiredNote.textContent = 'Email and permission are required.';
    summary.after(requiredNote);

    // MailerLite writes transport errors into this selector, which its template omits.
    let serverError = form.querySelector('.ml-server-error');
    if (!serverError) {
      serverError = document.createElement('p');
      serverError.className = 'ml-server-error d-none hero-newsletter-server-error';
      requiredNote.after(serverError);
    }
    serverError.setAttribute('role', 'alert');
    serverError.setAttribute('aria-live', 'assertive');
    serverError.setAttribute('aria-atomic', 'true');
    serverError.tabIndex = -1;

    function field(input, name, group) {
      input.required = true;
      input.setAttribute('aria-required', 'true');
      input.setAttribute('aria-invalid', 'false');
      if (!input.id) input.id = 'hero-newsletter-' + name;

      let error = group.querySelector('.ml-field-error-message');
      if (!error) {
        error = document.createElement('p');
        error.className = 'ml-field-error-message hero-newsletter-field-error';
        group.append(error);
      }
      if (!error.id) error.id = input.id + '-error';
      const descriptions = new Set((input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
      descriptions.add(error.id);
      input.setAttribute('aria-describedby', Array.from(descriptions).join(' '));
      return { input, group, error };
    }

    const emailField = field(email, 'email', email.closest('.ml-field-group') || email.parentElement);
    const consentField = field(consent, 'permission', consent.closest('.ml-form-checkboxRow'));
    const fields = [emailField, consentField];
    const signupHelp = document.createElement('p');
    signupHelp.className = 'hero-newsletter-signup-help';
    signupHelp.id = email.id + '-signup-help';
    const helpLink = document.createElement('a');
    helpLink.href = 'mailto:jswisher@mednet.ucla.edu';
    helpLink.textContent = 'Email HERO Lab for signup help';
    signupHelp.append(helpLink);
    form.append(signupHelp);
    email.setAttribute('aria-describedby', email.getAttribute('aria-describedby') + ' ' + signupHelp.id);

    // Retain the existing provider-compatible format restriction. It is not
    // the definition of valid email syntax, and does not establish deliverability.
    const providerEmailPattern = /^[a-zA-Z0-9_.+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,40}$/;
    const unsupportedEmailMessage = 'This signup form does not support this email address format. Use another email address or the signup help link.';

    function emailMessage() {
      if (!email.value.trim()) return 'Please enter your email address.';
      if (!email.validity.valid) {
        return 'Enter a valid email address, such as name@example.com.';
      }
      if (!providerEmailPattern.test(email.value.trim())) return unsupportedEmailMessage;
      return '';
    }
    function consentMessage() {
      return consent.checked ? '' : 'Please confirm that you want to receive The HERO Brief.';
    }
    function setError(item, message) {
      if (item.error.textContent !== message) item.error.textContent = message;
      item.input.setAttribute('aria-invalid', String(Boolean(message)));
      item.group.classList.toggle('ml-error', Boolean(message));
    }
    function updateSummary() {
      const count = fields.filter(item => item.input.getAttribute('aria-invalid') === 'true').length;
      summary.hidden = count === 0;
      const message = count ? 'Please review ' + count + (count === 1 ? ' field' : ' fields') + ' before continuing.' : '';
      if (summary.textContent !== message) summary.textContent = message;
    }
    function clearServerError() {
      if (serverError.textContent) serverError.textContent = '';
      serverError.classList.add('d-none');
    }
    function showServerError(message, focus = true) {
      if (serverError.textContent !== message) serverError.textContent = message;
      serverError.classList.remove('d-none');
      if (focus) serverError.focus();
    }
    function finishRequest(request) {
      if (pendingRequest !== request) return;
      window.clearTimeout(requestTimer);
      pendingRequest = null;
      form.removeAttribute('aria-busy');
    }
    function observeProvider() {
      const provider = window.ml_jQuery;
      if (typeof provider !== 'function' || !provider(form).data('ml-submit-bound')) return false;
      if (observedProvider === provider) return true;
      observedProvider = provider;
      const action = new URL(form.action);
      function isSubscription(settings) {
        try {
          const url = new URL(settings.url, window.location.href);
          return url.origin === action.origin && url.pathname === action.pathname;
        } catch (_) {
          return false;
        }
      }
      // Observe the provider's public AJAX events. Its request, callback, loading
      // state, and double opt-in success flow remain owned by MailerLite.
      provider(document).on('ajaxSend.heroNewsletter', (event, request, settings) => {
        if (!isSubscription(settings)) return;
        pendingRequest = request;
        form.setAttribute('aria-busy', 'true');
        requestTimer = window.setTimeout(() => {
          if (pendingRequest !== request) return;
          // Keep the guard while allowing the notice inside the form to announce.
          form.removeAttribute('aria-busy');
          showServerError(pendingMessage, form.contains(document.activeElement));
        }, 20000);
      }).on('ajaxSuccess.heroNewsletter', (event, request, settings, response) => {
        if (!isSubscription(settings) || pendingRequest !== request) return;
        finishRequest(request);
        clearServerError();
        if (!response?.success && !response?.fieldsToConfirm?.length && !fields.some(item => item.group.classList.contains('ml-error') || item.input.getAttribute('aria-invalid') === 'true')) {
          showServerError('Your signup could not be completed. Please try again, or open signup in a new tab.');
        }
      }).on('ajaxError.heroNewsletter', (event, request, settings) => {
        if (!isSubscription(settings) || pendingRequest !== request) return;
        finishRequest(request);
        const message = serverError.textContent.trim();
        showServerError(message && message !== pendingMessage ? message : 'We could not confirm your signup. Please check your connection and inbox before trying again.');
      }).on('ajaxComplete.heroNewsletter', (event, request, settings) => {
        if (isSubscription(settings)) finishRequest(request);
      });
      return true;
    }

    // Capture runs before the provider's submit listener. Invalid attempts never
    // reach its subscription handler; valid attempts use it without modification.
    form.addEventListener('submit', event => {
      if (pendingRequest) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      attempted = true;
      clearServerError();
      setError(emailField, emailMessage());
      setError(consentField, consentMessage());
      updateSummary();
      const firstInvalid = fields.find(item => item.input.getAttribute('aria-invalid') === 'true');
      if (firstInvalid) {
        event.preventDefault();
        event.stopImmediatePropagation();
        firstInvalid.input.focus();
      } else if (window.navigator.onLine === false || !observeProvider()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showServerError(window.navigator.onLine === false
          ? 'You appear to be offline. Check your connection and try again.'
          : 'The signup form is still loading. Please try again, or open signup in a new tab.');
      }
    }, true);

    email.addEventListener('input', () => {
      if (!attempted) return;
      if (!pendingRequest) clearServerError();
      setError(emailField, emailMessage());
      updateSummary();
    });
    consent.addEventListener('change', () => {
      if (!attempted) return;
      if (!pendingRequest) clearServerError();
      setError(consentField, consentMessage());
      updateSummary();
    });

    // Preserve provider error messages and explain any provider validation that
    // marks a field invalid without supplying its own text.
    new MutationObserver(() => {
      let providerRejection = false;
      fields.forEach(item => {
        const markedInvalid = item.group.classList.contains('ml-error') || item.input.getAttribute('aria-invalid') === 'true';
        if (!markedInvalid) return;
        if (item.input.getAttribute('aria-invalid') !== 'true') {
          item.input.setAttribute('aria-invalid', 'true');
          providerRejection = true;
        }
        if (item.error.textContent.trim()) return;
        item.error.textContent = item === emailField
          ? emailMessage() || 'The signup service could not accept this email address. Use another email address or the signup help link.'
          : 'Please confirm that you want to receive The HERO Brief.';
        providerRejection = true;
      });
      if (providerRejection && attempted) {
        updateSummary();
        fields.find(item => item.input.getAttribute('aria-invalid') === 'true')?.input.focus();
      }
    }).observe(form, { subtree: true, attributes: true, attributeFilter: ['aria-invalid', 'class'], childList: true, characterData: true });

    return true;
  }

  // The provider injects its public form asynchronously.
  if (enhanceForm()) return;
  const observer = new MutationObserver(() => {
    if (enhanceForm()) observer.disconnect();
  });
  observer.observe(embed, { childList: true, subtree: true });
})();
