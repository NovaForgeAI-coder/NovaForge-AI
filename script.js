// ---- STATE ----
let currentMode = "wallpaper";
let currentStyle = "";
let currentFilter = "all";
let currentRatio = "16:9";
let currentQuality = "hd";
let seedLocked = false;
let history = JSON.parse(localStorage.getItem('novaForgeHistory')) || [];

// ---- INITIALIZATION ----
window.onload = () => {
    updateNavCount();
    renderGallery();
};

// ---- UTILS ----
async function translateToEnglish(text) {
    try {
        const res = await fetch(`https://text.pollinations.ai/Translate to English: ${encodeURIComponent(text)}`);
        return await res.text();
    } catch (e) { return text; }
}

function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 2800);
}

// ---- NAVIGATION ----
function showPage(name) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("page-" + name).classList.add("active");
    document.querySelector(`.nav-btn[data-page="${name}"]`).classList.add("active");
}
document.querySelectorAll(".nav-btn").forEach(btn => btn.addEventListener("click", () => showPage(btn.dataset.page)));

// ---- CHAT LOGIC ----
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');

async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    chatMessages.innerHTML += `<div class="msg user">${text}</div>`;
    chatInput.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Логика: если просят нарисовать
    if (text.toLowerCase().includes('нарисуй') || text.toLowerCase().includes('создай')) {
        chatMessages.innerHTML += `<div class="msg bot">Генерирую...</div>`;
        const engPrompt = await translateToEnglish(text);
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(engPrompt)}?width=1024&height=1024&seed=${Math.random()}`;
        chatMessages.innerHTML += `<div class="msg bot"><img src="${url}" style="width:100%; border-radius:10px;"></div>`;
        addToHistory({ url, prompt: text, mode: 'wallpaper', style: '', res: '1024x1024' });
    } else {
        // Просто общение
        const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(text)}`);
        const reply = await res.text();
        chatMessages.innerHTML += `<div class="msg bot">${reply}</div>`;
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
sendChatBtn.addEventListener('click', sendChatMessage);

// ---- GENERATION LOGIC ----
async function generate(prompt) {
    if (!prompt.trim()) return;
    
    // Перевод на лету
    const engPrompt = await translateToEnglish(prompt);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(engPrompt)}?width=1024&height=1024`;
    
    document.getElementById("result-box").style.display = "block";
    document.getElementById("result-img").src = url;
    document.getElementById("result-img").style.display = "block";
    
    addToHistory({ url, prompt, mode: currentMode, style: currentStyle, res: '1024x1024' });
}
document.getElementById("generate-btn").addEventListener("click", () => generate(document.getElementById("prompt-input").value));

// ---- GALLERY LOGIC ----
function addToHistory(item) {
    history.unshift(item);
    localStorage.setItem('novaForgeHistory', JSON.stringify(history));
    updateNavCount();
    renderGallery();
}

function updateNavCount() {
    const el = document.getElementById("nav-count");
    el.textContent = history.length;
    el.style.display = history.length > 0 ? "inline" : "none";
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
