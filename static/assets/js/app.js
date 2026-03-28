
const GOOGLE_SCRIPT_URL = window.LUXAERIS_FORM_ENDPOINT || 'https://script.google.com/macros/s/AKfycbzI4qGgCYwGJMZL0P_xPqPtMCs_xJ7jvhDX0uYGXkgVFSQyMKKd1xBLYco9YmX7Dmhe/exec';
const AIRPORTS_URL_CANDIDATES = ['/data/airports.json','data/airports.json','/assets/airports-search-10k.json','assets/airports-search-10k.json','/assets/airport-search.json','assets/airport-search.json'];

let AIRPORTS = [];
let AIRPORTS_BY_CODE = new Map();

const normalize = (value = '') => String(value).toLowerCase().trim();
const normalizePlain = (value = '') => normalize(String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, ''));

function normalizeAirportRecord(item) {
  if (!item || typeof item !== 'object') return null;
  const label = String(item.label || '').trim();
  let code = String(item.code || '').trim();
  let city = String(item.city || '').trim();
  let country = String(item.country || '').trim();
  if (label && label.includes('—')) {
    const parts = label.split('—');
    code = code || parts[0].trim();
    const right = parts.slice(1).join('—').trim();
    if (!city) city = right.split(',')[0].trim();
    if (!country && right.includes(',')) country = right.split(',').slice(1).join(',').trim();
  }
  const clean = {
    code,
    submitCode: item.submitCode || code,
    city,
    country,
    name: item.name || item.airport || (city ? `${city} Airport` : code),
    airport: item.airport || item.name || (city ? `${city} Airport` : code),
    cityCode: item.cityCode || '',
    displayPrefix: item.displayPrefix || code,
    hasCityGroup: !!item.hasCityGroup,
    isCityGroup: !!item.isCityGroup,
    memberCodes: Array.isArray(item.memberCodes) ? item.memberCodes : [],
    searchable: Array.isArray(item.searchable) ? item.searchable : []
  };
  if (label && !clean.searchable.includes(label)) clean.searchable.push(label);
  if (item.slug && !clean.searchable.includes(item.slug)) clean.searchable.push(item.slug);
  return clean;
}


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
      AIRPORTS = data.map(normalizeAirportRecord).filter(Boolean);
      AIRPORTS_BY_CODE = new Map();
      AIRPORTS.forEach((a) => {
        [a.code, a.submitCode, a.cityCode, ...(a.memberCodes || [])].filter(Boolean).forEach((key) => {
          const upper = String(key).toUpperCase();
          if (!AIRPORTS_BY_CODE.has(upper) || a.isCityGroup) AIRPORTS_BY_CODE.set(upper, a);
        });
      });
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
  return !!code && AIRPORTS_BY_CODE.has(String(code).toUpperCase());
}

function findAirportByStoredCode(code) {
  if (!code) return null;
  if (AIRPORTS_BY_CODE.has(String(code).toUpperCase())) return AIRPORTS_BY_CODE.get(String(code).toUpperCase());
  const upper = String(code).toUpperCase();
  const matches = AIRPORTS.filter((airport) => String(airport.submitCode || '').toUpperCase() === upper || String(airport.cityCode || '').toUpperCase() === upper || (airport.memberCodes || []).map((c)=>String(c).toUpperCase()).includes(upper));
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
    const storedCode = airport.submitCode || airport.cityCode || airport.code;
    input.dataset.selectedCode = storedCode;
    hidden.value = storedCode;
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
    fullName: params.get('fullName') || '',
    email: params.get('email') || '',
    phone: params.get('phone') || '',
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
      const storedCode = exact.submitCode || exact.cityCode || exact.code;
      input.dataset.selectedCode = storedCode;
      codeField.value = storedCode;
    }
  }
  const valid = isValidCode(codeField.value);
  if (error) error.textContent = valid ? '' : 'Please choose an airport from the list.';
  return valid;
}



