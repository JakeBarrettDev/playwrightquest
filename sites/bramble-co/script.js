(function () {
  const STORAGE_KEY = 'bramble_cart';

  const products = {
    'terracotta-planter': { name: 'Terracotta Planter', price: 24 },
    'brass-watering-can': { name: 'Brass Watering Can', price: 42 },
    'heirloom-tomato-seeds': { name: 'Heirloom Tomato Seeds', price: 8 },
    'pruning-shears': { name: 'Pruning Shears', price: 35 },
    'ceramic-pot-trio': { name: 'Ceramic Pot Trio', price: 56 },
    'wildflower-seed-mix': { name: 'Wildflower Seed Mix', price: 12 },
  };

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }

  function cartCount(cart) {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  }

  function cartSubtotal(cart) {
    return Object.entries(cart).reduce(
      (sum, [id, qty]) => sum + (products[id] ? products[id].price * qty : 0),
      0
    );
  }

  function updateCartBadge() {
    const el = document.getElementById('cart-count');
    if (el) el.textContent = String(cartCount(getCart()));
  }

  // TRAP 1: non-deterministic class names on CTA-style buttons.
  // Players who select by class will write brittle tests.
  function randomHex(len = 4) {
    return Math.random().toString(16).slice(2, 2 + len);
  }
  function applyDynamicClasses() {
    document.querySelectorAll('.btn-dynamic').forEach((btn) => {
      btn.classList.add('btn-cta-' + randomHex());
    });
  }

  function initHome() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.add-to-cart');
      if (!btn) return;
      const card = btn.closest('.product-card');
      const id = card && card.dataset.productId;
      if (!id) return;
      const cart = getCart();
      cart[id] = (cart[id] || 0) + 1;
      saveCart(cart);
      updateCartBadge();
      const original = 'Add to Cart';
      btn.textContent = 'Added';
      setTimeout(() => {
        btn.textContent = original;
      }, 1000);
    });

    const priceMax = document.getElementById('price-max');
    const priceDisplay = document.getElementById('price-display');
    const categoryBoxes = document.querySelectorAll('input[name="category"]');

    function applyFilters() {
      const checked = Array.from(categoryBoxes).filter((c) => c.checked).map((c) => c.value);
      const maxPrice = parseInt((priceMax && priceMax.value) || '100', 10);
      document.querySelectorAll('.product-card').forEach((card) => {
        const cat = card.dataset.category;
        const price = parseInt(card.dataset.price, 10);
        const visible = (checked.length === 0 || checked.includes(cat)) && price <= maxPrice;
        card.hidden = !visible;
      });
    }

    if (priceMax) {
      priceMax.addEventListener('input', () => {
        if (priceDisplay) priceDisplay.textContent = '$' + priceMax.value;
        applyFilters();
      });
    }
    categoryBoxes.forEach((c) => c.addEventListener('change', applyFilters));
  }

  function renderCartRow(tbody, id, qty) {
    const p = products[id];
    if (!p) return;
    const tr = document.createElement('tr');
    tr.dataset.productId = id;
    tr.innerHTML =
      '<td>' + p.name + '</td>' +
      '<td><input type="number" min="1" value="' + qty + '" aria-label="Quantity for ' + p.name + '" class="qty-input" /></td>' +
      '<td data-testid="line-total">$' + (p.price * qty).toFixed(2) + '</td>' +
      '<td><button type="button" class="remove-btn" aria-label="Remove ' + p.name + '">Remove</button></td>';
    tbody.appendChild(tr);
  }

  function initCart() {
    const table = document.getElementById('cart-items');
    const tbody = table && table.querySelector('tbody');
    if (!tbody) return;

    const cart = getCart();
    const ids = Object.keys(cart);
    const emptyMsg = document.getElementById('cart-empty');

    if (ids.length === 0) {
      if (emptyMsg) emptyMsg.hidden = false;
      table.hidden = true;
    } else {
      ids.forEach((id) => renderCartRow(tbody, id, cart[id]));
    }

    const subtotalEl = document.getElementById('cart-subtotal');
    if (subtotalEl) subtotalEl.textContent = '$' + cartSubtotal(cart).toFixed(2);

    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('.remove-btn');
      if (!btn) return;
      const tr = btn.closest('tr');
      const id = tr && tr.dataset.productId;
      if (!id) return;
      const c = getCart();
      delete c[id];
      saveCart(c);
      tr.remove();
      if (subtotalEl) subtotalEl.textContent = '$' + cartSubtotal(c).toFixed(2);
      updateCartBadge();
      if (Object.keys(c).length === 0) {
        if (emptyMsg) emptyMsg.hidden = false;
        table.hidden = true;
      }
    });

    tbody.addEventListener('change', (e) => {
      const input = e.target.closest('.qty-input');
      if (!input) return;
      const tr = input.closest('tr');
      const id = tr && tr.dataset.productId;
      if (!id) return;
      const qty = Math.max(1, parseInt(input.value, 10) || 1);
      input.value = qty;
      const c = getCart();
      c[id] = qty;
      saveCart(c);
      const lineTotal = tr.querySelector('[data-testid="line-total"]');
      if (lineTotal) lineTotal.textContent = '$' + (products[id].price * qty).toFixed(2);
      if (subtotalEl) subtotalEl.textContent = '$' + cartSubtotal(c).toFixed(2);
      updateCartBadge();
    });
  }

  function initCheckout() {
    const form = document.getElementById('checkout-form');
    if (!form) return;
    const submitBtn = document.getElementById('submit-order');
    const confirmation = document.getElementById('order-confirmation');
    const orderNumberEl = document.getElementById('order-number');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      // TRAP 3: submit button changes text mid-request.
      // Players must wait for the final state rather than the transitional one.
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';

      setTimeout(() => {
        const orderNum = Math.floor(100000 + Math.random() * 900000);
        if (orderNumberEl) orderNumberEl.textContent = String(orderNum);
        if (confirmation) confirmation.hidden = false;
        form.hidden = true;
        localStorage.removeItem(STORAGE_KEY);
        updateCartBadge();
      }, 1500);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyDynamicClasses();
    updateCartBadge();
    initHome();
    initCart();
    initCheckout();
  });
})();
