/* Shared bilingual navigation and an accessible, manually controlled screenshot gallery. */
(() => {
    'use strict';
    const textNodes = [...document.querySelectorAll('[data-en]')];
    const labelNodes = [...document.querySelectorAll('[data-en-label]')];
    const imageNodes = [...document.querySelectorAll('[data-en-alt]')];
    const chinese = new Map(textNodes.map(element => [element, element.tagName === 'META' ? element.content : element.innerHTML]));
    const labels = new Map(labelNodes.map(element => [element, element.getAttribute('aria-label')]));
    const alternatives = new Map(imageNodes.map(element => [element, element.alt]));
    const originalTitle = document.title;
    let language = 'zh';
    let activeGallery = null;
    const dialog = document.createElement('dialog');
    dialog.className = 'image-dialog';
    dialog.setAttribute('aria-labelledby', 'image-dialog-title');
    dialog.innerHTML = '<div class="dialog-header"><span id="image-dialog-title"></span><button class="dialog-close" type="button" autofocus>×</button></div><img class="dialog-image" alt=""><p class="dialog-caption"></p>';
    document.body.append(dialog);
    const dialogImage = dialog.querySelector('img');
    const dialogCaption = dialog.querySelector('.dialog-caption');
    const closeButton = dialog.querySelector('.dialog-close');

    function syncDialog() {
        const english = language === 'en';
        dialog.querySelector('#image-dialog-title').textContent = english ? 'INTERFACE / FULL VIEW' : '界面 / 大图预览';
        closeButton.setAttribute('aria-label', english ? 'Close image preview' : '关闭大图预览');
        if (!activeGallery) return;
        const slide = activeGallery.slides[activeGallery.index];
        const image = slide.querySelector('img');
        dialogImage.src = image.currentSrc || image.src;
        dialogImage.alt = image.alt;
        dialogCaption.textContent = slide.querySelector('figcaption')?.textContent || image.alt;
    }
    closeButton.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        const bounds = dialog.getBoundingClientRect();
        if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });

    function setLanguage(value) {
        language = value === 'en' ? 'en' : 'zh';
        const english = language === 'en';
        document.documentElement.lang = english ? 'en' : 'zh-CN';
        document.title = english ? (document.body.dataset.titleEn || originalTitle) : originalTitle;
        textNodes.forEach(element => {
            const content = english ? element.dataset.en : chinese.get(element);
            if (element.tagName === 'META') element.content = content;
            else element.innerHTML = content;
        });
        labelNodes.forEach(element => element.setAttribute('aria-label', english ? element.dataset.enLabel : labels.get(element)));
        imageNodes.forEach(element => { element.alt = english ? element.dataset.enAlt : alternatives.get(element); });
        document.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
        syncDialog();
        try { localStorage.setItem('language', language); } catch { /* Storage can be unavailable in private contexts. */ }
    }

    document.querySelectorAll('.product-gallery').forEach(element => {
        const slides = [...element.querySelectorAll('.gallery-slide')];
        const buttons = [...element.querySelectorAll('[data-slide]')];
        const count = element.querySelector('.gallery-count');
        const stage = element.querySelector('.gallery-stage');
        if (!slides.length || !stage) return;
        const gallery = { element, slides, index: 0 };
        function select(index) {
            gallery.index = (index + slides.length) % slides.length;
            slides.forEach((slide, position) => { slide.hidden = position !== gallery.index; });
            buttons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.slide) === gallery.index)));
            if (count) count.textContent = `${String(gallery.index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
            if (dialog.open && activeGallery === gallery) syncDialog();
        }
        buttons.forEach(button => button.addEventListener('click', () => select(Number(button.dataset.slide))));
        element.querySelector('[data-gallery-prev]')?.addEventListener('click', () => select(gallery.index - 1));
        element.querySelector('[data-gallery-next]')?.addEventListener('click', () => select(gallery.index + 1));
        element.addEventListener('keydown', event => {
            if (event.altKey || event.ctrlKey || event.metaKey) return;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                select(gallery.index + (event.key === 'ArrowRight' ? 1 : -1));
                if (event.target.matches('[data-slide]')) buttons.find(button => Number(button.dataset.slide) === gallery.index)?.focus();
            }
        });
        const expandButton = element.querySelector('[data-gallery-expand]');
        if (expandButton && typeof dialog.showModal === 'function') {
            expandButton.addEventListener('click', () => {
                activeGallery = gallery;
                syncDialog();
                dialog.showModal();
            });
        } else if (expandButton) expandButton.hidden = true;
        select(0);
        const toolbar = element.querySelector('.gallery-toolbar');
        if (toolbar) toolbar.hidden = false;
        element.classList.add('is-ready');
    });
    let saved;
    try { saved = localStorage.getItem('language'); } catch { /* Chinese is the default. */ }
    setLanguage(saved);
    document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.language)));
    document.querySelectorAll('#year, [data-year]').forEach(element => { element.textContent = new Date().getFullYear(); });
})();
