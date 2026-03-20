
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
    const form = host.querySelector('[data-flight-search], #quoteRequestForm');
    const multi = host.querySelector('.multi-city-shell');
    const returnField = host.querySelector('[name="returnDate"]');
    function apply(type){
      host.dataset.tripType = type;
      tabs.forEach(t => t.classList.toggle('active', t.dataset.trip === type));
      if(returnField){
        returnField.style.display = type === 'roundtrip' ? '' : 'none';
        returnField.required = type === 'roundtrip';
      }
      if(multi) multi.style.display = type === 'multicity' ? '' : 'none';
      if(type === 'oneway' && returnField) returnField.value = '';
      const tripSelect = host.querySelector('[name="tripType"]');
      if(tripSelect) tripSelect.value = type;
    }
    tabs.forEach(t => t.addEventListener('click',()=>apply(t.dataset.trip)));
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
  const tryPlay = () => { const p = video.play(); if(p && p.catch) p.catch(()=>{}); };
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  tryPlay();
  video.addEventListener('canplay', tryPlay);
  video.addEventListener('loadeddata', tryPlay);
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
  bindTripSwitchers();
  bindSearchForms();
  prefillRequestForm();
  bindQuoteForm();
  initHeroVideo();
  initCookieBanner();
});
window.addEventListener('load', ()=> initHeroVideo());
