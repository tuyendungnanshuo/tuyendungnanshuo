(() => {
  'use strict';

  const STYLE_ID = 'nanshuo-brands-premium-ui';
  // Public directory additions and corrections, also applied after CMS renders.
  const STORE_ADDITIONS = {
    yanbaby: ['Malibu Walk', 'Vincom Hạ Long', 'Aeon Hạ Long', 'Vincom Vinh', 'Vincom Hà Tĩnh'],
    mermaid: ['Vincom Trần Duy Hưng', 'Malibu Walk', 'Vincom Imperia Hải Phòng']
  };
  const locationKey = value => String(value).normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase()
    .replace(/^(yanbaby|mermaid|gek|sanhe)\s+/, '')
    .replace(/vincom plaza/g, 'vincom').replace(/\s+/g, ' ').trim();

  // Keep Vietnamese identifiers for store URLs and geographic grouping.
  const STORE_NAMES_ZH = {
  "malibu walk": "Malibu Walk 商业街",
  "vincom ha long": "下龙 Vincom 购物中心",
  "aeon ha long": "下龙永旺购物中心",
  "vincom vinh": "荣市 Vincom 购物中心",
  "vincom ha tinh": "河静 Vincom 购物中心",
  "vincom tran duy hung": "陈维兴 Vincom 购物中心",
  "vincom imperia hai phong": "海防 Imperia Vincom 购物中心",
  "vincom ocean park 1": "Vincom Ocean Park 1 购物中心",
  "vincom times city": "Vincom Times City 购物中心",
  "times city": "Times City 购物中心",
  "vincom royal city": "Vincom Royal City 购物中心",
  "vincom pham ngoc thach": "范玉石 Vincom 购物中心",
  "go! thang long": "GO! 升龙购物中心",
  "vinhome ocean park 2": "Vinhomes Ocean Park 2 都市区",
  "vinhomes ocean park 2": "Vinhomes Ocean Park 2 都市区",
  "vincom bac ninh": "北宁 Vincom 购物中心",
  "134-136 le hoan, thanh hoa": "清化市黎桓街134–136号",
  "vinhome smart city": "Vinhomes Smart City 都市区",
  "vinhomes smart city": "Vinhomes Smart City 都市区",
  "vincom viet tri": "越池 Vincom 购物中心"
};

  function updateDirectory(brand, list) {
    const brandKey = brand.toLowerCase();
    const seen = new Set();
    [...list.children].forEach(el => {
      let key = locationKey(el.textContent);
      if (brandKey === 'sanhe' && key === 'vincom tran duy hung') {
        el.remove();
        return;
      }
      if (brandKey === 'gek' && /^(vinhome|vinhomes) ocean park 1$/.test(key)) {
        el.textContent = 'Vincom Ocean Park 1';
        if (el.tagName === 'A') el.setAttribute('href', storeUrl(brand, el.textContent));
        key = locationKey(el.textContent);
      }
      if (seen.has(key)) el.remove();
      else seen.add(key);
    });
    (STORE_ADDITIONS[brandKey] || []).forEach(store => {
      if (seen.has(locationKey(store))) return;
      const el = document.createElement('span');
      el.textContent = store;
      list.appendChild(el);
      seen.add(locationKey(store));
    });
  }

  function groupStores(list, links) {
    const groups = [
      { vi: 'Hà Nội', zh: '河内', links: [] },
      { vi: 'Các tỉnh/thành khác', zh: '其他省市', links: [] }
    ];
    links.forEach(link => {
      const key = locationKey(link.dataset.storeName || link.textContent);
      const outside = /ha long|hai phong|ha tinh|\bvinh\b|bac ninh|thanh hoa|viet tri|ocean park 2/.test(key);
      groups[outside ? 1 : 0].links.push(link);
    });
    list.replaceChildren();
    groups.forEach(group => {
      if (!group.links.length) return;
      const section = document.createElement('section');
      section.className = 'nanshuo-store-region';
      const heading = document.createElement('h4');
      heading.className = 'nanshuo-store-region-title';
      const vi = document.createElement('span');
      vi.className = 'lang-vi';
      vi.textContent = group.vi;
      const zh = document.createElement('span');
      zh.className = 'lang-zh';
      zh.textContent = group.zh;
      heading.append(vi, zh);
      section.append(heading, ...group.links);
      list.appendChild(section);
    });
  }
  let enhancing = false;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* =========================================================
         NANSHUO PREMIUM FASHION BRAND CARDS
         ========================================================= */

      #brands .nanshuo-brand-grid {
        display: flex !important;
        flex-wrap: wrap !important;
        justify-content: center !important;
        align-items: stretch !important;
        gap: 24px !important;
      }

      #brands .nanshuo-brand-card {
        width: 100%;
        display: flex !important;
        flex-direction: column !important;
        background: #fff !important;
        border: 1px solid #ebe7df !important;
        border-radius: 26px !important;
        overflow: hidden !important;
        box-shadow: 0 7px 24px rgba(17, 24, 39, .045) !important;
        transform: translateY(0) !important;
        transition:
          transform .32s cubic-bezier(.22,.61,.36,1),
          box-shadow .32s ease,
          border-color .32s ease !important;
      }

      #brands .nanshuo-brand-card:hover {
        transform: translateY(-6px) !important;
        border-color: rgba(178, 146, 103, .38) !important;
        box-shadow: 0 24px 55px rgba(17, 24, 39, .11) !important;
      }

      #brands .nanshuo-brand-image {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 11 !important;
        min-height: 0 !important;
        overflow: hidden !important;
        background: #f3f1ec !important;
      }

      #brands .nanshuo-brand-image::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(
          to bottom,
          rgba(17,24,39,0) 60%,
          rgba(17,24,39,.08) 100%
        );
        pointer-events: none;
      }

      #brands .nanshuo-brand-image img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        transform: scale(1);
        transition: transform .7s cubic-bezier(.22,.61,.36,1) !important;
      }

      #brands .nanshuo-brand-card:hover .nanshuo-brand-image img {
        transform: scale(1.035) !important;
      }

      #brands .nanshuo-brand-body {
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-start !important;
        flex: 1 1 auto !important;
        padding: 22px 22px 20px !important;
      }

      #brands .nanshuo-brand-copy {
        min-height: 95px;
      }

      #brands .nanshuo-brand-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }

      #brands .nanshuo-brand-title-row h3 {
        margin: 0 !important;
        min-width: 0;
        color: #111827 !important;
        font-size: 21px !important;
        line-height: 1.15 !important;
        font-weight: 700 !important;
        letter-spacing: .055em !important;
        text-align: left !important;
      }

      #brands .nanshuo-brand-count {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 6px 9px;
        border: 1px solid #eee7dd;
        border-radius: 999px;
        background: #fbf9f5;
        color: #8f714b;
        font-size: 9px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: .02em;
        white-space: nowrap;
      }

      #brands .nanshuo-brand-description {
        margin: 0 !important;
        color: #7b8190 !important;
        font-size: 12.5px !important;
        line-height: 1.75 !important;
        font-weight: 400 !important;
        text-align: left !important;
      }

      #brands .nanshuo-store-section {
        margin-top: 18px !important;
        padding-top: 16px !important;
        border-top: 1px solid #f0ede7 !important;
      }

      #brands .nanshuo-store-heading {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px;
        margin-bottom: 10px !important;
      }

      #brands .nanshuo-store-heading-label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: #a07d51;
        font-size: 9.5px;
        line-height: 1;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .11em;
      }

      #brands .nanshuo-store-heading-line {
        flex: 1 1 auto;
        height: 1px;
        background: #f0ede7;
      }

      #brands .nanshuo-store-list {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 5px !important;
      }

      #brands .nanshuo-store-region + .nanshuo-store-region { margin-top: 14px; }
      #brands .nanshuo-store-region-title {
        margin: 0 0 5px;
        padding: 8px 10px;
        background: #f7f3ed;
        border-radius: 6px;
        color: #8f714b;
        font-size: 11px;
        font-weight: 700;
      }
      #brands .nanshuo-store-link {
        width: 100% !important;
        min-width: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px !important;
        padding: 8px 3px !important;
        border: 0 !important;
        border-bottom: 1px solid #f3f0eb !important;
        border-radius: 0 !important;
        background: transparent !important;
        color: #555d6c !important;
        font-size: 10.5px !important;
        line-height: 1.35 !important;
        font-weight: 600 !important;
        text-align: left !important;
        text-decoration: none !important;
        transition: color .2s ease, padding-left .2s ease !important;
      }

      #brands .nanshuo-store-link:last-child {
        border-bottom-color: transparent !important;
      }

      #brands .nanshuo-store-link:hover {
        color: #9b794f !important;
        padding-left: 6px !important;
      }

      #brands .nanshuo-store-link-left {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      #brands .nanshuo-store-dot {
        width: 6px;
        height: 6px;
        flex: 0 0 auto;
        border-radius: 999px;
        background: #d9c4a8;
        transition: background .2s ease, transform .2s ease;
      }

      #brands .nanshuo-store-link:hover .nanshuo-store-dot {
        background: #b29267;
        transform: scale(1.2);
      }

      #brands .nanshuo-store-name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: normal;
      }

      #brands .nanshuo-store-arrow {
        flex: 0 0 auto;
        color: #b8b1a8;
        font-size: 8px;
        transition: color .2s ease, transform .2s ease;
      }

      #brands .nanshuo-store-link:hover .nanshuo-store-arrow {
        color: #b29267;
        transform: translate(2px, -2px);
      }

      #brands .nanshuo-store-extra[hidden] {
        display: none !important;
      }

      #brands .nanshuo-store-toggle {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        margin-top: 11px;
        padding: 9px 12px;
        border: 1px solid #e6ded2;
        border-radius: 999px;
        background: #fff;
        color: #94734d;
        font-size: 9.5px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: .02em;
        cursor: pointer;
        transition:
          background .2s ease,
          border-color .2s ease,
          color .2s ease;
      }

      #brands .nanshuo-store-toggle:hover {
        background: #faf6f0;
        border-color: #cdb491;
        color: #7f613f;
      }

      /* Responsive */
      @media (min-width: 640px) {
        #brands .nanshuo-brand-card {
          width: calc(50% - 12px);
        }
      }

      @media (min-width: 1024px) {
        #brands .nanshuo-brand-card {
          width: calc(33.3333% - 16px);
        }
      }

      @media (min-width: 1440px) {
        #brands .nanshuo-brand-card {
          width: calc(20% - 19.2px);
        }

        #brands .nanshuo-brand-body {
          padding: 20px 19px 18px !important;
        }

        #brands .nanshuo-brand-title-row h3 {
          font-size: 19px !important;
        }

        #brands .nanshuo-brand-description {
          font-size: 12px !important;
        }

        #brands .nanshuo-brand-count {
          padding: 5px 7px;
          font-size: 8.5px;
        }
      }

      @media (max-width: 639px) {
        #brands .nanshuo-brand-copy {
          min-height: 0;
        }

        #brands .nanshuo-brand-image {
          aspect-ratio: 16 / 10 !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function storeUrl(brand, store) {
    return `store.html?v=20260926-logo2&brand=${encodeURIComponent(String(brand || '').trim())}&store=${encodeURIComponent(String(store || '').trim())}`;
  }

  function getStoreContainer(card) {
    const candidates = [...card.querySelectorAll('div.flex.flex-wrap.gap-1, .nanshuo-store-list')];

    return candidates.find(el => {
      const text = el.parentElement?.textContent || '';
      return /cửa hàng|门店/i.test(text);
    }) || candidates[candidates.length - 1] || null;
  }

  function getBrandCopy(body) {
    return [...body.children].find(el => el.querySelector?.('h3')) || body.firstElementChild;
  }

  function makeStoreLink(brand, sourceEl) {
    if (sourceEl.matches('a.nanshuo-store-link')) return sourceEl;

    const store = sourceEl.textContent.replace(/\s+/g, ' ').trim();
    if (!store) return null;

    const link = document.createElement('a');
    link.href =
      sourceEl.tagName === 'A' && sourceEl.getAttribute('href')
        ? sourceEl.getAttribute('href')
        : storeUrl(brand, store);

    const destination = new URL(link.href, document.baseURI);
    if (destination.origin === location.origin && destination.pathname.endsWith('/store.html')) {
      destination.searchParams.set('v', '20260926-logo2');
      link.href = destination.href;
    }
    link.className = 'nanshuo-store-link';
    link.dataset.storeName = store;
    const storeZh = STORE_NAMES_ZH[locationKey(store)] || store;
    link.title = `${brand} — ${store} / ${storeZh}`;

    const left = document.createElement('span');
    left.className = 'nanshuo-store-link-left';

    const dot = document.createElement('span');
    dot.className = 'nanshuo-store-dot';
    dot.setAttribute('aria-hidden', 'true');

    const name = document.createElement('span');
    name.className = 'nanshuo-store-name';
    const nameVi = document.createElement('span');
    nameVi.className = 'lang-vi';
    nameVi.textContent = store;
    const nameZh = document.createElement('span');
    nameZh.className = 'lang-zh';
    nameZh.textContent = storeZh;
    name.append(nameVi, nameZh);

    const arrow = document.createElement('i');
    arrow.className = 'fa-solid fa-arrow-up-right-from-square nanshuo-store-arrow';
    arrow.setAttribute('aria-hidden', 'true');

    left.append(dot, name);
    link.append(left, arrow);

    sourceEl.replaceWith(link);
    return link;
  }

  function buildTitleRow(copy, storeCount) {
    const h3 = copy.querySelector('h3');
    if (!h3 || h3.closest('.nanshuo-brand-title-row')) return;

    const row = document.createElement('div');
    row.className = 'nanshuo-brand-title-row';

    const count = document.createElement('span');
    count.className = 'nanshuo-brand-count';
    count.innerHTML = `<i class="fa-solid fa-location-dot"></i><span>${storeCount}</span>`;

    h3.replaceWith(row);
    row.append(h3, count);
  }

  function normalizeDescription(copy) {
    const p = copy.querySelector('p');
    if (!p) return;
    p.classList.add('nanshuo-brand-description');
  }

  function enhanceCard(card) {
    if (!card || card.dataset.nanshuoPremiumUi === '1') return;

    const h3 = card.querySelector('h3');
    const brand = h3?.textContent?.replace(/\s+/g, ' ').trim();
    if (!brand) return;

    const imageWrap = card.firstElementChild;
    const body = imageWrap?.nextElementSibling;
    const storeList = getStoreContainer(card);

    if (!imageWrap || !body || !storeList) return;

    updateDirectory(brand, storeList);
    const rawStoreElements = [...storeList.children];
    const storeCount = rawStoreElements.length;

    card.classList.add('nanshuo-brand-card');
    imageWrap.classList.add('nanshuo-brand-image');
    body.classList.add('nanshuo-brand-body');
    body.classList.remove('justify-between');

    const copy = getBrandCopy(body);
    if (copy) {
      copy.classList.add('nanshuo-brand-copy');
      buildTitleRow(copy, storeCount);
      normalizeDescription(copy);
    }

    const storeSection = storeList.parentElement;
    storeSection.classList.add('nanshuo-store-section');
    storeList.className = 'nanshuo-store-list';

    const links = rawStoreElements
      .map(el => makeStoreLink(brand, el))
      .filter(Boolean);

    const oldLabel = [...storeSection.children].find(el =>
      el.tagName === 'SPAN' && /cửa hàng|门店/i.test(el.textContent || '')
    );

    if (oldLabel) {
      const heading = document.createElement('div');
      heading.className = 'nanshuo-store-heading';

      const label = document.createElement('span');
      label.className = 'nanshuo-store-heading-label';
      label.innerHTML = '<i class="fa-solid fa-location-dot"></i><span>Cửa hàng / 门店</span>';

      const line = document.createElement('span');
      line.className = 'nanshuo-store-heading-line';

      heading.append(label, line);
      oldLabel.replaceWith(heading);
    }

    groupStores(storeList, links);

    card.dataset.nanshuoPremiumUi = '1';
  }

  function enhanceBrands() {
    if (enhancing) return;
    enhancing = true;

    try {
      injectStyles();

      const section = document.getElementById('brands');
      if (!section) return;

      const grid = section.querySelector('.grid.grid-cols-1, .nanshuo-brand-grid');
      if (!grid) return;

      grid.classList.add('nanshuo-brand-grid');

      [...grid.children]
        .filter(el => el.querySelector('h3'))
        .forEach(enhanceCard);

    } finally {
      enhancing = false;
    }
  }

  function boot() {
    enhanceBrands();

    const section = document.getElementById('brands');
    if (!section) return;

    let timer;

    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(enhanceBrands, 40);
    });

    observer.observe(section, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
