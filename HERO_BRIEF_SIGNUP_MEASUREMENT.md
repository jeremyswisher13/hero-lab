# HERO Brief signup measurement

Use only these complete URLs for public recruitment. The four UTM values must
be exact and unique. The fixed labels describe a consented signup journey, not verified first-touch
attribution. Updated October 18, 2026.

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
Exact recruitment tuples are recognized on the explicitly supported public
pages, including the newsletter archive and the sent October issue. After
analytics permission, capture occurs without waiting for Google to load. The
fixed label and expiry metadata can remain in same-tab session storage for up
to 30 minutes from the tagged visit. Untagged internal navigation preserves
valid saved evidence without extending its expiry. A current approved tuple
replaces it. An explicit invalid, unsupported, duplicate or malformed campaign
clears it, including a different monthly newsletter campaign. Google campaign
labels still describe only the current page's exact approved tuple; they are
not reconstructed from a saved source.
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
value is the approved current or valid saved label above. Otherwise it is
`not_recorded`. Withdrawal resets the input immediately and clears session
evidence. Session evidence contains only `source`, `expires` and the consent
expiry used to bind it to the current permission. Expired or changed permission,
DNT, GPC, invalid records and privacy guards invalidate saved evidence. No raw
URL, referrer, email, source cookie or source local-storage record is created. A repeat submission can overwrite the subscriber's previous source,
including with `not_recorded`. Withdrawal does not delete a previously saved
subscriber label. The standalone MailerLite fallback page uses its provider
default, without the website's source attribution or GA events.

## Website signup placements

`hero_signup_placement` is a separate native TEXT custom field. The website
adds one hidden `fields[hero_signup_placement]` input and sets it before the
normal provider submission. With analytics permission, an exact, unique
`hero_signup_placement` query value can record a known website invitation:

- Homepage: `home_hero`, `home_nav`, `home_section`, `home_footer`.
- Evidence pages: `wearables`, `magnesium`, `cwi`, `concussion`, or `travel`,
  followed by `_nav`, `_inline`, or `_footer`.
- Archive: `archive_nav`, `archive_body`, `archive_footer`.
- Sent issue: `issue_nav`, `issue_body`, `issue_footer`.

Only these fixed values qualify. Missing, duplicate, malformed, unknown and
privacy-suppressed placements are `not_recorded`. Placement is scoped to the
current signup URL and is not persisted or substituted for acquisition source.
For example, a consented Instagram visitor who browses an evidence page before
using its signup link can have source `instagram_story` and placement
`travel_inline`. An untagged visitor using that link still has source
`not_recorded` and placement `travel_inline`. Do not classify the latter as
acquired through a known outside channel.

## Provider verification and promotion links

The fresh distribution kit is saved locally as
`HERO_Brief_Source_Tracking_2026-10-18`. Replace the destination used for the
Instagram Story link sticker, bio and email signature with the appropriate
approved URL. Use separate talk and print QR assets. Previously printed plain
QR codes remain untagged and must be replaced. Do not append UTM values to the
standalone fallback and assume the provider records them.

Historical blank and `not_recorded` values remain Source unknown. Existing
external records must not be backfilled from names, dates, form membership or
website placement. This field records submission metadata and can be changed
by repeat submissions; it is not a guaranteed permanent first-acquisition
record. Exclude every owner-controlled QA address from source coverage and
new-subscriber counts.

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

Official provider references: [embedded form hidden segmentation fields](https://www.mailerlite.com/help/how-to-create-an-embedded-form), [native custom fields](https://www.mailerlite.com/help/how-to-create-and-use-custom-fields).
