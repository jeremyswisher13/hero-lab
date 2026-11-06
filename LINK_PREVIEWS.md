# Website link previews

The public pages in `scripts/link-previews.json` use static Open Graph and Twitter
metadata, short page-specific titles, and versioned preview images. SEO document
titles, canonical URLs, page bodies, and signup behavior are preserved.

The nine image families use the website's teal, aqua, ivory, and gold palette.
Each PNG is 1200 by 630 pixels. Artwork is illustrative, with no study statistics
or clinical outcome claims. The Summit graphic uses only large year numerals;
the other images contain no text. Accessible preview titles and image descriptions
are supplied through metadata. Apple touch icons provide a fallback.

## Edit and render

Edit the native SVGs in `images/social/source/`. They have no external images,
font dependencies, or scripts. Use a new dated PNG filename when revising published
artwork, then update its HTML metadata and manifest entry together.

Install the pinned renderer outside the repository, then render:

```sh
npm install --prefix /tmp/hero-preview-renderer --no-audit --no-fund @resvg/resvg-js@2.6.2
NODE_PATH=/tmp/hero-preview-renderer/node_modules node scripts/build_social_images.cjs
python3 scripts/check_link_previews.py
python3 scripts/check_public_copy.py
```

The SVGs and rendered PNGs are committed. Rendering is not required in CI; the
checker reads PNG dimensions and validates the source metadata without network
access or additional packages.

## Release verification

After deployment, check that the public HTML and images match the release. On
macOS, Apple's `LPMetadataProvider` can fetch the page title and preview image
without sending an iMessage. This verifies Apple's current metadata handling,
not the cached contents of an already-sent message bubble.

Share the branded website links for the desired previews:

- Main website: `https://herolabsportsmedicine.com/`
- Summit and its signup CTA: `https://herolabsportsmedicine.com/summit/`
- HERO Brief signup: `https://herolabsportsmedicine.com/newsletter.html`
- Research: the specific study or evidence-page URL

Google controls the preview of direct Google Form and Google Sheet links. Their
metadata is separate from the website; share the Summit page for the HERO Summit
preview. Keep private response-sheet links for authorized users.

The noindex newsletter preview and historical generic image remain unchanged.

Primary reference: [Apple TN3156, Create rich previews for Messages](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages).
