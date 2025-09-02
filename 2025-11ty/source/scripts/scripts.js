
function adjustHeroBg() {
  const hero = document.querySelector('.hero');
  const bg = document.querySelector('.header-video');
  if (!hero || !bg) return; // avoid errors if elements aren't found
  const ratio = hero.offsetWidth / hero.offsetHeight;
  if (ratio > 16/9) {
    bg.style.width = "100%";
    bg.style.height = "auto";
  } else {
    bg.style.width = "auto";
    bg.style.height = "100%";
  }
}

// Run on load
window.addEventListener('load', adjustHeroBg);
// Run on resize
window.addEventListener('resize', adjustHeroBg);

// hamburder nav
document.addEventListener('DOMContentLoaded', () => {
  // Get all "navbar-burger" elements
  const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);
  // Add a click event on each of them
  $navbarBurgers.forEach( el => {
    el.addEventListener('click', () => {
      // Get the target from the "data-target" attribute
      const target = el.dataset.target;
      const $target = document.getElementById(target);
      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      el.classList.toggle('is-active');
      $target.classList.toggle('is-active');
    });
  });
});