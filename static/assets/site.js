
let AIRPORTS = [];
let AIRPORT_LOOKUP = new Map();

async function loadAirports() {
  if (AIRPORTS.length) return AIRPORTS;
  const candidates = ['/assets/airports-search-10k.json', '/assets/airport-search.json', '/data/airports.json'];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (Array.isArray(data.airports) ? data.airports : []);
      if (!arr.length) continue;
      AIRPORTS = arr.map(item => {
        const label = String(item.label || '').trim();
        const code = String(item.code || '').trim();
        const city = String(item.city || '').trim();
        const country = String(item.country || '').trim();
        return {
          label: label || `${code} — ${city}, ${country}`,
          code,
          city,
          country,
          submitCode: item.submitCode || code,
          slug: item.slug || ''
        };
      });
      AIRPORT_LOOKUP = new Map(AIRPORTS.map(a => [a.label, a]));
      return AIRPORTS;
    } catch (e) {}
  }
  return [];
}

function searchAirports(q) {
  q = String(q || '').trim().toLowerCase();
  if (q.length < 2) return [];
  return AIRPORTS.filter(a => {
    return [a.label, a.code, a.city, a.country].filter(Boolean).join(' ').toLowerCase().includes(q);
  }).slice(0, 10);
}

function bindAutocompleteInput(input) {
  if (!input || input.dataset.autocompleteBound === '1') return;
  input.dataset.autocompleteBound = '1';
  const field = input.closest('.autocomplete-field') || input.parentElement;
  let list = field.querySelector('.autocomplete-list');
  if (!list) {
    list = document.createElement('div');
    list.className = 'autocomplete-list';
    list.hidden = true;
    field.appendChild(list);
  }
  input.setAttribute('autocomplete', 'off');
  input.addEventListener('input', () => {
    delete input.dataset.airportCode;
    delete input.dataset.airportLabel;
    const results = searchAirports(input.value);
    if (!results.length) { list.hidden = true; list.innerHTML = ''; return; }
    list.innerHTML = results.map(a => `<div class="autocomplete-item" data-label="${a.label.replace(/"/g,'&quot;')}" data-code="${a.submitCode}"><strong>${a.code}</strong> — ${a.city}, ${a.country}</div>`).join('');
    list.hidden = false;
  });
  list.addEventListener('click', (e) => {
    const row = e.target.closest('.autocomplete-item');
    if (!row) return;
    input.value = row.dataset.label;
    input.dataset.airportCode = row.dataset.code;
    input.dataset.airportLabel = row.dataset.label;
    list.hidden = true;
  });
  input.addEventListener('blur', () => setTimeout(() => {
    list.hidden = true;
    const valid = !!input.dataset.airportCode;
    if (!valid && input.value.trim()) input.setCustomValidity('Please choose an airport from the list.');
    else input.setCustomValidity('');
  }, 120));
}

function bindTripButtons(scope=document) {
  scope.querySelectorAll('.trip-type-switch').forEach(host => {
    if (host.dataset.bound === '1') return;
    host.dataset.bound = '1';
    const hidden = host.parentElement.querySelector('input[type="hidden"][name="tripType"]') || host.querySelector('input[type="hidden"][name="tripType"]');
    const buttons = host.querySelectorAll('.trip-type-btn, .trip-tab');
    const apply = (value, btn) => {
      buttons.forEach(b => b.classList.toggle('is-active', b === btn) || b.classList.toggle('active', b === btn));
      if (hidden) hidden.value = value;
      const form = host.closest('form');
      const returnWrap = form ? (form.querySelector('.return-wrap') || form.querySelector('#returnDate')?.closest('.field')) : null;
      const returnInput = form ? form.querySelector('[name="returnDate"]') : null;
      const showReturn = !/one way/i.test(value);
      if (returnWrap) returnWrap.style.display = showReturn ? '' : 'none';
      if (returnInput) returnInput.required = showReturn;
      if (!showReturn && returnInput) returnInput.value = '';
      const multiSection = form ? form.querySelector('#multiCitySection') : null;
      if (multiSection) multiSection.hidden = !/multi/i.test(value);
    };
    buttons.forEach(btn => btn.addEventListener('click', () => apply(btn.dataset.tripType || btn.dataset.trip || btn.textContent.trim(), btn)));
  });
}

function styleCityHeroBackground() {
  document.querySelectorAll('.hero-grid.city-guide-grid').forEach(el => el.classList.add('city-guide-overlay'));
}

function shouldInjectInlineRequest() {
  const p = window.location.pathname;
  if (p === '/' || p.endsWith('/index.html') && p.split('/').length <= 2) return false;
  return /^\/(destinations|routes|airports|airlines|cabins)\//.test(p);
}

function makeInlineRequestSection(title) {
  const sec = document.createElement('section');
  sec.className = 'inline-request-section container';
  sec.innerHTML = `
    <div class="request-panel">
      <div class="request-grid">
        <div class="request-copy full-row">
          <p class="eyebrow">Request tailored options</p>
          <h2>Request refined premium options without leaving this page.</h2>
          <p>Share your travel details for ${title}. LuxAeris will shape premium options around comfort, timing, and airline fit.</p>
        </div>
        <form class="full-row" data-inline-request>
          <div class="trip-type-switch" role="tablist">
            <button class="trip-type-btn is-active" type="button" data-trip-type="Round Trip">Round Trip</button>
            <button class="trip-type-btn" type="button" data-trip-type="One Way">One Way</button>
            <button class="trip-type-btn" type="button" data-trip-type="Multi City">Multi City</button>
          </div>
          <input type="hidden" name="tripType" value="Round Trip" />
          <div class="request-grid">
            <div class="autocomplete-field"><label>Origin</label><input name="origin" placeholder="City, airport, or metro code" required /></div>
            <div class="autocomplete-field"><label>Destination</label><input name="destination" placeholder="City, airport, or metro code" required /></div>
            <div><label>Departure date</label><input name="departDate" data-date-field placeholder="mm.dd.yyyy" required /></div>
            <div class="return-wrap"><label>Return date</label><input name="returnDate" data-date-field placeholder="mm.dd.yyyy" required /></div>
            <div><label>Cabin</label><select name="cabin"><option>Business Class</option><option>First Class</option><option>Premium Economy</option></select></div>
            <div><label>Budget range</label><select name="preferredFareRange"><option value="">Select budget range</option><option>$3,500–$5,500</option><option>$5,500–$8,500</option><option>$8,500+</option></select></div>
            <div><label>Full name</label><input name="fullName" placeholder="Your name" required /></div>
            <div><label>Email</label><input name="email" type="email" placeholder="name@email.com" required /></div>
            <div><label>Phone or WhatsApp</label><input name="phone" placeholder="+1..." required /></div>
            <div class="button-row"><button class="btn btn-primary" type="submit">Continue</button></div>
          </div>
        </form>
      </div>
    </div>`;
  return sec;
}

function injectInlineRequest() {
  if (!shouldInjectInlineRequest()) return;
  if (document.querySelector('.inline-request-section')) return;
  const title = (document.querySelector('h1')?.textContent || 'this trip').trim();
  const target = document.querySelector('main .container, .page-shell > .container, section.section > .container, body > section > .container');
  if (!target) return;
  const section = makeInlineRequestSection(title);
  const parentSection = target.closest('section') || target;
  parentSection.insertAdjacentElement('afterend', section);
  bindTripButtons(section);
  section.querySelectorAll('input[name="origin"], input[name="destination"]').forEach(bindAutocompleteInput);
  section.querySelector('form[data-inline-request]').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const origin = form.querySelector('[name="origin"]');
    const destination = form.querySelector('[name="destination"]');
    if (!origin.dataset.airportCode || !destination.dataset.airportCode) {
      alert('Please choose both airports from the dropdown list.');
      return;
    }
    const params = new URLSearchParams(new FormData(form));
    params.set('originCode', origin.dataset.airportCode);
    params.set('destinationCode', destination.dataset.airportCode);
    window.location.href = '/request.html?' + params.toString();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadAirports();
  document.querySelectorAll('#origin, #destination, #segment2Origin, #segment2Destination, [data-inline-request] input[name="origin"], [data-inline-request] input[name="destination"]').forEach(bindAutocompleteInput);
  bindTripButtons(document);
  styleCityHeroBackground();
  injectInlineRequest();
});
