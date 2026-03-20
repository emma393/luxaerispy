const AIRPORTS_URL = 'data/airports.json';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzqGbpKf0FeFDgpdpdssCBUGQQszI9zMgN_wsQxRxZ2tcQnYre4OvYKM53uUOK3UwuR/exec';
let AIRPORTS = [];
let AIRPORTS_BY_CODE = new Map();

async function loadAirports() {
  if (AIRPORTS.length) return AIRPORTS;
  const res = await fetch(AIRPORTS_URL);
  AIRPORTS = await res.json();
  AIRPORTS_BY_CODE = new Map(AIRPORTS.map(a => [a.code, a]));
  return AIRPORTS;
}

function normalize(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function airportLabel(airport) {
  return `${airport.code} — ${airport.city}, ${airport.country}`;
}

function airportMeta(airport) {
  const metro = airport.cityCode && airport.cityCode !== airport.code ? `${airport.cityCode} metro area` : airport.code;
  return `${airport.name}` + (metro ? ` • ${metro}` : '');
}

function scoreAirport(airport, query) {
  const q = normalize(query);
  const code = normalize(airport.code);
  const cityCode = normalize(airport.cityCode || '');
  const city = normalize(airport.city);
  const country = normalize(airport.country);
  const name = normalize(airport.name);

  let score = 0;
  if (code === q) score += 160;
  if (cityCode === q) score += 150;
  if (city === q) score += 140;
  if (name === q) score += 120;
  if (code.startsWith(q)) score += 100;
  if (cityCode.startsWith(q)) score += 95;
  if (city.startsWith(q)) score += 90;
  if (name.startsWith(q)) score += 70;
  if (country.startsWith(q)) score += 25;
  if (code.includes(q)) score += 20;
  if (cityCode.includes(q)) score += 18;
  if (city.includes(q)) score += 16;
  if (name.includes(q)) score += 12;
  return score;
}

function searchAirports(query) {
  const q = normalize(query);
  if (q.length < 2) return [];

  return AIRPORTS
    .map(airport => ({ airport, score: scoreAirport(airport, q) }))
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aMetro = normalize(a.airport.cityCode || '');
      const bMetro = normalize(b.airport.cityCode || '');
      if (aMetro === q && bMetro !== q) return -1;
      if (bMetro === q && aMetro !== q) return 1;
      return a.airport.city.localeCompare(b.airport.city) || a.airport.code.localeCompare(b.airport.code);
    })
    .slice(0, 10)
    .map(item => item.airport);
}

function setupAutocomplete({ inputId, hiddenId, listId, errorId }) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const hidden = document.getElementById(hiddenId);
  const list = document.getElementById(listId);
  const error = document.getElementById(errorId);
  let activeIndex = -1;
  let currentResults = [];

  function clearList() {
    list.innerHTML = '';
    list.hidden = true;
    activeIndex = -1;
  }

  function selectAirport(airport) {
    input.value = airportLabel(airport);
    hidden.value = airport.code;
    input.dataset.selectedCode = airport.code;
    if (error) error.textContent = '';
    clearList();
  }

  function renderList(results) {
    currentResults = results;
    if (!results.length) {
      clearList();
      return;
    }

    list.innerHTML = results.map((airport, index) => `
      <div class="autocomplete-item${index === activeIndex ? ' is-active' : ''}" role="option" data-index="${index}" data-code="${airport.code}">
        <div class="autocomplete-top">
          <span>${airport.code} — ${airport.city}, ${airport.country}</span>
          ${airport.cityCode && airport.cityCode !== airport.code ? `<span class="autocomplete-metro">${airport.cityCode}</span>` : ''}
        </div>
        <div class="autocomplete-sub">${airportMeta(airport)}</div>
      </div>
    `).join('');
    list.hidden = false;
  }

  input.addEventListener('input', () => {
    hidden.value = '';
    input.dataset.selectedCode = '';
    const results = searchAirports(input.value);
    activeIndex = -1;
    renderList(results);
  });

  input.addEventListener('focus', () => {
    if (normalize(input.value).length >= 2) {
      renderList(searchAirports(input.value));
    }
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
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectAirport(currentResults[activeIndex]);
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
    if (!event.target.closest(`#${inputId}`) && !event.target.closest(`#${listId}`)) {
      clearList();
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      const selectedCode = input.dataset.selectedCode;
      if (!selectedCode && input.value.trim()) {
        if (error) error.textContent = 'Please choose an airport from the list.';
      }
    }, 120);
  });
}

function setDateConstraints() {
  const today = new Date();
  const max = new Date();
  max.setDate(today.getDate() + 364);
  const minValue = today.toISOString().split('T')[0];
  const maxValue = max.toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(input => {
    input.min = minValue;
    input.max = maxValue;
  });
}

function fillRequestSummary() {
  const params = new URLSearchParams(window.location.search);
  const map = {
    summaryOrigin: params.get('origin') || 'Not selected yet',
    summaryDestination: params.get('destination') || 'Not selected yet',
    summaryCabin: params.get('cabin') || 'Business Class',
    summaryDepart: params.get('departDate') || 'Flexible',
    summaryReturn: params.get('returnDate') || 'One way / flexible',
    summaryBudget: params.get('budget') || 'Not provided'
  };

  Object.entries(map).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });

  const requestForm = document.getElementById('fullRequestForm');
  if (requestForm) {
    const values = {
      origin: params.get('origin') || '',
      originCode: params.get('originCode') || '',
      destination: params.get('destination') || '',
      destinationCode: params.get('destinationCode') || '',
      departDate: params.get('departDate') || '',
      returnDate: params.get('returnDate') || '',
      cabin: params.get('cabin') || 'Business Class',
      budget: params.get('budget') || ''
    };

    Object.entries(values).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    });

    if (values.originCode) {
      const originInput = document.getElementById('origin');
      if (originInput) originInput.dataset.selectedCode = values.originCode;
    }
    if (values.destinationCode) {
      const destinationInput = document.getElementById('destination');
      if (destinationInput) destinationInput.dataset.selectedCode = values.destinationCode;
    }
  }
}

function isValidCode(code) {
  return !!code && AIRPORTS_BY_CODE.has(code);
}

function attachPlanner() {
  const btn = document.getElementById('aiPlanButton');
  const input = document.getElementById('aiInput');
  if (!btn || !input) return;

  btn.addEventListener('click', async () => {
    const text = normalize(input.value);
    const originField = document.getElementById('origin');
    const originCodeField = document.getElementById('originCode');
    const destinationField = document.getElementById('destination');
    const destinationCodeField = document.getElementById('destinationCode');
    const cabinField = document.getElementById('cabin');

    if (/first/.test(text)) cabinField.value = 'First Class';
    if (/business/.test(text)) cabinField.value = 'Business Class';

    const places = AIRPORTS.filter(a => text.includes(normalize(a.city)) || text.includes(normalize(a.code)) || (a.cityCode && text.includes(normalize(a.cityCode))));
    if (places[0] && originField && !originCodeField.value) {
      originField.value = airportLabel(places[0]);
      originCodeField.value = places[0].code;
      originField.dataset.selectedCode = places[0].code;
    }
    if (places[1] && destinationField && !destinationCodeField.value) {
      destinationField.value = airportLabel(places[1]);
      destinationCodeField.value = places[1].code;
      destinationField.dataset.selectedCode = places[1].code;
    }
    if (/maldives|male/.test(text) && destinationField) {
      const mle = AIRPORTS_BY_CODE.get('MLE');
      destinationField.value = airportLabel(mle);
      destinationCodeField.value = mle.code;
      destinationField.dataset.selectedCode = mle.code;
    }
    if (/paris/.test(text) && destinationField) {
      const cdg = AIRPORTS_BY_CODE.get('CDG');
      destinationField.value = airportLabel(cdg);
      destinationCodeField.value = cdg.code;
      destinationField.dataset.selectedCode = cdg.code;
    }
    if (/new york|nyc/.test(text) && originField && !originCodeField.value) {
      const jfk = AIRPORTS_BY_CODE.get('JFK');
      originField.value = airportLabel(jfk);
      originCodeField.value = jfk.code;
      originField.dataset.selectedCode = jfk.code;
    }
  });
}

function attachForms() {
  const quickForm = document.getElementById('quickQuoteForm');
  if (quickForm) {
    quickForm.addEventListener('submit', async (event) => {
      await loadAirports();
      const originCode = document.getElementById('originCode').value;
      const destinationCode = document.getElementById('destinationCode').value;
      const originInput = document.getElementById('origin');
      let valid = true;

      if (!isValidCode(originCode)) {
        valid = false;
        document.getElementById('originError').textContent = 'Please choose a valid origin airport from the list.';
      } else {
        document.getElementById('originError').textContent = '';
      }

      if (!isValidCode(destinationCode)) {
        valid = false;
        document.getElementById('destinationError').textContent = 'Please choose a valid destination airport from the list.';
      } else {
        document.getElementById('destinationError').textContent = '';
      }

      if (!valid) {
        event.preventDefault();
        originInput.focus();
      }
    });
  }

  const fullForm = document.getElementById('fullRequestForm');
  if (fullForm) {
    fullForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await loadAirports();
      const checks = [
        ['originCode', 'originError', 'Please choose a valid origin airport from the list.'],
        ['destinationCode', 'destinationError', 'Please choose a valid destination airport from the list.']
      ];
      let valid = true;
      checks.forEach(([codeId, errorId, message]) => {
        const value = document.getElementById(codeId).value;
        const error = document.getElementById(errorId);
        if (!isValidCode(value)) {
          valid = false;
          error.textContent = message;
        } else {
          error.textContent = '';
        }
      });
      if (!valid) return;

      const submitButton = fullForm.querySelector('button[type="submit"]');
      const success = document.getElementById('successBox');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
      }

      const payload = {
        origin: document.getElementById('origin').value,
        originCode: document.getElementById('originCode').value,
        destination: document.getElementById('destination').value,
        destinationCode: document.getElementById('destinationCode').value,
        departDate: document.getElementById('departDate').value,
        returnDate: document.getElementById('returnDate').value,
        cabin: document.getElementById('cabin').value,
        budget: document.getElementById('budget').value,
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        notes: document.getElementById('notes').value
      };

      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        success.style.display = 'block';
        if (result.ok) {
          success.classList.remove('error-state');
          success.innerHTML = '<strong>Request submitted successfully.</strong><span>Your lead has been sent to LuxAeris Leads.</span>';
          fullForm.reset();
          ['origin', 'destination'].forEach(id => {
            const field = document.getElementById(id);
            if (field) field.dataset.selectedCode = '';
          });
        } else {
          success.classList.add('error-state');
          success.innerHTML = `<strong>Submission failed.</strong><span>${result.error || 'Unknown error'}</span>`;
        }
      } catch (error) {
        success.style.display = 'block';
        success.classList.add('error-state');
        success.innerHTML = '<strong>Submission failed.</strong><span>Please try again in a moment.</span>';
      } finally {
        success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  setDateConstraints();
  setupAutocomplete({ inputId: 'origin', hiddenId: 'originCode', listId: 'originList', errorId: 'originError' });
  setupAutocomplete({ inputId: 'destination', hiddenId: 'destinationCode', listId: 'destinationList', errorId: 'destinationError' });
  fillRequestSummary();
  attachPlanner();
  attachForms();
}

document.addEventListener('DOMContentLoaded', init);
