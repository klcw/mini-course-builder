// Shows one section at a time. Without JavaScript every section stays visible as one long page.
(function () {
  var sections = Array.prototype.slice.call(document.querySelectorAll(".lesson"));
  var nav = document.getElementById("lesson-nav");
  var prev = document.getElementById("prev");
  var next = document.getElementById("next");
  var jump = document.getElementById("jump");
  var current = 0;

  sections.forEach(function (section, i) {
    var option = document.createElement("option");
    option.value = i;
    option.textContent = (i + 1) + ". " + section.getAttribute("data-title");
    jump.appendChild(option);
  });

  function indexFromHash() {
    var id = location.hash.slice(1);
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].id === id) return i;
    }
    return 0;
  }

  function show(index, moveFocus) {
    current = index;
    sections.forEach(function (section, i) {
      section.hidden = i !== index;
    });
    prev.disabled = index === 0;
    next.disabled = index === sections.length - 1;
    jump.value = index;
    window.scrollTo(0, 0);
    if (moveFocus) {
      // Moves screen readers and keyboard users to the new section's heading.
      var heading = sections[index].querySelector("h1, h2");
      heading.setAttribute("tabindex", "-1");
      heading.focus();
    }
  }

  // Changing the hash lets the browser's Back button and page refresh keep the right section.
  function go(index) {
    if (index === current) return;
    location.hash = sections[index].id;
  }

  prev.addEventListener("click", function () { go(current - 1); });
  next.addEventListener("click", function () { go(current + 1); });
  jump.addEventListener("change", function () { go(Number(jump.value)); });
  window.addEventListener("hashchange", function () { show(indexFromHash(), true); });

  nav.hidden = false;
  show(indexFromHash(), false);
})();
