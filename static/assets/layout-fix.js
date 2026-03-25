
document.addEventListener("DOMContentLoaded", function() {
  document.querySelectorAll('.floating-request').forEach(el => el.remove());

  const container = document.querySelector('.page-shell > .container');
  if (!container) return;

  const rail = document.querySelector('.luxaeris-request-rail');
  if (!rail) return;

  const main = document.createElement('div');
  main.className = 'luxaeris-main-column';

  Array.from(container.children).forEach(child => {
    if (!child.classList.contains('luxaeris-request-rail')) {
      main.appendChild(child);
    }
  });

  container.innerHTML = '';
  container.appendChild(main);
  container.appendChild(rail);
});
