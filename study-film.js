(() => {
  'use strict';

  function initializeStudyFilms() {
    document.querySelectorAll('[data-study-film]').forEach((player) => {
      if (player.dataset.studyFilmReady === 'true') return;

      const video = player.querySelector('video');
      const launch = player.querySelector('.study-film-launch');
      if (!video || !launch || typeof video.play !== 'function') return;

      const figure = player.closest('.study-film-feature');
      const hasDownload = Boolean(figure?.querySelector('figcaption a'));
      const status = document.createElement('p');
      status.className = 'study-film-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-atomic', 'true');
      player.append(status);

      let activated = false;

      function revealVideo(moveFocus) {
        video.hidden = false;
        launch.hidden = true;
        player.classList.add('is-active');
        if (moveFocus) video.focus({ preventScroll: true });
      }

      function reportFailure(message) {
        revealVideo(document.activeElement === launch);
        status.textContent = message + (hasDownload
          ? ' Use the video controls to try again, or download the film below.'
          : ' Use the video controls to try again.');
      }

      // The source markup is already usable without this enhancement.
      video.controls = true;
      video.autoplay = false;
      video.loop = false;
      video.tabIndex = 0;

      launch.addEventListener('click', () => {
        if (activated) return;
        activated = true;
        revealVideo(true);
        status.textContent = '';
        video.muted = false;
        video.defaultMuted = false;

        // Keep play() synchronous with the user's click for mobile audio support.
        try {
          const playback = video.play();
          if (playback && typeof playback.catch === 'function') {
            playback.catch((error) => {
              if (error?.name === 'AbortError' && document.hidden) return;
              reportFailure('Playback could not start.');
            });
          }
        } catch {
          reportFailure('Playback could not start.');
        }
      }, { once: true });

      video.addEventListener('error', () => {
        reportFailure('The film could not load.');
      });
      video.addEventListener('playing', () => {
        status.textContent = '';
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && !video.paused) video.pause();
      });

      player.dataset.studyFilmReady = 'true';
      if (video.error) {
        reportFailure('The film could not load.');
      } else if (!video.paused) {
        // Preserve playback if the script is initialized after a native play action.
        activated = true;
        revealVideo(false);
      } else {
        video.hidden = true;
        launch.hidden = false;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStudyFilms, { once: true });
  } else {
    initializeStudyFilms();
  }
})();
