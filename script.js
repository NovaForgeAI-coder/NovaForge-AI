// ---- STATE ----
let currentMode = "wallpaper";
let currentStyle = "";
let currentFilter = "all";
let currentRatio = "16:9";
let currentQuality = "hd";
let seedLocked = false;
const history = [];

// Resolution map [width, height] keyed by "ratio:quality"
const RES = {
    "16:9:hd":  [1920, 1080],
    "16:9:4k":  [3840, 2160],
    "4:3:hd":   [1440, 1080],
    "4:3:4k":   [2880, 2160],
    "1:1:hd":   [1024, 1024],
    "1:1:4k":   [2048, 2048],
    "9:16:hd":  [1080, 1920],
    "9:16:4k":  [2160, 3840],
    "21:9:hd":  [2560, 1080],
    "21:9:4k":  [3440, 1440],
};

// Logo always uses 1:1
function getDimensions() {
    const key = currentMode === "logo"
        ? `1:1:${currentQuality}`
        : `${currentRatio}:${currentQuality}`;
    return RES[key] || [1920, 1080];
}

// ---- TOAST ----
function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("visible");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove("visible"), 2800);
}

// ---- PAGE NAVIGATION ----
function showPage(name) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("page-" + name).classList.add("active");
    document.querySelector(`.nav-btn[data-page="${name}"]`).classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
}
document.querySelectorAll(".nav-btn").forEach(btn =>
    btn.addEventListener("click", () => showPage(btn.dataset.page))
);
window.showPage = showPage;

// ---- MODE TABS ----
document.querySelectorAll(".tabs button").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".tabs button").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentMode = tab.dataset.mode;
        updateQualityLabels();
    });
});

// ---- STYLE CHIPS ----
document.querySelectorAll("#style-chips .chip").forEach(chip => {
    chip.addEventListener("click", () => {
        document.querySelectorAll("#style-chips .chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        currentStyle = chip.dataset.style;
    });
});

// ---- ASPECT RATIO CHIPS ----
document.querySelectorAll("#ratio-chips .chip").forEach(chip => {
    chip.addEventListener("click", () => {
        document.querySelectorAll("#ratio-chips .chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        currentRatio = chip.dataset.ratio;
        updateQualityLabels();
    });
});

// ---- QUALITY BUTTONS ----
function updateQualityLabels() {
    document.querySelectorAll(".quality-btn").forEach(btn => {
        const q = btn.dataset.quality;
        const [w, h] = getDimensionsFor(q);
        btn.querySelector(".q-label").textContent = `${w} × ${h}`;
    });
}
function getDimensionsFor(quality) {
    const ratio = currentMode === "logo" ? "1:1" : currentRatio;
    return RES[`${ratio}:${quality}`] || [1920, 1080];
}

document.querySelectorAll(".quality-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".quality-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentQuality = btn.dataset.quality;
    });
});
updateQualityLabels();

// ---- ADVANCED PANEL ----
const advancedToggle = document.getElementById("advanced-toggle");
const advancedPanel = document.getElementById("advanced-panel");
const toggleArrow = document.getElementById("toggle-arrow");

advancedToggle.addEventListener("click", () => {
    const open = advancedPanel.style.display === "block";
    advancedPanel.style.display = open ? "none" : "block";
    toggleArrow.textContent = open ? "▾" : "▴";
});

// ---- SEED CONTROLS ----
const seedInput = document.getElementById("seed-input");
const seedRandomBtn = document.getElementById("seed-random-btn");
const seedLockBtn = document.getElementById("seed-lock-btn");

seedRandomBtn.addEventListener("click", () => {
    seedInput.value = Math.floor(Math.random() * 999999);
});
seedLockBtn.addEventListener("click", () => {
    seedLocked = !seedLocked;
    seedLockBtn.textContent = seedLocked ? "🔒" : "🔓";
    seedLockBtn.title = seedLocked ? "Seed locked — click to unlock" : "Lock seed";
    seedInput.disabled = false;
    if (seedLocked && !seedInput.value) {
        seedInput.value = Math.floor(Math.random() * 999999);
    }
});

function getSeed() {
    if (seedLocked && seedInput.value) return parseInt(seedInput.value);
    const s = Math.floor(Math.random() * 999999);
    if (!seedLocked) seedInput.value = s;
    return s;
}

// ---- TEXT WARNING ----
const promptInput = document.getElementById("prompt-input");
const textWarning = document.getElementById("text-warning");
const namePattern = /\b[A-Z][a-z]{2,}\b/;
const textKeywords = /\b(text|write|says|named?|called|label|word|letter|title|caption|sign|banner)\b/i;

promptInput.addEventListener("input", () => {
    const val = promptInput.value;
    const show = textKeywords.test(val) || (namePattern.test(val) && val.length < 50);
    textWarning.style.display = show ? "block" : "none";
});

// ---- GENERATE ----
const generateBtn = document.getElementById("generate-btn");
const resultBox = document.getElementById("result-box");
const resultLoading = document.getElementById("result-loading");
const loadingLabel = document.getElementById("loading-label");
const resultImg = document.getElementById("result-img");
const resultActions = document.getElementById("result-actions");
const resultMeta = document.getElementById("result-meta");
const downloadBtn = document.getElementById("download-btn");
const copyBtn = document.getElementById("copy-btn");
const regenerateBtn = document.getElementById("regenerate-btn");
const metaRes = document.getElementById("meta-res");
const metaStyle = document.getElementById("meta-style");

function buildUrl(prompt) {
    const [width, height] = getDimensions();
    const seed = getSeed();
    const negative = document.getElementById("negative-input").value.trim();
    const styleTag = currentStyle ? `, ${currentStyle}` : "";
    const negTag = negative ? `. Avoid: ${negative}` : "";
    const fullPrompt = `${prompt}${styleTag}${negTag}`;
    const params = new URLSearchParams({
        width, height,
        model: "flux-pro",
        nologo: "true",
        enhance: "true",
        seed
    });
    return {
        url: `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?${params}`,
        width, height, seed
    };
}

function generate(prompt) {
    if (!prompt.trim()) { promptInput.focus(); return; }

    const { url, width, height } = buildUrl(prompt.trim());
    const styleLabel = document.querySelector("#style-chips .chip.active")?.textContent.trim() || "";

    resultBox.style.display = "block";
    resultLoading.style.display = "flex";
    resultImg.style.display = "none";
    resultActions.style.display = "none";
    resultMeta.style.display = "none";
    loadingLabel.textContent = `Generating ${width}×${height} image…`;
    generateBtn.textContent = "Generating…";
    generateBtn.disabled = true;

    resultImg.onload = () => {
        resultLoading.style.display = "none";
        resultImg.style.display = "block";
        resultMeta.style.display = "flex";
        resultActions.style.display = "flex";
        metaRes.textContent = `${width} × ${height}`;
        metaStyle.textContent = (styleLabel && styleLabel !== "None") ? styleLabel : "";
        metaStyle.style.display = (styleLabel && styleLabel !== "None") ? "inline" : "none";
        generateBtn.textContent = "✨ Generate";
        generateBtn.disabled = false;
        downloadBtn.href = url;
        resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
        addToHistory({ url, prompt: prompt.trim(), mode: currentMode, style: styleLabel !== "None" ? styleLabel : "", res: `${width}×${height}` });
    };

    resultImg.onerror = () => {
        resultLoading.style.display = "none";
        resultBox.style.display = "none";
        generateBtn.textContent = "✨ Generate";
        generateBtn.disabled = false;
        showToast("Generation failed — please try again.");
    };

    resultImg.src = url;
    regenerateBtn.onclick = () => generate(promptInput.value);
}

generateBtn.addEventListener("click", () => generate(promptInput.value));
promptInput.addEventListener("keydown", e => { if (e.key === "Enter") generate(promptInput.value); });

// Copy URL
copyBtn.addEventListener("click", () => {
    if (!resultImg.src) return;
    navigator.clipboard.writeText(resultImg.src).then(() => showToast("Image URL copied!"));
});

// ---- GALLERY ----
function updateNavCount() {
    const el = document.getElementById("nav-count");
    el.textContent = history.length;
    el.style.display = history.length > 0 ? "inline" : "none";
}

function renderGallery() {
    const grid = document.getElementById("gallery-grid-full");
    const empty = document.getElementById("gallery-empty");
    const items = currentFilter === "all" ? history : history.filter(h => h.mode === currentFilter);

    grid.innerHTML = "";
    empty.style.display = items.length === 0 ? "block" : "none";

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "gallery-item" + (item.mode === "logo" ? " logo-item" : "");
        div.innerHTML = `
            <img src="${item.url}" alt="${item.prompt}" loading="lazy">
            <div class="gallery-label">
                <span class="gallery-mode">${item.mode === "wallpaper" ? "🖼" : "✦"}</span>
                <span class="gallery-prompt">${item.prompt}</span>
                ${item.style ? `<span class="gallery-style-tag">${item.style}</span>` : ""}
                ${item.res ? `<span class="gallery-res-tag">${item.res}</span>` : ""}
            </div>
            <div class="gallery-actions">
                <a class="gal-btn" href="${item.url}" target="_blank" title="Download">⬇</a>
                <button class="gal-btn gal-copy" title="Copy URL" data-url="${item.url}">🔗</button>
            </div>
        `;
        div.querySelector("img").addEventListener("click", () => {
            showPage("generate");
            setTimeout(() => {
                resultImg.src = item.url;
                resultImg.style.display = "block";
                resultActions.style.display = "flex";
                resultMeta.style.display = "flex";
                metaRes.textContent = item.res || "";
                metaStyle.textContent = item.style || "";
                metaStyle.style.display = item.style ? "inline" : "none";
                resultLoading.style.display = "none";
                resultBox.style.display = "block";
                downloadBtn.href = item.url;
                resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
        });
        div.querySelector(".gal-copy").addEventListener("click", (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(e.currentTarget.dataset.url).then(() => showToast("Copied!"));
        });
        grid.appendChild(div);
    });
}

function addToHistory(item) {
    history.unshift(item);
    updateNavCount();
    renderGallery();
}

document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        renderGallery();
    });
});

renderGallery();

// ---- STYLES PAGE ----
document.querySelectorAll(".style-card-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const card = btn.closest(".style-card");
        const style = card.dataset.style;
        const example = card.dataset.example;
        document.querySelectorAll("#style-chips .chip").forEach(c => {
            c.classList.toggle("active", c.dataset.style === style);
        });
        currentStyle = style;
        promptInput.value = example;
        showPage("generate");
    });
});

// ===================== INTERACTIVE EFFECTS & ANIMATIONS =====================
document.addEventListener("mousemove", e => {
    document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
    document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
});

// ===================== AI CHAT SYSTEM =====================
const chatInput = document.getElementById("chat-input");
const chatSendBtn = document.getElementById("chat-send-btn");
const chatMessagesContainer = document.getElementById("chat-messages");
const clearChatBtn = document.getElementById("clear-chat-btn");

let chatHistory = [];

// Helper: Scroll chat to bottom
function scrollChatToBottom() {
    chatMessagesContainer.scrollTo({
        top: chatMessagesContainer.scrollHeight,
        behavior: "smooth"
    });
}

// Helper: Parse message text to basic HTML (bold, lists, code blocks, etc.)
function parseMarkdown(text) {
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    
    // Code blocks/backticks
    html = html.replace(/`(.*?)`/g, "<code>$1</code>");
    
    // Unordered lists
    if (html.includes("\n- ") || html.includes("\n* ")) {
        const lines = html.split("\n");
        let inList = false;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith("- ") || lines[i].startsWith("* ")) {
                let itemContent = lines[i].substring(2);
                if (!inList) {
                    lines[i] = "<ul><li>" + itemContent + "</li>";
                    inList = true;
                } else {
                    lines[i] = "<li>" + itemContent + "</li>";
                }
            } else {
                if (inList) {
                    lines[i] = "</ul>" + lines[i];
                    inList = false;
                }
            }
        }
        if (inList) {
            lines[lines.length - 1] += "</ul>";
        }
        html = lines.join("\n");
    }

    // Line breaks
    html = html.replace(/\n/g, "<br>");
    return html;
}

// Helper: Extract suggested prompt from message (inside backticks or quotes)
function extractSuggestedPrompt(text) {
    // Try backticks first
    const backtickMatch = text.match(/`(.*?)`/);
    if (backtickMatch && backtickMatch[1]) {
        return backtickMatch[1].trim();
    }
    // Try double quotes
    const quoteMatch = text.match(/"([^"]{10,250})"/);
    if (quoteMatch && quoteMatch[1]) {
        return quoteMatch[1].trim();
    }
    // Fallback: if message is short enough, return the whole thing
    if (text.length < 150 && !text.includes("\n")) {
        return text.trim();
    }
    return null;
}

// Render message in DOM
function appendChatMessage(sender, contentText) {
    const isAI = sender === "ai";
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${isAI ? 'ai-message' : 'user-message'}`;
    
    const parsedHTML = parseMarkdown(contentText);
    const suggestedPrompt = isAI ? extractSuggestedPrompt(contentText) : null;
    
    let bubbleContent = `<div class="message-bubble">${parsedHTML}`;
    
    // Add custom interaction buttons inside AI responses if a prompt is detected!
    if (isAI && suggestedPrompt) {
        bubbleContent += `
            <div class="chat-bubble-actions">
                <button class="chat-bubble-btn use-this-prompt" data-prompt="${suggestedPrompt.replace(/"/g, '&quot;')}">🚀 Use in Generator</button>
                <button class="chat-bubble-btn copy-suggested" data-prompt="${suggestedPrompt.replace(/"/g, '&quot;')}">📋 Copy Prompt</button>
            </div>
        `;
    }
    bubbleContent += `</div>`;
    
    msgDiv.innerHTML = `
        <div class="message-avatar">${isAI ? '🤖' : '👤'}</div>
        ${bubbleContent}
    `;
    
    chatMessagesContainer.appendChild(msgDiv);
    
    // Wire up events for custom action buttons inside bubble
    if (isAI && suggestedPrompt) {
        msgDiv.querySelector(".use-this-prompt")?.addEventListener("click", () => {
            promptInput.value = suggestedPrompt;
            showPage("generate");
            showToast("Prompt copied to generator! ✨");
        });
        msgDiv.querySelector(".copy-suggested")?.addEventListener("click", () => {
            navigator.clipboard.writeText(suggestedPrompt).then(() => {
                showToast("Prompt copied to clipboard!");
            });
        });
    }
    
    scrollChatToBottom();
}

// Show animated typing indicator
let typingIndicator = null;
function showTypingIndicator() {
    if (typingIndicator) return;
    
    typingIndicator = document.createElement("div");
    typingIndicator.className = "message ai-message";
    typingIndicator.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-bubble">
            <div class="typing-loader">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    chatMessagesContainer.appendChild(typingIndicator);
    scrollChatToBottom();
}

function removeTypingIndicator() {
    if (typingIndicator) {
        typingIndicator.remove();
        typingIndicator = null;
    }
}

// Send message function
async function sendChatMessage(text) {
    if (!text || !text.trim()) return;
    const msg = text.trim();
    chatInput.value = "";
    
    // Add user message to DOM and history
    appendChatMessage("user", msg);
    chatHistory.push({ role: "user", content: msg });
    
    // Limit history length to maintain fast response and save token cost (excellent credit efficiency)
    if (chatHistory.length > 12) {
        chatHistory = chatHistory.slice(-12);
    }
    
    showTypingIndicator();
    chatSendBtn.disabled = true;
    
    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ messages: chatHistory })
        });
        
        removeTypingIndicator();
        chatSendBtn.disabled = false;
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        
        const reply = data.response;
        appendChatMessage("ai", reply);
        chatHistory.push({ role: "assistant", content: reply });
        
    } catch (err) {
        console.error("Chat Error:", err);
        removeTypingIndicator();
        chatSendBtn.disabled = false;
        appendChatMessage("ai", "⚠️ Sorry, I encountered an issue connecting to the AI brain. Please try again in a moment.");
    }
}

// Send button events
chatSendBtn.addEventListener("click", () => sendChatMessage(chatInput.value));
chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter") sendChatMessage(chatInput.value);
});

// Quick suggestion buttons
document.querySelectorAll(".suggestion-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const text = btn.dataset.text;
        sendChatMessage(text);
    });
});

// Clear Chat History
clearChatBtn.addEventListener("click", () => {
    chatMessagesContainer.innerHTML = `
        <div class="message ai-message">
            <div class="message-avatar">🤖</div>
            <div class="message-bubble">
                <p>Hey there! I am <strong>Nova</strong>, your AI creative assistant. I'm connected to the generator systems and can help you:</p>
                <ul>
                  <li>💡 Design intricate, highly visual prompts for wallpapers &amp; logos</li>
                  <li>🎨 Suggest the perfect aesthetic styles (e.g. Neo-cyberpunk, oil painting, watercolor)</li>
                  <li>🚀 Enhance your descriptions for maximum image quality</li>
                </ul>
                <p>Try one of the quick suggestions below, or ask me anything!</p>
            </div>
        </div>
    `;
    chatHistory = [];
    showToast("Chat history cleared!");
});
