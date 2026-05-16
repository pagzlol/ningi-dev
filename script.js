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

(function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const heroImg = document.querySelector('.hero-media img')
  const heroContent = document.querySelector('.hero-content')
  const hero = document.querySelector('.hero')
  if (!heroImg || !heroContent || !hero) return

  let ticking = false

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        const scrollY = window.scrollY
        const heroH = hero.offsetHeight

        heroImg.style.transform = 'translateY(' + (scrollY * 0.4) + 'px)'

        const progress = scrollY / heroH
        const textProgress = Math.max(0, Math.min((progress - 0.15) / 0.70, 1))
        heroContent.style.opacity = 1 - textProgress
        heroContent.style.transform = 'translateY(' + (textProgress * -60) + 'px)'

        ticking = false
      })
      ticking = true
    }
  }, { passive: true })
}())
