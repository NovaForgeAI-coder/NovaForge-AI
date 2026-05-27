/**
 * NovaForge AI — Bug-fixed & Enhanced
 */

const App = {
    state: {
        mode: 'wallpaper',
        style: '',
        ratio: '16:9',
        quality: 'hd',
        history: (() => { try { return JSON.parse(localStorage.getItem('novaForgeHistory') || '[]'); } catch { return []; } })(),
        chatContext: [],
        seedLocked: false,
        currentSeed: null,
        currentUrl: null,
        filter: 'all',
        creditsUsed: parseInt(localStorage.getItem('novaForgeCredits') || '0', 10)
    },

    // Reduced HD resolutions to keep API usage efficient (cheap)
    RES: {
        "16:9": { hd: [1280, 720],   "4k": [2560, 1440] },
        "4:3":  { hd: [1024, 768],   "4k": [2048, 1536] },
        "1:1":  { hd: [1024, 1024],  "4k": [2048, 2048] },
        "9:16": { hd: [720, 1280],   "4k": [1440, 2560] },
        "21:9": { hd: [1920, 823],   "4k": [2560, 1097] }
    },

    STYLES: [
        { name: 'Photorealistic', emoji: '📷', style: 'photorealistic, 8k, sharp focus, professional photography' },
        { name: 'Cinematic',      emoji: '🎬', style: 'cinematic, dramatic lighting, anamorphic lens, film grain' },
        { name: 'Anime',          emoji: '🌸', style: 'anime style, vibrant colors, cel shading, studio ghibli' },
        { name: 'Neon',           emoji: '⚡', style: 'neon lights, cyberpunk, synthwave, glowing outlines, dark' },
        { name: 'Oil Painting',   emoji: '🎨', style: 'oil painting, brushstrokes, classical art, rich texture' },
        { name: 'Watercolor',     emoji: '💧', style: 'watercolor, soft washes, dreamy, artistic, pastel tones' },
        { name: 'Minimalist',     emoji: '◻',  style: 'minimalist, clean lines, geometric, white space, simple' },
        { name: 'Fantasy',        emoji: '✨', style: 'fantasy art, magical, ethereal glow, concept art, detailed' }
    ],

    API: {
        // Skip translate call if text is already ASCII (saves an API round-trip)
        isLatin: (text) => /^[\x00-\x7F]+$/.test(text),

        translate: async (text) => {
            if (App.API.isLatin(text)) return text;
            try {
                const res = await fetch(
                    `https://text.pollinations.ai/${encodeURIComponent('Translate to English, reply with translation only: ' + text)}`
                );
                const out = await res.text();
                return out.trim() || text;
            } catch {
                return text;
            }
        },

        generateImage: (prompt, w, h, seed) => {
            const p = new URLSearchParams({ width: w, height: h, seed, nologo: 'true' });
            return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${p}`;
        }
    },

    UI: {
        toast(msg, type = 'info') {
            const el = document.getElementById('toast');
            el.textContent = msg;
            el.className = `toast toast-${type} show`;
            clearTimeout(App._toastTimer);
            App._toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
        },

        renderGallery() {
            const grid  = document.getElementById('gallery-grid-full');
            const empty = document.getElementById('gallery-empty');
            if (!grid) return;

            const items = App.state.filter === 'all'
                ? App.state.history
                : App.state.history.filter(i => i.mode === App.state.filter);

            if (items.length === 0) {
                grid.innerHTML = '';
                empty.style.display = 'flex';
            } else {
                empty.style.display = 'none';
                grid.innerHTML = items.map(item => `
                    <div class="gallery-item">
                        <img src="${item.url}" loading="lazy" alt="">
                        <div class="gallery-overlay">
                            <p class="gallery-prompt">${item.prompt}</p>
                            <div class="gallery-actions">
                                <a class="gallery-btn" href="${item.url}" target="_blank" download title="Download">⬇</a>
                                <button class="gallery-btn" onclick="App.copyUrl('${item.url}')" title="Copy URL">🔗</button>
                            </div>
                        </div>
                        <span class="gallery-badge">${item.mode === 'logo' ? '✦ Logo' : '🖼 Wallpaper'}</span>
                    </div>
                `).join('');
            }
        },

        updateCount() {
            const el = document.getElementById('nav-count');
            if (!el) return;
            el.textContent = App.state.history.length;
            el.style.display = App.state.history.length > 0 ? 'inline' : 'none';
        },

        updateCredits() {
            const el = document.getElementById('credits-display');
            if (el) el.textContent = `${App.state.creditsUsed} generated`;
        },

        renderStylesGrid() {
            const grid = document.getElementById('styles-grid');
            if (!grid) return;
            grid.innerHTML = App.STYLES.map(s => `
                <div class="style-card" onclick="App.applyStyle('${s.style.replace(/'/g,"\\'")}','${s.name}')">
                    <div class="style-card-emoji">${s.emoji}</div>
                    <div class="style-card-name">${s.name}</div>
                    <div class="style-card-desc">${s.style.split(',').slice(0, 3).join(', ')}</div>
                </div>
            `).join('');
        }
    },

    applyStyle(style, name) {
        App.state.style = style;
        showPage('generate');
        document.querySelectorAll('#style-chips .chip').forEach(c =>
            c.classList.toggle('active', c.dataset.style === style)
        );
        App.UI.toast(`Style "${name}" applied — ready to generate!`, 'success');
    },

    copyUrl(url) {
        const target = url || App.state.currentUrl || '';
        if (!target) { App.UI.toast('No image URL to copy', 'error'); return; }
        navigator.clipboard.writeText(target)
            .then(() => App.UI.toast('URL copied!', 'success'))
            .catch(() => App.UI.toast('Copy failed', 'error'));
    },

    async generate() {
        const promptVal = document.getElementById('prompt-input').value.trim();
        if (!promptVal) {
            App.UI.toast('Enter a prompt first', 'error');
            document.getElementById('prompt-input').focus();
            return;
        }

        const neg    = document.getElementById('negative-input')?.value?.trim() || '';
        const seedEl = document.getElementById('seed-input');
        const seed   = (App.state.seedLocked && seedEl?.value)
            ? parseInt(seedEl.value, 10)
            : Math.floor(Math.random() * 999999);
        if (seedEl && !App.state.seedLocked) seedEl.value = seed;
        App.state.currentSeed = seed;

        const [w, h]    = App.RES[App.state.ratio][App.state.quality];
        const resultBox = document.getElementById('result-box');
        const loading   = document.getElementById('result-loading');
        const img       = document.getElementById('result-img');
        const actions   = document.getElementById('result-actions');
        const meta      = document.getElementById('result-meta');
        const btn       = document.getElementById('generate-btn');

        resultBox.style.display = 'block';
        loading.style.display   = 'flex';
        img.style.display       = 'none';
        actions.style.display   = 'none';
        meta.style.display      = 'none';
        btn.disabled = true;
        btn.textContent = '⏳ Generating...';

        try {
            document.getElementById('loading-label').textContent = App.API.isLatin(promptVal)
                ? 'Building prompt...'
                : 'Translating prompt...';

            const negPart    = neg ? `, avoid: ${neg}` : '';
            const translated = await App.API.translate(promptVal + negPart);
            const stylePart  = App.state.style ? `, ${App.state.style}` : '';
            const fullPrompt = translated + stylePart;

            document.getElementById('loading-label').textContent = 'Generating image...';
            const url = App.API.generateImage(fullPrompt, w, h, seed);
            App.state.currentUrl = url;

            await new Promise((resolve, reject) => {
                const tmp = new Image();
                tmp.onload  = resolve;
                tmp.onerror = reject;
                tmp.src     = url;
            });

            img.src               = url;
            img.style.display     = 'block';
            loading.style.display = 'none';
            actions.style.display = 'flex';
            meta.style.display    = 'flex';

            document.getElementById('download-btn').href      = url;
            document.getElementById('meta-res').textContent   = `${w} × ${h}`;
            document.getElementById('meta-style').textContent = App.state.style
                ? App.state.style.split(',')[0].trim()
                : 'Default';

            App.state.creditsUsed++;
            localStorage.setItem('novaForgeCredits', App.state.creditsUsed);
            App.UI.updateCredits();
            App.saveToHistory(url, promptVal, App.state.mode);
            App.UI.toast('Image ready!', 'success');
        } catch {
            loading.style.display   = 'none';
            resultBox.style.display = 'none';
            App.UI.toast('Generation failed — please try again', 'error');
        } finally {
            btn.disabled    = false;
            btn.textContent = '✨ Generate';
        }
    },

    saveToHistory(url, prompt, mode) {
        App.state.history.unshift({ url, prompt, mode, ts: Date.now() });
        App.state.history = App.state.history.slice(0, 50); // cap to avoid localStorage bloat
        localStorage.setItem('novaForgeHistory', JSON.stringify(App.state.history));
        App.UI.renderGallery();
        App.UI.updateCount();
    },

    async handleChat() {
        const input = document.getElementById('chat-input');
        const text  = input.value.trim();
        if (!text) return;

        input.value    = '';
        input.disabled = true;

        const msgs = document.getElementById('chat-messages');

        const addMsg = (cls, html) => {
            const div = document.createElement('div');
            div.className = `msg ${cls}`;
            div.innerHTML = html;
            msgs.appendChild(div);
            msgs.scrollTop = msgs.scrollHeight;
            return div;
        };

        addMsg('user', text);
        const typingEl = addMsg('bot typing', '<span class="dot"></span><span class="dot"></span><span class="dot"></span>');

        const isImageReq = /нарисуй|создай изображ|сгенерируй|draw|generate image|make.*image|create.*image/i.test(text);

        try {
            if (isImageReq) {
                const translated = await App.API.translate(text);
                const seed = Math.floor(Math.random() * 999999);
                const url  = App.API.generateImage(translated, 512, 512, seed);

                await new Promise((res, rej) => {
                    const t = new Image(); t.onload = res; t.onerror = rej; t.src = url;
                });

                typingEl.className = 'msg bot';
                typingEl.innerHTML = `<img src="${url}" style="max-width:100%;border-radius:10px;margin-top:4px" loading="lazy">`;

                App.state.creditsUsed++;
                localStorage.setItem('novaForgeCredits', App.state.creditsUsed);
                App.UI.updateCredits();
                App.saveToHistory(url, text, 'chat');
            } else {
                const res   = await fetch(`https://text.pollinations.ai/${encodeURIComponent(text)}`);
                const reply = await res.text();
                typingEl.className = 'msg bot';
                typingEl.textContent = reply.trim() || '...';
            }
        } catch {
            typingEl.className = 'msg bot';
            typingEl.textContent = 'Connection error. Please try again.';
        }

        input.disabled = false;
        input.focus();
    }
};

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${id}`)?.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.page === id)
    );
    if (id === 'gallery') App.UI.renderGallery();
    if (id === 'styles')  App.UI.renderStylesGrid();
}

document.addEventListener('DOMContentLoaded', () => {

    // Nav
    document.querySelectorAll('.nav-btn').forEach(b =>
        b.addEventListener('click', () => showPage(b.dataset.page))
    );

    // Mode tabs
    document.querySelectorAll('.tabs button').forEach(b =>
        b.addEventListener('click', () => {
            document.querySelectorAll('.tabs button').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            App.state.mode = b.dataset.mode;
            // Re-check text warning on mode switch
            const promptEl = document.getElementById('prompt-input');
            const warnEl   = document.getElementById('text-warning');
            if (warnEl && promptEl) {
                const hasText = App.state.mode === 'logo' &&
                    /\b(name|text|word|letter|brand|title|label|write)\b/i.test(promptEl.value);
                warnEl.style.display = hasText ? 'block' : 'none';
            }
        })
    );

    // Style chips (scoped to #style-chips to avoid colliding with ratio chips)
    document.querySelectorAll('#style-chips .chip').forEach(c =>
        c.addEventListener('click', () => {
            document.querySelectorAll('#style-chips .chip').forEach(x => x.classList.remove('active'));
            c.classList.add('active');
            App.state.style = c.dataset.style || '';
        })
    );

    // Ratio chips
    document.querySelectorAll('#ratio-chips .chip').forEach(c =>
        c.addEventListener('click', () => {
            document.querySelectorAll('#ratio-chips .chip').forEach(x => x.classList.remove('active'));
            c.classList.add('active');
            App.state.ratio = c.dataset.ratio;
        })
    );

    // Quality
    document.querySelectorAll('.quality-btn').forEach(b =>
        b.addEventListener('click', () => {
            document.querySelectorAll('.quality-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            App.state.quality = b.dataset.quality;
        })
    );

    // Advanced toggle
    document.getElementById('advanced-toggle')?.addEventListener('click', () => {
        const panel = document.getElementById('advanced-panel');
        const arrow = document.getElementById('toggle-arrow');
        const open  = panel.style.display !== 'block';
        panel.style.display = open ? 'block' : 'none';
        if (arrow) arrow.style.transform = open ? 'rotate(180deg)' : '';
    });

    // Seed random
    document.getElementById('seed-random-btn')?.addEventListener('click', () => {
        const el = document.getElementById('seed-input');
        if (el) el.value = Math.floor(Math.random() * 999999);
    });

    // Seed lock toggle
    document.getElementById('seed-lock-btn')?.addEventListener('click', function () {
        App.state.seedLocked = !App.state.seedLocked;
        this.textContent = App.state.seedLocked ? '🔒' : '🔓';
        this.title = App.state.seedLocked ? 'Seed locked' : 'Lock seed';
    });

    // Generate
    document.getElementById('generate-btn')?.addEventListener('click', () => App.generate());
    document.getElementById('prompt-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) App.generate();
    });

    // Copy & Regenerate
    document.getElementById('copy-btn')?.addEventListener('click', () => App.copyUrl());
    document.getElementById('regenerate-btn')?.addEventListener('click', () => App.generate());

    // Text warning for logo mode
    const promptEl = document.getElementById('prompt-input');
    const warnEl   = document.getElementById('text-warning');
    promptEl?.addEventListener('input', () => {
        const hasText = App.state.mode === 'logo' &&
            /\b(name|text|word|letter|brand|title|label|write)\b/i.test(promptEl.value);
        if (warnEl) warnEl.style.display = hasText ? 'block' : 'none';
    });

    // Chat
    document.getElementById('send-chat-btn')?.addEventListener('click', () => App.handleChat());
    document.getElementById('chat-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') App.handleChat();
    });

    // Gallery filter
    document.querySelectorAll('.filter-btn').forEach(b =>
        b.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            App.state.filter = b.dataset.filter;
            App.UI.renderGallery();
        })
    );

    // Init
    App.UI.renderGallery();
    App.UI.updateCount();
    App.UI.updateCredits();
});
