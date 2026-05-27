// ---- STATE ----
let currentMode = "wallpaper";
let currentStyle = "";
let currentFilter = "all";
let currentRatio = "16:9";
let currentQuality = "hd";
let seedLocked = false;
let history = JSON.parse(localStorage.getItem('novaForgeHistory')) || [];

const RES = {
    "16:9:hd": [1920, 1080], "16:9:4k": [3840, 2160],
    "4:3:hd": [1440, 1080], "4:3:4k": [2880, 2160],
    "1:1:hd": [1024, 1024], "1:1:4k": [2048, 2048],
    "9:16:hd": [1080, 1920], "9:16:4k": [2160, 3840],
    "21:9:hd": [2560, 1080], "21:9:4k": [3440, 1440]
};

// ---- CORE LOGIC ----
async function translateToEnglish(text) {
    try {
        const response = await fetch(`https://text.pollinations.ai/Translate to English: ${encodeURIComponent(text)}`);
        return await response.text();
    } catch (e) { return text; }
}

function getDimensions() {
    const key = currentMode === "logo" ? `1:1:${currentQuality}` : `${currentRatio}:${currentQuality}`;
    return RES[key] || [1920, 1080];
}

// ---- CHAT & GENERATION ENGINE ----
async function runGeneration(prompt, isChat = false) {
    const [w, h] = getDimensions();
    const neg = document.getElementById("negative-input")?.value || "";
    const seed = document.getElementById("seed-input")?.value || Math.floor(Math.random() * 999999);
    
    // Перевод и подготовка промпта
    const engPrompt = await translateToEnglish(prompt);
    const finalPrompt = `${engPrompt}${currentStyle ? ', ' + currentStyle : ''}`;
    
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=${w}&height=${h}&seed=${seed}&nologo=true`;
    
    if (isChat) {
        chatMessages.innerHTML += `<div class="msg bot"><img src="${url}" style="width:100%; border-radius:12px; margin-top:10px;"></div>`;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
        const img = document.getElementById("result-img");
        img.src = url;
        img.style.display = "block";
        document.getElementById("result-box").style.display = "block";
    }
    
    addToHistory({ url, prompt, mode: currentMode, res: `${w}×${h}`, style: currentStyle });
}

// ---- UI & NAVIGATION ----
function showPage(name) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("page-" + name).classList.add("active");
    document.querySelector(`.nav-btn[data-page="${name}"]`).classList.add("active");
}

// ---- CHAT HANDLER ----
const chatMessages = document.getElementById('chat-messages');
document.getElementById('send-chat-btn').onclick = async () => {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    chatMessages.innerHTML += `<div class="msg user">${text}</div>`;
    input.value = '';
    
    if (text.toLowerCase().includes('нарисуй') || text.toLowerCase().includes('создай')) {
        chatMessages.innerHTML += `<div class="msg bot">Генерирую...</div>`;
        await runGeneration(text, true);
    } else {
        const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(text)}`);
        const reply = await res.text();
        chatMessages.innerHTML += `<div class="msg bot">${reply}</div>`;
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
};

// ---- HISTORY & STORAGE ----
function addToHistory(item) {
    history.unshift(item);
    localStorage.setItem('novaForgeHistory', JSON.stringify(history));
    updateNavCount();
    renderGallery();
}

function updateNavCount() {
    const el = document.getElementById("nav-count");
    if(el) {
        el.textContent = history.length;
        el.style.display = history.length > 0 ? "inline" : "none";
    }
}

function renderGallery() {
    const grid = document.getElementById("gallery-grid-full");
    if(!grid) return;
    grid.innerHTML = history.map(item => `
        <div class="gallery-item">
            <img src="${item.url}" loading="lazy">
        </div>
    `).join('');
}

// --- INITIALIZERS (События для всех кнопок) ---
document.querySelectorAll(".nav-btn").forEach(b => b.onclick = () => showPage(b.dataset.page));
document.getElementById("generate-btn").onclick = () => runGeneration(document.getElementById("prompt-input").value);

// Seed randomizer
document.getElementById("seed-random-btn").onclick = () => {
    document.getElementById("seed-input").value = Math.floor(Math.random() * 999999);
};

// Style selection
document.querySelectorAll(".chip").forEach(c => {
    c.onclick = () => {
        document.querySelectorAll(".chip").forEach(el => el.classList.remove("active"));
        c.classList.add("active");
        currentStyle = c.dataset.style;
    };
});
