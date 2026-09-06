(() => {
  'use strict';

  // The complete protocol stays readable when JavaScript is unavailable.
  document.querySelectorAll('[data-study-journey]').forEach((journey) => {
    const navigation = journey.querySelector('[data-journey-nav]');
    const tabs = Array.from(journey.querySelectorAll('[data-journey-tab]'));
    const panels = Array.from(journey.querySelectorAll('[data-journey-panel]'));
    if (!navigation || !tabs.length || tabs.length !== panels.length) return;

    navigation.setAttribute('role', 'tablist');
    tabs.forEach((tab) => {
      const panel = panels.find((item) => item.dataset.journeyPanel === tab.dataset.journeyTab);
      if (!panel) return;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.tabIndex = 0;
    });

    const select = (index, moveFocus = false) => {
      tabs.forEach((tab, position) => {
        const selected = position === index;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        const panel = panels.find((item) => item.dataset.journeyPanel === tab.dataset.journeyTab);
        if (panel) panel.hidden = !selected;
      });
      if (moveFocus) tabs[index].focus();
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(index));
      tab.addEventListener('keydown', (event) => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        select(next, true);
      });
    });
    select(0);
    journey.classList.add('is-enhanced');
    navigation.hidden = false;
  });

  // A short, user-initiated sequence: never autoplay and never loop.
  document.querySelectorAll('[data-capsule-video]').forEach((video) => {
    const stage = video.closest('.study-capsule-stage');
    const control = stage?.querySelector('[data-capsule-control]');
    const label = control?.querySelector('[data-capsule-label]');
    if (!control || !label) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let hasPlayed = false;

    const updateControl = () => {
      const playing = !video.paused && !video.ended;
      label.textContent = playing ? 'Pause capsule sequence' : video.ended ? 'Replay capsule sequence' : hasPlayed ? 'Resume capsule sequence' : 'Play capsule sequence';
      control.querySelector('[aria-hidden="true"]').textContent = playing ? 'Ⅱ' : '▶';
    };
    video.controls = false;
    control.hidden = false;
    control.addEventListener('click', async () => {
      if (!video.paused && !video.ended) {
        video.pause();
        return;
      }
      if (video.ended) video.currentTime = 0;
      try {
        await video.play();
        hasPlayed = true;
        updateControl();
      } catch {
        // Native controls remain available if custom playback is blocked.
        video.controls = true;
        control.hidden = true;
      }
    });
    video.addEventListener('play', updateControl);
    video.addEventListener('pause', updateControl);
    video.addEventListener('ended', updateControl);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) video.pause();
    });
    reduceMotion.addEventListener('change', (event) => {
      if (event.matches) video.pause();
    });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) video.pause();
      });
      observer.observe(video);
    }
  });
})();
