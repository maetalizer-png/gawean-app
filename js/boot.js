(function () {
  try {
    const savedTheme = localStorage.getItem("gawean-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  } catch {}

  document.documentElement.classList.add("booting");
  try {
    if (!localStorage.getItem("gawean-session")) {
      document.body.classList.add("locked", "hide-chrome");
    }
  } catch {
    document.body.classList.add("locked", "hide-chrome");
  }
})();
