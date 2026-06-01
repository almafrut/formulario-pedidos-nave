// ============================================================
// Formulario Pedidos Nave — Logica principal
// ============================================================

// URL del trigger de Power Automate — pegar aqui tras crear el flujo
const POWER_AUTOMATE_URL = "https://default4219abae8d5243a1b52a7bb8c1c61d.0d.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/05580e31334d42b0987f1ee3c02ec5bb/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=qO4W0fkhDqsgrxzMX7-sPkqlBjb0kYdufiLg_2H9f1U";

// ============================================================
// Referencias del pedido (hasta 5 medidas + cantidades)
// La referencia 1 conserva los ids originales (medida / medida_otra / cantidad)
// para mantener compatibilidad con el flujo de Power Automate actual.
// ============================================================
const REFS = [
  { n: 1, wrapperId: "medida-dropdown",   hiddenId: "medida",   otraWrapId: "medida-otra-wrapper",   otraId: "medida_otra",   cantidadId: "cantidad" },
  { n: 2, wrapperId: "medida-dropdown-2", hiddenId: "medida_2", otraWrapId: "medida-otra-wrapper-2", otraId: "medida_otra_2", cantidadId: "cantidad_2" },
  { n: 3, wrapperId: "medida-dropdown-3", hiddenId: "medida_3", otraWrapId: "medida-otra-wrapper-3", otraId: "medida_otra_3", cantidadId: "cantidad_3" },
  { n: 4, wrapperId: "medida-dropdown-4", hiddenId: "medida_4", otraWrapId: "medida-otra-wrapper-4", otraId: "medida_otra_4", cantidadId: "cantidad_4" },
  { n: 5, wrapperId: "medida-dropdown-5", hiddenId: "medida_5", otraWrapId: "medida-otra-wrapper-5", otraId: "medida_otra_5", cantidadId: "cantidad_5" },
];
const MAX_REFS = 5;
let visibleRefs = 1;

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

  // Dropdown de cliente
  initSearchableDropdown({
    wrapperId: "cliente-dropdown",
    hiddenId: "cliente",
    conditionalId: "cliente-otro-wrapper",
    data: CLIENTES,
    grouped: false,
    otherLabel: "OTRO (escribir nombre)",
    otherValue: "__OTHER__",
  });

  // Dropdown de medida para cada referencia (1..5)
  REFS.forEach((ref) => {
    initSearchableDropdown({
      wrapperId: ref.wrapperId,
      hiddenId: ref.hiddenId,
      conditionalId: ref.otraWrapId,
      data: DIMENSIONES,
      grouped: true,
      otherLabel: "OTRA MEDIDA (escribir)",
      otherValue: "__OTHER__",
    });
  });

  // Botones de añadir / quitar referencia
  document.getElementById("btn-add-ref").addEventListener("click", addReference);
  document.querySelectorAll(".ref-remove").forEach((btn) => {
    btn.addEventListener("click", () => removeReference(Number(btn.dataset.ref)));
  });
  updateRefControls();

  // Form submission
  document.getElementById("pedido-form").addEventListener("submit", handleSubmit);
});

// ============================================================
// Mostrar/ocultar referencias dinamicas
// ============================================================
function updateRefControls() {
  REFS.forEach((ref) => {
    const block = document.getElementById("ref-" + ref.n);
    const visible = ref.n <= visibleRefs;
    block.classList.toggle("ref-hidden", !visible);
    const rm = block.querySelector(".ref-remove");
    if (rm) {
      rm.style.display =
        visible && ref.n === visibleRefs && visibleRefs > 1 ? "" : "none";
    }
  });
  document.getElementById("btn-add-ref").style.display =
    visibleRefs < MAX_REFS ? "" : "none";
}

function addReference() {
  if (visibleRefs >= MAX_REFS) return;
  visibleRefs++;
  updateRefControls();
  const block = document.getElementById("ref-" + visibleRefs);
  block.scrollIntoView({ behavior: "smooth", block: "nearest" });
  const search = block.querySelector(".dropdown-search");
  if (search) search.focus();
}

function removeReference(n) {
  // Solo se quita la ultima referencia visible (evita huecos)
  if (n !== visibleRefs || visibleRefs <= 1) return;
  clearReference(REFS[n - 1]);
  visibleRefs--;
  updateRefControls();
}

function clearReference(ref) {
  const hidden = document.getElementById(ref.hiddenId);
  if (hidden) hidden.value = "";
  const wrapper = document.getElementById(ref.wrapperId);
  if (wrapper && wrapper._clear) wrapper._clear();
  const otra = document.getElementById(ref.otraId);
  if (otra) {
    otra.value = "";
    otra.classList.remove("invalid");
  }
  const otraWrap = document.getElementById(ref.otraWrapId);
  if (otraWrap) otraWrap.classList.remove("visible");
  const cant = document.getElementById(ref.cantidadId);
  if (cant) {
    cant.value = "";
    cant.classList.remove("invalid");
  }
  const block = document.getElementById("ref-" + ref.n);
  if (block) {
    block
      .querySelectorAll(".error-msg")
      .forEach((e) => e.classList.remove("visible"));
  }
}

// ============================================================
// Validation
// ============================================================
function validateForm() {
  let valid = true;

  // Campos simples obligatorios
  const requiredFields = [
    { id: "fecha_pedido", name: "Fecha del pedido" },
    { id: "cliente", name: "Cliente" },
    { id: "fecha_entrega", name: "Fecha de entrega" },
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

  // Cliente "otro" debe tener texto
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

  // Cada referencia visible: medida + cantidad obligatorias
  for (let i = 1; i <= visibleRefs; i++) {
    if (!validateReference(REFS[i - 1])) valid = false;
  }

  // Urgencia
  if (!document.querySelector('input[name="urgencia"]:checked')) valid = false;

  // Canal
  if (!document.querySelector('input[name="canal"]:checked')) valid = false;

  return valid;
}

function validateReference(ref) {
  let ok = true;

  // Medida obligatoria
  const medEl = document.getElementById(ref.hiddenId);
  const wrapper = document.getElementById(ref.wrapperId);
  const search = wrapper ? wrapper.querySelector(".dropdown-search") : null;
  const fieldGroup = wrapper ? wrapper.closest(".field-group") : null;
  const medError = fieldGroup ? fieldGroup.querySelector(".error-msg") : null;

  if (!medEl.value) {
    if (search) search.classList.add("invalid");
    if (medError) {
      medError.textContent = "Selecciona una medida";
      medError.classList.add("visible");
    }
    ok = false;
  } else {
    if (search) search.classList.remove("invalid");
    if (medError) medError.classList.remove("visible");

    // Medida "otra" debe tener texto
    if (medEl.value === "__OTHER__") {
      const otra = document.getElementById(ref.otraId);
      if (!otra.value.trim()) {
        otra.classList.add("invalid");
        ok = false;
      } else {
        otra.classList.remove("invalid");
      }
    }
  }

  // Cantidad obligatoria > 0
  const cant = document.getElementById(ref.cantidadId);
  const cantError = cant.closest(".field-group").querySelector(".error-msg");
  if (!cant.value || Number(cant.value) <= 0) {
    cant.classList.add("invalid");
    if (cantError) cantError.classList.add("visible");
    ok = false;
  } else {
    cant.classList.remove("invalid");
    if (cantError) cantError.classList.remove("visible");
  }

  return ok;
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

  // Datos base del pedido
  const clienteVal = document.getElementById("cliente").value;
  const clienteFinal =
    clienteVal === "__OTHER__"
      ? document.getElementById("cliente_otro").value.trim()
      : clienteVal;

  const payload = {
    fecha_pedido: document.getElementById("fecha_pedido").value,
    cliente: clienteFinal,
    cliente_otro: clienteVal === "__OTHER__" ? clienteFinal : "",
    fecha_entrega: document.getElementById("fecha_entrega").value,
    urgencia: document.querySelector('input[name="urgencia"]:checked').value,
    canal: document.querySelector('input[name="canal"]:checked').value,
    observaciones: document.getElementById("observaciones").value.trim(),
  };

  // Referencias: campos planos (ref 1 sin sufijo; ref 2..5 con _N) + array.
  // Las referencias no usadas se envian vacias para que las columnas del Excel queden en blanco.
  const referencias = [];
  REFS.forEach((ref) => {
    const medEl = document.getElementById(ref.hiddenId);
    const otraEl = document.getElementById(ref.otraId);
    const cantEl = document.getElementById(ref.cantidadId);
    const activa = ref.n <= visibleRefs && !!medEl.value;

    const medidaFinal = !activa
      ? ""
      : medEl.value === "__OTHER__"
      ? otraEl.value.trim()
      : medEl.value;
    const medidaOtra =
      activa && medEl.value === "__OTHER__" ? otraEl.value.trim() : "";
    const cantidadVal = activa && cantEl.value ? Number(cantEl.value) : "";

    const suf = ref.n === 1 ? "" : "_" + ref.n;
    payload["medida" + suf] = medidaFinal;
    payload["medida_otra" + suf] = medidaOtra;
    payload["cantidad" + suf] = cantidadVal;

    if (activa) {
      referencias.push({ medida: medidaFinal, cantidad: cantidadVal });
    }
  });
  payload.num_referencias = referencias.length;
  payload.referencias = referencias;

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

  // Limpia dropdowns: cliente + todas las referencias
  document.getElementById("cliente-dropdown")._clear();
  REFS.forEach((ref) => clearReference(ref));
  visibleRefs = 1;
  updateRefControls();

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
