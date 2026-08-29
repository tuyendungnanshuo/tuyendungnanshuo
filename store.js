import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.NANSHUO_CONFIG || {};
const configured = cfg.supabaseUrl && cfg.supabaseKey;
const sb = configured ? createClient(cfg.supabaseUrl, cfg.supabaseKey) : null;
const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const brandParam = (params.get('brand') || '').trim();
const storeParam = (params.get('store') || '').trim();
let lang = 'vi';
let brand = null;
let products = [];
let category = 'all';
let query = '';

const fallbackBrands = {
  WARRIOR:{name:'Warrior',desc_vi:'Giày Sneaker trẻ trung và năng động.',desc_zh:'青春活力的运动鞋系列。',image_url:'https://i.ibb.co/x8zmTTCc/Warrior.jpg'},
  YANBABY:{name:'Yanbaby',desc_vi:'Thời trang nữ dịu dàng và trẻ trung.',desc_zh:'温柔青春的女装系列。',image_url:'https://i.ibb.co/S7svqwpF/Yan-jpg.png'},
  MERMAID:{name:'Mermaid',desc_vi:'Thời trang nữ hiện đại và sang trọng.',desc_zh:'现代优雅的高级女装。',image_url:'https://i.ibb.co/rK9MFvh5/Mermaid.jpg'},
  GEK:{name:'GEK',desc_vi:'Phong cách tinh tế và trẻ trung.',desc_zh:'精致奢雅的时尚风范。',image_url:'https://i.ibb.co/9mT4nWsk/GEK.jpg'},
  SANHE:{name:'Sanhe',desc_vi:'Trang phục mặc nhà chất lượng.',desc_zh:'高品质精雅居家服饰。',image_url:'https://i.ibb.co/N6xTJTDZ/Sanhe.png'}
};

const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const normalize = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const imagesOf = (p) => Array.isArray(p.image_urls) ? p.image_urls.filter(Boolean) : [];
const textOf = (p, key) => lang === 'zh' ? (p[`${key}_zh`] || p[`${key}_vi`] || '') : (p[`${key}_vi`] || '');

function setLanguage(next) {
  lang = next;
  document.documentElement.lang = next;
  $('#lang-vi').className = `px-2.5 py-1.5 text-[11px] font-bold rounded-md ${next==='vi'?'bg-primary text-white':'text-gray-500'}`;
  $('#lang-zh').className = `px-2.5 py-1.5 text-[11px] font-bold rounded-md ${next==='zh'?'bg-primary text-white':'text-gray-500'}`;
  $('#product-search').placeholder = next === 'zh' ? '搜索商品...' : 'Tìm sản phẩm...';
  renderHeader();
  renderCategories();
  renderProducts();
}

function renderHeader() {
  const displayBrand = brand?.name || brandParam || 'Nanshuo';
  $('#crumb-brand').textContent = displayBrand;
  $('#crumb-store').textContent = storeParam || (lang==='zh'?'门店':'Cửa hàng');
  $('#brand-pill').textContent = displayBrand;
  $('#store-title').textContent = storeParam || displayBrand;
  $('#brand-desc').textContent = lang === 'zh' ? (brand?.desc_zh || brand?.desc_vi || '') : (brand?.desc_vi || '');
  document.title = `${displayBrand} · ${storeParam || ''} | Nanshuo`;
  if (brand?.image_url) {
    $('#brand-image').src = brand.image_url;
    $('#brand-image').alt = displayBrand;
    $('#brand-image-wrap').classList.remove('hidden');
  }
}

function categories() {
  const map = new Map();
  products.forEach(p => {
    const vi = p.category_vi || 'Sản phẩm';
    const zh = p.category_zh || vi;
    const key = normalize(vi);
    if (!map.has(key)) map.set(key,{key,vi,zh});
  });
  return [...map.values()];
}

function renderCategories() {
  const cats = categories();
  const allLabel = lang==='zh'?'全部':'Tất cả';
  $('#category-filters').innerHTML = [`<button data-cat="all" class="cat-btn px-4 py-2.5 rounded-full text-xs font-bold ${category==='all'?'bg-secondary text-white':'bg-white border border-gray-200 text-gray-600'}">${allLabel}</button>`,...cats.map(c=>`<button data-cat="${esc(c.key)}" class="cat-btn px-4 py-2.5 rounded-full text-xs font-bold ${category===c.key?'bg-secondary text-white':'bg-white border border-gray-200 text-gray-600'}">${esc(lang==='zh'?c.zh:c.vi)}</button>`)].join('');
  document.querySelectorAll('.cat-btn').forEach(b=>b.onclick=()=>{category=b.dataset.cat;renderCategories();renderProducts()});
}

function filteredProducts() {
  return products.filter(p => {
    const catKey = normalize(p.category_vi || 'Sản phẩm');
    const matchesCat = category==='all' || catKey===category;
    const hay = normalize([p.name_vi,p.name_zh,p.description_vi,p.description_zh,p.category_vi,p.category_zh,p.sku].join(' '));
    return matchesCat && (!query || hay.includes(normalize(query)));
  });
}

function renderProducts() {
  const list = filteredProducts();
  $('#empty-state').classList.toggle('hidden', list.length > 0);
  $('#product-grid').innerHTML = list.map(p => {
    const imgs = imagesOf(p);
    const img = imgs[0] || 'https://placehold.co/600x800/f1f1ef/9ca3af?text=Nanshuo';
    const name = textOf(p,'name');
    const cat = textOf(p,'category') || (lang==='zh'?'商品':'Sản phẩm');
    return `<button data-product="${Number(p.id)}" class="product-card text-left bg-white rounded-2xl md:rounded-3xl overflow-hidden border border-gray-100">
      <div class="aspect-[3/4] bg-stone-100 overflow-hidden"><img src="${esc(img)}" alt="${esc(name)}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy"></div>
      <div class="p-4 md:p-5"><div class="text-[9px] md:text-[10px] uppercase tracking-[.13em] font-bold text-primary">${esc(cat)}</div><h3 class="font-bold text-sm md:text-base text-secondary mt-1.5 line-clamp-2">${esc(name)}</h3>${p.price_text?`<div class="text-xs md:text-sm font-bold text-accent mt-2">${esc(p.price_text)}</div>`:''}</div>
    </button>`;
  }).join('');
  document.querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>openProduct(Number(b.dataset.product)));
}

function openProduct(id) {
  const p = products.find(x=>Number(x.id)===id); if(!p)return;
  const imgs = imagesOf(p); const fallback='https://placehold.co/600x800/f1f1ef/9ca3af?text=Nanshuo';
  const shown = imgs.length?imgs:[fallback];
  $('#modal-main-image').src=shown[0];
  $('#modal-main-image').alt=textOf(p,'name');
  $('#modal-thumbs').innerHTML=shown.map((u,i)=>`<button data-thumb="${i}" class="aspect-square rounded-xl overflow-hidden border ${i===0?'border-primary':'border-transparent'}"><img src="${esc(u)}" class="w-full h-full object-cover" alt=""></button>`).join('');
  document.querySelectorAll('[data-thumb]').forEach(b=>b.onclick=()=>{$('#modal-main-image').src=shown[Number(b.dataset.thumb)];document.querySelectorAll('[data-thumb]').forEach(x=>x.classList.remove('border-primary'));b.classList.add('border-primary')});
  $('#modal-category').textContent=textOf(p,'category');
  $('#modal-name').textContent=textOf(p,'name');
  $('#modal-price').textContent=p.price_text||'';
  $('#modal-description').textContent=textOf(p,'description');
  $('#modal-store').textContent=storeParam;
  $('#product-modal').classList.remove('hidden'); document.body.style.overflow='hidden';
}

function closeModal(){ $('#product-modal').classList.add('hidden'); document.body.style.overflow=''; }
document.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=closeModal);
$('#lang-vi').onclick=()=>setLanguage('vi'); $('#lang-zh').onclick=()=>setLanguage('zh');
$('#product-search').addEventListener('input',e=>{query=e.target.value;renderProducts()});

async function load() {
  const fallback = fallbackBrands[brandParam.toUpperCase()] || {name:brandParam,desc_vi:'',desc_zh:'',image_url:''};
  brand = fallback;
  if (!brandParam || !storeParam) {
    $('#catalog-status').textContent='Đường dẫn cửa hàng chưa đầy đủ. Hãy quay lại trang chủ và chọn một địa điểm cửa hàng.';
    $('#catalog-status').classList.remove('hidden'); renderHeader(); renderCategories(); renderProducts(); return;
  }
  if (!sb) { renderHeader(); renderCategories(); renderProducts(); return; }
  try {
    const br = await sb.from('brands').select('*').ilike('name',brandParam).limit(1);
    if (!br.error && br.data?.[0]) brand=br.data[0];
    renderHeader();
    if (!brand?.id) { renderCategories(); renderProducts(); return; }
    const pr = await sb.from('products').select('*').eq('brand_id',brand.id).eq('active',true).order('sort_order').order('id');
    if (pr.error) {
      $('#catalog-status').innerHTML = `<b>${lang==='zh'?'商品目录尚未启用。':'Danh mục sản phẩm chưa được kích hoạt.'}</b> ${lang==='zh'?'管理员需要先运行 catalog-setup.sql。':'Admin cần chạy file catalog-setup.sql trong Supabase một lần.'}`;
      $('#catalog-status').classList.remove('hidden');
    } else products=(pr.data||[]).filter(p=>p.store_location==='__all__'||p.store_location===storeParam);
  } catch (e) { console.warn(e); }
  renderHeader(); renderCategories(); renderProducts();
}

setLanguage('vi'); load();
