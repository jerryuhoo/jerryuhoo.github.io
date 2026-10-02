/* Runs in <head> so the first paint already matches the saved/local-time theme. */
(() => {
    'use strict';
    const KEY = 'appearance';
    const choices = ['auto', 'light', 'dark'];
    const root = document.documentElement;
    const controls = [];
    let timer = null;
    let preference = 'auto';
    const normalize = value => choices.includes(value) ? value : 'auto';
    try { preference = normalize(localStorage.getItem(KEY)); } catch { /* Automatic mode still works without storage. */ }

    function effectiveTheme(date = new Date()) {
        if (preference !== 'auto') return preference;
        const hour = date.getHours();
        return hour >= 18 || hour < 7 ? 'dark' : 'light';
    }
    function applyTheme() {
        const theme = effectiveTheme();
        const changed = root.dataset.theme !== theme || root.dataset.themePreference !== preference;
        root.dataset.theme = theme;
        root.dataset.themePreference = preference;
        root.style.colorScheme = theme;
        document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
            meta.content = theme === 'dark' ? '#11161d' : '#f3f2ee';
        });
        controls.forEach(control => control.update());
        if (changed) window.dispatchEvent(new CustomEvent('site-theme-change', { detail: { theme, preference } }));
    }
    function schedule() {
        if (timer !== null) clearTimeout(timer);
        timer = null;
        if (preference !== 'auto' || document.hidden) return;
        const now = new Date();
        // Recheck at the next local minute, including clock/time-zone changes.
        timer = setTimeout(() => {
            timer = null;
            applyTheme();
            schedule();
        }, 60000 - now.getSeconds() * 1000 - now.getMilliseconds() + 15);
    }
    function refresh() { applyTheme(); schedule(); }
    function choose(value) {
        preference = normalize(value);
        try { localStorage.setItem(KEY, preference); } catch { /* Keep the selected mode in memory. */ }
        refresh();
    }
    applyTheme();
    schedule();

    const icons = {
        auto: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17Z" fill="currentColor" stroke="none"/>',
        light: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
        dark: '<path d="M20.5 14.4A8.8 8.8 0 0 1 9.6 3.5a8.8 8.8 0 1 0 10.9 10.9Z"/>'
    };
    const icon = name => `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
    const words = () => document.documentElement.lang.startsWith('zh') ? {
        title: '外观', auto: '自动', light: '浅色', dark: '深色', current: '当前', schedule: '自动：当地时间 18:00–07:00 使用深色。'
    } : {
        title: 'Appearance', auto: 'Auto', light: 'Light', dark: 'Dark', current: 'currently', schedule: 'Auto: dark from 18:00 to 07:00, in your local time.'
    };
    function mountControls() {
        document.querySelectorAll('[data-theme-control]').forEach((mount, index) => {
            if (mount.querySelector('.theme-control')) return;
            const control = document.createElement('div');
            control.className = 'theme-control';
            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'theme-trigger';
            trigger.setAttribute('aria-haspopup', 'dialog');
            trigger.setAttribute('aria-expanded', 'false');
            trigger.innerHTML = '<span class="theme-icon"></span><span class="theme-label"></span><span class="theme-chevron" aria-hidden="true">⌄</span>';
            const panel = document.createElement('div');
            panel.className = 'theme-panel';
            panel.id = `theme-panel-${index}`;
            panel.hidden = true;
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-labelledby', `theme-panel-title-${index}`);
            trigger.setAttribute('aria-controls', panel.id);
            const title = document.createElement('p');
            title.className = 'theme-panel-title';
            title.id = `theme-panel-title-${index}`;
            const options = document.createElement('div');
            options.className = 'theme-options';
            options.setAttribute('role', 'group');
            const buttons = choices.map(choice => {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.themeChoice = choice;
                button.innerHTML = `${icon(choice)}<span></span>`;
                button.addEventListener('click', () => { choose(choice); close(true); });
                options.append(button);
                return button;
            });
            const note = document.createElement('p');
            note.className = 'theme-schedule';
            panel.append(title, options, note);
            control.append(trigger, panel);
            mount.append(control);
            function close(restoreFocus = false) {
                if (panel.hidden) return;
                panel.hidden = true;
                trigger.setAttribute('aria-expanded', 'false');
                if (restoreFocus) trigger.focus();
            }
            function update() {
                const text = words();
                trigger.querySelector('.theme-icon').innerHTML = icon(preference);
                trigger.querySelector('.theme-label').textContent = text[preference];
                trigger.setAttribute('aria-label', `${text.title}: ${text[preference]}, ${text.current} ${text[root.dataset.theme]}`);
                trigger.title = `${text.title}: ${text[preference]}`;
                title.textContent = text.title;
                options.setAttribute('aria-label', text.title);
                buttons.forEach((button, i) => {
                    button.querySelector('span').textContent = text[choices[i]];
                    button.setAttribute('aria-pressed', String(choices[i] === preference));
                });
                note.textContent = text.schedule;
            }
            trigger.addEventListener('click', () => {
                if (!panel.hidden) return close(true);
                controls.forEach(item => item.close());
                panel.hidden = false;
                trigger.setAttribute('aria-expanded', 'true');
                buttons[choices.indexOf(preference)].focus();
            });
            control.addEventListener('keydown', event => {
                if (event.key === 'Escape' && !panel.hidden) {
                    event.preventDefault();
                    event.stopPropagation();
                    close(true);
                }
            });
            document.addEventListener('pointerdown', event => { if (!control.contains(event.target)) close(); });
            document.addEventListener('focusin', event => { if (!control.contains(event.target)) close(); });
            controls.push({ update, close });
            update();
        });
        new MutationObserver(() => controls.forEach(control => control.update())).observe(root, { attributes: true, attributeFilter: ['lang'] });
        refresh();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountControls, { once: true });
    else mountControls();
    window.addEventListener('storage', event => {
        if (event.key !== KEY && event.key !== null) return;
        preference = normalize(event.newValue);
        refresh();
    });
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    window.addEventListener('pagehide', () => { if (timer !== null) clearTimeout(timer); timer = null; });
})();
