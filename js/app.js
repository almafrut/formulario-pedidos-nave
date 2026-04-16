// ============================================================
// Formulario Pedidos Nave — Logica principal
// ============================================================

// URL del trigger de Power Automate — pegar aqui tras crear el flujo
const POWER_AUTOMATE_URL = "https://default4219abae8d5243a1b52a7bb8c1c61d.0d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/05580e31334d42b0987f1ee3c02ec5bb/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=qO4W0fkhDqsgrxzMX7-sPkqlBjb0kYdufiLg_2H9f1U";

// ============================================================
// Searchable dropdown component
// ============================================================
function initSearchableDropdown(config) {
  const wrapper = document.getElementById(config.wrapperId);
  const input = wrapper.querySelector(".dropdown-search");
  const list = wrapper.querySelector(".dropdown-list");
  const hiddenInput = document.getElementById(config.hiddenId);
  const selectedDisplay = wrapper.querySelector(".dropdown-selected");
  const conditionalField = config.conditionalId
    ? document.getElementById(config.conditionalId)
    : null;
  const otherValue = config.otherValue || "__OTHER__";

  let items = [];
  let highlightedIndex = -1;

  // Build flat item list
  if (config.grouped) {
    config.data.forEach((group) => {
      items.push({ type: "separator", label: group.familia });
      group.medidas.forEach((m) => items.push({ type: "item", label: m, value: m }));
    });
  } else {
    config.data.forEach((d) => items.push({ type: "item", label: d, value: d }));
  }
  items.push({ type: "special", label: config.otherLabel, value: otherValue });

  function renderList(filter) {
    list.innerHTML = "";
    const lowerFilter = (filter || "").toLowerCase();
    let visibleItems = [];

    items.forEach((item) => {
      if (item.type === "separator") {
        if (!lowerFilter) {
          const el = document.createElement("div");
          el.className = "dropdown-item separator";
          el.textContent = item.label;
          list.appendChild(el);
        }
        return;
      }

      if (lowerFilter && !item.label.toLowerCase().includes(lowerFilter)) return;

      const el = document.createElement("div");
      el.className = "dropdown-item" + (item.type === "special" ? " special" : "");
      el.textContent = item.label;
      el.dataset.value = item.value;

      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });
      el.addEventListener("click", () => {
        selectItem(item);
      });

      list.appendChild(el);
      visibleItems.push(el);
    });

    highlightedIndex = -1;
    return visibleItems;
  }

  function selectItem(item) {
    hiddenInput.value = item.value;
    input.value = "";
    list.classList.remove("open");

    selectedDisplay.innerHTML = "";
    const span = document.createElement("span");
    span.textContent = item.label;
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "clear-btn";
    clearBtn.innerHTML = "&times;";
    clearBtn.setAttribute("aria-label", "Quitar seleccion");
    clearBtn.addEventListener("click", clearSelection);
    selectedDisplay.appendChild(span);
    selectedDisplay.appendChild(clearBtn);
    selectedDisplay.style.display = "flex";
    input.style.display = "none";

    // Show/hide conditional field
    if (conditionalField) {
      conditionalField.classList.toggle("visible", item.value === otherValue);
    }

    // Clear validation
    input.classList.remove("invalid");
    const errorEl = wrapper.querySelector(".error-msg");
    if (errorEl) errorEl.classList.remove("visible");
  }

  function clearSelection() {
    hiddenInput.value = "";
    selectedDisplay.style.display = "none";
    selectedDisplay.innerHTML = "";
    input.style.display = "";
    input.value = "";
    input.focus();

    if (conditionalField) {
      conditionalField.classList.remove("visible");
    }
  }

  input.addEventListener("focus", () => {
    renderList(input.value);
    list.classList.add("open");
  });

  input.addEventListener("input", () => {
    renderList(input.value);
    list.classList.add("open");
  });

  input.addEventListener("blur", () => {
    setTimeout(() => list.classList.remove("open"), 150);
  });

  input.addEventListener("keydown", (e) => {
    const visibleItems = list.querySelectorAll(
      ".dropdown-item:not(.separator)"
    );
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlightedIndex = Math.min(highlightedIndex + 1, visibleItems.length - 1);
      updateHighlight(visibleItems);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, 0);
      updateHighlight(visibleItems);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && visibleItems[highlightedIndex]) {
        const value = visibleItems[highlightedIndex].dataset.value;
        const item = items.find((i) => i.value === value);
        if (item) selectItem(item);
      }
    } else if (e.key === "Escape") {
      list.classList.remove("open");
      input.blur();
    }
  });

  function updateHighlight(visibleItems) {
    visibleItems.forEach((el, i) => {
      el.classList.toggle("highlighted", i === highlightedIndex);
      if (i === highlightedIndex) {
        el.scrollIntoView({ block: "nearest" });
      }
    });
  }

  // Expose reset function
  wrapper._clear = clearSelection;
}

// ============================================================
// Form initialization
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  // Set default dates
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("fecha_pedido").value = today;

  // Init searchable dropdowns
  initSearchableDropdown({
    wrapperId: "cliente-dropdown",
    hiddenId: "cliente",
    conditionalId: "cliente-otro-wrapper",
    data: CLIENTES,
    grouped: false,
    otherLabel: "OTRO (escribir nombre)",
    otherValue: "__OTHER__",
  });

  initSearchableDropdown({
    wrapperId: "medida-dropdown",
    hiddenId: "medida",
    conditionalId: "medida-otra-wrapper",
    data: DIMENSIONES,
    grouped: true,
    otherLabel: "OTRA MEDIDA (escribir)",
    otherValue: "__OTHER__",
  });

  // Form submission
  document.getElementById("pedido-form").addEventListener("submit", handleSubmit);
});

// ============================================================
// Validation
// ============================================================
function validateForm() {
  let valid = true;
  const errors = [];

  // Required fields
  const requiredFields = [
    { id: "fecha_pedido", name: "Fecha del pedido" },
    { id: "cliente", name: "Cliente" },
    { id: "cantidad", name: "Cantidad" },
    { id: "fecha_entrega", name: "Fecha de entrega" },
    { id: "medida", name: "Medida" },
  ];

  requiredFields.forEach(({ id, name }) => {
    const el = document.getElementById(id);
    const wrapper = el.closest(".field-group") || el.parentElement;
    const errorEl = wrapper.querySelector(".error-msg");

    if (!el.value || el.value === "") {
      el.classList.add("invalid");
      if (errorEl) {
        errorEl.textContent = `${name} es obligatorio`;
        errorEl.classList.add("visible");
      }
      valid = false;
    } else {
      el.classList.remove("invalid");
      if (errorEl) errorEl.classList.remove("visible");
    }
  });

  // Cantidad > 0
  const cantidad = document.getElementById("cantidad");
  if (cantidad.value && Number(cantidad.value) <= 0) {
    cantidad.classList.add("invalid");
    const errorEl = cantidad.parentElement.querySelector(".error-msg");
    if (errorEl) {
      errorEl.textContent = "La cantidad debe ser mayor que 0";
      errorEl.classList.add("visible");
    }
    valid = false;
  }

  // Urgencia
  const urgencia = document.querySelector('input[name="urgencia"]:checked');
  if (!urgencia) {
    valid = false;
  }

  // Canal
  const canal = document.querySelector('input[name="canal"]:checked');
  if (!canal) {
    valid = false;
  }

  // Conditional: client "other" must have text
  const clienteVal = document.getElementById("cliente").value;
  if (clienteVal === "__OTHER__") {
    const otroInput = document.getElementById("cliente_otro");
    if (!otroInput.value.trim()) {
      otroInput.classList.add("invalid");
      valid = false;
    } else {
      otroInput.classList.remove("invalid");
    }
  }

  // Conditional: dimension "other" must have text
  const medidaVal = document.getElementById("medida").value;
  if (medidaVal === "__OTHER__") {
    const otraInput = document.getElementById("medida_otra");
    if (!otraInput.value.trim()) {
      otraInput.classList.add("invalid");
      valid = false;
    } else {
      otraInput.classList.remove("invalid");
    }
  }

  return valid;
}

// ============================================================
// Submit
// ============================================================
async function handleSubmit(e) {
  e.preventDefault();

  if (!validateForm()) return;

  const btn = document.getElementById("btn-submit");
  const statusBanner = document.getElementById("status-banner");

  // Hide previous status
  statusBanner.className = "status-banner";
  statusBanner.style.display = "none";

  // Check URL configured
  if (!POWER_AUTOMATE_URL) {
    statusBanner.className = "status-banner error";
    statusBanner.querySelector(".status-text").textContent =
      "Error: La URL de Power Automate no esta configurada. Contacta con Rafael.";
    statusBanner.style.display = "flex";
    return;
  }

  // Build payload
  const clienteVal = document.getElementById("cliente").value;
  const medidaVal = document.getElementById("medida").value;

  const payload = {
    fecha_pedido: document.getElementById("fecha_pedido").value,
    cliente:
      clienteVal === "__OTHER__"
        ? document.getElementById("cliente_otro").value.trim()
        : clienteVal,
    cliente_otro:
      clienteVal === "__OTHER__"
        ? document.getElementById("cliente_otro").value.trim()
        : "",
    medida:
      medidaVal === "__OTHER__"
        ? document.getElementById("medida_otra").value.trim()
        : medidaVal,
    medida_otra:
      medidaVal === "__OTHER__"
        ? document.getElementById("medida_otra").value.trim()
        : "",
    cantidad: Number(document.getElementById("cantidad").value),
    fecha_entrega: document.getElementById("fecha_entrega").value,
    urgencia: document.querySelector('input[name="urgencia"]:checked').value,
    canal: document.querySelector('input[name="canal"]:checked').value,
    observaciones: document.getElementById("observaciones").value.trim(),
  };

  // Send
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Enviando...';

  try {
    const res = await fetch(POWER_AUTOMATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok || res.status === 202) {
      statusBanner.className = "status-banner success";
      statusBanner.querySelector(".status-text").textContent =
        "Pedido registrado correctamente";
      statusBanner.style.display = "flex";
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    statusBanner.className = "status-banner error";
    statusBanner.querySelector(".status-text").textContent =
      "Error al enviar. Comprueba tu conexion e intentalo de nuevo.";
    statusBanner.style.display = "flex";
  } finally {
    btn.disabled = false;
    btn.innerHTML = "Registrar pedido";
  }
}

// ============================================================
// Reset form for new order
// ============================================================
function resetForm() {
  const form = document.getElementById("pedido-form");
  form.reset();

  // Reset date to today
  document.getElementById("fecha_pedido").value = new Date()
    .toISOString()
    .split("T")[0];

  // Clear dropdowns
  document.getElementById("cliente-dropdown")._clear();
  document.getElementById("medida-dropdown")._clear();

  // Hide conditional fields
  document.querySelectorAll(".conditional-field").forEach((el) => {
    el.classList.remove("visible");
  });

  // Clear validation states
  document.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
  document.querySelectorAll(".error-msg").forEach((el) => el.classList.remove("visible"));

  // Hide status
  const banner = document.getElementById("status-banner");
  banner.className = "status-banner";
  banner.style.display = "none";

  // Default radio selections
  document.getElementById("urgencia-normal").checked = true;

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
}
