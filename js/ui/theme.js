export const theme = {
  apply(mode) {
    const value = mode === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", value);
    localStorage.setItem("gawean-theme", value);
    document.querySelectorAll(".theme-tile").forEach((b) => {
      b.classList.toggle("active", b.dataset.theme === value);
    });
  },
  restore() {
    theme.apply(localStorage.getItem("gawean-theme") || "light");
  },
};
