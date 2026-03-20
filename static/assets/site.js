
let AIRPORTS = [];
const AIRPORT_LOOKUP = new Map();
let activeDropdown = null;

async function loadAirports() {
  try {
    const res = await fetch('/assets/airports-search-10k.json');
    const data = await res.json();
    AIRPORTS = Array.isArray(data) ? data : [];
    AIRPORTS.forEach(item => AIRPORT_LOOKUP.set(item.label, item));
  } catch (err) {
    AIRPORTS = [];
  }
}

function filterAirports(query) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return AIRPORTS.filter(item =>
    item.label.toLowerCase().includes(q) ||
    item.code.toLowerCase().includes(q) ||
    item.city.toLowerCase().includes(q)
  ).slice(0, 12);
}

function closeDropdown() {
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
  }
}

function attachAirportAutocomplete(input) {
  input.setAttribute('autocomplete', 'off');

  input.addEventListener('focus', () => {
    closeDropdown();
  });

  input.addEventListener('click', () => {
    if ((input.value || '').trim().length < 2) closeDropdown();
  });

  input.addEventListener('input', () => {
    const matches = filterAirports(input.value || '');
    closeDropdown();
    if (matches.length === 0) return;

    const box = document.createElement('div');
    box.className = 'airport-dropdown';
    matches.forEach(item => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'airport-option';
      row.textContent = item.label;
      row.addEventListener('click', () => {
        input.value = item.label;
        input.dataset.airportCode = item.code;
        input.dataset.airportSlug = item.slug;
        input.setCustomValidity('');
        closeDropdown();
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      box.appendChild(row);
    });

    input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(box);
    activeDropdown = box;
  });

  input.addEventListener('blur', () => {
    setTimeout(() => closeDropdown(), 180);
  });
}

function normalizeAirportCode(value) {
  if (!value) return '';
  if (AIRPORT_LOOKUP.has(value)) return AIRPORT_LOOKUP.get(value).code;
  const match = value.trim().match(/^([A-Z0-9]{3,4})\s+—/i);
  return match ? match[1].toUpperCase() : value.trim().toUpperCase();
}

function markAirportFieldValidity(input) {
  if (!input) return true;
  const raw = (input.value || '').trim();
  const valid = AIRPORT_LOOKUP.has(raw);
  input.setCustomValidity(valid ? '' : 'Please choose a valid airport from the list.');
  return valid;
}

function toISO(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toUS(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${m}.${d}.${y}`;
}

function syncDateDisplay(input) {
  const shell = input.closest('.date-shell');
  const display = shell ? shell.querySelector('.date-display') : null;
  if (display) display.value = toUS(input.value);
}

function applyDateLimitsAndUI() {
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 364);
  const min = toISO(today);
  const max = toISO(maxDate);

  document.querySelectorAll('input[type="date"]').forEach(input => {
    input.min = min;
    input.max = max;
    if (input.dataset.enhanced === '1') {
      syncDateDisplay(input);
      return;
    }
    input.dataset.enhanced = '1';

    const shell = document.createElement('div');
    shell.className = 'date-shell';
    input.parentNode.insertBefore(shell, input);
    shell.appendChild(input);

    const display = document.createElement('input');
    display.type = 'text';
    display.className = 'date-display';
    display.placeholder = 'mm.dd.yyyy';
    display.readOnly = true;
    display.value = toUS(input.value);
    shell.insertBefore(display, input);

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'date-trigger';
    trigger.textContent = '📅';
    trigger.addEventListener('click', () => {
      if (typeof input.showPicker === 'function') input.showPicker();
      else input.focus();
    });
    shell.appendChild(trigger);

    display.addEventListener('click', () => {
      if (typeof input.showPicker === 'function') input.showPicker();
      else input.focus();
    });

    input.addEventListener('change', () => syncDateDisplay(input));
  });
}

function bindTripSwitchers() {
  document.querySelectorAll('[data-trip-switcher]').forEach(host => {
    const tabs = host.querySelectorAll('.trip-tab');
    const returnField = host.querySelector('[name="returnDate"]');
    function apply(type) {
      host.dataset.tripType = type;
      tabs.forEach(t => t.classList.toggle('active', t.dataset.trip === type));
      if (returnField) {
        const shell = returnField.closest('.date-shell') || returnField;
        shell.style.display = type === 'roundtrip' ? '' : 'none';
        returnField.required = type === 'roundtrip';
        if (type !== 'roundtrip') returnField.value = '';
        syncDateDisplay(returnField);
      }
      const tripSelect = host.querySelector('[name="tripType"]');
      if (tripSelect) tripSelect.value = type;
    }
    tabs.forEach(t => t.addEventListener('click', () => apply(t.dataset.trip)));
    apply(host.dataset.defaultTrip || 'roundtrip');
  });
}

function buildRequestURL(form) {
  const params = new URLSearchParams();
  ['origin','destination','departDate','returnDate','cabin'].forEach(name => {
    const field = form.querySelector(`[name="${name}"]`);
    if (field && field.value) params.set(name, field.value);
  });
  const host = form.closest('[data-trip-switcher]') || form;
  params.set('tripType', host.dataset.tripType || 'roundtrip');
  return '/request.html?' + params.toString();
}

function bindSearchForms() {
  document.querySelectorAll('[data-flight-search]').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const host = form.closest('[data-trip-switcher]') || form;
      const tripType = host.dataset.tripType || 'roundtrip';
      let ok = true;

      ['origin', 'destination', 'departDate'].forEach(name => {
        const field = form.querySelector(`[name="${name}"]`);
        if (!field || !field.value) ok = false;
      });
      const returnField = form.querySelector('[name="returnDate"]');
      if (tripType === 'roundtrip' && returnField && !returnField.value) ok = false;

      form.querySelectorAll('[data-location-input]').forEach(input => {
        ok = markAirportFieldValidity(input) && ok;
      });

      if (!ok) {
        alert('Please complete the required fields using airports from the list.');
        return;
      }

      window.location.href = buildRequestURL(form);
    });
  });
}

function prefillRequestForm() {
  const form = document.getElementById('quoteRequestForm');
  if (!form) return;
  const url = new URL(window.location.href);
  ['origin','destination','departDate','returnDate','cabin','tripType'].forEach(name => {
    const value = url.searchParams.get(name);
    const field = form.querySelector(`[name="${name}"]`);
    if (value && field) {
      field.value = value;
      if (field.type === 'date') syncDateDisplay(field);
    }
  });
}

function initHeroVideo() {
  const video = document.getElementById('heroVideo');
  if (!video) return;
  const tryPlay = () => {
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  };
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.autoplay = true;
  tryPlay();
  video.addEventListener('loadeddata', tryPlay);
  video.addEventListener('canplay', tryPlay);
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.airport-dropdown') && !e.target.matches('[data-location-input]')) closeDropdown();
});

document.addEventListener('DOMContentLoaded', async () => {
  await loadAirports();
  applyDateLimitsAndUI();
  bindTripSwitchers();
  document.querySelectorAll('[data-location-input]').forEach(attachAirportAutocomplete);
  bindSearchForms();
  prefillRequestForm();
  initHeroVideo();
});
