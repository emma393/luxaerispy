
document.addEventListener("DOMContentLoaded",()=>{
 const container=document.querySelector('.page-shell > .container');
 if(!container) return;

 if(container.querySelector('.luxaeris-request-rail')) return;

 const main=document.createElement('div');
 main.className='luxaeris-main-column';

 [...container.children].forEach(el=>{
  if(!el.classList.contains('luxaeris-request-rail')){
    main.appendChild(el);
  }
 });

 container.innerHTML='';
 container.appendChild(main);

 const rail=document.createElement('aside');
 rail.className='luxaeris-request-rail';
 rail.innerHTML=`<div class="sticky-card"><h3>Request tailored options</h3></div>`;
 container.appendChild(rail);
});
