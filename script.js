const filterButtons = document.querySelectorAll("[data-filter]");
const workCards = document.querySelectorAll(".work-card");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    workCards.forEach((card) => {
      const categories = card.dataset.category.split(" ");
      const shouldShow = activeFilter === "all" || categories.includes(activeFilter);
      card.hidden = !shouldShow;
    });
  });
});

(function initPlexus() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W, H, nodes, rafId;

  function setup() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    nodes = [];
    const count = Math.min(Math.round(W * H / 10000), 140);
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * W,
        baseY: H * (0.28 + Math.random() * 0.55),
        phase: Math.random() * Math.PI * 2,
        waveAmp: 20 + Math.random() * H * 0.07,
        waveFreq: 0.0006 + Math.random() * 0.0009,
        personalAmp: 8 + Math.random() * 22,
        personalFreq: 0.0004 + Math.random() * 0.0006,
        vx: (Math.random() - 0.5) * 0.26,
        size: 1.5 + Math.random() * 1.8,
        y: 0,
      });
    }
  }

  const MAX_D = 165;
  const MAX_D2 = MAX_D * MAX_D;

  function globalWave(x, t) {
    return (
      Math.sin(x * 0.0018 + t * 0.00055) * 55 +
      Math.sin(x * 0.0038 + t * 0.00085 + 1.4) * 28 +
      Math.sin(x * 0.0007 - t * 0.00035 + 3.1) * 40
    );
  }

  function draw(t) {
    rafId = requestAnimationFrame(draw);
    ctx.clearRect(0, 0, W, H);

    for (const n of nodes) {
      n.x += n.vx;
      if (n.x < -MAX_D) n.x += W + MAX_D * 2;
      if (n.x > W + MAX_D) n.x -= W + MAX_D * 2;
      n.y = n.baseY
        + globalWave(n.x, t)
        + Math.sin(n.phase + t * n.personalFreq) * n.personalAmp;
    }

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > MAX_D2) continue;
        const alpha = ((1 - d2 / MAX_D2) * 0.5).toFixed(2);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(60, 140, 235, ${alpha})`;
        ctx.lineWidth = 0.65;
        ctx.stroke();
      }
    }

    ctx.shadowColor = 'rgba(95, 180, 255, 0.88)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(190, 220, 255, 0.92)';
    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  setup();
  if (!reduced) rafId = requestAnimationFrame(draw);

  window.addEventListener('resize', () => {
    cancelAnimationFrame(rafId);
    setup();
    if (!reduced) rafId = requestAnimationFrame(draw);
  });
}());

(function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const bgImage = document.getElementById('bg-image');
  if (!bgImage) return;

  let ticking = false;

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        bgImage.style.transform = 'translateY(' + (window.scrollY * 0.4) + 'px)';
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}());
