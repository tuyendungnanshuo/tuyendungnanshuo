import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.NANSHUO_CONFIG || {};
const configured = cfg.supabaseUrl && cfg.supabaseKey;
const sb = configured ? createClient(cfg.supabaseUrl, cfg.supabaseKey) : null;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
let orders = [];

const statusMeta = {
  new: ['Mới','bg-amber-50 text-amber-700'],
  contacted: ['Đã liên hệ','bg-blue-50 text-blue-700'],
  confirmed: ['Đã xác nhận','bg-emerald-50 text-emerald-700'],
  completed: ['Hoàn tất','bg-green-50 text-green-700'],
  cancelled: ['Đã hủy','bg-gray-100 text-gray-500']
};

function show(id){['setup','login','dashboard'].forEach(x=>$('#'+x).classList.add('hidden'));$('#'+id).classList.remove('hidden')}
function toast(msg){const e=$('#toast');e.textContent=msg;e.classList.remove('hidden');setTimeout(()=>e.classList.add('hidden'),2600)}
function formatDate(v){try{return new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short'}).format(new Date(v))}catch{return v||''}}
function phoneHref(v){return `tel:${String(v||'').replace(/[^+\d]/g,'')}`}

if(!configured) show('setup'); else init();

async function init(){
  const {data:{session}}=await sb.auth.getSession();
  if(session) await enter(session.user); else show('login');
  sb.auth.onAuthStateChange(async(e,s)=>{if(e==='SIGNED_IN'&&s)await enter(s.user);if(e==='SIGNED_OUT')show('login')});
}

$('#login-form').onsubmit=async e=>{e.preventDefault();$('#login-error').classList.add('hidden');const {error}=await sb.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});if(error){$('#login-error').textContent=error.message;$('#login-error').classList.remove('hidden')}};
$('#logout').onclick=()=>sb.auth.signOut();
$('#refresh').onclick=loadOrders;
$('#filter-status').onchange=render;
$('#filter-search').oninput=render;

async function enter(user){show('dashboard');$('#admin-email').textContent=user.email;await loadOrders()}

async function loadOrders(){
  $('#message').classList.add('hidden');
  const {data,error}=await sb.from('orders').select('*').order('created_at',{ascending:false});
  if(error){orders=[];$('#message').innerHTML='<b>Chưa tải được đơn hàng.</b> Hãy chắc chắn bạn đã chạy file <code>orders-setup.sql</code> trong Supabase.';$('#message').classList.remove('hidden');render();return}
  orders=data||[];render();
}

function renderStats(){
  const defs=[['','Tất cả'],['new','Mới'],['contacted','Đã liên hệ'],['confirmed','Đã xác nhận'],['completed','Hoàn tất']];
  $('#stats').innerHTML=defs.map(([key,label])=>{const n=key?orders.filter(o=>o.status===key).length:orders.length;return `<div class="card p-4"><div class="text-[10px] uppercase tracking-wider text-gray-400 font-bold">${label}</div><div class="text-2xl font-extrabold mt-1">${n}</div></div>`}).join('');
}

function render(){
  renderStats();
  const status=$('#filter-status').value;
  const q=$('#filter-search').value.trim().toLowerCase();
  const list=orders.filter(o=>(!status||o.status===status)&&(!q||[o.customer_name,o.phone,o.address,o.product_name,o.product_sku,o.brand_name,o.store_location].join(' ').toLowerCase().includes(q)));
  $('#orders-list').innerHTML=list.map(o=>{
    const [label,cls]=statusMeta[o.status]||statusMeta.new;
    return `<article class="card p-5 md:p-6">
      <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2"><span class="text-[10px] font-bold uppercase tracking-[.13em] text-primary">#${o.id} · ${esc(o.brand_name)} · ${esc(o.store_location)}</span><span class="text-[10px] rounded-full px-2.5 py-1 font-bold ${cls}">${label}</span></div>
          <h2 class="font-bold text-lg mt-2">${esc(o.product_name)} <span class="text-gray-400 font-medium">× ${Number(o.quantity)||1}</span></h2>
          <div class="text-xs text-gray-500 mt-1">${esc(o.product_sku||'')} ${o.price_text?'· '+esc(o.price_text):''} · ${esc(formatDate(o.created_at))}</div>
        </div>
        <select data-status="${o.id}" class="input lg:w-44"><option value="new" ${o.status==='new'?'selected':''}>Mới</option><option value="contacted" ${o.status==='contacted'?'selected':''}>Đã liên hệ</option><option value="confirmed" ${o.status==='confirmed'?'selected':''}>Đã xác nhận</option><option value="completed" ${o.status==='completed'?'selected':''}>Hoàn tất</option><option value="cancelled" ${o.status==='cancelled'?'selected':''}>Đã hủy</option></select>
      </div>
      <div class="mt-5 grid md:grid-cols-3 gap-4 border-t border-gray-100 pt-5">
        <div><div class="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Khách hàng</div><div class="font-bold mt-1">${esc(o.customer_name)}</div><a href="${phoneHref(o.phone)}" class="inline-flex items-center gap-2 text-accent font-bold mt-2"><i class="fa-solid fa-phone"></i>${esc(o.phone)}</a></div>
        <div><div class="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Địa chỉ</div><div class="text-sm text-gray-600 mt-1 leading-6">${esc(o.address)}</div></div>
        <div><div class="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Ghi chú</div><div class="text-sm text-gray-600 mt-1 leading-6">${esc(o.note||'Không có')}</div></div>
      </div>
      <div class="mt-5 flex justify-end"><button data-delete="${o.id}" class="text-xs font-bold text-red-600 px-3 py-2"><i class="fa-solid fa-trash mr-2"></i>Xóa đơn</button></div>
    </article>`;
  }).join('')||'<div class="card p-10 text-center text-gray-500">Chưa có đơn hàng phù hợp.</div>';

  document.querySelectorAll('[data-status]').forEach(s=>s.onchange=()=>updateStatus(Number(s.dataset.status),s.value));
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteOrder(Number(b.dataset.delete)));
}

async function updateStatus(id,status){
  const {error}=await sb.from('orders').update({status,updated_at:new Date().toISOString()}).eq('id',id);
  if(error)return toast('Lỗi cập nhật: '+error.message);
  const o=orders.find(x=>Number(x.id)===id);if(o)o.status=status;render();toast('Đã cập nhật trạng thái');
}

async function deleteOrder(id){
  if(!confirm('Bạn chắc chắn muốn xóa đơn này?'))return;
  const {error}=await sb.from('orders').delete().eq('id',id);
  if(error)return toast('Lỗi xóa: '+error.message);
  orders=orders.filter(x=>Number(x.id)!==id);render();toast('Đã xóa đơn');
}
