document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const video = document.getElementById('home-allocation');
  const button = document.querySelector('[data-home-allocation]');
  if (video && button) {
    video.controls = false;
    button.hidden = false;
    const idleLabel = () => {
      button.textContent = video.currentTime > 0 ? 'Replay capsule sequence ↻' : 'Play capsule sequence ↻';
      button.setAttribute('aria-label', button.textContent);
    };
    button.addEventListener('click', async () => {
      if (!video.paused) { video.pause(); idleLabel(); return; }
      try {
        video.currentTime = 0;
        await video.play();
        button.textContent = 'Pause capsule sequence';
        button.setAttribute('aria-label','Pause capsule sequence');
      } catch {
        video.controls = true;
        button.hidden = true;
      }
    });
    video.addEventListener('ended', idleLabel);
    video.addEventListener('pause', idleLabel);
    reducedMotion.addEventListener('change', () => { video.pause(); idleLabel(); });
  }

  // Deep links retain access to full studies even when their disclosures are closed.
  const revealHashTarget = () => {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    let parent = target.parentElement;
    let opened = false;
    while (parent) {
      if (parent.tagName === 'DETAILS' && !parent.open) { parent.open = true; opened = true; }
      parent = parent.parentElement;
    }
    if (opened) requestAnimationFrame(() => target.scrollIntoView({behavior:'instant',block:'start'}));
  };
  window.addEventListener('hashchange',revealHashTarget);
  revealHashTarget();

  const videos = Array.from(document.querySelectorAll('video'));
  videos.forEach(active => active.addEventListener('play', () => {
    videos.forEach(other => { if (other !== active) other.pause(); });
  }));
  document.querySelectorAll('details').forEach(details => {
    details.addEventListener('toggle', () => {
      if (!details.open) details.querySelectorAll('video').forEach(item => item.pause());
    });
  });
});
