(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    document.documentElement.classList.add("reduce-motion");
    document.querySelectorAll(".reveal-group").forEach((el) => {
      el.classList.add("is-visible");
    });
  } else {
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
  }

  const contactPan = document.querySelector("#contact [data-contact-pan]");
  if (contactPan && !reduced) {
    contactPan.addEventListener(
      "wheel",
      (e) => {
        const max = contactPan.scrollWidth - contactPan.clientWidth;
        if (max <= 0) return;
        const dy = e.deltaY + e.deltaX;
        const atStart = contactPan.scrollLeft <= 0;
        const atEnd = contactPan.scrollLeft >= max - 0.5;
        if (atStart && dy < 0) return;
        if (atEnd && dy > 0) return;
        e.preventDefault();
        contactPan.scrollLeft = Math.max(0, Math.min(max, contactPan.scrollLeft + dy));
      },
      { passive: false }
    );
  }
})();
