// Shows a running total on the order form. The server recalculates the real total from its own prices.
(function () {
  var inputs = document.querySelectorAll('.qty');
  var totalEl = document.getElementById('order-total');
  if (!totalEl) return;

  function update() {
    var total = 0;
    inputs.forEach(function (input) {
      var qty = parseInt(input.value, 10);
      if (qty > 0) total += qty * parseFloat(input.dataset.price);
    });
    totalEl.textContent = total.toFixed(2);
  }

  inputs.forEach(function (input) {
    input.addEventListener('input', update);
  });
  update();

  // Menu search: hides non-matching items and any category with nothing left.
  var search = document.getElementById('menu-search');
  if (search) {
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      var anyVisible = false;
      document.querySelectorAll('.menu-group').forEach(function (group) {
        var visible = 0;
        group.querySelectorAll('.menu-row').forEach(function (row) {
          var show = q === '' || row.dataset.name.indexOf(q) !== -1;
          row.hidden = !show;
          if (show) visible++;
        });
        group.hidden = visible === 0;
        if (visible > 0) anyVisible = true;
      });
      document.getElementById('menu-empty').hidden = anyVisible;
    });
  }
})();
