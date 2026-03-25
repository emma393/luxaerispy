
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
  const q = (query || '').trim().toLowerCase();
  if (q.length < 2) return [];
  return AIRPORTS.filter(item => {
    const label = (item.label || '').toLowerCase();
    const code = (item.code || '').toLowerCase();
    const city = (item.city || '').toLowerCase();
    const country = (item.country || '').toLowerCase();
    return label.includes(q) || code.includes(q) || city.includes(q) || country.includes(q);
  }).slice(0, 12);
}

function closeDropdown() {
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
  }
}

function attachAirportAutocomplete(input) {
  input.setAttribute('autocomplete', 'off');
  input.addEventListener('input', () => {
    delete input.dataset.airportCode;
    delete input.dataset.airportSlug;
    const query = input.value || '';
    const matches = filterAirports(query);
    closeDropdown();
    if (query.trim().length < 2 || matches.length === 0) return;
    const box = document.createElement('div');
    box.className = 'airport-dropdown';
    matches.forEach(item => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'airport-option';
      row.innerHTML = `<strong>${item.code}</strong> — ${item.city}, ${item.country}`;
      row.addEventListener('click', () => {
        input.value = item.label;
        input.dataset.airportCode = item.code;
        input.dataset.airportSlug = item.slug || '';
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
    setTimeout(() => {
      closeDropdown();
      markAirportFieldValidity(input);
    }, 180);
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
  const valid = !!input.dataset.airportCode && AIRPORT_LOOKUP.has(raw) && AIRPORT_LOOKUP.get(raw).code === input.dataset.airportCode;
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
      if ((name === 'origin' || name === 'destination') && AIRPORT_LOOKUP.has(value)) {
        field.dataset.airportCode = AIRPORT_LOOKUP.get(value).code;
        field.dataset.airportSlug = AIRPORT_LOOKUP.get(value).slug || '';
      }
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


function injectFunnelBanner() {
  if (document.querySelector('.funnel-banner')) return;
  const banner = document.createElement('div');
  banner.className = 'funnel-banner';
  banner.innerHTML = `
    <div class="container funnel-banner-inner">
      <p><strong>Need tailored premium travel guidance?</strong> Share your route and cabin preferences to be matched with a relevant specialist.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <a class="btn btn-secondary" href="/destinations/index.html">Explore destinations</a>
        <a class="btn btn-primary" href="/request.html?source=sticky-banner">Request tailored options</a>
      </div>
    </div>`;
  document.body.appendChild(banner);
}

function injectExitPopup() {
  if (document.getElementById('exitPopup')) return;
  const popup = document.createElement('div');
  popup.id = 'exitPopup';
  popup.className = 'popup-overlay';
  popup.innerHTML = `
    <div class="popup-card">
      <button class="popup-close" type="button" aria-label="Close">×</button>
      <p class="kicker">Before you leave</p>
      <h3>Keep your premium route research moving.</h3>
      <p>Share your route and cabin preferences to receive tailored premium travel options from a relevant specialist when appropriate.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px">
        <a class="btn btn-primary" href="/request.html?source=exit-popup">Request tailored options</a>
        <a class="btn btn-secondary" href="/routes/index.html">Explore routes</a>
      </div>
    </div>`;
  document.body.appendChild(popup);
  popup.querySelector('.popup-close').addEventListener('click', () => popup.remove());
  let fired = false;
  document.addEventListener('mouseout', e => {
    if (fired || e.clientY > 0) return;
    fired = true;
    popup.classList.add('show');
  });
}

function enhanceRequestForm() {
  const form = document.getElementById('quoteRequestForm');
  if (!form) return;
  const url = new URL(window.location.href);
  const source = url.searchParams.get('source') || document.referrer || 'direct';
  const sourceInput = document.createElement('input');
  sourceInput.type = 'hidden'; sourceInput.name = 'leadSource'; sourceInput.value = source;
  form.appendChild(sourceInput);
  const nextInput = document.createElement('input');
  nextInput.type = 'hidden'; nextInput.name = '_next'; nextInput.value = window.location.origin + '/thank-you.html';
  form.appendChild(nextInput);
}

document.addEventListener('DOMContentLoaded', async () => {
  injectFunnelBanner();
  injectExitPopup();
  enhanceRequestForm();
}, { once: true });


const REAL_IMAGE_MAP = {
  destinations: {
    'paris': '/assets/images/real/paris.jpg',
    'new-york': '/assets/images/real/new-york.jpg',
    'london': '/assets/images/real/london.jpg',
    'tokyo': '/assets/images/real/tokyo.jpg',
    'dubai': '/assets/images/real/dubai.jpg',
    'los-angeles': '/assets/images/real/los-angeles.jpg'
  },
  airports: {
    'jfk': '/assets/images/real/jfk.jpg',
    'lax': '/assets/images/real/lax.jpg'
  },
  cabins: {
    'business': '/assets/images/real/business-class.jpg',
    'first': '/assets/images/real/first-class.jpg'
  },
  fallback: '/assets/images/real/business-class.jpg'
};

const CODE_IMAGE_MAP = { CDG: '/assets/images/real/paris.jpg', ORY: '/assets/images/real/paris.jpg', JFK: '/assets/images/real/new-york.jpg', EWR: '/assets/images/real/new-york.jpg', LHR: '/assets/images/real/london.jpg', LGW: '/assets/images/real/london.jpg', HND: '/assets/images/real/tokyo.jpg', NRT: '/assets/images/real/tokyo.jpg', DXB: '/assets/images/real/dubai.jpg', LAX: '/assets/images/real/los-angeles.jpg' };

function validName(value) {
  return (value || '').trim().replace(/\s+/g, ' ').length >= 2;
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim());
}

function validPhone(value) {
  const digits = (value || '').replace(/\D/g, '');
  return digits.length >= 7;
}

function getAirportRecordFromInput(input) {
  const raw = (input.value || '').trim();
  return AIRPORT_LOOKUP.get(raw) || null;
}

function inferRouteType(originCode, destinationCode) {
  const us = new Set(['JFK','EWR','LGA','LAX','SFO','ORD','DFW','MIA','SEA','IAD','BOS','ATL','IAH','LAS','SAN','PHX','CLT','DTW','MSP','DEN','HNL']);
  const originUS = us.has((originCode || '').toUpperCase());
  const destinationUS = us.has((destinationCode || '').toUpperCase());
  if (originUS && destinationUS) return 'domestic-us';
  if (originUS && !destinationUS) return 'outbound-us';
  if (!originUS && destinationUS) return 'inbound-us';
  return 'global-premium';
}

function applyAirportValidation(form) {
  let ok = true;
  form.querySelectorAll('[data-location-input]').forEach(input => {
    const valid = markAirportFieldValidity(input);
    input.classList.toggle('field-invalid', !valid);
    ok = valid && ok;
  });
  const fullName = form.querySelector('[name="fullName"]');
  const email = form.querySelector('[name="email"]');
  const phone = form.querySelector('[name="phone"]');
  if (fullName) {
    const good = validName(fullName.value);
    fullName.setCustomValidity(good ? '' : 'Please enter your full name.');
    fullName.classList.toggle('field-invalid', !good);
    ok = good && ok;
  }
  if (email) {
    const good = validEmail(email.value);
    email.setCustomValidity(good ? '' : 'Please enter a valid email address.');
    email.classList.toggle('field-invalid', !good);
    ok = good && ok;
  }
  if (phone) {
    const good = validPhone(phone.value);
    phone.setCustomValidity(good ? '' : 'Please enter a valid phone or WhatsApp number.');
    phone.classList.toggle('field-invalid', !good);
    ok = good && ok;
  }
  return ok;
}

function enhanceRequestSubmission() {
  const form = document.getElementById('quoteRequestForm');
  if (!form) return;
  const status = document.getElementById('formStatus');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ok = applyAirportValidation(form);
    if (!ok) {
      if (status) status.textContent = 'Please complete every required field and choose both airports from the dropdown list.';
      form.reportValidity();
      return;
    }

    const origin = getAirportRecordFromInput(form.querySelector('[name="origin"]'));
    const destination = getAirportRecordFromInput(form.querySelector('[name="destination"]'));
    if (!origin || !destination) {
      if (status) status.textContent = 'Please choose both airports from the suggested list.';
      return;
    }

    const payload = Object.fromEntries(new FormData(form).entries());
    payload.originCode = origin.code;
    payload.destinationCode = destination.code;
    payload.routeType = inferRouteType(origin.code, destination.code);
    payload.originCity = origin.city || '';
    payload.destinationCity = destination.city || '';
    payload.originCountry = origin.country || '';
    payload.destinationCountry = destination.country || '';

    const endpoint = (window.LUXAERIS_FORM_ENDPOINT || '').trim();
    if (!endpoint) {
      if (status) status.textContent = 'Add your Google Apps Script endpoint in assets/site-config.js to activate submissions.';
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    if (status) status.textContent = 'Submitting your request…';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Submission failed');
      window.location.href = '/thank-you.html';
    } catch (err) {
      if (status) status.textContent = 'We could not send your request just now. Please try again in a moment.';
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

function applyRealImages() {
  const path = window.location.pathname;
  const parts = path.split('/').filter(Boolean);
  const heroImg = document.querySelector('.lux-hero img');
  let src = '';
  if (parts[0] === 'destinations' && parts.length >= 2) {
    const slug = parts[parts.length - 1].replace('.html', '');
    src = REAL_IMAGE_MAP.destinations[slug] || REAL_IMAGE_MAP.fallback;
  } else if (parts[0] === 'airports' && parts.length >= 2) {
    const slug = parts[parts.length - 1].replace('.html', '');
    src = REAL_IMAGE_MAP.airports[slug] || '/assets/images/real/jfk.jpg';
  } else if (parts[0] === 'routes' && parts.length >= 2) {
    const slug = parts[parts.length - 1].replace('.html', '');
    const match = slug.match(/to-([a-z0-9]{3,4})/i);
    if (match) src = CODE_IMAGE_MAP[match[1].toUpperCase()] || REAL_IMAGE_MAP.fallback;
    else src = REAL_IMAGE_MAP.fallback;
  } else if (parts[0] === 'cabins' && parts.length >= 2) {
    const slug = parts[parts.length - 1];
    if (slug.includes('business')) src = REAL_IMAGE_MAP.cabins.business;
    if (slug.includes('first')) src = REAL_IMAGE_MAP.cabins.first;
  } else if (path.endsWith('/index.html') || path === '/' || path === '/index.html') {
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach((card, i) => card.classList.add('feature-card-visual', `visual-${i+1}`));
  }
  if (heroImg && src) heroImg.src = src;
}

function polishMicrocopy() {
  document.querySelectorAll('a, button').forEach(el => {
    if (el.textContent.includes('Request Quote')) el.textContent = el.textContent.replaceAll('Request Quote', 'Request tailored options');
    if (el.textContent.includes('Get my private quote')) el.textContent = el.textContent.replaceAll('Get my private quote', 'Request tailored options');
    if (el.textContent.includes('Get My Private Quote')) el.textContent = el.textContent.replaceAll('Get My Private Quote', 'Request tailored options');
    if (el.textContent.includes('private quote')) el.textContent = el.textContent.replaceAll('private quote', 'tailored options');
  });
}


function luxaerisShouldHaveRail(){
  const path = window.location.pathname.replace(/\/+/g,'/');
  if (path === '/' || path === '/index.html' || path === '/request.html' || path === '/about.html' || path === '/contact.html' || path === '/faq.html' || path === '/privacy-policy.html' || path === '/terms-and-conditions.html' || path === '/cookie-policy.html' || path === '/disclaimer.html' || path === '/thank-you.html' || path === '/search.html') return false;
  return /^\/(destinations|routes|airports|airlines|cabins)\//.test(path);
}

function luxaerisRailHTML(contextTitle){
  return `<aside class="luxaeris-fixed-rail"><div class="request-card"><p class="kicker">Request tailored options</p><h2>Get business or first class options without leaving this page.</h2><p class="request-lede">Share your route, dates, and preferences for ${contextTitle}. LuxAeris does not sell tickets directly and there is no LuxAeris service fee.</p><div class="proof-list"><span>No service fee</span><span>Premium airlines</span><span>Fast follow-up</span></div><form class="rail-quote-form" data-luxaeris-form="rail" novalidate><div class="trip-switch"><button class="trip-tab active" type="button" data-trip="roundtrip">Round Trip</button><button class="trip-tab" type="button" data-trip="oneway">One Way</button><button class="trip-tab" type="button" data-trip="multicity">Multi City</button><input type="hidden" name="tripType" value="roundtrip"></div><div class="field full-row"><label>Origin</label><input name="origin" data-location-input placeholder="Type city or airport" required></div><div class="field full-row"><label>Destination</label><input name="destination" data-location-input placeholder="Type city or airport" required></div><div class="field"><label>Departure date</label><input type="date" name="departDate" required></div><div class="field return-wrap"><label>Return date</label><input type="date" name="returnDate" required></div><div class="field"><label>Cabin</label><select name="cabin"><option>Business Class</option><option>First Class</option><option>Premium Economy</option></select></div><div class="field"><label>Full name</label><input name="fullName" placeholder="Your name" required></div><div class="field full-row"><label>Email</label><input type="email" name="email" placeholder="name@email.com" required></div><div class="field full-row"><label>Phone or WhatsApp</label><input name="phone" placeholder="+1..." required></div><div class="field full-row"><label>Notes</label><textarea name="notes" placeholder="Preferred airline, flexibility, passengers, or anything helpful"></textarea></div><p class="microcopy">Not sure about dates or the exact airport yet? Submit the closest option and LuxAeris can refine it with you.</p><div class="status" aria-live="polite"></div><button class="btn btn-primary full-row" type="submit">Request tailored options</button></form></div></aside>`;
}

function luxaerisInjectEnhancements(){
  if (!luxaerisShouldHaveRail()) return;
  const h1 = document.querySelector('main h1, body > section h1, .page-shell h1, .section h1');
  if (h1 && !document.querySelector('.luxaeris-trust-line')) {
    const trust = document.createElement('p');
    trust.className = 'luxaeris-trust-line';
    trust.textContent = 'Tailored premium flight options • no LuxAeris service fee • request without leaving this page';
    h1.insertAdjacentElement('afterend', trust);
  }
  if (/\/routes\//.test(window.location.pathname) && !document.querySelector('.luxaeris-price-box')) {
    const intro = document.querySelector('main p, .section p');
    if (intro && intro.parentNode) {
      const box = document.createElement('section');
      box.className = 'luxaeris-price-box';
      box.innerHTML = `<article class="content-panel"><p class="kicker">Why travelers choose LuxAeris</p><h2>Premium route help without the search fatigue</h2><ul class="guide-list"><li>No LuxAeris service fee</li><li>Premium airlines and long-haul route context</li><li>Faster than manually checking dozens of combinations</li></ul></article><article class="content-panel"><p class="kicker">Typical fare context</p><h2>Typical business class fare range</h2><p class="price-range">$2,200 – $4,800</p><p>Typical fares vary by route, season, flexibility, and cabin inventory. Use the request form for route-specific options on your dates.</p></article>`;
      intro.insertAdjacentElement('afterend', box);
    }
  }
  if (!document.querySelector('.luxaeris-inline-faq')) {
    const target = document.querySelector('main .container, body > section .container');
    if (target) {
      const faq = document.createElement('section');
      faq.className = 'luxaeris-inline-faq';
      const title = document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : 'this page';
      faq.innerHTML = `<p class="kicker">FAQ</p><h2>Questions travelers ask about ${title}</h2><details open><summary>Does LuxAeris sell tickets directly?</summary><p>No. LuxAeris does not sell tickets directly. The site helps travelers request tailored premium flight options through trusted providers.</p></details><details><summary>Is there a LuxAeris service fee?</summary><p>No. There is no LuxAeris service fee for submitting a tailored request through the website.</p></details><details><summary>Can I submit a request without exact dates?</summary><p>Yes. Share your best estimate and any flexibility you have. LuxAeris can refine the route and date range with you.</p></details>`;
      target.appendChild(faq);
    }
  }
  if (!document.querySelector('.breadcrumbs')) {
    const target = document.querySelector('main .container, body > section .container');
    if (target) {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const bc = document.createElement('nav');
      bc.className = 'breadcrumbs';
      let html = '<span class="crumb"><a href="/index.html">Home</a></span>';
      let cur = '';
      parts.forEach((p, i) => {
        cur += '/' + p;
        const label = (p === 'index.html' ? (parts[i-1] || 'home') : p).replace('.html','').replace(/-/g,' ');
        if (i < parts.length - 1) html += `<span class="crumb"><a href="${cur}${p==='index.html'?'':'/index.html'}">${label.replace(/\b\w/g, c => c.toUpperCase())}</a></span>`;
      });
      const last = (parts[parts.length-1] === 'index.html' ? parts[parts.length-2] : parts[parts.length-1]).replace('.html','').replace(/-/g,' ');
      html += `<span class="crumb current">${last.replace(/\b\w/g, c => c.toUpperCase())}</span>`;
      bc.innerHTML = html;
      target.insertAdjacentElement('afterbegin', bc);
    }
  }
}

function bindUniversalQuoteForms(){
  document.querySelectorAll('form[data-luxaeris-form]').forEach(form => {
    if (form.dataset.bound === '1') return;
    form.dataset.bound = '1';
    form.querySelectorAll('[data-location-input]').forEach(attachAirportAutocomplete);
    const tabs = form.querySelectorAll('.trip-tab');
    const tripField = form.querySelector('[name="tripType"]');
    const returnWrap = form.querySelector('.return-wrap');
    const returnInput = form.querySelector('[name="returnDate"]');
    function apply(type){
      tabs.forEach(t => t.classList.toggle('active', t.dataset.trip === type));
      if (tripField) tripField.value = type;
      const needsReturn = type === 'roundtrip';
      if (returnWrap) returnWrap.style.display = needsReturn ? '' : 'none';
      if (returnInput) { returnInput.required = needsReturn; if (!needsReturn) returnInput.value = ''; }
    }
    tabs.forEach(t => t.addEventListener('click', () => apply(t.dataset.trip)));
    apply((tripField && tripField.value) || 'roundtrip');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = form.querySelector('.status');
      let ok = true;
      form.querySelectorAll('[data-location-input]').forEach(input => {
        const valid = markAirportFieldValidity(input);
        input.classList.toggle('field-invalid', !valid);
        ok = ok && valid;
      });
      const fullName = form.querySelector('[name="fullName"]');
      const email = form.querySelector('[name="email"]');
      const phone = form.querySelector('[name="phone"]');
      if (fullName) { const good = validName(fullName.value); fullName.setCustomValidity(good ? '' : 'Please enter your full name.'); ok = ok && good; }
      if (email) { const good = validEmail(email.value); email.setCustomValidity(good ? '' : 'Please enter a valid email address.'); ok = ok && good; }
      if (phone) { const good = validPhone(phone.value); phone.setCustomValidity(good ? '' : 'Please enter a valid phone number.'); ok = ok && good; }
      const dep = form.querySelector('[name="departDate"]');
      if (!dep || !dep.value) ok = false;
      if (returnInput && returnInput.required && !returnInput.value) ok = false;
      if (!ok) {
        if (status) status.textContent = 'Please complete the required fields and choose airports from the list.';
        form.reportValidity();
        return;
      }
      const origin = getAirportRecordFromInput(form.querySelector('[name="origin"]'));
      const destination = getAirportRecordFromInput(form.querySelector('[name="destination"]'));
      if (!origin || !destination) { if (status) status.textContent = 'Please choose both airports from the suggested list.'; return; }
      const endpoint = (window.LUXAERIS_FORM_ENDPOINT || '').trim();
      if (!endpoint) { if (status) status.textContent = 'Add your Google Apps Script endpoint in assets/site-config.js to activate submissions.'; return; }
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.originCode = origin.code; payload.destinationCode = destination.code;
      payload.routeType = inferRouteType(origin.code, destination.code);
      payload.originCity = origin.city || ''; payload.destinationCity = destination.city || '';
      payload.originCountry = origin.country || ''; payload.destinationCountry = destination.country || '';
      payload.leadSource = window.location.pathname;
      const submit = form.querySelector('button[type="submit"]'); if (submit) submit.disabled = true;
      if (status) status.textContent = 'Submitting your request…';
      try {
        const res = await fetch(endpoint, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
        if (!res.ok) throw new Error('Submission failed');
        window.location.href = '/thank-you.html';
      } catch (err) {
        if (status) status.textContent = 'We could not send your request just now. Please try again in a moment.';
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  });
}

function luxaerisInjectRail(){
  if (!luxaerisShouldHaveRail() || document.querySelector('.luxaeris-fixed-rail')) return;
  document.body.classList.add('has-sticky-request-rail');
  document.querySelectorAll('.floating-request').forEach(el => el.remove());
  document.querySelectorAll('section, article, div').forEach(block => {
    const heading = block.querySelector && block.querySelector('h2,h3');
    if (!heading) return;
    const txt = (heading.textContent || '').trim().toLowerCase();
    if (txt.includes('request a tailor') || txt.includes('request a quote') || txt.includes('request this route') || txt.includes('tailor-made itinerary')) {
      if ((block.textContent || '').trim().length < 700) block.remove();
    }
  });
  const h1 = document.querySelector('main h1, body > section h1, .page-shell h1, .section h1');
  const contextTitle = h1 ? h1.textContent.trim() : 'this trip';
  const main = document.querySelector('main') || document.querySelector('body > section');
  if (main) main.insertAdjacentHTML('afterend', luxaerisRailHTML(contextTitle));
  else document.body.insertAdjacentHTML('beforeend', luxaerisRailHTML(contextTitle));
  luxaerisInjectEnhancements();
  bindUniversalQuoteForms();
}

document.addEventListener('DOMContentLoaded', async () => {
  try { if (!AIRPORTS.length) await loadAirports(); } catch (e) {}
  applyDateLimitsAndUI();
  luxaerisInjectRail();
  bindUniversalQuoteForms();
});
