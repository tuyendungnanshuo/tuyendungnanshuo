import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.NANSHUO_CONFIG || {};
const configured = cfg.supabaseUrl && cfg.supabaseKey && !cfg.supabaseUrl.includes('PASTE_') && !cfg.supabaseKey.includes('PASTE_');
if (!configured) {
  console.info('[Nanshuo CMS] Chưa cấu hình Supabase. Website tiếp tục dùng nội dung tĩnh trong index.html.');
} else {
  const sb = createClient(cfg.supabaseUrl, cfg.supabaseKey);
  const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const lines = (s) => String(s ?? '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  let cmsJobs = [];

  function splitTitle(value) {
    const a = lines(value);
    if (a.length >= 2) return [a[0], a.slice(1).join(' ')];
    const text = String(value || '').trim();
    const comma = text.indexOf(',');
    if (comma > 0) return [text.slice(0, comma + 1), text.slice(comma + 1).trim()];
    return [text, ''];
  }

  function updateHero(hero) {
    if (!hero) return;
    const section = document.querySelector('#view-recruitment > section');
    if (!section) return;

    const badge = section.querySelector('.inline-flex');
    if (badge) {
      const vi = badge.querySelector('.lang-vi');
      const zh = badge.querySelector('.lang-zh');
      if (vi && hero.eyebrow_vi) vi.textContent = hero.eyebrow_vi;
      if (zh && hero.eyebrow_zh) zh.textContent = hero.eyebrow_zh;
    }

    const h1 = section.querySelector('h1');
    if (h1) {
      const viSpans = h1.querySelectorAll('.lang-vi');
      const zhSpans = h1.querySelectorAll('.lang-zh');
      const [vi1, vi2] = splitTitle(hero.title_vi);
      const [zh1, zh2] = splitTitle(hero.title_zh);
      if (viSpans[0] && vi1) viSpans[0].textContent = vi1;
      if (viSpans[1] && vi2) viSpans[1].textContent = vi2;
      if (zhSpans[0] && zh1) zhSpans[0].textContent = zh1;
      if (zhSpans[1] && zh2) zhSpans[1].textContent = zh2;
    }

    const intro = section.querySelector('h1 + p');
    if (intro) {
      const vi = intro.querySelector('.lang-vi');
      const zh = intro.querySelector('.lang-zh');
      if (vi && hero.text_vi) vi.textContent = hero.text_vi;
      if (zh && hero.text_zh) zh.textContent = hero.text_zh;
    }

    const img = section.querySelector('img');
    if (img && hero.image) img.src = hero.image;
  }

  function updateAbout(about) {
    if (!about) return;
    const section = document.querySelector('#about');
    if (!section) return;
    const title = section.querySelector('h3');
    if (title) {
      const vi = title.querySelector('.lang-vi');
      const zh = title.querySelector('.lang-zh');
      if (vi && about.title_vi) vi.textContent = about.title_vi;
      if (zh && about.title_zh) zh.textContent = about.title_zh;
    }
    const right = section.querySelector('.md\\:col-span-7') || section;
    const ps = right.querySelectorAll('p.text-gray-600');
    if (ps[0]) {
      const vi = ps[0].querySelector('.lang-vi');
      const zh = ps[0].querySelector('.lang-zh');
      if (vi && about.text1_vi) vi.textContent = about.text1_vi;
      if (zh && about.text1_zh) zh.textContent = about.text1_zh;
    }
    if (ps[1]) {
      const vi = ps[1].querySelector('.lang-vi');
      const zh = ps[1].querySelector('.lang-zh');
      if (vi && about.text2_vi) vi.textContent = about.text2_vi;
      if (zh && about.text2_zh) zh.textContent = about.text2_zh;
    }
  }

  function renderBrands(brands) {
    const grid = document.querySelector('#brands .grid.grid-cols-1');
    if (!grid) return;
    grid.innerHTML = brands.map(b => `
      <div class="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
        <div class="w-full aspect-[3/4] bg-stone-100 flex items-center justify-center overflow-hidden">
          ${b.image_url ? `<img src="${esc(b.image_url)}" alt="${esc(b.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy">` : `<div class="text-3xl font-bold text-stone-300">${esc(b.name)}</div>`}
        </div>
        <div class="p-5 flex-grow flex flex-col justify-between">
          <div>
            <h3 class="font-serif text-xl font-bold text-secondary tracking-wider uppercase mb-2 text-center">${esc(b.name)}</h3>
            <p class="font-sans text-sm text-gray-500 leading-relaxed font-light text-center">
              <span class="lang-vi">${esc(b.desc_vi)}</span>
              <span class="lang-zh">${esc(b.desc_zh)}</span>
            </p>
          </div>
          <div class="mt-4 pt-4 border-t border-stone-100">
            <span class="text-[10px] font-bold text-primary uppercase tracking-wider block mb-2"><i class="fa-solid fa-location-dot mr-1"></i> Cửa hàng / 门店:</span>
            <div class="flex flex-wrap gap-1">
              ${(Array.isArray(b.locations) ? b.locations : []).map(x => `<span class="text-[10px] bg-stone-100 text-stone-600 px-2.5 py-1.5 rounded font-medium text-left">${esc(x)}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>`).join('');
  }

  const jobMeta = {
    ops: {icon:'fa-store', wrap:'bg-amber-50 text-primary border-primary/15'},
    marketing: {icon:'fa-award', wrap:'bg-amber-50 text-primary border-primary/15'},
    design: {icon:'fa-palette', wrap:'bg-blue-50 text-blue-600 border-blue-100'}
  };

  function renderJobs(jobs) {
    const list = document.getElementById('job-list');
    if (!list) return;
    cmsJobs = jobs;
    list.innerHTML = jobs.map(j => {
      const meta = jobMeta[j.category] || jobMeta.ops;
      const icon = j.icon || meta.icon;
      return `<div class="job-item bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm transition-all duration-300 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between premium-card" data-category="${esc(j.category)}">
        <div class="flex gap-6 items-start">
          <div class="w-14 h-14 ${meta.wrap} rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border"><i class="fa-solid ${esc(icon)}"></i></div>
          <div>
            <div class="flex items-center gap-2 mb-1.5">
              <h3 class="text-lg font-bold text-secondary hover:text-primary cursor-pointer transition-colors" onclick="window.nanshuoCmsDetail(${Number(j.id)})">
                <span class="lang-vi">${esc(j.title_vi)}</span><span class="lang-zh">${esc(j.title_zh || j.title_vi)}</span>
              </h3>
              ${j.hot ? '<span class="bg-accent/10 text-accent text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Hot</span>' : ''}
            </div>
            <div class="flex flex-wrap gap-4 text-xs text-gray-400 mb-3 font-medium">
              <span class="flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-primary"></i><span class="lang-vi">${esc(j.location)}</span><span class="lang-zh">${esc(j.location_zh || j.location)}</span></span>
              <span class="flex items-center gap-1.5"><i class="fa-solid fa-briefcase text-primary"></i><span class="lang-vi">${esc(j.type_vi)}</span><span class="lang-zh">${esc(j.type_zh || j.type_vi)}</span></span>
              <span class="flex items-center gap-1.5"><i class="fa-solid fa-money-bill-wave text-accent"></i><span class="lang-vi">${esc(j.salary)}</span><span class="lang-zh">${esc(j.salary_zh || j.salary)}</span></span>
            </div>
            <p class="text-gray-500 text-sm leading-relaxed font-light line-clamp-2 max-w-3xl"><span class="lang-vi">${esc(j.summary_vi)}</span><span class="lang-zh">${esc(j.summary_zh || j.summary_vi)}</span></p>
          </div>
        </div>
        <div class="flex flex-row md:flex-col gap-3 w-full md:w-auto flex-shrink-0 mt-4 md:mt-0">
          <button onclick="window.nanshuoCmsApply(${Number(j.id)})" class="flex-1 md:flex-none px-6 py-3 bg-secondary text-white font-bold text-xs tracking-wider uppercase rounded-xl hover:bg-primary transition-all duration-300 shadow-sm"><span class="lang-vi">Ứng tuyển</span><span class="lang-zh">申请职位</span></button>
          <button onclick="window.nanshuoCmsDetail(${Number(j.id)})" class="flex-1 md:flex-none px-6 py-3 border border-gray-200 text-gray-700 font-bold text-xs tracking-wider uppercase rounded-xl hover:bg-gray-50 transition-all duration-300"><span class="lang-vi">Chi tiết</span><span class="lang-zh">职位详情</span></button>
        </div>
      </div>`;
    }).join('');
    if (typeof window.filterJobs === 'function') window.filterJobs('all');
  }

  function ensureJobModal() {
    if (document.getElementById('cms-job-detail')) return;
    document.body.insertAdjacentHTML('beforeend', `<div id="cms-job-detail" class="fixed inset-0 z-[80] hidden opacity-0 transition-opacity duration-300">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="window.nanshuoCmsCloseDetail()"></div>
      <div class="relative min-h-full flex items-end md:items-center justify-center p-0 md:p-5">
        <div class="bg-white w-full md:max-w-3xl rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-auto shadow-2xl">
          <div class="p-6 md:p-8 border-b border-gray-100 flex items-start justify-between gap-4"><div><div id="cms-detail-hot" class="hidden text-[10px] font-bold uppercase tracking-wider text-accent mb-2">HOT POSITION</div><h3 id="cms-detail-title" class="serif-title text-2xl md:text-3xl font-bold text-secondary"></h3><div id="cms-detail-meta" class="text-xs text-gray-400 mt-3"></div></div><button onclick="window.nanshuoCmsCloseDetail()" class="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200"><i class="fa-solid fa-xmark"></i></button></div>
          <div class="p-6 md:p-8"><div id="cms-detail-summary" class="text-gray-600 leading-7"></div><div id="cms-detail-body" class="mt-6 text-sm text-gray-600 leading-7 whitespace-pre-line"></div><div id="cms-detail-req-wrap" class="mt-7 hidden"><h4 class="font-bold text-secondary mb-3"><span class="lang-vi">Yêu cầu</span><span class="lang-zh">岗位要求</span></h4><ul id="cms-detail-req" class="space-y-2 text-sm text-gray-600 list-disc pl-5"></ul></div></div>
          <div class="p-6 border-t border-gray-100 bg-bgLight flex justify-end gap-3"><button onclick="window.nanshuoCmsCloseDetail()" class="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg border border-gray-200 hover:bg-gray-100"><span class="lang-vi">Đóng</span><span class="lang-zh">关闭</span></button><button id="cms-detail-apply" class="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-primary text-white hover:bg-primaryDark"><span class="lang-vi">Ứng tuyển ngay</span><span class="lang-zh">立即投递</span></button></div>
        </div>
      </div>
    </div>`);
  }

  window.nanshuoCmsApply = (id) => {
    const j = cmsJobs.find(x => Number(x.id) === Number(id));
    if (j?.form_url) window.open(j.form_url, '_blank', 'noopener');
    else if (j) alert(`Chưa cấu hình link ứng tuyển cho: ${j.title_vi}`);
  };
  window.nanshuoCmsCloseDetail = () => {
    const m = document.getElementById('cms-job-detail');
    if (!m) return;
    m.classList.add('opacity-0');
    setTimeout(() => m.classList.add('hidden'), 250);
  };
  window.nanshuoCmsDetail = (id) => {
    const j = cmsJobs.find(x => Number(x.id) === Number(id));
    if (!j) return;
    ensureJobModal();
    const lang = document.documentElement.lang === 'zh' ? 'zh' : 'vi';
    document.getElementById('cms-detail-title').textContent = lang === 'zh' ? (j.title_zh || j.title_vi) : j.title_vi;
    document.getElementById('cms-detail-meta').textContent = [lang === 'zh' ? (j.location_zh || j.location) : j.location, lang === 'zh' ? (j.type_zh || j.type_vi) : j.type_vi, lang === 'zh' ? (j.salary_zh || j.salary) : j.salary].filter(Boolean).join(' · ');
    document.getElementById('cms-detail-summary').textContent = lang === 'zh' ? (j.summary_zh || j.summary_vi) : j.summary_vi;
    document.getElementById('cms-detail-body').textContent = lang === 'zh' ? (j.detail_zh || '') : (j.detail_vi || '');
    const req = lines(lang === 'zh' ? j.requirements_zh : j.requirements_vi);
    const wrap = document.getElementById('cms-detail-req-wrap');
    wrap.classList.toggle('hidden', req.length === 0);
    document.getElementById('cms-detail-req').innerHTML = req.map(x => `<li>${esc(x)}</li>`).join('');
    document.getElementById('cms-detail-hot').classList.toggle('hidden', !j.hot);
    document.getElementById('cms-detail-apply').onclick = () => window.nanshuoCmsApply(j.id);
    const m = document.getElementById('cms-job-detail');
    m.classList.remove('hidden');
    requestAnimationFrame(() => m.classList.remove('opacity-0'));
  };

  async function boot() {
    try {
      const [settingsRes, brandsRes, jobsRes] = await Promise.all([
        sb.from('site_settings').select('*').eq('id', 1).maybeSingle(),
        sb.from('brands').select('*').eq('active', true).order('sort_order'),
        sb.from('jobs').select('*').eq('active', true).order('sort_order')
      ]);
      if (settingsRes.error) throw settingsRes.error;
      const s = settingsRes.data;
      const features = s?.features || {};
      if (features.hero === true) updateHero(s.hero || {});
      if (features.about === true) updateAbout(s.about || {});
      if (features.brands === true && brandsRes.data) renderBrands(brandsRes.data);
      if (features.jobs === true && jobsRes.data) renderJobs(jobsRes.data);
      console.info('[Nanshuo CMS] Loaded', features);
    } catch (e) {
      console.warn('[Nanshuo CMS] Không tải được CMS, giữ nguyên index.html:', e?.message || e);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
}
