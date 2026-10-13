# Stylesheet bundles

Public website and newsletter copy must not use em dashes. Use periods,
commas, colons, or parentheses as appropriate. Run
`python3 scripts/check_public_copy.py` before publication. CI also scans
public text, including encoded punctuation in email links and metadata.
The embedded Google Form must be checked separately in its editor.

Run `node --test scripts/test_analytics.cjs` for offline analytics consent,
campaign attribution, and event privacy checks. The tests do not download the
Google tag or send analytics. Campaign attribution accepts only approved HERO
Brief links and maps their subjects to fixed labels after analytics consent.

Run `node --test scripts/test_newsletter.cjs` for offline checks of newsletter
email validation, consent, provider readiness, and errors. The tests execute
the production script against a small DOM fixture and never send a signup.
They do not verify email delivery or the provider's accepted address formats.

The homepage and formulation study load one CSS bundle each. The original
stylesheets remain the editing sources and retain their exact cascade order.
The bundle files stay in the site root so relative asset URLs still resolve.

After editing any source in `build_styles.py`, run:

```sh
python3 scripts/build_styles.py
python3 scripts/build_styles.py --check
```

Commit both generated CSS files and the updated HTML cache keys. Do not edit
`home-bundle.css` or `study-bundle.css` directly. Other pages use the original
stylesheets. The styles workflow checks that committed bundles are current.

`fonts.css` preserves the Inter declarations returned by Google Fonts on
September 7, 2026 for the existing `400;500;600;700;800;900&display=swap` request,
using an Android Chrome 151 user agent. It retains the same font URLs, weights,
unicode ranges, and swap behavior, removing the external CSS request. Font
binaries continue to be served by fonts.gstatic.com. No font binaries are
copied into this repository. Source request:
https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap


# Responsive photograph copies

The homepage and AMSSM magnesium gallery use smaller WebP copies selected
with `srcset` and layout-specific `sizes`. Original photographs remain in
place. Every derivative is encoded directly from its original, without
cropping, at quality 80 and method 6; embedded metadata is stripped.

To rebuild the 33 copies, install libwebp 1.6.0 (`cwebp`) and run:

```sh
python3 scripts/build_responsive_images.py
python3 scripts/build_responsive_images.py --check
```

Commit the generated `*-optimized.webp` files and
`scripts/responsive-images.json` with any source update. The manifest records
source and output hashes, dimensions, and byte sizes. The check requires only
Python 3 and verifies the committed assets without re-encoding them. New
image filenames keep cached original copies from masking the update.
