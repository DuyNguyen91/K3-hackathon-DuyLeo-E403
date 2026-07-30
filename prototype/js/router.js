// Lightweight router to keep navigation and page states simple.
document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll(".nav-item");

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (href && currentPath.endsWith(href)) {
      link.classList.add("active");
    }
  });
});
