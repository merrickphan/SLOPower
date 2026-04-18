(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    document.documentElement.classList.add("reduce-motion");
    document.querySelectorAll(".reveal-group").forEach((el) => {
      el.classList.add("is-visible");
    });
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
  );

  document.querySelectorAll(".reveal-group").forEach((el) => io.observe(el));
})();
