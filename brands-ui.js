(() => {
  'use strict';

  const STYLE_ID = 'nanshuo-brands-ui-style';
  const MAX_VISIBLE_STORES = 4;
  let enhancing = false;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* ===== NANSHUO BRANDS / STORES MODERN UI ===== */
      #brands .nanshuo-brand-grid {
        display: flex !important;
        flex-wrap: wrap !important;
        justify-content: center !important;
        align-items: stretch !important;
        gap: 24px !important;
      }

      #brands .nanshuo-brand-card {
        width: 100%;
        height: auto;
        border-radius: 24px !important;
        border: 1px solid #ece9e3 !important;
        background: #fff;
        box-shadow: 0 8px 24px rgba(17,24,39,.045) !important;
        overflow: hidden;
        transform: translateY(0);
        transition: transform .28s ease, box-shadow .28s ease, border-color .28s ease !important;
      }

      #brands .nanshuo-brand-card:hover {
        transform: translateY(-5px) !important;
        border-color: rgba(178,146,103,.38) !important;
        box-shadow: 0 20px 48px rgba(17,24,39,.10) !important;
      }

      #brands .nanshuo-brand-image {
        aspect-ratio: 4 / 3 !important;
        min-height: 0 !important;
        background: #f4f2ed !important;
      }

      #brands .nanshuo-brand-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      #brands .nanshuo-brand-body {
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-start !important;
        padding: 22px !important;
      }

      #brands .nanshuo-brand-body h3 {
        margin-bottom: 8px !important;
        font-size: 21px !important;
        line-height: 1.2 !important;
        letter-spacing: .055em !important;
      }

      #brands .nanshuo-brand-body > div:first-child > p {
        min-height: 44px;
        margin: 0 !important;
        font-size: 13px !important;
        line-height: 1.7 !important;
      }

      #brands .nanshuo-store-section {
        margin-top: 20px !important;
        padding-top: 17px !important;
        border-top: 1px solid #f0eee9 !important;
      }

      #brands .nanshuo-store-heading {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px;
        margin-bottom: 11px !important;
      }

      #brands .nanshuo-store-heading-label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: #9b794f;
        font-size: 10px;
        line-height: 1;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .09em;
      }

      #brands .nanshuo-store-count {
        flex: 0 0 auto;
        padding: 5px 8px;
        border-radius: 999px;
        background: #f7f4ef;
        color: #8c765e;
        font-size: 9px;
        font-weight: 800;
        white-space: nowrap;
      }

      #brands .nanshuo-store-list {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 7px !important;
      }

      #brands .nanshuo-store-link {
        width: 100% !important;
        min-width: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px !important;
        padding: 9px 11px !important;
        border: 1px solid #eeece7 !important;
        border-radius: 11px !important;
        background: #faf9f6 !important;
        color: #4b5563 !important;
        font-size: 10.5px !important;
        line-height: 1.35 !important;
        font-weight: 600 !important;
        text-align: left !important;
        text-decoration: none !important;
        transition: background .2s ease, color .2s ease, border-color .2s ease, transform .2s ease !important;
      }

      #brands .nanshuo-store-link:hover {
        background: #b29267 !important;
        border-color: #b29267 !important;
        color: #fff !important;
        transform: translateX(2px);
      }

      #brands .nanshuo-store-name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #brands .nanshuo-store-arrow {
        flex: 0 0 auto;
        opacity: .62;
        font-size: 8px;
      }

      #brands .nanshuo-store-extra[hidden] {
        display: none !important;
      }

      #brands .nanshuo-store-toggle {
        width: 100%;
        margin-top: 10px;
        padding: 9px 12px;
        border: 1px dashed #d8c9b5;
        border-radius: 11px;
        background: transparent;
        color: #96764e;
        font-size: 10px;
        font-weight: 800;
        cursor: pointer;
        transition: background .2s ease, border-color .2s ease;
      }

      #brands .nanshuo-store-toggle:hover {
        background: #fbf7f1;
        border-color: #b29267;
      }

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

      @media (min-width: 1536px) {
        #brands .nanshuo-brand-card {
          width: calc(20% - 19.2px);
        }
        #brands .nanshuo-brand-body {
          padding: 20px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function storeUrl(brand, store) {
    return `store.html?brand=${encodeURIComponent(String(brand || '').trim())}&store=${encodeURIComponent(String(store || '').trim())}`;
  }

  function getStoreContainer(card) {
    const candidates = [...card.querySelectorAll('div.flex.flex-wrap.gap-1')];
    return candidates.find(el => {
      const parentText = el.parentElement?.textContent || '';
      return /cửa hàng|门店/i.test(parentText);
    }) || candidates[candidates.length - 1] || null;
  }

  function makeStoreLink(brand, sourceEl) {
    if (sourceEl.matches('a.nanshuo-store-link')) return sourceEl;

    const store = sourceEl.textContent.replace(/\s+/g, ' ').trim();
    if (!store) return null;

    const link = document.createElement('a');
    link.href = sourceEl.tagName === 'A' && sourceEl.getAttribute('href')
      ? sourceEl.getAttribute('href')
      : storeUrl(brand, store);
    link.className = 'nanshuo-store-link';
    link.title = `Xem sản phẩm ${brand} tại ${store}`;

    const name = document.createElement('span');
    name.className = 'nanshuo-store-name';
    name.textContent = store;

    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-arrow-up-right-from-square nanshuo-store-arrow';
    icon.setAttribute('aria-hidden', 'true');

    link.append(name, icon);
    sourceEl.replaceWith(link);
    return link;
  }

  function enhanceCard(card) {
    if (!card || card.dataset.nanshuoBrandUi === '1') return;

    const brand = card.querySelector('h3')?.textContent?.replace(/\s+/g, ' ').trim();
    if (!brand) return;

    const imageWrap = card.firstElementChild;
    const body = imageWrap?.nextElementSibling;
    const storeList = getStoreContainer(card);
    if (!imageWrap || !body || !storeList) return;

    card.classList.add('nanshuo-brand-card');
    imageWrap.classList.add('nanshuo-brand-image');
    body.classList.add('nanshuo-brand-body');
    body.classList.remove('justify-between');

    const storeSection = storeList.parentElement;
    storeSection.classList.add('nanshuo-store-section');
    storeList.className = 'nanshuo-store-list';

    const rawStores = [...storeList.children];
    const links = rawStores.map(el => makeStoreLink(brand, el)).filter(Boolean);

    const oldLabel = storeSection.querySelector(':scope > span');
    if (oldLabel) {
      const heading = document.createElement('div');
      heading.className = 'nanshuo-store-heading';

      const label = document.createElement('span');
      label.className = 'nanshuo-store-heading-label';
      label.innerHTML = '<i class="fa-solid fa-location-dot"></i><span>Cửa hàng / 门店</span>';

      const count = document.createElement('span');
      count.className = 'nanshuo-store-count';
      count.textContent = `${links.length} cửa hàng`;

      heading.append(label, count);
      oldLabel.replaceWith(heading);
    }

    links.forEach((link, index) => {
      if (index >= MAX_VISIBLE_STORES) {
        link.classList.add('nanshuo-store-extra');
        link.hidden = true;
      }
    });

    if (links.length > MAX_VISIBLE_STORES) {
      const hiddenCount = links.length - MAX_VISIBLE_STORES;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nanshuo-store-toggle';
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = `<i class="fa-solid fa-plus mr-1"></i> Xem thêm ${hiddenCount} cửa hàng`;

      button.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') === 'true';
        card.querySelectorAll('.nanshuo-store-extra').forEach(el => {
          el.hidden = expanded;
        });
        button.setAttribute('aria-expanded', String(!expanded));
        button.innerHTML = expanded
          ? `<i class="fa-solid fa-plus mr-1"></i> Xem thêm ${hiddenCount} cửa hàng`
          : '<i class="fa-solid fa-chevron-up mr-1"></i> Thu gọn';
      });

      storeSection.appendChild(button);
    }

    card.dataset.nanshuoBrandUi = '1';
  }

  function enhanceBrands() {
    if (enhancing) return;
    enhancing = true;
    try {
      injectStyles();
      const section = document.getElementById('brands');
      if (!section) return;

      const grid = section.querySelector('.grid.grid-cols-1');
      if (grid) grid.classList.add('nanshuo-brand-grid');

      const cards = grid
        ? [...grid.children].filter(el => el.querySelector('h3'))
        : [...section.querySelectorAll('.group')];

      cards.forEach(enhanceCard);
    } finally {
      enhancing = false;
    }
  }

  function boot() {
    enhanceBrands();
    const section = document.getElementById('brands');
    if (!section) return;

    let timer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(enhanceBrands, 30);
    });
    observer.observe(section, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
