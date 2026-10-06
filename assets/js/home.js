(() => {
    'use strict';
    const english = {
        sidechainLink: 'Explore the Sidechain Pro low-end handoff plugin', sidechainAlt: 'Sidechain Pro waveform monitor and kick-to-bass timing controls', sidechainKind: 'Low-end handoff / Development preview', sidechainDescription: 'Let the kick tail become bass. Follow pitch and phase in real time, and shape the handoff and its duration in a clear waveform workspace.',
        skip: 'Skip to content', navigation: 'Main navigation', navWork: 'Selected work', navMusic: 'Music', navAbout: 'About', navContact: 'Let’s talk', menuOpen: 'Open menu', menuClose: 'Close menu',
        heroEyebrow: 'YIFENG YU / BLUE WINGS', heroStatement: 'Creating where sound and code meet.', heroDescription: 'Music producer. Independent developer.<br>Making immersive sound and tools for creative freedom.', exploreWork: 'Explore my work', listenMusic: 'Listen to my music',
        artDescription: 'A cobalt sound sculpture that gently responds to your pointer', artNote: 'A different shape of sound', artModes: 'Sound sculpture modes', modeSpatial: 'Spatial', modeWave: 'Wave', modeDrive: 'Drive', pauseMotion: 'Pause animation', resumeMotion: 'Resume animation', scrollExplore: 'Scroll to explore',
        openSourceTitle: 'Open tools. Creative freedom.', openSourceDescription: 'I’m making all of my software free and open source. Future payments will be voluntary tips, with no paid feature tiers. Tipping is not available yet.',
        workTitle: 'Tools for <span class="serif accent">the way we hear.</span>', workIntro: 'Every tool starts with a real creative challenge.<br>From shaping sound to finding a better flow.',
        fireLink: 'Explore the Fire multi-effects sound design plugin', fireAlt: 'Fire Vintage interface with the Band Lab and Warm Triode sound-shaping module', fireKind: 'Sound design / Open source', fireDescription: 'Give sound its own character. Explore texture, movement and space with distortion, phaser, chorus, reverb, lo-fi and granular processing.', viewProject: 'Explore project',
        atmosLink: 'Explore the Atmos Check audio inspection tool', atmosAlt: 'Atmos Check master and stems inspection interface', atmosKind: 'Spatial audio / Workflow', atmosDescription: 'Stay focused on the mix. Compare masters and stems, analyze audio differences and inspect ADM metadata for a clearer review before delivery.',
        hubLink: 'Explore the PluginHub audio plugin manager', hubAlt: 'PluginHub organizing audio plugins by vendor and format', hubKind: 'Plugin management / Workflow', hubDescription: 'Make room for inspiration. Scan, find and manage audio plugins in one place, bringing a little order to an ever-growing collection.', githubExplore: 'More code and experiments on GitHub',
        musicTitle: 'Beyond the code, <span class="serif">there is sound.</span>', albumLink: 'Listen to NIGHTMARE EP on Apple Music', albumAlt: 'NIGHTMARE EP album artwork', albumDescription: 'Step into the dream. Explore the edges of sound.<br>An immersive journey through electronic music and Dolby Atmos.', albumListen: 'Experience on Apple Music', listenElsewhere: 'FIND ME ON YOUR FAVORITE PLATFORM', netease: 'NetEase Music', qqMusic: 'QQ Music',
        portraitAlt: 'Blue Wings artist image: a hooded figure with dark blue wings', aboutTitle: 'Feeling the world through music.<br>Following curiosity through code.', aboutIntro: 'Hi, I’m Yifeng Yu. I make music as Blue Wings (羽翼深蓝).', aboutBody: 'I work between music production and software development. I’m drawn to the possibilities of electronic music and the sense of presence in spatial audio. The challenges I meet while creating often become the starting point for my next tool.', aboutClosing: 'From a melody to a line of code, I care about the same thing: making an imagined experience real.', disciplineMusic: 'Electronic music', disciplineAudio: 'Spatial audio', disciplineDev: 'Audio software',
        contactTitle: 'Let’s make <span class="serif">something resonate.</span>', contactDescription: 'Music, tools, or that idea you can’t stop thinking about.', copyEmail: 'Copy email address', copied: 'Email address copied.', copyFailed: 'Could not copy. Select the email address to copy it.', footerNote: 'Made with curiosity. Refined with care.', backTop: 'Back to top ↑'
    };
    const syncPreviews = () => document.querySelectorAll('[data-theme-preview]').forEach(img => {
        img.src = document.documentElement.dataset.theme === 'dark' ? img.dataset.darkSrc : img.dataset.lightSrc;
    });
    syncPreviews();
    window.addEventListener('site-theme-change', syncPreviews);
    const chinese = {};
    document.querySelectorAll('[data-i18n]').forEach(element => { chinese[element.dataset.i18n] = element.innerHTML; });
    document.querySelectorAll('[data-i18n-label]').forEach(element => { chinese[element.dataset.i18nLabel] = element.getAttribute('aria-label'); });
    document.querySelectorAll('[data-i18n-alt]').forEach(element => { chinese[element.dataset.i18nAlt] = element.alt; });
    Object.assign(chinese, { menuClose: '关闭菜单', resumeMotion: '播放动画', copied: '邮箱地址已复制。', copyFailed: '暂时无法复制，请选中邮箱地址手动复制。' });
    const copy = { zh: chinese, en: english };
    let language = 'zh';
    const menuButton = document.querySelector('.menu-toggle');
    const navigation = document.querySelector('#main-nav');
    const motionButton = document.querySelector('#motion-toggle');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let motionPaused = reducedMotion.matches;
    const updateMotionButton = () => {
        motionButton.setAttribute('aria-pressed', String(motionPaused));
        motionButton.setAttribute('aria-label', copy[language][motionPaused ? 'resumeMotion' : 'pauseMotion']);
    };
    const setMenu = (open, restoreFocus = false) => {
        navigation.classList.toggle('is-open', open);
        menuButton.setAttribute('aria-expanded', String(open));
        menuButton.setAttribute('aria-label', copy[language][open ? 'menuClose' : 'menuOpen']);
        if (restoreFocus) menuButton.focus();
    };
    const setLanguage = lang => {
        language = lang === 'en' ? 'en' : 'zh';
        document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
        document.title = language === 'en' ? 'Blue Wings — Between Sound & Code' : '羽翼深蓝 Blue Wings — 声音与代码之间';
        document.querySelector('meta[name="description"]').content = language === 'en' ? 'Yifeng Yu / Blue Wings. Electronic music, spatial audio, and independent audio tools: Fire, Atmos Check, PluginHub and Sidechain Pro.' : '羽翼深蓝（Yifeng Yu / Blue Wings）的个人作品集。探索电子音乐、空间音频，以及 Fire、Atmos Check、PluginHub 和 Sidechain Pro 音频工具。';
        document.querySelectorAll('[data-i18n]').forEach(element => { if (copy[language][element.dataset.i18n]) element.innerHTML = copy[language][element.dataset.i18n]; });
        document.querySelectorAll('[data-i18n-label]').forEach(element => { if (copy[language][element.dataset.i18nLabel]) element.setAttribute('aria-label', copy[language][element.dataset.i18nLabel]); });
        document.querySelectorAll('[data-i18n-alt]').forEach(element => { if (copy[language][element.dataset.i18nAlt]) element.alt = copy[language][element.dataset.i18nAlt]; });
        document.querySelectorAll('[data-language]').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.language === language)); });
        document.querySelector('.wordmark').setAttribute('aria-label', language === 'en' ? 'Blue Wings · Home' : 'Blue Wings · 首页');
        document.querySelector('#copy-status').textContent = '';
        setMenu(menuButton.getAttribute('aria-expanded') === 'true');
        updateMotionButton();
        try { localStorage.setItem('language', language); } catch { /* The page also works when storage is unavailable. */ }
    };
    let savedLanguage;
    try { savedLanguage = localStorage.getItem('language'); } catch { /* Keep the Chinese default. */ }
    setLanguage(savedLanguage);
    document.querySelectorAll('[data-language]').forEach(button => { button.addEventListener('click', () => setLanguage(button.dataset.language)); });
    menuButton.addEventListener('click', () => {
        const opening = menuButton.getAttribute('aria-expanded') !== 'true';
        setMenu(opening);
        if (opening) navigation.querySelector('a').focus();
    });
    navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false, true); });
    document.addEventListener('click', event => { if (!event.target.closest('.site-header')) setMenu(false); });
    document.addEventListener('focusin', event => { if (!event.target.closest('.site-header')) setMenu(false); });
    window.matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

    const modes = { spatial: 'SPATIAL FIELD', wave: 'WAVE FORM', drive: 'HARMONIC DRIVE' };
    document.querySelectorAll('[data-sound-mode]').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('[data-sound-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
            document.querySelector('#art-caption').textContent = modes[button.dataset.soundMode];
        });
    });
    const sendMotionState = () => {
        updateMotionButton();
        window.dispatchEvent(new CustomEvent('sound-motion-change', { detail: { paused: motionPaused } }));
    };
    motionButton.addEventListener('click', () => { motionPaused = !motionPaused; sendMotionState(); });
    reducedMotion.addEventListener('change', event => { motionPaused = event.matches; sendMotionState(); });

    let copyTimer;
    document.querySelector('#copy-email').addEventListener('click', async () => {
        const status = document.querySelector('#copy-status');
        clearTimeout(copyTimer);
        try {
            await navigator.clipboard.writeText('yuyishenlanmusic@gmail.com');
            status.textContent = copy[language].copied;
        } catch { status.textContent = copy[language].copyFailed; }
        copyTimer = setTimeout(() => { status.textContent = ''; }, 5500);
    });
    const albumImage = document.querySelector('.album-art img');
    const showAlbumFallback = () => {
        albumImage.classList.add('is-missing');
        albumImage.setAttribute('aria-hidden', 'true');
    };
    albumImage.addEventListener('error', showAlbumFallback);
    if (albumImage.complete && !albumImage.naturalWidth) showAlbumFallback();
    document.querySelector('#year').textContent = new Date().getFullYear();

    // Native links remain useful even if scripts or browser APIs are unavailable.
    if ('IntersectionObserver' in window) {
        const sections = [...document.querySelectorAll('main > section[id]')];
        const visibleSections = new Set();
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => entry.isIntersecting ? visibleSections.add(entry.target) : visibleSections.delete(entry.target));
            const active = sections.find(section => visibleSections.has(section));
            navigation.querySelectorAll('a').forEach(link => {
                if (active && link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location');
                else link.removeAttribute('aria-current');
            });
        }, { rootMargin: '-20% 0px -45% 0px', threshold: 0 });
        sections.forEach(section => observer.observe(section));
    }
})();
