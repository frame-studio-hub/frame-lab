import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';
const configured = SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('YOUR-PROJECT') && SUPABASE_ANON_KEY.length > 30 && !SUPABASE_ANON_KEY.includes('YOUR_');
const db = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = (s) => document.querySelector(s);
const status = $('#review-status');
const setStatus = (el, msg, bad=false) => { if(el){el.textContent=msg;el.classList.toggle('is-error',bad);} };
const form = $('#project-planner');
if (form) form.addEventListener('submit', async () => {
  if (!db) { setTimeout(()=>setStatus($('#copy-status'),'Для автоматической отправки владелец сайта должен подключить Supabase. Пока можно скопировать бриф и отправить его вручную.',true),0); return; }
  const data = new FormData(form);
  const service = form.querySelector('[name="service"]:checked')?.value || '';
  const payload = {client:String(data.get('client')||'').trim(),contact:String(data.get('contact')||'').trim(),service,business:String(data.get('business')||''),goal:String(data.get('goal')||''),deadline:String(data.get('deadline')||''),materials:String(data.get('materials')||''),reference:String(data.get('reference')||''),details:String(data.get('details')||''),budget:String(data.get('budget')||''),brief:$('#brief-output')?.textContent||'',status:'new'};
  const {error}=await db.from('requests').insert(payload);
  setStatus($('#copy-status'), error ? 'Не удалось отправить заявку автоматически. Скопируйте бриф и свяжитесь с нами через Instagram.' : 'Заявка успешно отправлена. Спасибо! Мы свяжемся с вами.', !!error);
}, {capture:true});
// Public reviews: only approved rows are readable under RLS.
async function loadReviews(){const host=$('#public-reviews');if(!host)return;if(!db){host.innerHTML='<p class="reviews-empty">Отзывы появятся здесь после подключения системы приёма и проверки.</p>';return;}const {data,error}=await db.from('reviews').select('id,author,project,rating,body,created_at').eq('status','approved').order('created_at',{ascending:false}).limit(12);if(error||!data?.length){host.innerHTML='<p class="reviews-empty">Пока нет опубликованных отзывов. Будем рады вашему первому отзыву.</p>';return;}host.replaceChildren(...data.map(r=>{const article=document.createElement('article');article.className='review-card';const stars=document.createElement('div');stars.className='review-stars';stars.textContent='★'.repeat(r.rating)+'☆'.repeat(5-r.rating);const title=document.createElement('h3');title.textContent=r.author;const meta=document.createElement('p');meta.className='review-meta';meta.textContent=r.project||'Клиент FRAME LAB';const body=document.createElement('p');body.textContent=r.body;article.append(stars,title,meta,body);return article;}));}
loadReviews();
const reviewForm=$('#review-form');
if(reviewForm) reviewForm.addEventListener('submit',async e=>{e.preventDefault();if(!db){setStatus(status,'Форма отзывов пока не подключена. Владелец сайта должен настроить Supabase.',true);return;}const d=new FormData(reviewForm);const payload={author:String(d.get('author')||'').trim(),project:String(d.get('project')||'').trim(),rating:Number(d.get('rating')),body:String(d.get('body')||'').trim(),status:'pending'};const {error}=await db.from('reviews').insert(payload);if(error){setStatus(status,'Не получилось отправить отзыв. Попробуйте позже.',true);return;}reviewForm.reset();setStatus(status,'Спасибо! Отзыв отправлен на проверку. После одобрения он появится на сайте.');});
