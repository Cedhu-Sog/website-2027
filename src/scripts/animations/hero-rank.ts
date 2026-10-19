const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

document.querySelectorAll<HTMLElement>('.hero__rank').forEach(rank => {
  const button = rank.querySelector<HTMLButtonElement>('.hero__rank-number');
  if (!button) return;

  let playing = false;

  // Read the existing CSS animations and transitions, excluding the ambient loop.
  // finished also settles on cancellation, e.g. when reduced motion is enabled.
  const finishMotion = (element: HTMLElement, subtree = false) => Promise.allSettled(
    element.getAnimations({ subtree })
      .filter(animation => animation.effect?.getTiming().iterations !== Infinity)
      .map(animation => animation.finished),
  );

  const play = async () => {
    if (playing || reducedMotion.matches || document.documentElement.dataset.motion === 'reduced') return;

    playing = true;
    try {
      rank.classList.add('is-animating');
      await finishMotion(rank, true);
      rank.classList.remove('is-animating');
      // Keep the lock through the numeral's existing transition back to rest.
      await finishMotion(button);
    } finally {
      rank.classList.remove('is-animating');
      playing = false;
    }
  };

  rank.addEventListener('pointerenter', event => {
    // Touch-generated pointerenter must not duplicate the native click below.
    if (event.pointerType === 'mouse' || (event.pointerType === 'pen' && event.buttons === 0)) void play();
  });

  // One native click covers touch, Enter, Space and assistive activation.
  button.addEventListener('click', () => { void play(); });
});

export {};
