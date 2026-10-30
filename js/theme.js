// Light is the default. The visitor's choice is remembered when the browser allows it.
(function () {
  var KEY = "theme";

  function saved() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var button = document.getElementById("theme-toggle");
    if (button) {
      button.textContent = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
    }
  }

  // Runs straight away (this script sits in <head>) so the page never flashes the wrong theme.
  apply(saved() === "dark" ? "dark" : "light");

  document.addEventListener("DOMContentLoaded", function () {
    var button = document.getElementById("theme-toggle");
    apply(document.documentElement.getAttribute("data-theme"));
    button.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      apply(next);
      try {
        localStorage.setItem(KEY, next);
      } catch (e) {
        // Storage blocked: the theme still switches, it just isn't remembered.
      }
    });
  });
})();
