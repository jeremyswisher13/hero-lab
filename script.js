// ========================================
// HERO Lab Website - JavaScript
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const body = document.body;
  const newsBanner = document.getElementById('newsBanner');
  const newsBannerClose = document.getElementById('newsBannerClose');
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const BANNER_KEY = 'herolab-news-banner-dismissed-magnesium-fall2026';

  let currentBannerHeight = 0;
  let bannerResizeObserver = null;
  let resizeFallbackAttached = false;

  const setBannerHeight = (height = 0) => {
    const nextHeight = Math.max(0, Math.ceil(height));
    if (nextHeight === currentBannerHeight) return;

    currentBannerHeight = nextHeight;
    root.style.setProperty('--news-banner-height', `${currentBannerHeight}px`);
  };

  const measureBanner = () => {
    const isVisible =
      newsBanner?.isConnected &&
      body.classList.contains('has-news-banner') &&
      !newsBanner.classList.contains('dismissed');

    setBannerHeight(isVisible ? newsBanner.getBoundingClientRect().height : 0);
  };

  const stopBannerMeasurement = () => {
    bannerResizeObserver?.disconnect();

    if (resizeFallbackAttached) {
      window.removeEventListener('resize', measureBanner);
      resizeFallbackAttached = false;
    }
  };

  let bannerWasDismissed = false;
  try {
    bannerWasDismissed = localStorage.getItem(BANNER_KEY) === 'true';
  } catch {
    // Storage can be unavailable in strict privacy contexts.
  }

  if (newsBanner && !bannerWasDismissed) {
    body.classList.add('has-news-banner');
    measureBanner();

    if ('ResizeObserver' in window) {
      bannerResizeObserver = new ResizeObserver(measureBanner);
      bannerResizeObserver.observe(newsBanner);
    } else {
      window.addEventListener('resize', measureBanner, { passive: true });
      resizeFallbackAttached = true;
    }

    window.addEventListener('load', measureBanner, { once: true });

    newsBannerClose?.addEventListener('click', () => {
      if (newsBanner.classList.contains('dismissed')) return;

      stopBannerMeasurement();
      newsBanner.classList.add('dismissed');
      body.classList.remove('has-news-banner');
      setBannerHeight(0);

      try {
        localStorage.setItem(BANNER_KEY, 'true');
      } catch {
        // Dismissal still works for the current visit.
      }

      const removeBanner = () => {
        if (newsBanner.isConnected) newsBanner.remove();
      };

      newsBanner.addEventListener('transitionend', removeBanner, { once: true });
      window.setTimeout(removeBanner, 350);
    });
  } else {
    body.classList.remove('has-news-banner');
    setBannerHeight(0);
    newsBanner?.remove();
  }

  requestAnimationFrame(() => {
    body.classList.add('header-offset-ready');
  });

  // Mobile navigation toggle
  const setMobileNavOpen = (isOpen) => {
    if (!navToggle || !navLinks) return;

    navToggle.classList.toggle('active', isOpen);
    navLinks.classList.toggle('active', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  };

  if (navToggle && navLinks) {
    const mobileNavQuery = window.matchMedia('(max-width: 768px)');
    const navRegion = navToggle.closest('nav') || navToggle.parentElement;
    navToggle.setAttribute('aria-controls', navLinks.id);
    setMobileNavOpen(false);

    navToggle.addEventListener('click', () => {
      setMobileNavOpen(!navLinks.classList.contains('active'));
    });

    // Close mobile nav on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => setMobileNavOpen(false));
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && navLinks.classList.contains('active')) {
        event.preventDefault();
        setMobileNavOpen(false);
        navToggle.focus({ preventScroll: true });
      }
    });

    // The disclosure is nonmodal: Tab follows the document and closes it on exit.
    document.addEventListener('focusin', event => {
      if (!navRegion.contains(event.target)) setMobileNavOpen(false);
    });
    document.addEventListener('click', event => {
      if (!navRegion.contains(event.target)) setMobileNavOpen(false);
    });

    const handleBreakpointChange = event => {
      const focusedElement = document.activeElement;
      setMobileNavOpen(false);

      // Preserve a visible focus target when the responsive layout hides it.
      if (event.matches && navLinks.contains(focusedElement)) {
        navToggle.focus({ preventScroll: true });
      } else if (!event.matches && focusedElement === navToggle) {
        navLinks.querySelector('a')?.focus({ preventScroll: true });
      }
    };

    if (mobileNavQuery.addEventListener) {
      mobileNavQuery.addEventListener('change', handleBreakpointChange);
    } else {
      mobileNavQuery.addListener(handleBreakpointChange);
    }
  }

  // Navbar scroll effect
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Restrained, one-shot reveal motion for explicitly marked content.
  // Elements remain visible when JavaScript is unavailable, motion is reduced,
  // or IntersectionObserver is unsupported.
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsIntersectionObserver = 'IntersectionObserver' in window;

  if (!prefersReducedMotion && supportsIntersectionObserver) {
    const observerOptions = {
      threshold: 0.12,
      rootMargin: '0px 0px -10% 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const revealElements = new Set(document.querySelectorAll('[data-reveal]'));

    document.querySelectorAll('[data-reveal-group]').forEach(group => {
      Array.from(group.children).forEach((el, index) => {
        const delay = Math.min(index, 3) * 75;
        el.style.setProperty('--reveal-delay', `${delay}ms`);
        revealElements.add(el);
      });
    });

    revealElements.forEach(el => {
      el.classList.add('fade-in');
      observer.observe(el);
    });
  }

  // Smooth active nav link highlighting
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = navLinks.querySelectorAll('a');

  const highlightNav = () => {
    const scrollPos =
      window.scrollY +
      currentBannerHeight +
      (navbar?.offsetHeight || 0) +
      16;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        navAnchors.forEach(a => {
          a.classList.remove('active');
          a.removeAttribute('aria-current');
          if (a.getAttribute('href') === `#${id}`) {
            a.classList.add('active');
            a.setAttribute('aria-current', 'true');
          }
        });
      }
    });
  };

  window.addEventListener('scroll', highlightNav, { passive: true });
  highlightNav();

  // Instagram embeds load eagerly via embed.js (included in the page). This
  // fallback ONLY replaces them if embed.js was genuinely blocked (ad blockers,
  // strict privacy, Edge Tracking Prevention) — it never clobbers real embeds
  // that are simply slow to render.
  const igFeed = document.getElementById('instagramFeed');
  if (igFeed) {
    const renderFallback = () => {
      const blockquotes = igFeed.querySelectorAll('blockquote.instagram-media');
      if (!blockquotes.length) return;
      const urls = Array.from(blockquotes).map(b => b.getAttribute('data-instgrm-permalink'));
      igFeed.innerHTML = urls.map(url => `
          <a href="${url}" target="_blank" rel="noopener" class="ig-fallback-card">
            <div class="ig-fallback-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </div>
            <div class="ig-fallback-label">View on Instagram</div>
            <div class="ig-fallback-sub">@herolabsportsmedicine</div>
          </a>
        `).join('');
    };

    const checkEmbeds = () => {
      // If Instagram's script loaded, make sure the blockquotes get processed
      // and leave the real embeds alone.
      if (window.instgrm && window.instgrm.Embeds) {
        window.instgrm.Embeds.process();
        return;
      }
      // embed.js never loaded (blocked) and nothing rendered → show fallback.
      if (igFeed.querySelectorAll('iframe').length === 0) {
        renderFallback();
      }
    };

    // Wait until after load + a generous grace period so slow embeds aren't
    // mistaken for blocked ones.
    if (document.readyState === 'complete') {
      setTimeout(checkEmbeds, 4000);
    } else {
      window.addEventListener('load', () => setTimeout(checkEmbeds, 4000));
    }
  }
});
