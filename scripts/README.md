# Stylesheet bundles

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
