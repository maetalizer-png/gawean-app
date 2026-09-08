(function () {
  try {
    const savedTheme = localStorage.getItem("gawean-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  } catch {}

  try {
    if (!localStorage.getItem("gawean-session")) {
      localStorage.setItem("gawean-session", "tamu@gawean.local");
    }
  } catch {}
})();
