(function(){
  const ENDPOINT = () => (window.LUXAERIS_FORM_ENDPOINT || '').trim();
  let AIRPORTS = [];
  const LOOKUP = new Map();
  let activeBox = null;

  async function loadAirports(){
    if (AIRPORTS.length) return AIRPORTS;
    try {
      const res = await fetch('/assets/airports-search-10k.json');
      AIRPORTS = await res.json();
      AIRPORTS = Array.isArray(AIRPORTS) ? AIRPORTS : [];
      AIRPORTS.forEach(item => LOOKUP.set(item.label, item));
    } catch (e) {
      AIRPORTS = [];
    }
    return AIRPORTS;
  }

  function closeBox(){ if (activeBox) { activeBox.remove(); activeBox = null; } }

  function filterAirports(q){
    q = (q || '').trim().toLowerCase();
    if (q.length < 2) return [];
    return AIRPORTS.filter(item => {
      const label = (item.label || '').toLowerCase();
      const city = (item.city || '').toLowerCase();
      const code = (item.code || '').toLowerCase();
      const country = (item.country || '').toLowerCase();
      return label.includes(q) || city.includes(q) || code.includes(q) || country.includes(q);
    }).slice(0, 10);
  }

  function attachAutocomplete(input){
    input.setAttribute('autocomplete', 'off');
    input.addEventListener('input', () => {
      input.dataset.airportCode = '';
      closeBox();
      const matches = filterAirports(input.value);
      if (!matches.length) return;
      const box = document.createElement('div');
      box.className = 'lxa-airport-dropdown';
      matches.forEach(item => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lxa-airport-option';
        btn.innerHTML = '<strong>' + item.code + '</strong><span>' + item.city + ', ' + item.country + '</span>';
        btn.addEventListener('click', () => {
          input.value = item.label;
          input.dataset.airportCode = item.code;
          closeBox();
        });
        box.appendChild(btn);
      });
      input.parentElement.style.position = 'relative';
      input.parentElement.appendChild(box);
      activeBox = box;
    });
    input.addEventListener('blur', () => setTimeout(closeBox, 140));
  }

  function applyDateLimits(scope){
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 364);
    const min = today.toISOString().slice(0,10);
    const max = maxDate.toISOString().slice(0,10);
    scope.querySelectorAll('input[type="date"]').forEach(input => {
      input.min = min; input.max = max;
    });
  }

  function valid(form){
    let ok = true;
    form.querySelectorAll('[data-location-input]').forEach(input => {
      const chosen = (input.dataset.airportCode || '').trim();
      const good = !!chosen;
      input.classList.toggle('field-invalid', !good);
      if (!good) ok = false;
    });
    [['fullName',2],['email',5],['phone',7]].forEach(([name,min]) => {
      const el = form.querySelector('[name="'+name+'"]');
      if (!el) return;
      let good = false;
      if (name === 'email') good = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((el.value || '').trim());
      else if (name === 'phone') good = (el.value || '').replace(/\D/g,'').length >= min;
      else good = (el.value || '').trim().length >= min;
      el.classList.toggle('field-invalid', !good);
      if (!good) ok = false;
    });
    ['departDate'].forEach(name => { const el=form.querySelector('[name="'+name+'"]'); if (el && !el.value){ el.classList.add('field-invalid'); ok=false; } });
    return ok;
  }

  function bindForm(form){
    applyDateLimits(form);
    form.querySelectorAll('[data-location-input]').forEach(attachAutocomplete);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = form.querySelector('.lxa-form-status');
      if (!valid(form)) {
        if (status) status.textContent = 'Please complete the required fields and choose both airports from the dropdown list.';
        return;
      }
      const payload = Object.fromEntries(new FormData(form).entries());
      const origin = LOOKUP.get((form.querySelector('[name="origin"]').value || '').trim());
      const destination = LOOKUP.get((form.querySelector('[name="destination"]').value || '').trim());
      if (origin) payload.originCode = origin.code;
      if (destination) payload.destinationCode = destination.code;
      payload.pageUrl = window.location.href;
      payload.pageTitle = document.title;
      payload.leadSource = 'sticky-sidebar';
      payload.routeType = 'website-lead';
      const endpoint = ENDPOINT();
      if (!endpoint) {
        if (status) status.textContent = 'Add the Google Apps Script endpoint in /assets/site-config.js to activate submissions.';
        return;
      }
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      if (status) status.textContent = 'Submitting your request…';
      try {
        const res = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('bad response');
        window.location.href = '/thank-you.html';
      } catch (err) {
        if (status) status.textContent = 'We could not send your request just now. Please try again in a moment.';
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.lxa-airport-dropdown') && !e.target.closest('[data-location-input]')) closeBox();
  });

  document.addEventListener('DOMContentLoaded', async () => {
    const forms = Array.from(document.querySelectorAll('.lxa-quote-form'));
    if (!forms.length) return;
    await loadAirports();
    forms.forEach(bindForm);
  });
})();
