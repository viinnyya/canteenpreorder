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
})();
