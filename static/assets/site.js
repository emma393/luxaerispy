
let AIRPORTS = [];
const AIRPORT_LOOKUP = new Map();

async function loadAirports(){
  try{
    const res = await fetch('/assets/airport-search.json');
    AIRPORTS = await res.json();
    AIRPORTS.forEach(a => AIRPORT_LOOKUP.set(a.label, a));
    ensureDatalist();
  }catch(err){}
}
function ensureDatalist(){
  if(document.getElementById('airport-list')) return;
  const dl = document.createElement('datalist');
  dl.id = 'airport-list';
  AIRPORTS.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.label;
    dl.appendChild(opt);
  });
  document.body.appendChild(dl);
  document.querySelectorAll('[data-location-input]').forEach(i => i.setAttribute('list','airport-list'));
}
function markAirportFieldValidity(input){
  if(!input) return true;
  const val = (input.value || '').trim();
  const valid = AIRPORT_LOOKUP.has(val);
  input.setCustomValidity(valid ? '' : 'Please choose an airport from the list.');
  return valid;
}
function toISO(d){
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}
function toUS(iso){
  if(!iso) return '';
  const [y,m,d] = iso.split('-');
  return `${m}.${d}.${y}`;
}
function applyDateLimitsAndUI(){
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 364);
  const min = toISO(today), max = toISO(maxDate);

  document.querySelectorAll('input[type="date"]').forEach(input=>{
    input.min = min;
    input.max = max;
    if(input.dataset.enhanced === '1') return;
    input.dataset.enhanced = '1';

    const shell = document.createElement('div');
    shell.className = 'date-shell';
    input.parentNode.insertBefore(shell, input);
    shell.appendChild(input);

    const display = document.createElement('input');
    display.type = 'text';
    display.className = 'date-display';
    display.placeholder = 'mm.dd.yyyy';
    display.value = toUS(input.value);
    shell.insertBefore(display, input);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'date-trigger';
    btn.innerHTML = '📅';
    shell.appendChild(btn);

    const openPicker = () => {
      if(typeof input.showPicker === 'function') input.showPicker();
      else input.focus();
    };
    btn.addEventListener('click', openPicker);
    display.addEventListener('focus', openPicker);
    display.addEventListener('click', openPicker);
    input.addEventListener('change', ()=> display.value = toUS(input.value));
    display.addEventListener('blur', ()=> display.value = toUS(input.value) || display.value);
  });
}
function buildRequestURL(form){
  const params = new URLSearchParams();
  ['origin','destination','departDate','returnDate','cabin'].forEach(name=>{
    const field = form.querySelector(`[name="${name}"]`);
    if(field && field.value) params.set(name, field.value);
  });
  const host = form.closest('[data-trip-switcher]') || form;
  params.set('tripType', host.dataset.tripType || 'roundtrip');
  return '/request.html?' + params.toString();
}
function bindTripSwitchers(){
  document.querySelectorAll('[data-trip-switcher]').forEach(host=>{
    const tabs = host.querySelectorAll('.trip-tab');
    const returnField = host.querySelector('[name="returnDate"]');
    const multi = host.querySelector('.multi-city-shell');
    function apply(type){
      host.dataset.tripType = type;
      tabs.forEach(t => t.classList.toggle('active', t.dataset.trip === type));
      if(returnField){
        returnField.closest('.date-shell')?.style.setProperty('display', type === 'roundtrip' ? '' : 'none');
        returnField.required = type === 'roundtrip';
        if(type !== 'roundtrip') returnField.value = '';
      }
      if(multi) multi.style.display = type === 'multicity' ? '' : 'none';
      const tripSelect = host.querySelector('[name="tripType"]');
      if(tripSelect) tripSelect.value = type;
    }
    tabs.forEach(t=>t.addEventListener('click', ()=>apply(t.dataset.trip)));
    apply(host.dataset.defaultTrip || 'roundtrip');
  });
}
function bindSearchForms(){
  document.querySelectorAll('[data-flight-search]').forEach(form=>{
    form.addEventListener('submit', e=>{
      e.preventDefault();
      const host = form.closest('[data-trip-switcher]') || form;
      const tripType = host.dataset.tripType || 'roundtrip';
      let ok = true;
      form.querySelectorAll('[data-location-input]').forEach(i => ok = markAirportFieldValidity(i) && ok);
      ['origin','destination','departDate'].forEach(name=>{
        const f = form.querySelector(`[name="${name}"]`);
        if(!f || !f.value) ok = false;
      });
      const returnField = form.querySelector('[name="returnDate"]');
      if(tripType === 'roundtrip' && returnField && !returnField.value) ok = false;
      if(!ok){ alert('Please complete the required fields using airports from the list.'); return; }
      window.location.href = buildRequestURL(form);
    });
  });
}
function prefillRequestForm(){
  const form = document.getElementById('quoteRequestForm');
  if(!form) return;
  const url = new URL(window.location.href);
  ['origin','destination','departDate','returnDate','cabin','tripType'].forEach(name=>{
    const value = url.searchParams.get(name);
    const field = form.querySelector(`[name="${name}"]`);
    if(value && field) field.value = value;
  });
}
function bindQuoteForm(){
  const form = document.getElementById('quoteRequestForm');
  if(!form) return;
  form.addEventListener('submit', e=>{
    let ok = true;
    ['fullName','email','phone','origin','destination','departDate'].forEach(name=>{
      const f = form.querySelector(`[name="${name}"]`);
      if(!f || !f.value.trim()) ok = false;
    });
    const tripType = form.querySelector('[name="tripType"]')?.value || 'roundtrip';
    const returnField = form.querySelector('[name="returnDate"]');
    if(tripType === 'roundtrip' && returnField && !returnField.value) ok = false;
    form.querySelectorAll('[data-location-input]').forEach(i => ok = markAirportFieldValidity(i) && ok);
    if(!ok){ e.preventDefault(); alert('Please complete all required fields before submitting.'); }
  });
}
function initHeroVideo(){
  const video = document.getElementById('heroVideo');
  if(!video) return;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.autoplay = true;
  const source = video.querySelector('source');
  if(source && source.getAttribute('src') !== '/assets/videos/hero-plane-window.mp4'){
    source.setAttribute('src', '/assets/videos/hero-plane-window.mp4');
    video.load();
  }
  const tryPlay = () => {
    const p = video.play();
    if(p && p.catch) p.catch(()=>{});
  };
  tryPlay();
  video.addEventListener('loadeddata', tryPlay);
  video.addEventListener('canplay', tryPlay);
}
function initCookieBanner(){
  const banner = document.getElementById('cookieBanner');
  if(!banner) return;
  const key = 'luxaeris_cookie_choice';
  let choice = null;
  try{ choice = localStorage.getItem(key); }catch(err){}
  if(!choice) banner.style.display = 'block';
  document.getElementById('cookieAccept')?.addEventListener('click',()=>{ try{localStorage.setItem(key,'accepted')}catch(err){} banner.style.display='none'; });
  document.getElementById('cookieReject')?.addEventListener('click',()=>{ try{localStorage.setItem(key,'rejected')}catch(err){} banner.style.display='none'; });
}
document.addEventListener('DOMContentLoaded', async ()=>{
  await loadAirports();
  applyDateLimitsAndUI();
  bindTripSwitchers();
  bindSearchForms();
  prefillRequestForm();
  bindQuoteForm();
  initHeroVideo();
  initCookieBanner();
});
window.addEventListener('load', ()=> initHeroVideo());
