
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


function injectFunnelBanner() {
  if (document.querySelector('.funnel-banner')) return;
  const banner = document.createElement('div');
  banner.className = 'funnel-banner';
  banner.innerHTML = `
    <div class="container funnel-banner-inner">
      <p><strong>Unpublished premium fares.</strong> Request a private quote for business or first class long-haul travel.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <a class="btn btn-secondary" href="/destinations/index.html">Explore routes</a>
        <a class="btn btn-primary" href="/request.html?source=sticky-banner">Get my private quote</a>
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
      <h3>Unlock unpublished business and first class fares.</h3>
      <p>Tell us your route and dates and we will check premium fare options with no service fee. Designed for long-haul international travel.</p>
      <div class="popup-actions">
        <a class="btn btn-primary" href="/request.html?source=exit-popup">Get my private quote</a>
        <a class="btn btn-secondary" href="/routes/index.html">Browse long-haul routes</a>
      </div>
    </div>`;
  document.body.appendChild(popup);
  popup.addEventListener('click', (e) => {
    if (e.target === popup || e.target.closest('.popup-close')) popup.classList.remove('active');
  });
  const seen = sessionStorage.getItem('luxaeris_exit_popup_seen');
  if (seen) return;
  const handler = (e) => {
    if (e.clientY > 20) return;
    popup.classList.add('active');
    sessionStorage.setItem('luxaeris_exit_popup_seen', '1');
    document.removeEventListener('mouseout', handler);
  };
  document.addEventListener('mouseout', handler);
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
  const email = form.querySelector('[name="email"]');
  const phone = form.querySelector('[name="phone"]');
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
      if (status) status.textContent = 'Please select valid airports from the list and enter a real email address and phone number.';
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
    src = REAL_IMAGE_MAP.destinations[slug] || '';
  } else if (parts[0] === 'airports' && parts.length >= 2) {
    const slug = parts[parts.length - 1].replace('.html', '');
    src = REAL_IMAGE_MAP.airports[slug] || '';
  } else if (parts[0] === 'routes' && parts.length >= 2) {
    const slug = parts[parts.length - 1].replace('.html', '');
    const match = slug.match(/to-([a-z0-9]{3,4})/i);
    if (match) src = CODE_IMAGE_MAP[match[1].toUpperCase()] || '';
  } else if (parts[0] === 'cabins' && parts.length >= 2) {
    const slug = parts[parts.length - 1];
    if (slug.includes('business')) src = REAL_IMAGE_MAP.cabins.business;
    if (slug.includes('first')) src = REAL_IMAGE_MAP.cabins.first;
  } else if (path.endsWith('/index.html') || path === '/' || path === '/index.html') {
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach((card, i) => card.classList.add('feature-card-visual', `visual-${i+1}`));
  }
  if (heroImg && src) {
    heroImg.src = src;
  }
}

function polishMicrocopy() {
  document.querySelectorAll('a, button').forEach(el => {
    if (el.textContent.includes('Request Quote')) el.textContent = el.textContent.replaceAll('Request Quote', 'Get Tailored Options');
    if (el.textContent.includes('Get my private quote')) el.textContent = el.textContent.replaceAll('Get my private quote', 'Get tailored options');
    if (el.textContent.includes('Get My Private Quote')) el.textContent = el.textContent.replaceAll('Get My Private Quote', 'Get Tailored Options');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  enhanceRequestSubmission();
  applyRealImages();
  polishMicrocopy();
});
