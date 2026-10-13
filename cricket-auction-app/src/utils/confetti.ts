import confetti from 'canvas-confetti';

export const triggerSoldConfetti = () => {
  // Fire dual side cannons
  const count = 180;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#eab308', '#3b82f6', '#ec4899', '#10b981'],
  });
  fire(0.2, {
    spread: 60,
    colors: ['#fbbf24', '#60a5fa', '#f472b6', '#34d399'],
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    colors: ['#ffd700', '#ff4500', '#00e5ff'],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
};
