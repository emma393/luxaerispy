
const GOOGLE_SCRIPT_URL = window.LUXAERIS_FORM_ENDPOINT || 'https://script.google.com/macros/s/AKfycbzI4qGgCYwGJMZL0P_xPqPtMCs_xJ7jvhDX0uYGXkgVFSQyMKKd1xBLYco9YmX7Dmhe/exec';
const AIRPORTS_URL_CANDIDATES = ['data/airports.json', '/data/airports.json', 'assets/data/airports.json'];

let AIRPORTS = [];
let AIRPORTS_BY_CODE = new Map();

const normalize = (value = '') => String(value).toLowerCase().trim();
const normalizePlain = (value = '') => normalize(String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, ''));

async function loadAirports() {
  if (AIRPORTS.length) return AIRPORTS;
  let lastError = null;
  for (const url of AIRPORTS_URL_CANDIDATES) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const data = Array.isArray(raw) ? raw : (Array.isArray(raw?.airports) ? raw.airports : []);
      if (!Array.isArray(data) || !data.length) throw new Error('Airport data is not an array');
      AIRPORTS = data;
      AIRPORTS_BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]));
      return AIRPORTS;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Unable to load airports data.');
}

function airportDisplayPrefix(airport) {
  if (airport.displayPrefix) return airport.displayPrefix;
  if (airport.isCityGroup) return airport.cityCode || airport.city;
  if (airport.hasCityGroup) return airport.cityCode || airport.city;
  return airport.code;
}

function airportLabel(airport) {
  const prefix = airportDisplayPrefix(airport);
  if (airport.isCityGroup) {
    return `${prefix} (${(airport.memberCodes || []).join(', ')}) — ${airport.city}, ${airport.country}`;
  }
  if (airport.hasCityGroup) {
    return `${prefix} (${airport.code}) — ${airport.city}, ${airport.country}`;
  }
  return `${airport.code} — ${airport.city}, ${airport.country}`;
}

function airportMeta(airport) {
  if (airport.isCityGroup) {
    const names = (airport.memberCodes || []).slice(0, 6).join(', ');
    return `Select the city-wide option or choose a specific airport • ${names}${(airport.memberCodes || []).length > 6 ? ', …' : ''}`;
  }
  const bits = [airport.name || airport.airport || airport.city];
  if (airport.cityCode && airport.cityCode !== airport.code) bits.push(`${airport.cityCode} metro area`);
  if (airport.code) bits.push(airport.code);
  return bits.filter(Boolean).join(' • ');
}

function airportSearchTerms(airport) {
  const parts = [
    airport.code,
    airport.cityCode,
    airport.displayPrefix,
    airport.city,
    airport.country,
    airport.name,
    airport.airport,
    airportLabel(airport),
    ...(airport.memberCodes || []),
    ...(airport.searchable || [])
  ].filter(Boolean);
  return Array.from(new Set(parts.map(normalizePlain)));
}

function searchAirports(term) {
  const q = normalizePlain(term);
  if (q.length < 2) return [];
  const scored = [];
  for (const airport of AIRPORTS) {
    const terms = airportSearchTerms(airport);
    const joined = terms.join(' ');
    if (!joined.includes(q)) continue;

    let score = airport.isCityGroup ? 100 : 0;
    if (terms.some((t) => t === q)) score += 120;
    if (normalizePlain(airportDisplayPrefix(airport)) === q) score += airport.isCityGroup ? 220 : 150;
    if (normalizePlain(airport.code) === q) score += airport.isCityGroup ? 90 : 180;
    if (normalizePlain(airport.cityCode || '') === q) score += airport.isCityGroup ? 200 : 140;
    if (normalizePlain(airport.city || '') === q) score += airport.isCityGroup ? 170 : 90;
    if ((airport.memberCodes || []).some((code) => normalizePlain(code) === q)) score += airport.isCityGroup ? 160 : 70;
    if (terms.some((t) => t.startsWith(q))) score += 60;
    if (normalizePlain(airportLabel(airport)).startsWith(q)) score += 40;
    score += Math.max(0, 12 - (airport.memberCodes || []).length) / 100;

    scored.push({ airport, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.airport.city.localeCompare(b.airport.city) || a.airport.code.localeCompare(b.airport.code))
    .slice(0, 12)
    .map((entry) => entry.airport);
}

function findExactAirport(term) {
  const q = normalizePlain(term);
  if (!q) return null;
  const exact = AIRPORTS.find((airport) => airportSearchTerms(airport).includes(q));
  if (exact) return exact;
  const results = searchAirports(term);
  return results.length === 1 ? results[0] : null;
}

function isValidCode(code) {
  return !!code && AIRPORTS_BY_CODE.has(code);
}

function findAirportByStoredCode(code) {
  if (!code) return null;
  if (AIRPORTS_BY_CODE.has(code)) return AIRPORTS_BY_CODE.get(code);
  const matches = AIRPORTS.filter((airport) => airport.submitCode === code);
  if (!matches.length) return null;
  const preferredGroup = matches.find((airport) => airport.isCityGroup);
  return preferredGroup || matches[0];
}

function submittedCodeFor(storedCode) {
  const airport = findAirportByStoredCode(storedCode);
  return airport?.submitCode || storedCode || '';
}

function parseMDY(text) {
  const m = String(text || '').trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const dt = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getMonth() !== Number(m[1]) - 1 || dt.getDate() !== Number(m[2])) return null;
  return dt;
}

function formatMDY(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}.${dd}.${date.getFullYear()}`;
}

function mdyToISO(text) {
  const dt = parseMDY(text);
  if (!dt) return '';
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

function isoToMDY(text) {
  if (!text) return '';
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(text)) return text;
  const m = String(text).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return text;
  return `${m[2]}.${m[3]}.${m[1]}`;
}

function validMDYWithinRange(text) {
  const dt = parseMDY(text);
  if (!dt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const max = new Date(today);
  max.setDate(max.getDate() + 364);
  return dt >= today && dt <= max;
}

function attachDatePickers() {
  const fields = Array.from(document.querySelectorAll('[data-date-field]'));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const max = new Date(today);
  max.setDate(max.getDate() + 364);

  fields.forEach((input) => {
    input.placeholder = 'mm.dd.yyyy';
    input.autocomplete = 'off';
    input.value = isoToMDY(input.value);

    if (window.flatpickr) {
      const picker = flatpickr(input, {
        dateFormat: 'm.d.Y',
        allowInput: true,
        minDate: today,
        maxDate: max,
        disableMobile: true,
        clickOpens: true,
        onReady: (_, __, instance) => {
          input.dataset.hasCalendar = 'true';
          input.addEventListener('click', () => instance.open());
          input.addEventListener('focus', () => instance.open());
        },
        onClose: (_, dateStr, instance) => {
          if (dateStr) instance.input.value = dateStr;
        }
      });
      input._flatpickr = picker;
    }

    input.addEventListener('blur', () => {
      if (input.value && !validMDYWithinRange(input.value)) {
        input.setCustomValidity('Please use mm.dd.yyyy and choose a date from today to 364 days ahead.');
      } else {
        input.setCustomValidity('');
      }
    });
  });
}

function setupAutocomplete({ inputId, hiddenId, listId, errorId }) {
  const input = document.getElementById(inputId);
  const hidden = document.getElementById(hiddenId);
  const list = document.getElementById(listId);
  const error = document.getElementById(errorId);
  if (!input || !hidden || !list) return;

  let currentResults = [];
  let activeIndex = -1;
  const field = input.closest('.autocomplete-field');
  input.setAttribute('spellcheck', 'false');

  const clearList = () => {
    currentResults = [];
    activeIndex = -1;
    list.hidden = true;
    list.innerHTML = '';
    field?.classList.remove('autocomplete-open');
  };

  const selectAirport = (airport) => {
    input.value = airportLabel(airport);
    input.dataset.selectedCode = airport.code;
    hidden.value = airport.code;
    if (error) error.textContent = '';
    clearList();
  };

  const maybeSelectTypedAirport = () => {
    if (isValidCode(hidden.value)) return true;
    const exact = findExactAirport(input.value);
    if (exact) {
      selectAirport(exact);
      return true;
    }
    return false;
  };

  const renderList = (results) => {
    currentResults = results;
    if (!results.length) {
      clearList();
      return;
    }
    list.innerHTML = results.map((airport, index) => `
      <div class="autocomplete-item ${index === activeIndex ? 'is-active' : ''}" data-index="${index}">
        <div class="autocomplete-top">
          <span>${airportLabel(airport)}</span>
          ${airport.cityCode && airport.cityCode !== airport.code ? `<span class="autocomplete-metro">${airport.cityCode}</span>` : ''}
        </div>
        <div class="autocomplete-sub">${airportMeta(airport)}</div>
      </div>`).join('');
    list.hidden = false;
    field?.classList.add('autocomplete-open');
  };

  input.addEventListener('input', () => {
    hidden.value = '';
    input.dataset.selectedCode = '';
    if (error) error.textContent = '';
    activeIndex = -1;
    renderList(searchAirports(input.value));
  });

  input.addEventListener('focus', () => {
    if (normalize(input.value).length >= 2) renderList(searchAirports(input.value));
  });

  input.addEventListener('click', () => {
    if (normalize(input.value).length >= 2) renderList(searchAirports(input.value));
  });

  input.addEventListener('keydown', (event) => {
    if (list.hidden || !currentResults.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % currentResults.length;
      renderList(currentResults);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = (activeIndex - 1 + currentResults.length) % currentResults.length;
      renderList(currentResults);
    } else if (event.key === 'Enter') {
      if (activeIndex >= 0) {
        event.preventDefault();
        selectAirport(currentResults[activeIndex]);
      } else {
        maybeSelectTypedAirport();
      }
    } else if (event.key === 'Escape') {
      clearList();
    }
  });

  list.addEventListener('mousedown', (event) => {
    const item = event.target.closest('.autocomplete-item');
    if (!item) return;
    const airport = currentResults[Number(item.dataset.index)];
    if (airport) selectAirport(airport);
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest(`#${inputId}`) && !event.target.closest(`#${listId}`)) clearList();
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!maybeSelectTypedAirport() && input.value.trim() && error) {
        error.textContent = 'Please choose an airport from the list.';
      }
    }, 120);
  });
}

function prefillRequestForm() {
  const params = new URLSearchParams(window.location.search);
  const requestForm = document.getElementById('fullRequestForm');
  if (!requestForm) return;

  const values = {
    origin: params.get('origin') || '',
    originCode: params.get('originCode') || '',
    destination: params.get('destination') || '',
    destinationCode: params.get('destinationCode') || '',
    departDate: isoToMDY(params.get('departDate') || ''),
    returnDate: isoToMDY(params.get('returnDate') || ''),
    tripType: params.get('tripType') || ((params.get('returnDate') || '') ? 'Round Trip' : 'Round Trip'),
    cabin: params.get('cabin') || 'Business Class',
    preferredFareRange: params.get('preferredFareRange') || '',
    noFixedItinerary: params.get('noFixedItinerary') || ''
  };

  Object.entries(values).forEach(([id, value]) => { const el = document.getElementById(id); if (!el) return; if (el.type === 'checkbox') { el.checked = value === 'yes' || value === 'true' || value === true; } else { el.value = value; } });

  if (values.originCode) {
    const airport = findAirportByStoredCode(values.originCode);
    const originInput = document.getElementById('origin');
    const hidden = document.getElementById('originCode');
    if (airport && originInput && hidden) {
      originInput.value = airportLabel(airport);
      originInput.dataset.selectedCode = values.originCode;
      hidden.value = values.originCode;
    }
  }
  if (values.destinationCode) {
    const airport = findAirportByStoredCode(values.destinationCode);
    const destinationInput = document.getElementById('destination');
    const hidden = document.getElementById('destinationCode');
    if (airport && destinationInput && hidden) {
      destinationInput.value = airportLabel(airport);
      destinationInput.dataset.selectedCode = values.destinationCode;
      hidden.value = values.destinationCode;
    }
  }

  const leg2OriginCode = params.get('segment2OriginCode') || '';
  const leg2DestinationCode = params.get('segment2DestinationCode') || '';
  const leg2DepartDate = isoToMDY(params.get('segment2DepartDate') || '');
  const seg2Date = document.getElementById('segment2DepartDate');
  if (seg2Date) seg2Date.value = leg2DepartDate;

  if (leg2OriginCode) {
    const airport = findAirportByStoredCode(leg2OriginCode);
    const input = document.getElementById('segment2Origin');
    const hidden = document.getElementById('segment2OriginCode');
    if (airport && input && hidden) {
      input.value = airportLabel(airport);
      input.dataset.selectedCode = leg2OriginCode;
      hidden.value = leg2OriginCode;
    }
  }
  if (leg2DestinationCode) {
    const airport = findAirportByStoredCode(leg2DestinationCode);
    const input = document.getElementById('segment2Destination');
    const hidden = document.getElementById('segment2DestinationCode');
    if (airport && input && hidden) {
      input.value = airportLabel(airport);
      input.dataset.selectedCode = leg2DestinationCode;
      hidden.value = leg2DestinationCode;
    }
  }
}

function validateAirportField(inputId, codeId, errorId) {
  const input = document.getElementById(inputId);
  const codeField = document.getElementById(codeId);
  const error = document.getElementById(errorId);
  if (!input || !codeField) return false;
  if (!isValidCode(codeField.value)) {
    const exact = findExactAirport(input.value);
    if (exact) {
      input.value = airportLabel(exact);
      input.dataset.selectedCode = exact.code;
      codeField.value = exact.code;
    }
  }
  const valid = isValidCode(codeField.value);
  if (error) error.textContent = valid ? '' : 'Please choose an airport from the list.';
  return valid;
}

function buildRequestUrl() {
  const params = new URLSearchParams({
    origin: document.getElementById('origin').value,
    originCode: document.getElementById('originCode').value,
    destination: document.getElementById('destination').value,
    destinationCode: document.getElementById('destinationCode').value,
    departDate: mdyToISO(document.getElementById('departDate').value),
    returnDate: mdyToISO(document.getElementById('returnDate').value),
    tripType: document.getElementById('tripType') ? document.getElementById('tripType').value : (document.getElementById('returnDate').value ? 'Round Trip' : 'One Way'),
    cabin: document.getElementById('cabin').value,
  });
  return `request.html?${params.toString()}`;
}

async function submitWithBeacon(payload) {
  if (!navigator.sendBeacon) return false;
  try {
    const blob = new Blob([JSON.stringify(payload)], { type: 'text/plain;charset=utf-8' });
    return navigator.sendBeacon(GOOGLE_SCRIPT_URL, blob);
  } catch (error) {
    return false;
  }
}



function setupFlexibleItinerary(){
  const toggle = document.getElementById('noFixedItinerary');
  const preferredRange = document.getElementById('preferredRangeField');
  if (!toggle) return;
  const ids = ['origin','destination','departDate','returnDate','segment2Origin','segment2Destination','segment2DepartDate'];
  const codeIds = ['originCode','destinationCode','segment2OriginCode','segment2DestinationCode'];
  const apply = () => {
    const on = toggle.checked;
    const tripField = document.getElementById('tripType');
    if (preferredRange) preferredRange.hidden = false;
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.required = !on && !['returnDate','segment2Origin','segment2Destination','segment2DepartDate'].includes(id);
      if (on) { el.setCustomValidity(''); }
      const wrap = el.closest('.field');
      if (wrap) wrap.classList.toggle('field-disabled', on);
    });
    codeIds.forEach((id) => { const el=document.getElementById(id); if (el && on) el.value=''; });
    const originErr = document.getElementById('originError'); if (originErr && on) originErr.textContent='';
    const destErr = document.getElementById('destinationError'); if (destErr && on) destErr.textContent='';
    if (tripField && on) tripField.value='Flexible';
  };
  toggle.addEventListener('change', apply);
  apply();
}

function setupTripType() {
  const hidden = document.getElementById('tripType');
  const returnField = document.getElementById('returnDate');
  const buttons = Array.from(document.querySelectorAll('.trip-type-btn'));
  const multiCitySection = document.getElementById('multiCitySection');
  if (!hidden || !returnField || !buttons.length) return;

  const toggleFieldState = (field, disabled) => {
    if (!field) return;
    field.disabled = disabled;
    field.closest('.field')?.classList.toggle('field-disabled', disabled);
    if (disabled) {
      field.value = '';
      field.setCustomValidity('');
      if (field._flatpickr) field._flatpickr.clear();
    }
    if (field._flatpickr) field._flatpickr.set('clickOpens', !disabled);
  };

  const applyType = (type) => {
    hidden.value = type;
    buttons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tripType === type));
    const oneWay = type === 'One Way';
    const multiCity = type === 'Multi City';
    toggleFieldState(returnField, oneWay || multiCity);
    if (multiCitySection) multiCitySection.hidden = !multiCity;
    ['segment2Origin', 'segment2Destination', 'segment2DepartDate'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.required = multiCity;
      if (!multiCity) {
        el.value = '';
        el.setCustomValidity('');
      }
    });
    ['segment2OriginCode', 'segment2DestinationCode'].forEach((id) => {
      const el = document.getElementById(id);
      if (el && !multiCity) el.value = '';
    });
  };

  buttons.forEach((btn) => btn.addEventListener('click', () => applyType(btn.dataset.tripType)));
  applyType(hidden.value || 'Round Trip');
}

async function attachForms() {
  const quickForm = document.getElementById('quickQuoteForm');
  if (quickForm) {
    quickForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await loadAirports();
      let valid = true;
      if (!validateAirportField('origin', 'originCode', 'originError')) valid = false;
      if (!validateAirportField('destination', 'destinationCode', 'destinationError')) valid = false;
      const departField = document.getElementById('departDate');
      const returnField = document.getElementById('returnDate');
      const selectedTripType = document.getElementById('tripType') ? document.getElementById('tripType').value : 'Round Trip';
      if (!departField.value || !validMDYWithinRange(departField.value)) {
        departField.setCustomValidity('Choose a departure date from today to 364 days ahead.');
        valid = false;
      } else {
        departField.setCustomValidity('');
      }
      if (selectedTripType === 'Round Trip') {
        if (!returnField.value || !validMDYWithinRange(returnField.value)) {
          returnField.setCustomValidity('Choose a valid return date.');
          valid = false;
        } else {
          returnField.setCustomValidity('');
        }
      } else {
        returnField.setCustomValidity('');
      }
      if (!quickForm.reportValidity() || !valid) return;
      window.location.href = buildRequestUrl();
    });
  }

  const fullForm = document.getElementById('fullRequestForm');
  if (fullForm) {
    fullForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await loadAirports();
      let valid = true;
      const flexible = document.getElementById('noFixedItinerary') && document.getElementById('noFixedItinerary').checked;
      if (!flexible) {
        if (!validateAirportField('origin', 'originCode', 'originError')) valid = false;
        if (!validateAirportField('destination', 'destinationCode', 'destinationError')) valid = false;
      }
      const departField = document.getElementById('departDate');
      const returnField = document.getElementById('returnDate');
      if (!flexible && (!departField.value || !validMDYWithinRange(departField.value))) valid = false;
      const selectedTripType = document.getElementById('tripType') ? document.getElementById('tripType').value : (returnField.value ? 'Round Trip' : 'One Way');
      if (!flexible && selectedTripType === 'Round Trip') {
        if (!returnField.value || !validMDYWithinRange(returnField.value)) valid = false;
      }
      if (!flexible && selectedTripType === 'Multi City') {
        if (!validateAirportField('segment2Origin', 'segment2OriginCode', 'segment2OriginError')) valid = false;
        if (!validateAirportField('segment2Destination', 'segment2DestinationCode', 'segment2DestinationError')) valid = false;
        const seg2Date = document.getElementById('segment2DepartDate');
        if (!seg2Date.value || !validMDYWithinRange(seg2Date.value)) valid = false;
      }
      const preferredFareRangeField = document.getElementById('preferredFareRange');
      if (flexible && preferredFareRangeField && !preferredFareRangeField.value) valid = false;
      if (!fullForm.reportValidity() || !valid) return;

      const submitButton = fullForm.querySelector('button[type="submit"]');
      const success = document.getElementById('successBox');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
      }
      if (success) {
        success.style.display = 'none';
        success.classList.remove('error-state');
      }

      const originAirport = findAirportByStoredCode(document.getElementById('originCode').value) || {};
      const destinationAirport = findAirportByStoredCode(document.getElementById('destinationCode').value) || {};
      const payload = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        origin: document.getElementById('origin').value,
        originCode: submittedCodeFor(document.getElementById('originCode').value),
        originCity: originAirport.city || '',
        originCountry: originAirport.country || '',
        destination: document.getElementById('destination').value,
        destinationCode: submittedCodeFor(document.getElementById('destinationCode').value),
        destinationCity: destinationAirport.city || '',
        destinationCountry: destinationAirport.country || '',
        departDate: mdyToISO(document.getElementById('departDate').value),
        returnDate: (document.getElementById('tripType') && document.getElementById('tripType').value === 'Round Trip') ? mdyToISO(document.getElementById('returnDate').value) : '',
        cabin: document.getElementById('cabin').value,
        preferredFareRange: document.getElementById('preferredFareRange') ? document.getElementById('preferredFareRange').value : '',
        priceRange: document.getElementById('preferredFareRange') ? document.getElementById('preferredFareRange').value : '',
        budget: document.getElementById('preferredFareRange') ? document.getElementById('preferredFareRange').value : '',
        notes: document.getElementById('notes').value,
        tripType: flexible ? 'Flexible' : (document.getElementById('tripType') ? document.getElementById('tripType').value : (document.getElementById('returnDate').value ? 'Round Trip' : 'One Way')),
        noFixedItinerary: flexible ? 'yes' : 'no',
        flightType: 'Premium Cabin Request',
        multiCityLegs: '',
        multiCity: '',
        segment2Origin: document.getElementById('segment2Origin') ? document.getElementById('segment2Origin').value : '',
        segment2OriginCode: document.getElementById('segment2OriginCode') ? submittedCodeFor(document.getElementById('segment2OriginCode').value) : '',
        segment2Destination: document.getElementById('segment2Destination') ? document.getElementById('segment2Destination').value : '',
        segment2DestinationCode: document.getElementById('segment2DestinationCode') ? submittedCodeFor(document.getElementById('segment2DestinationCode').value) : '',
        segment2DepartDate: document.getElementById('segment2DepartDate') ? mdyToISO(document.getElementById('segment2DepartDate').value) : ''
      };

      if (payload.tripType === 'Multi City') {
        payload.multiCityLegs = JSON.stringify([
          {
            origin: payload.origin,
            originCode: payload.originCode,
            destination: payload.destination,
            destinationCode: payload.destinationCode,
            departDate: payload.departDate
          },
          {
            origin: payload.segment2Origin,
            originCode: payload.segment2OriginCode,
            destination: payload.segment2Destination,
            destinationCode: payload.segment2DestinationCode,
            departDate: payload.segment2DepartDate
          }
        ]);
        payload.multiCity = `Leg 1: ${payload.origin} → ${payload.destination} on ${payload.departDate}\nLeg 2: ${payload.segment2Origin} → ${payload.segment2Destination} on ${payload.segment2DepartDate}`;
        payload.notes = (payload.notes || '') + `

Multi-city itinerary:
Leg 1: ${payload.origin} → ${payload.destination} on ${payload.departDate}
Leg 2: ${payload.segment2Origin} → ${payload.segment2Destination} on ${payload.segment2DepartDate}`;
      }

      const thankYouUrl = `thank-you.html?origin=${encodeURIComponent(payload.origin)}&destination=${encodeURIComponent(payload.destination)}&cabin=${encodeURIComponent(payload.cabin)}`;

      try {
        const body = new URLSearchParams();
        body.set('payload', JSON.stringify(payload));
        Object.entries(payload).forEach(([key, value]) => body.set(key, value == null ? '' : String(value)));
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: body.toString(),
          keepalive: true
        });
        window.location.href = thankYouUrl;
        return;
      } catch (error) {
        const beaconSent = await submitWithBeacon(payload);
        if (beaconSent) {
          window.location.href = thankYouUrl;
          return;
        }
        if (success) {
          success.style.display = 'block';
          success.classList.add('error-state');
          success.innerHTML = `<strong>Submission failed.</strong><span>${error?.message || 'Please try again in a moment.'}</span>`;
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Submit request';
        }
      }
    });
  }
}

async function init() {
  await loadAirports();
  attachDatePickers();
  setupAutocomplete({ inputId: 'origin', hiddenId: 'originCode', listId: 'originList', errorId: 'originError' });
  setupAutocomplete({ inputId: 'destination', hiddenId: 'destinationCode', listId: 'destinationList', errorId: 'destinationError' });
  setupAutocomplete({ inputId: 'segment2Origin', hiddenId: 'segment2OriginCode', listId: 'segment2OriginList', errorId: 'segment2OriginError' });
  setupAutocomplete({ inputId: 'segment2Destination', hiddenId: 'segment2DestinationCode', listId: 'segment2DestinationList', errorId: 'segment2DestinationError' });
  prefillRequestForm();
  setupTripType();
  setupFlexibleItinerary();
  await attachForms();
}

document.addEventListener('DOMContentLoaded', init);
