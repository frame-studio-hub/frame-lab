// Optional backend integration.
// Keep the public site independent from third-party module CDNs so mobile browsers
// can render the page even when the optional database client is unavailable.
const db = null;
const $ = (s) => document.querySelector(s);
const status = $('#review-status');
const setStatus = (el, msg, bad=false) => { if(el){el.textContent=msg;el.classList.toggle('is-error',bad);} };
const form = $('#project-planner');
if (form) form.addEventListener('submit', () => {
  setTimeout(()=>setStatus($('#copy-status'),'Автоматическая отправка пока не подключена. Скопируйте бриф и отправьте его вручную.',true),0);
}, {capture:true});
async function loadReviews(){
  const host=$('#public-reviews');
  if(host) host.innerHTML='<p class="reviews-empty">Отзывы появятся здесь после подключения системы приёма и проверки.</p>';
}
loadReviews();
const reviewForm=$('#review-form');
if(reviewForm) reviewForm.addEventListener('submit',e=>{
  e.preventDefault();
  setStatus(status,'Форма отзывов пока не подключена. Свяжитесь с нами через Instagram.',true);
});
