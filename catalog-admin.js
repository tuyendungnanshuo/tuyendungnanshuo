import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.NANSHUO_CONFIG || {};
const configured = cfg.supabaseUrl && cfg.supabaseKey;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

let sb = null;
let brands = [];
let products = [];
let storeProfiles = [];
let editingId = null;
let images = [];
let storeImageUrl = '';

const FASHION_CATEGORIES = [
  {key:'tops',vi:'Áo',zh:'上衣'},
  {key:'pants',vi:'Quần',zh:'裤装'},
  {key:'dresses',vi:'Váy / Đầm',zh:'连衣裙'},
  {key:'skirts',vi:'Chân váy',zh:'半身裙'},
  {key:'sets',vi:'Set / Bộ',zh:'套装'},
  {key:'outerwear',vi:'Áo khoác',zh:'外套'},
  {key:'footwear',vi:'Giày / Dép',zh:'鞋履'},
  {key:'bags',vi:'Túi xách',zh:'包袋'},
  {key:'accessories',vi:'Phụ kiện',zh:'配饰'},
  {key:'homewear',vi:'Đồ mặc nhà',zh:'家居服'},
  {key:'other',vi:'Khác',zh:'其他'}
];

function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase()}
function normalizeStore(s){return normalize(s).replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim().replace(/\bvincom plaza\b/g,' ').replace(/\bvincom\b/g,' ').replace(/\bvinhomes\b/g,' ').replace(/\bvinhome\b/g,' ').replace(/\s+/g,' ').trim()}
function sameStore(a,b){const x=normalizeStore(a),y=normalizeStore(b);return x!==''&&x===y}

function categoryFromText(value){
  const raw=normalize(value);
  const tests=[
    ['outerwear',['ao khoac','jacket','coat','blazer','cardigan']],
    ['skirts',['chan vay','skirt']],
    ['homewear',['do mac nha','homewear','pajama','pyjama']],
    ['dresses',['vay','dam','dress']],
    ['footwear',['giay','dep','sandal','sneaker','shoe']],
    ['bags',['tui','bag','handbag']],
    ['accessories',['phu kien','accessory','belt','khan','kinh','jewelry']],
    ['sets',['set','bo','combo','suit']],
    ['pants',['quan','pants','trouser','jean','short']],
    ['tops',['ao','shirt','top','blouse','tee','somi','so mi']]
  ];
  for(const [key,words] of tests) if(words.some(w=>raw.includes(normalize(w)))) return key;
  return 'other';
}
function categoryMeta(key){return FASHION_CATEGORIES.find(x=>x.key===key)||FASHION_CATEGORIES.at(-1)}

function show(id){['setup','login','dashboard'].forEach(x=>$('#'+x).classList.add('hidden'));$('#'+id).classList.remove('hidden')}
function toast(msg){const e=$('#toast');e.textContent=msg;e.classList.remove('hidden');setTimeout(()=>e.classList.add('hidden'),2600)}

if(!configured) show('setup'); else { sb=createClient(cfg.supabaseUrl,cfg.supabaseKey); init(); }

async function init(){
  const {data:{session}}=await sb.auth.getSession();
  if(session) await enter(session.user); else show('login');
  sb.auth.onAuthStateChange(async(e,s)=>{if(e==='SIGNED_IN'&&s)await enter(s.user);if(e==='SIGNED_OUT')show('login')});
}

$('#login-form').onsubmit=async e=>{
  e.preventDefault();
  $('#login-error').classList.add('hidden');
  const {error}=await sb.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});
  if(error){$('#login-error').textContent=error.message;$('#login-error').classList.remove('hidden')}
};
$('#logout').onclick=()=>sb.auth.signOut();

async function enter(user){
  show('dashboard');
  $('#admin-email').textContent=user.email;
  await loadAll();
}

async function loadAll(){
  const [b,p,sp]=await Promise.all([
    sb.from('brands').select('*').order('sort_order'),
    sb.from('products').select('*').order('sort_order').order('id'),
    sb.from('store_profiles').select('*').order('brand_id').order('store_location')
  ]);
  if(b.error){toast('Lỗi brands: '+b.error.message);return}
  brands=b.data||[];
  if(p.error){
    products=[];
    $('#table-message').innerHTML='<b>Chưa có bảng products.</b> Hãy chạy catalog-setup.sql.';
    $('#table-message').classList.remove('hidden');
  }else{
    products=p.data||[];
    $('#table-message').classList.add('hidden');
  }
  if(sp.error){
    storeProfiles=[];
    $('#store-profile-status').innerHTML='<span class="text-amber-700">Chưa có bảng store_profiles. Hãy chạy <b>fashion-catalog-upgrade.sql</b> trong Supabase.</span>';
  }else{
    storeProfiles=sp.data||[];
    $('#store-profile-status').textContent='';
  }
  fillFilters();
  initStoreProfileControls();
  render();
}

function brandById(id){return brands.find(b=>Number(b.id)===Number(id))}
function storeOptions(brandId,includeAll=true){
  const b=brandById(brandId);
  const arr=b&&Array.isArray(b.locations)?b.locations:[];
  return `${includeAll?'<option value="__all__">Tất cả cửa hàng của thương hiệu</option>':''}${arr.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}`;
}

function fillFilters(){
  const current=$('#filter-brand').value;
  $('#filter-brand').innerHTML='<option value="">Tất cả thương hiệu</option>'+brands.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('');
  if([...$('#filter-brand').options].some(o=>o.value===current))$('#filter-brand').value=current;
  fillStoreFilter();
}

function fillStoreFilter(){
  const bid=$('#filter-brand').value;
  const old=$('#filter-store').value;
  $('#filter-store').innerHTML='<option value="">Tất cả cửa hàng</option>'+(bid?storeOptions(bid,false):'');
  if([...$('#filter-store').options].some(o=>o.value===old))$('#filter-store').value=old;
}

function render(){
  const bid=$('#filter-brand').value,store=$('#filter-store').value,q=$('#filter-search').value.toLowerCase().trim();
  const list=products.filter(p=>(!bid||String(p.brand_id)===bid)&&(!store||sameStore(p.store_location,store))&&(!q||[p.name_vi,p.name_zh,p.category_vi,p.sku].join(' ').toLowerCase().includes(q)));
  $('#product-list').innerHTML=list.map(p=>{
    const b=brandById(p.brand_id),img=Array.isArray(p.image_urls)&&p.image_urls[0],cat=categoryMeta(categoryFromText(p.category_vi||p.name_vi));
    return `<article class="card overflow-hidden">
      <div class="aspect-[4/3] bg-stone-100">${img?`<img src="${esc(img)}" class="w-full h-full object-cover">`:'<div class="h-full grid place-items-center text-gray-300"><i class="fa-solid fa-image text-3xl"></i></div>'}</div>
      <div class="p-5"><div class="text-[9px] uppercase tracking-[.15em] font-bold text-primary">${esc(b?.name||'')} · ${esc(p.store_location==='__all__'?'Tất cả cửa hàng':p.store_location)}</div>
      <h3 class="font-bold text-lg mt-2">${esc(p.name_vi)}</h3><div class="text-xs text-gray-500 mt-2">${esc(cat.vi)} ${p.price_text?'· '+esc(p.price_text):''}</div>
      <div class="mt-4 flex items-center justify-between"><span class="text-[10px] rounded-full px-2.5 py-1 font-bold ${p.active?'bg-green-50 text-green-700':'bg-gray-100 text-gray-500'}">${p.active?'Đang hiển thị':'Đang ẩn'}</span><button data-edit="${p.id}" class="rounded-full bg-secondary text-white px-4 py-2 text-xs font-bold">Chỉnh sửa</button></div></div>
    </article>`;
  }).join('')||'<div class="card p-8 text-center text-gray-500 md:col-span-2 xl:col-span-3">Chưa có sản phẩm phù hợp.</div>';
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openModal(Number(b.dataset.edit)));
}

$('#filter-brand').onchange=()=>{fillStoreFilter();render()};
$('#filter-store').onchange=render;
$('#filter-search').oninput=render;
$('#new-product').onclick=()=>openModal(null);

function closeModal(){$('#modal').classList.add('hidden');document.body.style.overflow=''}
document.querySelectorAll('[data-close]').forEach(x=>x.onclick=closeModal);

function setCategory(key){
  const meta=categoryMeta(key);
  $('#form-category').value=meta.key;
  const f=$('#product-form');
  f.elements.category_vi.value=meta.vi;
  f.elements.category_zh.value=meta.zh;
  $('#category-preview').textContent=`${meta.vi} / ${meta.zh}`;
}
$('#form-category').onchange=e=>setCategory(e.target.value);

function openModal(id){
  editingId=id;
  const p=id?products.find(x=>Number(x.id)===id):null;
  $('#modal-title').textContent=id?'Chỉnh sửa sản phẩm':'Thêm sản phẩm';
  $('#delete-product').classList.toggle('hidden',!id);
  $('#form-brand').innerHTML=brands.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('');
  const defaultBrand=p?.brand_id||brands[0]?.id||'';
  $('#form-brand').value=String(defaultBrand);
  fillFormStores(p?.store_location||'__all__');
  const f=$('#product-form');
  ['name_vi','name_zh','sku','price_text','description_vi','description_zh','sort_order'].forEach(n=>{f.elements[n].value=p?.[n]??(n==='sort_order'?0:'')});
  setCategory(p?categoryFromText(p.category_vi||p.name_vi):'tops');
  f.elements.active.checked=p?.active!==false;
  images=Array.isArray(p?.image_urls)?[...p.image_urls]:[];
  renderImages();
  $('#modal').classList.remove('hidden');
  document.body.style.overflow='hidden';
}

function fillFormStores(selected){
  const bid=$('#form-brand').value;
  $('#form-store').innerHTML=storeOptions(bid,true);
  $('#form-store').value=[...$('#form-store').options].some(o=>o.value===selected)?selected:'__all__';
}
$('#form-brand').onchange=()=>fillFormStores('__all__');

function renderImages(){
  $('#image-list').innerHTML=images.map((u,i)=>`<div class="relative aspect-square rounded-2xl overflow-hidden bg-stone-100"><img src="${esc(u)}" class="w-full h-full object-cover"><button type="button" data-remove-image="${i}" class="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/65 text-white text-xs"><i class="fa-solid fa-xmark"></i></button></div>`).join('');
  document.querySelectorAll('[data-remove-image]').forEach(b=>b.onclick=()=>{images.splice(Number(b.dataset.removeImage),1);renderImages()});
}

async function uploadFile(file,prefix){
  if(file.size>6*1024*1024){toast(`${file.name}: ảnh lớn hơn 6MB`);return null}
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
  const path=`${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const {error}=await sb.storage.from('site-images').upload(path,file,{cacheControl:'3600'});
  if(error){toast('Upload lỗi: '+error.message);return null}
  return sb.storage.from('site-images').getPublicUrl(path).data.publicUrl;
}

$('#image-upload').onchange=async e=>{
  const files=[...(e.target.files||[])].slice(0,Math.max(0,6-images.length));
  if(!files.length)return;
  $('#upload-status').textContent='Đang upload...';
  for(const file of files){
    const url=await uploadFile(file,'products');
    if(url) images.push(url);
  }
  $('#upload-status').textContent=`Đã có ${images.length}/6 ảnh`;
  renderImages();
  e.target.value='';
};

$('#product-form').onsubmit=async e=>{
  e.preventDefault();
  const fd=new FormData(e.target),obj=Object.fromEntries(fd.entries());
  const meta=categoryMeta($('#form-category').value);
  obj.category_vi=meta.vi;
  obj.category_zh=meta.zh;
  obj.brand_id=Number(obj.brand_id);
  obj.sort_order=Number(obj.sort_order)||0;
  obj.active=fd.has('active');
  obj.image_urls=images;
  obj.updated_at=new Date().toISOString();
  const res=editingId?await sb.from('products').update(obj).eq('id',editingId):await sb.from('products').insert(obj);
  if(res.error)return toast('Lỗi: '+res.error.message);
  await loadAll();closeModal();toast('Đã lưu sản phẩm');
};

$('#delete-product').onclick=async()=>{
  if(!editingId||!confirm('Xóa sản phẩm này?'))return;
  const {error}=await sb.from('products').delete().eq('id',editingId);
  if(error)return toast('Lỗi: '+error.message);
  await loadAll();closeModal();toast('Đã xóa sản phẩm');
};

// ---------- Storefront image manager ----------
function initStoreProfileControls(){
  const oldBrand=$('#store-brand').value;
  $('#store-brand').innerHTML=brands.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('');
  if([...$('#store-brand').options].some(o=>o.value===oldBrand))$('#store-brand').value=oldBrand;
  fillStoreProfileLocations();
}

function fillStoreProfileLocations(){
  const bid=$('#store-brand').value;
  const b=brandById(bid);
  const locations=Array.isArray(b?.locations)?b.locations:[];
  const old=$('#store-location').value;
  $('#store-location').innerHTML=locations.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  if([...$('#store-location').options].some(o=>o.value===old))$('#store-location').value=old;
  loadStoreProfileForm();
}

function currentProfile(){
  const bid=Number($('#store-brand').value);
  const store=$('#store-location').value;
  return storeProfiles.find(p=>Number(p.brand_id)===bid&&sameStore(p.store_location,store))||null;
}

function setStorePreview(url){
  storeImageUrl=url||'';
  const img=$('#store-image-preview'),empty=$('#store-image-empty');
  if(storeImageUrl){
    img.src=storeImageUrl;img.classList.remove('hidden');empty.classList.add('hidden');
    img.onerror=()=>{img.classList.add('hidden');empty.classList.remove('hidden')};
  }else{
    img.removeAttribute('src');img.classList.add('hidden');empty.classList.remove('hidden');
  }
}

function loadStoreProfileForm(){
  const p=currentProfile();
  $('#store-description-vi').value=p?.description_vi||'';
  $('#store-description-zh').value=p?.description_zh||'';
  setStorePreview(p?.image_url||'');
  $('#store-profile-status').textContent=p?'Đã có cấu hình riêng cho gian hàng này.':'Chưa có cấu hình riêng. Upload ảnh rồi bấm “Lưu gian hàng”.';
}

$('#store-brand').onchange=fillStoreProfileLocations;
$('#store-location').onchange=loadStoreProfileForm;
$('#store-image-upload').onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  $('#store-profile-status').textContent='Đang upload ảnh gian hàng...';
  const url=await uploadFile(file,'storefronts');
  if(url){setStorePreview(url);$('#store-profile-status').textContent='Upload xong. Bấm “Lưu gian hàng” để áp dụng.'}
  e.target.value='';
};

$('#save-store-profile').onclick=async()=>{
  const brandId=Number($('#store-brand').value);
  const store=$('#store-location').value;
  if(!brandId||!store)return toast('Hãy chọn thương hiệu và cửa hàng');
  const payload={
    brand_id:brandId,
    store_location:store,
    image_url:storeImageUrl,
    description_vi:$('#store-description-vi').value.trim(),
    description_zh:$('#store-description-zh').value.trim(),
    active:true,
    updated_at:new Date().toISOString()
  };
  const existing=currentProfile();
  const res=existing
    ? await sb.from('store_profiles').update(payload).eq('id',existing.id)
    : await sb.from('store_profiles').insert(payload);
  if(res.error)return toast('Lỗi lưu gian hàng: '+res.error.message);
  const {data,error}=await sb.from('store_profiles').select('*').order('brand_id').order('store_location');
  if(!error)storeProfiles=data||[];
  loadStoreProfileForm();
  toast('Đã lưu ảnh gian hàng');
};
