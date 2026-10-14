# HERO Brief signup measurement

Use only these complete URLs for public recruitment. The four UTM values must
be exact and unique. The fixed labels are current signup sources, not stored
first-touch attribution.

| Placement | Fixed MailerLite source | Approved URL |
| --- | --- | --- |
| Instagram story | `instagram_story` | [Story signup](https://herolabsportsmedicine.com/newsletter.html?utm_source=instagram&utm_medium=social&utm_campaign=hero_brief_signup&utm_content=story) |
| Instagram bio | `instagram_bio` | [Bio signup](https://herolabsportsmedicine.com/newsletter.html?utm_source=instagram&utm_medium=social&utm_campaign=hero_brief_signup&utm_content=bio) |
| Email signature | `email_signature` | [Signature signup](https://herolabsportsmedicine.com/newsletter.html?utm_source=email&utm_medium=signature&utm_campaign=hero_brief_signup&utm_content=signature) |
| Talk QR code | `event_talk` | [Talk signup](https://herolabsportsmedicine.com/newsletter.html?utm_source=event&utm_medium=qr&utm_campaign=hero_brief_signup&utm_content=talk) |
| Printed QR code | `event_print` | [Print signup](https://herolabsportsmedicine.com/newsletter.html?utm_source=event&utm_medium=qr&utm_campaign=hero_brief_signup&utm_content=print) |

The campaign is `hero_brief_signup`. GA receives only the approved fixed
source, medium, and content from this table, plus fixed public page context.
The term is empty. Existing approved monthly newsletter campaigns still work.
Recruitment attribution applies only on `/newsletter.html`. Untagged, partial,
unknown, duplicate, or malformed tuples have no recruitment attribution.
Do not add email addresses, subscriber identifiers, or personal data to links.

## MailerLite field

The original embedded form is `tn5fb0`, form ID `200888505463735643`, in account
`2676652`. Its native TEXT custom field is `hero_signup_source`. Configure it as
a hidden segmentation field with default `not_recorded`. MailerLite's generated
HTML uses this input contract:

```html
<input type="hidden" name="fields[hero_signup_source]" value="not_recorded">
```

The website ensures one such hidden input for cached embeds and sets it before
MailerLite serializes the normal form request. It never makes a separate
subscription request. With analytics permission and an approved tuple, the
value is the fixed label above. Otherwise it is `not_recorded`. Withdrawal
resets the input immediately. No source cookie or local-storage record is
created. A repeat submission can overwrite the subscriber's previous source,
including with `not_recorded`. Withdrawal does not delete a previously saved
subscriber label. The standalone MailerLite fallback page uses its provider
default, without the website's source attribution or GA events.

The October 13, 2026 owner-approved provider QA verified that `event_talk` was
retained on the unconfirmed record and after email confirmation activated it.
The initial owner QA record was then unsubscribed. A subsequent callback check
using the final production form enhancer observed the real provider request
start and successful acceptance, verifying the current form's synchronous AJAX
sequence. That same QA record is now Unconfirmed and outside active sends.
Exclude all owner QA records and activity from growth reports. Recheck field
retention and request callbacks after changing the form or provider settings.
Do not change the double opt-in configuration.

## Reporting limits

- `hero_newsletter_submit` means a locally valid form submission actually
  started the matching MailerLite AJAX request.
- `hero_newsletter_accepted` means that same request returned
  `response.success === true`. It can include an existing address and does not
  prove delivery, email confirmation, or a newly added subscriber.
- Each stage is counted once per page visit. Analytics must already be active
  when the request starts. Late consent or delayed Google loading never replays
  earlier stages. A request that began while visible may report acceptance after
  the reader switches to another tab, if consent and privacy guards still apply.
  Withdrawal, DNT, GPC, and the existing privacy guards suppress collection.
  Requests can still go to MailerLite when website analytics is off.
- No confirmed-subscription GA event exists. Use MailerLite's confirmed
  subscriber reporting for confirmation counts. Consented, once-per-page GA
  events and all-provider subscriber counts have different coverage and cannot
  be divided to produce an exact signup-to-confirmation conversion rate.
- Requests and responses, email addresses, form values, raw query strings,
  fragments, and referring-page URLs are never supplied to the analytics bridge
  or custom event payloads. Advertising and enhanced measurement stay disabled.

Run `node --test scripts/test_analytics.cjs scripts/test_newsletter.cjs` and
`python3 scripts/check_public_copy.py` before release. These offline checks do
not send signups, fetch Google's script, or prove email delivery or provider
field persistence.
