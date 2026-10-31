# HERO Brief signup measurement

Use only these complete URLs for public recruitment. The four UTM values must
be exact and unique. The fixed labels describe a consented signup journey, not verified first-touch
attribution. Updated October 30, 2026.

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

## Current signup mode, October 29, 2026

The owner approved single opt-in for new subscriptions through the current
website form, `mWHwWK` / `201948685938984749`. Double opt-in is now disabled
for that form only. Permission remains required. Existing unconfirmed contacts
were not bulk activated, resubmitted, imported, or sent a reminder by this change.
The older form and historical confirmation evidence remain unchanged.

The website and native fallback success copy acknowledge the signup request.
A successful provider response can include an existing address and does not
prove a new active subscriber or verified email ownership. The website still
leaves subscription requests, spam checks and subscriber status to MailerLite.
The existing welcome workflow is retained, with repeat entry disabled.

Report new single-opt-in Active contacts as active subscribers, not email
confirmations. Preserve historical double-opt-in confirmation counts and
existing pending contacts separately. Do not combine both modes into one
email-confirmation conversion rate. The historical instruction below not to
change double opt-in was superseded by the owner's October 29 approval.

Offline checks do not verify a first-time subscriber's Active status, source
retention, or welcome-email delivery. Those require a separate owner-controlled
live test. Do not resubmit an existing unconfirmed reader for testing.

## MailerLite field and historical verification

The October 21, 2026 signup form is `mWHwWK`, form ID
`201948685938984749`, in account `2676652`, connected to the same newsletter
group. The website integration targets this form. Owner-controlled preproduction
checks passed for real plain-text and HTML confirmation emails and activation.
The existing welcome workflow is Active with a direct trigger for this form;
the newsletter group is not its trigger. Repeat entry is disabled. Live website
provider acceptance, confirmation delivery and activation, the enhanced success
message, and source and placement retention on an already-active QA repeat
submission passed. First-time subscriber field persistence before and after
confirmation and future welcome delivery were not separately tested. Do not
treat offline test results as evidence of email delivery or provider field
persistence.

The October 18 baseline used `tn5fb0`, form ID `200888505463735643`, in account
`2676652`. Keep that form and its historical QA evidence available during the
cutover. The native TEXT custom field is `hero_signup_source`. Configure it as
a hidden segmentation field with default `not_recorded`. The generated HTML
must use this input contract:

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
- Publication pages: `sleep_extension`, `athlete_travel`, or `collegiate_sleep`,
  followed by `_nav`, `_inline`, or `_footer`.

Only these fixed values qualify. Missing, duplicate, malformed, unknown and
privacy-suppressed placements are `not_recorded`. Placement is scoped to the
current signup URL and is not persisted or substituted for acquisition source.
For example, a consented Instagram visitor who browses an evidence page before
using its signup link can have source `instagram_story` and placement
`travel_inline`. An untagged visitor using that link still has source
`not_recorded` and placement `travel_inline`. Do not classify the latter as
acquired through a known outside channel.

The two signup-stage GA events now include `signup_placement`, using the
approved value captured when the matching provider request begins. Both stages
use that same value. It is `not_recorded` when the link supplies no approved
placement. This label does not change GA campaign fields, save a new acquisition
source, or read a form field. It is separate from the native MailerLite field.
Page-view and GA configuration payloads do not include this placement.

## Website link events

`hero_newsletter_cta` records a consented signup-link click with a fixed
`action_id` and, for invitation placements above, `signup_placement`. Existing
links to this site's HTTPS `/newsletter.html` qualify when they contain one
exact approved `hero_signup_placement`. Other query values and the clicked URL
are discarded. Off-site destinations, duplicate placement keys, unsupported
labels and malformed encodings do not qualify. Link parsing waits until
analytics is active and the consent and privacy checks pass.

For explicit markup, use `data-analytics="newsletter-cta"` and
`data-analytics-id="home_hero"`, replacing the ID with an approved placement.
The newsletter page's same-page return link can use `newsletter_repeat` as its
ID. That action has no placement parameter because it does not identify the
invitation that brought the reader to the signup page. Explicit and inferred
versions of the same placement share deduplication.

`hero_publication_click` records a selected original-publication link with a
fixed `publication_id`. Use `data-analytics="publication-source"` with one of
these `data-analytics-id` values:

- `sleep-extension-2026`
- `athlete-travel-2026`
- `collegiate-athlete-sleep-2024`

The publication event reports no destination, link text, DOI, or arbitrary ID.
Both click events count each approved action once per page visit, including
middle-clicks. They do not replay preconsent or pre-load actions and do not
establish that a reader subscribed, opened the destination, or read the paper.
No external analytics account settings or GA custom dimensions are configured
by this code change. Register the fixed event parameters in GA reporting only
if that is needed for a chosen report; these offline checks cannot verify
collection or report availability.

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
using the then-production form enhancer observed the real provider request
start and successful acceptance, verifying that form's synchronous AJAX
sequence. That same QA record is now Unconfirmed and outside active sends.
Exclude all owner QA records and activity from growth reports. Recheck field
retention and request callbacks after changing the form or provider settings.
Do not change the double opt-in configuration.

## October 21 form and workflow verification

Two independent fresh owner-controlled signups tested the new form before
website release. A later live website check used the historical owner QA
record. Genuine received MIME messages were decoded and inspected:

| Test path | text/plain characters | text/plain URLs | text/html characters | text/html URLs | Unresolved markers | Em dashes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Plain-text confirmation link | 361 | 1 | 32,578 | 11 | 0 in both parts | 0 in both parts |
| HTML confirmation button | 361 | 1 | 32,576 | 11 | 0 in both parts | 0 in both parts |
| Live website plain-text confirmation link | 361 | 1 | 32,578 | 11 | 0 in both parts | 0 in both parts |

The plain-text link activated its matching new-form contact at 14:39:48 UTC on
October 21, 2026. The HTML button independently activated a different matching
new-form contact at 14:40:18 UTC. Both joined the intended existing newsletter
group. Generated new-form markup was checked for `form.ml-block-form`, the
required permission checkbox row, and the native hidden source input.

The original welcome workflow, `201064442021021173`, is Active and retains
its existing email step, `201064494348109693`. Its form-completion trigger now
targets form `201948685938984749` directly, with repeat entry disabled. No
workflow copy, subscriber backfill, or manual subscriber addition was used.
Started, Completed, and Sent remained at 12 each, with 0 in progress, when the
updated trigger was verified. This verifies no welcome send was started by the
trigger update; it does not verify a future new subscriber's welcome delivery.

The live website signup received provider acceptance and displayed the
enhancer's "Check your inbox" success message and confirmation instructions.
Its native confirmation email arrived at 15:03:14 UTC on October 21, 2026.
The delivered plain-text URL confirmed the reused owner QA record at
15:05:25 UTC. That record had already received its welcome email historically.
After confirmation and a repeat submission, it still had only that one
historical welcome send. The workflow remained at 12 Completed, 12 Sent, and
0 in progress, with no re-entry or backfill observed.

An initial visit renewed analytics permission and reset acquisition context.
A fresh tagged visit with permission already set retained source `event_talk`
and placement `travel_inline` on the already-active QA record's repeat
submission. This verifies repeat-submission metadata retention, not a new
subscriber conversion. First-time subscriber persistence before and after
confirmation and a first-time new subscriber's welcome delivery were not
separately tested.

All three owner QA records used in the October 21 confirmation tests are now
Unsubscribed after the approved cleanup.
The owner's primary subscriber record was unchanged, and the browser's
original analytics-off preference was restored. Exclude all QA records and
their activity from growth reporting.

Raw received messages and confirmation evidence remain in private local
records; no test addresses, subscriber identifiers, or confirmation tokens
belong in this repository.

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
- No confirmed-subscription GA event exists. Use MailerLite's subscriber
  status reporting, separating historical email confirmations from new
  single-opt-in Active contacts. Consented, once-per-page GA
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
