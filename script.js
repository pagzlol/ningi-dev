const filterButtons = document.querySelectorAll("[data-filter]");
const workCards = document.querySelectorAll(".work-card");
const workGrid = document.querySelector(".work-grid");

function updateGridColumns() {
  const visible = [...workCards].filter((c) => !c.hidden);
  const count = visible.length;
  const cols = Math.min(count, 3);
  workGrid.style.gridTemplateColumns = cols > 0 ? `repeat(${cols}, minmax(0, 1fr))` : "";

  // Reset spans
  visible.forEach((c) => (c.style.gridColumn = ""));

  // Span lone orphan in last row across all columns
  if (cols > 1 && count % cols === 1) {
    visible[visible.length - 1].style.gridColumn = "1 / -1";
  }
}

updateGridColumns();

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
    updateGridColumns();
  });
});
