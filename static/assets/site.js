
let AIRPORTS = [];
let AIRPORT_PROMISE = null;
let activeDropdown = null;

async function loadAirports() {
  if (AIRPORTS.length) return AIRPORTS;
  if (AIRPORT_PROMISE) return AIRPORT_PROMISE;
  AIRPORT_PROMISE = (async () => {
    const urls = ['/assets/airports-search-10k.json', '/assets/airport-search.json', '/data/airports.json'];
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (Array.isArray(data.airports) ? data.airports : []);
        if (!arr.length) continue;
        AIRPORTS = arr.map(item => ({
          code: String(item.code || item.iata || '').trim(),
          city: String(item.city || '').trim(),
          country: String(item.country || '').trim(),
          label: String(item.label || `${item.code || ''} — ${item.city || ''}, ${item.country || ''}`).trim(),
          slug: String(item.slug || '').trim()
        })).filter(x => x.code || x.city || x.label);
        return AIRPORTS;
      } catch (e) {}
    }
    AIRPORTS = [];
    return AIRPORTS;
  })();
  return AIRPORT_PROMISE;
}

function closeDropdown() {
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
  }
}

function airportMatches(item, q) {
  const hay = `${item.label} ${item.code} ${item.city} ${item.country}`.toLowerCase();
  return hay.includes(q);
}

function filterAirports(query) {
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 2) return [];
  return AIRPORTS.filter(item => airportMatches(item, q)).slice(0, 12);
}

function attachAirportAutocomplete(input) {
  if (!input || input.dataset.autocompleteBound === '1') return;
  input.dataset.autocompleteBound = '1';
  input.setAttribute('autocomplete', 'off');
  input.addEventListener('input', async () => {
    await loadAirports();
    delete input.dataset.airportCode;
    delete input.dataset.airportSlug;
    const matches = filterAirports(input.value || '');
    closeDropdown();
    if ((input.value || '').trim().length < 2 || !matches.length) return;
    const box = document.createElement('div');
    box.className = 'airport-dropdown';
    matches.forEach(item => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'airport-option';
      row.innerHTML = `<strong>${item.code}</strong> — ${item.city}, ${item.country}`;
      row.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = item.label;
        input.dataset.airportCode = item.code;
        input.dataset.airportSlug = item.slug || '';
        input.setCustomValidity('');
        closeDropdown();
      });
      box.appendChild(row);
    });
    const parent = input.parentElement || input;
    parent.style.position = 'relative';
    parent.appendChild(box);
    activeDropdown = box;
  });
  input.addEventListener('blur', () => setTimeout(closeDropdown, 120));
}

function ensureBudgetFieldInForms(root=document) {
  const cabinFields = Array.from(root.querySelectorAll('select[name="cabin"], #cabin'));
  const map = {
    'Premium Economy': ['Select budget range', '$1,200–$2,200', '$2,200–$3,500', '$3,500+'],
    'Business Class': ['Select budget range', '$3,500–$5,500', '$5,500–$8,500', '$8,500+'],
    'First Class': ['Select budget range', '$6,500–$10,000', '$10,000–$16,000', '$16,000+']
  };
  cabinFields.forEach(cabinField => {
    let form = cabinField.closest('form') || root;
    let fareField = form.querySelector('select[name="preferredFareRange"], #preferredFareRange');
    if (!fareField) {
      const wrap = document.createElement('div');
      wrap.className = 'field full-row field-budget-row';
      wrap.innerHTML = '<label>Budget range</label><select name="preferredFareRange" required></select>';
      (cabinField.closest('.field') || cabinField.parentElement || form).insertAdjacentElement('afterend', wrap);
      fareField = wrap.querySelector('select');
    }
    const sync = () => {
      const opts = map[cabinField.value] || map['Business Class'];
      const prev = fareField.value;
      fareField.innerHTML = opts.map((v, i) => `<option value="${i === 0 ? '' : v}">${v}</option>`).join('');
      if (opts.includes(prev)) fareField.value = prev;
    };
    if (cabinField.dataset.budgetBound !== '1') {
      cabinField.dataset.budgetBound = '1';
      cabinField.addEventListener('change', sync);
    }
    sync();
  });
}

function applyTripTabs(form) {
  const tabs = form.querySelectorAll('.trip-tab, .trip-type-btn');
  const hidden = form.querySelector('[name="tripType"]');
  const returnWrap = form.querySelector('.return-wrap, #returnDateWrap') || (form.querySelector('[name="returnDate"]') ? form.querySelector('[name="returnDate"]').closest('.field') : null);
  const returnInput = form.querySelector('[name="returnDate"], #returnDate');
  const setType = (type) => {
    tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.trip === type) || btn.classList.toggle('is-active', btn.dataset.trip === type));
    if (hidden) hidden.value = type;
    const needReturn = type === 'roundtrip';
    if (returnWrap) returnWrap.style.display = needReturn ? '' : 'none';
    if (returnInput) returnInput.required = needReturn;
  };
  tabs.forEach(btn => btn.addEventListener('click', () => setType(btn.dataset.trip || 'roundtrip')));
  setType((hidden && hidden.value) || 'roundtrip');
}

function railMarkup(contextTitle) {
  return `<aside class="luxaeris-fixed-rail"><div class="request-card"><p class="kicker">Request tailored options</p><h2>Request refined premium options without leaving this page.</h2><p class="request-lede">Share your travel details for ${contextTitle}. LuxAeris shapes premium options around comfort, timing, and airline fit.</p><div class="proof-list"><span>No service fee</span><span>Premium airlines</span><span>Fast follow-up</span></div><form class="rail-quote-form" data-luxaeris-form="rail" novalidate><div class="field full-row"><label>Full name</label><input name="fullName" placeholder="Your name" required></div><div class="field full-row"><label>Email</label><input type="email" name="email" placeholder="name@email.com" required></div><div class="field full-row"><label>Phone or WhatsApp</label><input name="phone" placeholder="+1..." required></div><div class="trip-switch"><button class="trip-tab active" type="button" data-trip="roundtrip">Round Trip</button><button class="trip-tab" type="button" data-trip="oneway">One Way</button><button class="trip-tab" type="button" data-trip="multicity">Multi City</button><input type="hidden" name="tripType" value="roundtrip"></div><div class="field full-row"><label>Origin</label><input name="origin" data-location-input placeholder="Type city or airport" required></div><div class="field full-row"><label>Destination</label><input name="destination" data-location-input placeholder="Type city or airport" required></div><div class="field"><label>Departure date</label><input type="date" name="departDate" required></div><div class="field return-wrap"><label>Return date</label><input type="date" name="returnDate" required></div><div class="field full-row"><label>Cabin</label><select name="cabin"><option>Business Class</option><option>First Class</option><option>Premium Economy</option></select></div><div class="field full-row"><label>Notes</label><textarea name="notes" placeholder="Preferred airline, flexibility, passengers, or anything helpful"></textarea></div><p class="microcopy">Not sure about dates or the exact airport yet? Submit the closest option and LuxAeris can refine it with you.</p><div class="status" aria-live="polite"></div><button class="btn btn-primary full-row" type="submit">Request tailored options</button></form></div></aside>`;
}

function shouldHaveRail() {
  const p = window.location.pathname.replace(/\/+/g, '/');
  if (p === '/' || p === '/index.html' || p === '/request.html' || /\/(about|contact|privacy-policy|cookie-policy|terms-and-conditions|disclaimer|thank-you|faq|search)\.html$/.test(p)) return false;
  return /\/(destinations|routes|airports|airlines|cabins)\//.test(p) || /\/(frankfurt|montreal|washington)\.html$/.test(p);
}

function injectRail() {
  if (!shouldHaveRail()) return;
  const container = document.querySelector('.page-shell > .container, main > .container, body > section > .container');
  if (!container || container.querySelector(':scope > .luxaeris-fixed-rail')) return;
  const title = (document.querySelector('h1')?.textContent || 'this trip').trim();
  const mainCol = document.createElement('div');
  mainCol.className = 'luxaeris-main-column';
  const existing = Array.from(container.children);
  const wrap = document.createElement('div');
  wrap.innerHTML = railMarkup(title);
  const rail = wrap.firstElementChild;
  existing.forEach(el => mainCol.appendChild(el));
  container.classList.add('luxaeris-two-col-target');
  document.body.classList.add('has-sticky-request-rail');
  container.appendChild(rail);
  container.appendChild(mainCol);
}

function bindForms(root=document) {
  root.querySelectorAll('form').forEach(form => {
    form.querySelectorAll('[data-location-input], input[name="origin"], input[name="destination"], #origin, #destination').forEach(attachAirportAutocomplete);
    applyTripTabs(form);
  });
  ensureBudgetFieldInForms(root);
}

function applyDateLimits(root=document) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const max = new Date(today); max.setDate(max.getDate()+364);
  const minStr = today.toISOString().slice(0,10);
  const maxStr = max.toISOString().slice(0,10);
  root.querySelectorAll('input[type="date"]').forEach(el => { el.min = minStr; el.max = maxStr; });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadAirports();
  applyDateLimits(document);
  injectRail();
  bindForms(document);
  applyFullPageCityBackground();
});


function applyFullPageCityBackground(){
  const heroGrid = document.querySelector('.hero-grid.city-guide-grid');
  const heroShot = heroGrid ? heroGrid.querySelector('img.hero-shot') : null;
  if (!heroGrid || !heroShot) return;
  const src = heroShot.getAttribute('src');
  if (!src) return;
  document.body.classList.add('city-page-bg');
  document.body.style.setProperty('--city-page-bg', `url("${src}")`);
}
