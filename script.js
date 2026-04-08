// ========================================
// HERO Lab Website - JavaScript
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // News banner dismiss (persists via localStorage)
  const newsBanner = document.getElementById('newsBanner');
  const newsBannerClose = document.getElementById('newsBannerClose');
  const BANNER_KEY = 'herolab-news-banner-dismissed-amssm2026';
  if (newsBanner) {
    if (localStorage.getItem(BANNER_KEY) === 'true') {
      newsBanner.remove();
    } else {
      document.body.classList.add('has-news-banner');
      if (newsBannerClose) {
        newsBannerClose.addEventListener('click', () => {
          newsBanner.classList.add('dismissed');
          document.body.classList.remove('has-news-banner');
          localStorage.setItem(BANNER_KEY, 'true');
          setTimeout(() => newsBanner.remove(), 300);
        });
      }
    }
  }

  // Mobile navigation toggle
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navLinks.classList.toggle('active');
  });

  // Close mobile nav on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      navLinks.classList.remove('active');
    });
  });

  // Navbar scroll effect
  const navbar = document.getElementById('navbar');
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Scroll-triggered fade-in animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Add fade-in class to elements and observe them
  const animateSelectors = [
    '.about-text', '.about-stats', '.partner-logos',
    '.study-featured', '.area-card', '.team-card',
    '.pub-card', '.social-cta', '.contact-card',
    '.location-info', '.evidence-card'
  ];

  animateSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.classList.add('fade-in');
      el.style.transitionDelay = `${i * 0.1}s`;
      observer.observe(el);
    });
  });

  // Smooth active nav link highlighting
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = navLinks.querySelectorAll('a');

  const highlightNav = () => {
    const scrollPos = window.scrollY + 100;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        navAnchors.forEach(a => {
          a.classList.remove('active');
          if (a.getAttribute('href') === `#${id}`) {
            a.classList.add('active');
          }
        });
      }
    });
  };

  window.addEventListener('scroll', highlightNav, { passive: true });
  highlightNav();

  // Instagram embed fallback: if embed.js is blocked (ad blockers,
  // strict privacy, Edge Tracking Prevention), show clickable cards instead.
  const igFeed = document.getElementById('instagramFeed');
  if (igFeed) {
    setTimeout(() => {
      const hasIframes = igFeed.querySelectorAll('iframe').length > 0;
      if (!hasIframes) {
        const blockquotes = igFeed.querySelectorAll('blockquote.instagram-media');
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
      }
    }, 3500);
  }
});
