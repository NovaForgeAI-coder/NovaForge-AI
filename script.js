/**
 * NovaForge AI v2.0 - FULL PRODUCTION ENGINE
 */

const App = {
    state: {
        mode: 'wallpaper',
        style: '',
        ratio: '16:9',
        quality: 'hd',
        history: JSON.parse(localStorage.getItem('novaForgeHistory')) || [],
        chatContext: []
    },

    // --- КОНФИГУРАЦИЯ ---
    RES: {
        "16:9": { hd: [1920, 1080], "4k": [3840, 2160] },
        "4:3":  { hd: [1440, 1080], "4k": [2880, 2160] },
        "1:1":  { hd: [1024, 1024], "4k": [2048, 2048] },
        "9:16": { hd: [1080, 1920], "4k": [2160, 3840] },
        "21:9": { hd: [2560, 1080], "4k": [3440, 1440] }
    },

    // --- API LAYER ---
    API: {
        translate: async (text) => {
            try {
                const res = await fetch(`https://text.pollinations.ai/Translate to English: ${encodeURIComponent(text)}`);
                return await res.text();
            } catch { return text; }
        },
        generateImage: (prompt, w, h, seed) => {
            return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true`;
        }
    },

    // --- UI LAYER ---
    UI: {
        renderGallery: () => {
            const grid = document.getElementById('gallery-grid-full');
            if (grid) {
                grid.innerHTML = App.state.history.map(item => `
                    <div class="gallery-item"><img src="${item.url}" loading="lazy"></div>
                `).join('');
            }
        },
        updateCount: () => {
            const el = document.getElementById('nav-count');
            if (el) { el.textContent = App.state.history.length; el.style.display = App.state.history.length > 0 ? "inline" : "none"; }
        }
    },

    // --- ГЕНЕРАЦИЯ (С учетом старых функций) ---
    async generate() {
        const prompt = document.getElementById('prompt-input').value;
        const neg = document.getElementById('negative-input')?.value || "";
        const seed = document.getElementById('seed-input')?.value || Math.floor(Math.random() * 999999);
        const [w, h] = App.RES[App.state.ratio][App.state.quality];

        const eng = await App.API.translate(prompt + (neg ? " excluding: " + neg : ""));
        const url = App.API.generateImage(eng + ', ' + App.state.style, w, h, seed);

        const img = document.getElementById('result-img');
        img.src = url;
        img.style.display = 'block';
        document.getElementById('result-box').style.display = 'block';
        
        App.saveToHistory(url, prompt, App.state.mode);
    },

    saveToHistory(url, prompt, mode) {
        App.state.history.unshift({ url, prompt, mode });
        localStorage.setItem('novaForgeHistory', JSON.stringify(App.state.history));
        App.UI.renderGallery();
        App.UI.updateCount();
    }
};

// --- ИНИЦИАЛИЗАЦИЯ ВСЕХ СТАРЫХ КНОПОК ---
document.addEventListener('DOMContentLoaded', () => {
    // Стиль
    document.querySelectorAll(".chip").forEach(c => c.onclick = (e) => {
        document.querySelectorAll(".chip").forEach(el => el.classList.remove("active"));
        e.target.classList.add("active");
        App.state.style = e.target.dataset.style;
    });

    // Формат (Ratio)
    document.querySelectorAll("[data-ratio]").forEach(b => b.onclick = (e) => {
        App.state.ratio = e.target.dataset.ratio;
        // ... (добавить смену классов active)
    });

    // Запуск
    document.getElementById('generate-btn').onclick = App.generate;
    document.getElementById('send-chat-btn').onclick = App.handleChat;
    
    App.UI.renderGallery();
    App.UI.updateCount();
});
