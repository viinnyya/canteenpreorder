// Light/dark switch. The saved choice is applied early by a small script in the page head.
(function () {
  var button = document.getElementById('theme-toggle');
  if (!button) return;
  button.addEventListener('click', function () {
    var root = document.documentElement;
    var next = root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-bs-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });
})();
