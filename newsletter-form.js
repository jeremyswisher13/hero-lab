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
    // Match the provider's format check so its local rejection also gets text.
    const providerEmailPattern = /^[a-zA-Z0-9_.+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,40}$/;

    function emailMessage() {
      if (!email.value.trim()) return 'Please enter your email address.';
      if (!email.validity.valid || !providerEmailPattern.test(email.value.trim())) {
        return 'Enter a valid email address, such as name@example.com.';
      }
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
      const message = count ? 'Please correct ' + count + (count === 1 ? ' field' : ' fields') + ' to subscribe.' : '';
      if (summary.textContent !== message) summary.textContent = message;
    }
    function clearServerError() {
      serverError.textContent = '';
      serverError.classList.add('d-none');
    }

    // Capture runs before the provider's submit listener. Invalid attempts never
    // reach its subscription handler; valid attempts use it without modification.
    form.addEventListener('submit', event => {
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
      }
    }, true);

    email.addEventListener('input', () => {
      if (!attempted) return;
      clearServerError();
      setError(emailField, emailMessage());
      updateSummary();
    });
    consent.addEventListener('change', () => {
      if (!attempted) return;
      clearServerError();
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
          ? 'Please check your email address and try again.'
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
