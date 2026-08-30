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
let storeProfile = null;
let products = [];
let category = 'all';
let query = '';
let selectedProduct = null;
let orderSubmitting = false;
let lastOrderAt = 0;

const fallbackBrands = {
  WARRIOR:{name:'Warrior',desc_vi:'Giày Sneaker trẻ trung và năng động.',desc_zh:'青春活力的运动鞋系列。',image_url:'https://i.ibb.co/x8zmTTCc/Warrior.jpg'},
  YANBABY:{name:'Yanbaby',desc_vi:'Thời trang nữ dịu dàng và trẻ trung.',desc_zh:'温柔青春的女装系列。',image_url:'https://i.ibb.co/S7svqwpF/Yan-jpg.png'},
  MERMAID:{name:'Mermaid',desc_vi:'Thời trang nữ hiện đại và sang trọng.',desc_zh:'现代优雅的高级女装。',image_url:'https://i.ibb.co/rK9MFvh5/Mermaid.jpg'},
  GEK:{name:'GEK',desc_vi:'Phong cách tinh tế và trẻ trung.',desc_zh:'精致奢雅的时尚风范。',image_url:'https://i.ibb.co/9mT4nWsk/GEK.jpg'},
  SANHE:{name:'Sanhe',desc_vi:'Trang phục mặc nhà chất lượng.',desc_zh:'高品质精雅居家服饰。',image_url:'https://i.ibb.co/N6xTJTDZ/Sanhe.png'}
};

const FASHION_CATEGORIES = [
  {key:'tops',vi:'Áo',zh:'上衣',icon:'fa-shirt',keywords:['ao','shirt','top','blouse','tee','t shirt','somi','so mi']},
  {key:'pants',vi:'Quần',zh:'裤装',icon:'fa-person',keywords:['quan','pants','trouser','jean','short']},
  {key:'dresses',vi:'Váy / Đầm',zh:'连衣裙',icon:'fa-person-dress',keywords:['vay','dam','dress']},
  {key:'skirts',vi:'Chân váy',zh:'半身裙',icon:'fa-person-dress',keywords:['chan vay','skirt']},
  {key:'sets',vi:'Set / Bộ',zh:'套装',icon:'fa-layer-group',keywords:['set','bo','combo','suit']},
  {key:'outerwear',vi:'Áo khoác',zh:'外套',icon:'fa-vest',keywords:['ao khoac','jacket','coat','blazer','cardigan']},
  {key:'footwear',vi:'Giày / Dép',zh:'鞋履',icon:'fa-shoe-prints',keywords:['giay','dep','sandal','sneaker','shoe','footwear']},
  {key:'bags',vi:'Túi xách',zh:'包袋',icon:'fa-bag-shopping',keywords:['tui','bag','handbag']},
  {key:'accessories',vi:'Phụ kiện',zh:'配饰',icon:'fa-gem',keywords:['phu kien','accessory','belt','mu','non','khan','kinh','jewelry']},
  {key:'homewear',vi:'Đồ mặc nhà',zh:'家居服',icon:'fa-house',keywords:['do mac nha','homewear','pajama','pyjama','ngu']},
  {key:'other',vi:'Khác',zh:'其他',icon:'fa-ellipsis',keywords:[]}
];

function categoryMetaFromProduct(p) {
  const raw = normalize([p.category_vi,p.category_zh,p.name_vi,p.name_zh].filter(Boolean).join(' '));
  // Match specific categories first to avoid "Áo khoác" becoming generic "Áo".
  const order = ['outerwear','skirts','homewear','dresses','footwear','bags','accessories','sets','pants','tops'];
  for (const key of order) {
    const meta = FASHION_CATEGORIES.find(x => x.key === key);
    if (meta?.keywords.some(k => raw.includes(normalize(k)))) return meta;
  }
  return FASHION_CATEGORIES.find(x => x.key === 'other');
}

function categoryMetaByKey(key) {
  return FASHION_CATEGORIES.find(x => x.key === key) || FASHION_CATEGORIES[FASHION_CATEGORIES.length - 1];
}

const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const normalize = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const normalizeStore = (s) => {
  let value = normalize(s)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  value = value
    .replace(/\bvincom plaza\b/g, ' ')
    .replace(/\bvincom\b/g, ' ')
    .replace(/\bvinhomes\b/g, ' ')
    .replace(/\bvinhome\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return value;
};

const sameStore = (a, b) => {
  const left = normalizeStore(a);
  const right = normalizeStore(b);
  return left !== '' && left === right;
};
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
  $('#brand-desc').textContent = lang === 'zh'
    ? (storeProfile?.description_zh || brand?.desc_zh || brand?.desc_vi || '')
    : (storeProfile?.description_vi || brand?.desc_vi || '');
  document.title = `${displayBrand} · ${storeParam || ''} | Nanshuo`;

  const imageUrl = storeProfile?.image_url || brand?.image_url || '';
  const img = $('#brand-image');
  const placeholder = $('#store-image-placeholder');
  if (imageUrl) {
    img.src = imageUrl;
    img.alt = `${displayBrand} - ${storeParam}`;
    img.classList.remove('hidden');
    placeholder?.classList.add('hidden');
    img.onerror = () => {
      img.classList.add('hidden');
      placeholder?.classList.remove('hidden');
    };
  } else {
    img.removeAttribute('src');
    img.classList.add('hidden');
    placeholder?.classList.remove('hidden');
  }
  $('#brand-image-wrap').classList.remove('hidden');
}

function categories() {
  const used = new Map();
  products.forEach(p => {
    const meta = categoryMetaFromProduct(p);
    used.set(meta.key, meta);
  });
  return FASHION_CATEGORIES.filter(meta => used.has(meta.key));
}

function renderCategories() {
  const cats = categories();
  const allLabel = lang==='zh'?'全部':'Tất cả';
  const allButton = `<button data-cat="all" class="cat-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold ${category==='all'?'bg-secondary text-white':'bg-white border border-gray-200 text-gray-600'}"><i class="fa-solid fa-border-all"></i>${allLabel}</button>`;
  const catButtons = cats.map(c => `<button data-cat="${esc(c.key)}" class="cat-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold ${category===c.key?'bg-secondary text-white':'bg-white border border-gray-200 text-gray-600'}"><i class="fa-solid ${esc(c.icon)}"></i>${esc(lang==='zh'?c.zh:c.vi)}</button>`);
  $('#category-filters').innerHTML = [allButton, ...catButtons].join('');
  document.querySelectorAll('.cat-btn').forEach(b=>b.onclick=()=>{category=b.dataset.cat;renderCategories();renderProducts()});
}

function filteredProducts() {
  return products.filter(p => {
    const catKey = categoryMetaFromProduct(p).key;
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
    const catMeta = categoryMetaFromProduct(p);
    const cat = lang === 'zh' ? catMeta.zh : catMeta.vi;
    return `<button data-product="${Number(p.id)}" class="product-card text-left bg-white rounded-2xl md:rounded-3xl overflow-hidden border border-gray-100">
      <div class="aspect-[3/4] bg-stone-100 overflow-hidden"><img src="${esc(img)}" alt="${esc(name)}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy"></div>
      <div class="p-4 md:p-5"><div class="text-[9px] md:text-[10px] uppercase tracking-[.13em] font-bold text-primary">${esc(cat)}</div><h3 class="font-bold text-sm md:text-base text-secondary mt-1.5 line-clamp-2">${esc(name)}</h3>${p.price_text?`<div class="text-xs md:text-sm font-bold text-accent mt-2">${esc(p.price_text)}</div>`:''}</div>
    </button>`;
  }).join('');
  document.querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>openProduct(Number(b.dataset.product)));
}

function openProduct(id) {
  const p = products.find(x=>Number(x.id)===id); if(!p)return;
  selectedProduct = p;
  const imgs = imagesOf(p); const fallback='https://placehold.co/600x800/f1f1ef/9ca3af?text=Nanshuo';
  const shown = imgs.length?imgs:[fallback];
  $('#modal-main-image').src=shown[0];
  $('#modal-main-image').alt=textOf(p,'name');
  $('#modal-thumbs').innerHTML=shown.map((u,i)=>`<button data-thumb="${i}" class="aspect-square rounded-xl overflow-hidden border ${i===0?'border-primary':'border-transparent'}"><img src="${esc(u)}" class="w-full h-full object-cover" alt=""></button>`).join('');
  document.querySelectorAll('[data-thumb]').forEach(b=>b.onclick=()=>{$('#modal-main-image').src=shown[Number(b.dataset.thumb)];document.querySelectorAll('[data-thumb]').forEach(x=>x.classList.remove('border-primary'));b.classList.add('border-primary')});
    const modalCat = categoryMetaFromProduct(p);
  $('#modal-category').textContent = lang === 'zh' ? modalCat.zh : modalCat.vi;
  $('#modal-name').textContent=textOf(p,'name');
  $('#modal-price').textContent=p.price_text||'';
  $('#modal-description').textContent=textOf(p,'description');
  $('#modal-store').textContent=storeParam;
  $('#product-modal').classList.remove('hidden'); document.body.style.overflow='hidden';
}


function showOrderError(message) {
  const box = $('#order-error');
  box.textContent = message;
  box.classList.remove('hidden');
}

function clearOrderError() {
  const box = $('#order-error');
  box.textContent = '';
  box.classList.add('hidden');
}

function openOrderModal() {
  if (!selectedProduct) return;
  if (!sb) {
    alert(lang === 'zh' ? '订购功能暂不可用。' : 'Tính năng đặt hàng tạm thời chưa sẵn sàng.');
    return;
  }

  closeModal();
  const form = $('#order-form');
  form.reset();
  $('#order-quantity').value = '1';
  clearOrderError();
  $('#order-success').classList.add('hidden');
  $('#order-form-content').classList.remove('hidden');

  const imgs = imagesOf(selectedProduct);
  $('#order-product-image').src = imgs[0] || 'https://placehold.co/300x400/f1f1ef/9ca3af?text=Nanshuo';
  $('#order-product-image').alt = textOf(selectedProduct, 'name');
  $('#order-product-brand').textContent = brand?.name || brandParam;
  $('#order-product-name').textContent = textOf(selectedProduct, 'name');
  $('#order-product-meta').textContent = [storeParam, selectedProduct.price_text || ''].filter(Boolean).join(' · ');

  $('#order-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#order-name')?.focus(), 50);
}

function closeOrderModal() {
  $('#order-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

function validPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 12;
}

async function submitOrder(e) {
  e.preventDefault();
  if (orderSubmitting || !selectedProduct || !sb) return;

  clearOrderError();
  const fd = new FormData(e.currentTarget);

  // Honeypot chống bot đơn giản.
  if (String(fd.get('website') || '').trim()) {
    $('#order-form-content').classList.add('hidden');
    $('#order-success').classList.remove('hidden');
    return;
  }

  const customerName = String(fd.get('customer_name') || '').trim();
  const phone = String(fd.get('phone') || '').trim();
  const address = String(fd.get('address') || '').trim();
  const note = String(fd.get('note') || '').trim();
  const quantity = Math.max(1, Math.min(99, Number(fd.get('quantity')) || 1));

  if (customerName.length < 2) return showOrderError(lang === 'zh' ? '请输入姓名。' : 'Vui lòng nhập họ và tên.');
  if (!validPhone(phone)) return showOrderError(lang === 'zh' ? '请输入有效联系电话。' : 'Vui lòng nhập số điện thoại hợp lệ.');
  if (address.length < 5) return showOrderError(lang === 'zh' ? '请输入联系/收货地址。' : 'Vui lòng nhập địa chỉ liên hệ/nhận hàng.');
  if (!fd.has('privacy')) return showOrderError(lang === 'zh' ? '请确认信息使用说明。' : 'Vui lòng xác nhận đồng ý sử dụng thông tin để hỗ trợ đơn hàng.');

  // Hạn chế gửi lặp liên tục do double click.
  const now = Date.now();
  if (now - lastOrderAt < 4000) return showOrderError(lang === 'zh' ? '请稍候再提交。' : 'Vui lòng chờ vài giây trước khi gửi lại.');

  const payload = {
    product_id: Number(selectedProduct.id) || null,
    brand_id: Number(brand?.id) || null,
    brand_name: brand?.name || brandParam || '',
    store_location: storeParam || '',
    product_name: selectedProduct.name_vi || selectedProduct.name_zh || '',
    product_sku: selectedProduct.sku || '',
    price_text: selectedProduct.price_text || '',
    quantity,
    customer_name: customerName,
    phone,
    address,
    note,
    privacy_accepted: true,
    source_url: location.href.slice(0, 1000)
  };

  const btn = $('#order-submit');
  orderSubmitting = true;
  btn.disabled = true;
  const oldHtml = btn.innerHTML;
  btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>${lang === 'zh' ? '正在提交...' : 'Đang gửi...'}`;

  try {
    const { error } = await sb.from('orders').insert(payload);
    if (error) throw error;
    lastOrderAt = Date.now();
    $('#order-form-content').classList.add('hidden');
    $('#order-success').classList.remove('hidden');
    $('#order-code').textContent = '';
  } catch (err) {
    console.warn('[Nanshuo Order] Submit error:', err);
    const missingTable = err?.code === '42P01' || /orders/i.test(err?.message || '') && /relation|schema cache|not find/i.test(err?.message || '');
    showOrderError(missingTable
      ? (lang === 'zh' ? '订购功能尚未启用。管理员需要先运行 orders-setup.sql。' : 'Chức năng đặt hàng chưa được kích hoạt. Admin cần chạy file orders-setup.sql trong Supabase.')
      : (lang === 'zh' ? '暂时无法提交，请稍后再试或直接联系门店。' : 'Tạm thời chưa gửi được yêu cầu. Vui lòng thử lại hoặc liên hệ trực tiếp cửa hàng.'));
  } finally {
    orderSubmitting = false;
    btn.disabled = false;
    btn.innerHTML = oldHtml;
  }
}

$('#open-order-btn').onclick = openOrderModal;
document.querySelectorAll('[data-close-order]').forEach(b => b.onclick = closeOrderModal);
$('#order-form').addEventListener('submit', submitOrder);

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
    if (!brand?.id) { renderHeader(); renderCategories(); renderProducts(); return; }

    // Ảnh và mô tả riêng của từng gian hàng.
    const profileRes = await sb.from('store_profiles').select('*').eq('brand_id',brand.id).eq('active',true);
    if (!profileRes.error) {
      storeProfile = (profileRes.data || []).find(x => sameStore(x.store_location, storeParam)) || null;
    }
    renderHeader();

    const pr = await sb.from('products').select('*').eq('brand_id',brand.id).eq('active',true).order('sort_order').order('id');
    if (pr.error) {
      $('#catalog-status').innerHTML = `<b>${lang==='zh'?'商品目录尚未启用。':'Danh mục sản phẩm chưa được kích hoạt.'}</b> ${lang==='zh'?'管理员需要先运行 catalog-setup.sql。':'Admin cần chạy file catalog-setup.sql trong Supabase một lần.'}`;
      $('#catalog-status').classList.remove('hidden');
    } else {
      const allBrandProducts = pr.data || [];
      products = allBrandProducts.filter(
        p => p.store_location === '__all__' || sameStore(p.store_location, storeParam)
      );

      if (allBrandProducts.length > 0 && products.length === 0) {
        const savedStores = [...new Set(
          allBrandProducts
            .map(p => p.store_location)
            .filter(x => x && x !== '__all__')
        )];
        console.info('[Nanshuo Catalog] Store URL:', storeParam);
        console.info('[Nanshuo Catalog] Stores saved in products:', savedStores);
      }
    }
  } catch (e) {
    console.warn('[Nanshuo Catalog] Load error:', e);
    $('#catalog-status').textContent =
      lang === 'zh'
        ? '暂时无法加载商品，请稍后再试。'
        : 'Tạm thời chưa tải được sản phẩm. Vui lòng thử tải lại trang.';
    $('#catalog-status').classList.remove('hidden');
  }

  renderHeader();
  renderCategories();
  renderProducts();
}

setLanguage('vi'); load();
