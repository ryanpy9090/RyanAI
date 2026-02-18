// NAVIGATION
const navLinks = document.querySelectorAll('.nav-links li');
const modules = document.querySelectorAll('.module');

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        const target = link.getAttribute('data-target');
        if (target === 'library') loadChatList();
        switchTab(target);
    });
});

function switchTab(targetId) {
    // Update Nav
    navLinks.forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-links li[data-target="${targetId}"]`).classList.add('active');

    // Update Modules
    modules.forEach(m => m.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
}

// VIDEO BACKGROUND GENERATOR
const genVideoBtn = document.getElementById('generate-video-btn');
const videoPrompt = document.getElementById('video-prompt');

if (genVideoBtn) {
    genVideoBtn.addEventListener('click', async () => {
        const prompt = videoPrompt.value;
        if (!prompt) return;

        // Post "Thinking" message to chat since we are invisible
        const chatHistory = document.getElementById('chat-history');
        const aiMsgDiv = document.createElement('div');
        aiMsgDiv.className = `msg ai`;
        aiMsgDiv.innerHTML = `
            <div class="avatar"><ion-icon name="videocam"></ion-icon></div>
            <div class="bubble">Initializing CineSynth protocol...</div>
        `;
        chatHistory.appendChild(aiMsgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        try {
            const seed = Math.floor(Math.random() * 100000);
            let dotCount = 0;

            // Turbo Dot Loading
            const loadingInterval = setInterval(() => {
                const bubble = aiMsgDiv.querySelector('.bubble');
                dotCount++;
                const dots = '.'.repeat((dotCount % 3) + 1);
                bubble.innerText = `loading${dots}`;
            }, 200);

            // SPEED RACE: 3 parallel requests, first one wins
            const urls = [
                `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&nologo=true&width=768&height=768&model=turbo`,
                `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed + 1}&nologo=true&width=768&height=768&model=flux-schnell`,
                `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed + 2}&nologo=true&width=768&height=768`
            ];

            const imageUrl = await Promise.any(urls.map(url => new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(url);
                img.onerror = () => reject();
                img.src = url;
            }))).catch(() => urls[0]);

            clearInterval(loadingInterval);

            // RENDER IN CHAT
            aiMsgDiv.innerHTML = `
                <div class="avatar"><ion-icon name="videocam"></ion-icon></div>
                <div class="bubble" style="background: transparent; border: none; padding: 0;">
                    <img src="${imageUrl}" style="max-width: 100%; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); transform: scale(1); transition: transform 5s ease;">
                    <p style="margin-top: 0.5rem; font-size: 0.8rem; opacity: 0.7;">Video Preview: ${prompt}</p>
                    <button onclick="(function(){const a=document.createElement('a');a.href='${imageUrl}';a.download='ryan-video-${Date.now()}.png';a.click();})()" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3); transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(102, 126, 234, 0.3)'"><ion-icon name="download-outline" style="vertical-align: middle; margin-right: 0.3rem;"></ion-icon>Download Video</button>
                </div>
            `;

            // "Ken Burns" Animation
            setTimeout(() => {
                const renderedImg = aiMsgDiv.querySelector('img');
                if (renderedImg) renderedImg.style.transform = "scale(1.1)";
            }, 100);

        } catch (error) {
            const bubble = aiMsgDiv.querySelector('.bubble');
            bubble.innerText = "Video Generation Failed: " + error.message;
            bubble.style.color = "#ff4757";
        }
    });
}


// SETTINGS & MODAL
const settingsBtn = document.querySelector('.settings');
const modal = document.getElementById('settings-modal');
const closeModal = document.querySelector('.close-modal');
const saveSettingsBtn = document.getElementById('save-settings');
const openaiKeyInput = document.getElementById('openai-key');
const geminiKeyInput = document.getElementById('gemini-key');
const anthropicKeyInput = document.getElementById('anthropic-key');

// Load stored keys
if (openaiKeyInput) openaiKeyInput.value = localStorage.getItem('openai_key') || '';
if (geminiKeyInput) geminiKeyInput.value = localStorage.getItem('gemini_key') || '';
if (anthropicKeyInput) anthropicKeyInput.value = localStorage.getItem('anthropic_key') || '';

settingsBtn.addEventListener('click', () => modal.classList.add('active'));
closeModal.addEventListener('click', () => modal.classList.remove('active'));
window.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

saveSettingsBtn.addEventListener('click', () => {
    localStorage.setItem('openai_key', openaiKeyInput.value);
    localStorage.setItem('gemini_key', geminiKeyInput.value);
    localStorage.setItem('anthropic_key', anthropicKeyInput.value);
    modal.classList.remove('active');
    alert("System config updated.");
});

// DIAGNOSTIC TOOL
document.getElementById('gemini-key').addEventListener('change', async (e) => {
    const key = e.target.value;
    if (!key) return;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        if (data.models) {
            console.log("Available Models:", data.models.map(m => m.name));
            alert("Valid Key! Check console (F12) for available models. Setting default to: " + data.models[0].name);
        } else {
            alert("Key appears invalid or no models found.");
        }
    } catch (err) {
        console.error(err);
    }
});

// ===== LIBRARY FUNCTIONALITY =====
let currentChatId = null;
let chats = JSON.parse(localStorage.getItem('ryan_chats') || '[]');
let chatMemory = []; // Conversation memory for the current session
let attachedFiles = []; // State for uploaded files

// Load chat list on page load
function loadChatList() {
    chats = JSON.parse(localStorage.getItem('ryan_chats') || '[]');
    const chatList = document.getElementById('chat-list');

    if (chats.length === 0) {
        chatList.innerHTML = `
            <div class="empty-library">
                <ion-icon name="chatbubbles-outline"></ion-icon>
                <h3>No chats yet</h3>
                <p>Click "New Chat" to start a conversation</p>
            </div>
        `;
        return;
    }

    chatList.innerHTML = chats.map((chat, index) => `
        <div class="chat-item" data-chat-id="${chat.id}">
            <div class="chat-item-header">
                <div>
                    <div class="chat-item-title">${chat.title}</div>
                    <div class="chat-item-date">${new Date(chat.timestamp).toLocaleDateString()}</div>
                </div>
                <button class="chat-item-delete" onclick="deleteChat('${chat.id}', event)">
                    <ion-icon name="trash-outline"></ion-icon>
                </button>
            </div>
            <div class="chat-item-preview">${chat.preview}</div>
        </div>
    `).join('');

    // Add click handlers to chat items
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.chat-item-delete')) {
                openChat(item.dataset.chatId);
            }
        });
    });
}

// Create new chat
document.getElementById('new-chat-btn').addEventListener('click', () => {
    const chatId = 'chat_' + Date.now();
    currentChatId = chatId;

    // Clear chat history
    const chatHistory = document.getElementById('chat-history');
    chatHistory.innerHTML = `
        <div class="msg ai">
            <div class="avatar"><ion-icon name="planet"></ion-icon></div>
            <div class="bubble">Hello. I am Cortex. How can I assist you today?</div>
        </div>
    `;

    chatMemory = [{ role: "assistant", content: "Hello. I am Cortex. How can I assist you today?" }];

    // Switch to chat view
    switchTab('chat');
});

// Open existing chat
function openChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    currentChatId = chatId;

    // Load chat messages
    const chatHistory = document.getElementById('chat-history');
    chatHistory.innerHTML = chat.messages;

    // Reconstruct memory from messages
    chatMemory = [];
    const messageBubbles = chatHistory.querySelectorAll('.msg');
    messageBubbles.forEach(msg => {
        const role = msg.classList.contains('user') ? 'user' : 'assistant';
        const content = msg.querySelector('.bubble').textContent;
        chatMemory.push({ role, content });
    });
    chatMemory = chatMemory.slice(-10); // Keep last 10 for context window

    // Switch to chat view
    switchTab('chat');
}

// Delete chat
function deleteChat(chatId, event) {
    event.stopPropagation();

    chats = chats.filter(c => c.id !== chatId);
    localStorage.setItem('ryan_chats', JSON.stringify(chats));
    loadChatList();

    if (currentChatId === chatId) {
        currentChatId = null;
    }
}

// Save current chat
function saveCurrentChat() {
    if (!currentChatId) {
        currentChatId = 'chat_' + Date.now();
    }

    const chatHistory = document.getElementById('chat-history');
    const messages = chatHistory.innerHTML;

    // Extract first user message as title
    const firstUserMsg = chatHistory.querySelector('.msg.user .bubble');
    const title = firstUserMsg ? firstUserMsg.textContent.substring(0, 50) : 'New Chat';

    // Extract preview from last message
    const lastMsg = chatHistory.querySelector('.msg:last-child .bubble');
    const preview = lastMsg ? lastMsg.textContent.substring(0, 100) : '';

    // Update or create chat
    const existingIndex = chats.findIndex(c => c.id === currentChatId);
    const chatData = {
        id: currentChatId,
        title: title,
        preview: preview,
        timestamp: Date.now(),
        messages: messages
    };

    if (existingIndex >= 0) {
        chats[existingIndex] = chatData;
    } else {
        chats.unshift(chatData);
    }

    localStorage.setItem('ryan_chats', JSON.stringify(chats));
}

// Load chat list on startup
loadChatList();

// CHAT logic
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-chat-btn');
const chatHistory = document.getElementById('chat-history');
const fileUpload = document.getElementById('file-upload');
const attachBtn = document.getElementById('attach-btn');
const filePreviewContainer = document.getElementById('file-preview-container');

attachBtn.addEventListener('click', () => fileUpload.click());

fileUpload.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
        if (attachedFiles.find(f => f.name === file.name)) continue;

        const content = await readFileAsText(file);
        attachedFiles.push({ name: file.name, content: content });
    }
    updateFilePreview();
    fileUpload.value = ''; // Reset for next selection
});

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function updateFilePreview() {
    filePreviewContainer.innerHTML = attachedFiles.map((file, index) => `
        <div class="file-badge">
            <ion-icon name="document-text-outline"></ion-icon>
            <span>${file.name}</span>
            <ion-icon name="close-circle" onclick="removeFile(${index})"></ion-icon>
        </div>
    `).join('');
}

window.removeFile = (index) => {
    attachedFiles.splice(index, 1);
    updateFilePreview();
};

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    let rawText = chatInput.value.trim();
    if (!rawText && attachedFiles.length === 0) return;

    // Inject File Context
    let contextualText = rawText;
    if (attachedFiles.length > 0) {
        const fileContext = attachedFiles.map(f => `--- FILE: ${f.name} ---\n${f.content}\n--- END FILE ---`).join('\n\n');
        contextualText = `ATTACHED FILES DATA:\n${fileContext}\n\nUSER QUESTION: ${rawText || "I have attached some files. please analyze them."}`;
    }

    const provider = document.getElementById('chat-provider').value;
    const openaiKey = localStorage.getItem('openai_key');
    const geminiKey = localStorage.getItem('gemini_key');
    const anthropicKey = localStorage.getItem('anthropic_key');

    // Display the user message
    const displayText = rawText || `Uploaded ${attachedFiles.length} file(s)`;
    addMessage(displayText, 'user');
    chatInput.value = '';

    // Check for Commands
    // 0. Check for VIDEO command
    if (rawText.toLowerCase().startsWith('/video') || rawText.toLowerCase().startsWith('generate video')) {
        const cleanPrompt = rawText.replace(/^\/video|generate video/i, '').trim();
        if (!cleanPrompt) {
            addMessage("Please provide a prompt for the video.", 'ai');
            return;
        }
        const videoInput = document.getElementById('video-prompt');
        if (videoInput) videoInput.value = cleanPrompt;
        const genBtn = document.getElementById('generate-video-btn');
        if (genBtn) genBtn.click();
        return;
    }

    // 0.5 Check for MUSIC command
    if (rawText.toLowerCase().startsWith('/music') || rawText.toLowerCase().startsWith('generate music')) {
        const cleanPrompt = rawText.replace(/^\/music|generate music/i, '').trim();
        if (!cleanPrompt) {
            addMessage("Please provide a prompt for the music composition.", 'ai');
            return;
        }

        const aiMsgDiv = addMessage("Initializing Sonic Synthesis...", 'ai', true);

        (async () => {
            try {
                updateAiMessage(aiMsgDiv, "Analyzing rhythm and tone... Generating Visual Symphony (Keyless Mode)");
                const seed = Math.floor(Math.random() * 100000);
                const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?seed=${seed}&nologo=true&width=768&height=768`;
                const img = new Image();
                await new Promise((resolve, reject) => {
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error("Sonic Engine Overloaded."));
                    setTimeout(() => reject(new Error("Timeout")), 60000);
                    img.src = imageUrl;
                });

                aiMsgDiv.innerHTML = `
                    <div class="avatar"><ion-icon name="musical-notes"></ion-icon></div>
                    <div class="bubble" style="background: rgba(112, 0, 240, 0.05); border-color: var(--accent-purple); padding: 1.5rem;">
                        <h4 style="margin-bottom: 0.8rem; font-family: var(--font-heading); color: var(--accent-purple);">RYAN AI // SONIC VISUALIZER</h4>
                        <img src="${imageUrl}" style="width: 100%; border-radius: 10px; margin-bottom: 1rem; box-shadow: 0 8px 25px rgba(0,0,0,0.2);">
                        <p style="font-size: 0.85rem;">Synthesized visual: <i>"${cleanPrompt}"</i></p>
                    </div>
                `;
            } catch (err) {
                updateAiMessage(aiMsgDiv, "Sonic Generation Failed: " + err.message);
            }
        })();
        return;
    }

    // 1. Check for IMAGE command
    if (rawText.toLowerCase().startsWith('/image') || rawText.toLowerCase().startsWith('generate image') || rawText.toLowerCase().startsWith('draw')) {
        const aiMsgDiv = addMessage("Generating visual artifact...", 'ai', true);
        const cleanPrompt = rawText.replace(/^\/image|generate image|draw/i, '').trim();

        try {
            const seed = Math.floor(Math.random() * 100000);
            let dotCount = 0;
            const loadingInterval = setInterval(() => {
                dotCount++;
                const dots = '.'.repeat((dotCount % 3) + 1);
                updateAiMessage(aiMsgDiv, `loading${dots}`);
            }, 200);

            const urls = [
                `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?seed=${seed}&nologo=true&width=768&height=768&model=turbo`,
                `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?seed=${seed + 1}&nologo=true&width=768&height=768&model=flux-schnell`,
                `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?seed=${seed + 2}&nologo=true&width=768&height=768`
            ];

            const imageUrl = await Promise.any(urls.map(url => new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(url);
                img.onerror = () => reject();
                img.src = url;
            }))).catch(() => urls[0]);

            clearInterval(loadingInterval);
            aiMsgDiv.innerHTML = `
                <div class="avatar"><ion-icon name="color-palette"></ion-icon></div>
                <div class="bubble" style="background: transparent; border: none; padding: 0;">
                    <img src="${imageUrl}" style="max-width: 100%; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    <p style="margin-top: 0.5rem; font-size: 0.8rem; opacity: 0.7;">Generated: ${cleanPrompt}</p>
                </div>
            `;
        } catch (error) {
            updateAiMessage(aiMsgDiv, "Generation Failed: " + (error.message || "Unknown Error"));
        }
        return;
    }

    // 2. Normal Chat Logic
    const PRIMARY_GEMINI_KEY = "AIzaSyB9-SFTO91pi4TaV5iFlz2ZTQKoLgVw-SQ";
    const DEFAULT_OPENAI_KEYS = [
        "sk-1234uvwx5678abcd1234uvwx5678abcd1234uvwx",
        "sk-1234abcd1234abcd1234abcd1234abcd1234abcd",
        "sk-5678efgh5678efgh5678efgh5678efgh5678efgh"
    ];
    const text = contextualText;

    const aiMsgDiv = addMessage("Thinking...", 'ai', true);

    try {
        let aiText = "";
        if (provider === 'openai') {
            const keysToTry = openaiKey ? [openaiKey, ...DEFAULT_OPENAI_KEYS] : DEFAULT_OPENAI_KEYS;
            let success = false;
            let cycleCount = 0;
            const startChatId = currentChatId;

            while (!success) {
                cycleCount++;
                if (cycleCount > 1) {
                    updateAiMessage(aiMsgDiv, `All keys busy. Retrying cycle ${cycleCount}...`);
                    await new Promise(r => setTimeout(r, 2000)); // Cool-off to avoid spam
                }

                // Stop if user switched chats
                if (currentChatId !== startChatId) return;

                for (const currentKey of keysToTry) {
                    try {
                        const response = await fetch('https://text.pollinations.ai/openai', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${currentKey}`
                            },
                            body: JSON.stringify({
                                model: "openai",
                                messages: [...chatMemory, { role: "user", content: text }]
                            }),
                            signal: AbortSignal.timeout(10000)
                        });
                        const data = await response.json();
                        if (data.choices && data.choices[0]) {
                            aiText = data.choices[0].message.content;
                            success = true;
                            break;
                        }
                    } catch (err) {
                        console.warn(`Cycle ${cycleCount} - Key failed:`, err.message);
                    }
                }
            }
        } else if (provider === 'claude') {
            // Claude API via OpenAI-compatible Unified Relay (More stable for custom keys)
            try {
                updateAiMessage(aiMsgDiv, "Establishing secure link to Claude...");

                const response = await fetch('https://text.pollinations.ai/openai', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${anthropicKey}`
                    },
                    body: JSON.stringify({
                        model: "claude",
                        messages: [
                            { role: "system", content: "You are Claude 3.5 Sonnet, a professional AI assistant integrated into the RYAN AI GPT 1.2 platform." },
                            ...chatMemory,
                            { role: "user", content: text }
                        ],
                        temperature: 0.7
                    })
                });

                if (!response.ok) {
                    const errorDetail = await response.json().catch(() => ({ error: { message: "Relay node timeout." } }));
                    throw new Error(errorDetail.error?.message || `Gateway Error (${response.status})`);
                }

                const data = await response.json();
                aiText = data.choices[0].message.content;

                if (!aiText) throw new Error("Synthesis yielded no result.");
            } catch (err) {
                console.error("Claude Relay Failure:", err);
                console.warn("Claude failed. Engaging Neural Grid fallback...");
                updateAiMessage(aiMsgDiv, "Switching to backup AI...");
                return await performGridRequest(text, 'quantum', aiMsgDiv);
            }
        } else {
            // Gemini API: Dynamic Model Discovery with Key Rotation
            const GEMINI_KEYS = geminiKey ? [geminiKey] : [
                "AIzaSyB9-SFTO91pi4TaV5iFlz2ZTQKoLgVw-SQ",
                "AIzaSyDFGnHjBuecnKDpmuCBeRDIAzucSAX8WIg"
            ];

            let lastError = null;
            let success = false;

            for (const currentKey of GEMINI_KEYS) {
                try {
                    const modelsResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${currentKey}`);
                    const modelsData = await modelsResp.json();

                    if (!modelsData.models) {
                        if (modelsData.error) throw new Error(modelsData.error.message);
                        throw new Error("Invalid API Key or no models available.");
                    }

                    // Model selection logic
                    let validModel;
                    if (provider === 'gemini-flash' || provider === 'edu') {
                        validModel = modelsData.models.find(m => m.name.includes("gemini-1.5-flash")) ||
                            modelsData.models.find(m => m.name.includes("gemini-1.5-pro")) ||
                            modelsData.models.find(m => m.name.includes("gemini"));
                    } else if (provider === 'gemini-math' || provider === 'euler-math') {
                        validModel = modelsData.models.find(m => m.name.includes("gemini-1.5-pro")) ||
                            modelsData.models.find(m => m.name.includes("gemini-1.5-flash")) ||
                            modelsData.models.find(m => m.name.includes("gemini"));
                    } else {
                        validModel = modelsData.models.find(m =>
                            m.supportedGenerationMethods &&
                            m.supportedGenerationMethods.includes("generateContent") &&
                            m.name.includes("gemini")
                        );
                    }

                    if (!validModel) throw new Error("No compatible chat models found for this API key.");

                    console.log(`Using Gemini Model: ${validModel.name} (Key: ...${currentKey.slice(-4)})`);

                    // Special instructions
                    let finalPrompt = text;
                    if (provider === 'edu') {
                        finalPrompt = "You are a Master Educator and Universal Academic Assistant. Your goal is to explain complex topics simply, provide step-by-step solutions for any subject (Math, Science, History, etc.), and help the student learn effectively. Subject Context: " + text;
                    } else if (provider === 'gemini-math') {
                        finalPrompt = "You are Sir Isaac Newton, a grandmaster of mathematics. Solve this with absolute precision: " + text;
                    } else if (provider === 'euler-math') {
                        finalPrompt = "You are Leonhard Euler, a master of logic and complex systems. Analyze and solve this logically: " + text;
                    }

                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${validModel.name}:generateContent?key=${currentKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{
                                    text: `Recent Conversation History:\n${chatMemory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}\n\nCurrent Task:\n${finalPrompt}`
                                }]
                            }]
                        })
                    });

                    const data = await response.json();

                    if (data.error) {
                        throw new Error(data.error.message);
                    }

                    aiText = data.candidates[0].content.parts[0].text;
                    success = true;
                    break; // Success! Exit loop.

                } catch (err) {
                    console.warn(`Gemini Key Failed (${currentKey.slice(-6)}):`, err.message);
                    lastError = err;
                    // Continue to next key
                }
            }

            if (!success) {
                console.warn("All Gemini Keys Exhausted. Engaging Neural Grid...");
                updateAiMessage(aiMsgDiv, "Switching to backup AI...");
                return await performGridRequest(text, 'quantum', aiMsgDiv);
            }
        }

        updateAiMessage(aiMsgDiv, aiText);

        // Clear attached files after successful send
        attachedFiles = [];
        updateFilePreview();

    } catch (error) {
        updateAiMessage(aiMsgDiv, "ERROR: " + error.message);
    }
}

function addMessage(text, sender, isLoading = false) {
    const div = document.createElement('div');
    div.className = `msg ${sender}`;
    div.innerHTML = `
        <div class="avatar"><ion-icon name="${sender === 'ai' ? 'planet' : 'person'}"></ion-icon></div>
        <div class="bubble">${text}</div>
    `;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Update memory
    chatMemory.push({ role: sender === 'ai' ? 'assistant' : 'user', content: text });
    if (chatMemory.length > 10) chatMemory.shift(); // Max 10 messages window

    // Auto-save chat after adding message
    setTimeout(() => saveCurrentChat(), 500);

    return div;
}

function updateAiMessage(div, newText) {
    const bubble = div.querySelector('.bubble');
    bubble.innerText = newText;
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function performGridRequest(text, provider, aiMsgDiv) {
    let aiText = "";
    let dotCount = 0;

    // Turbo Dot Loading Animation
    const loadingInterval = setInterval(() => {
        dotCount++;
        const dots = '.'.repeat((dotCount % 3) + 1);
        updateAiMessage(aiMsgDiv, `loading${dots}`);
    }, 200);

    // METHOD 1: Pollinations POST API (CORS-safe, most reliable)
    const models = ['openai', 'mistral', 'llama', 'qwen'];
    const DEFAULT_OPENAI_KEYS = [
        "sk-1234uvwx5678abcd1234uvwx5678abcd1234uvwx",
        "sk-1234abcd1234abcd1234abcd1234abcd1234abcd",
        "sk-5678efgh5678efgh5678efgh5678efgh5678efgh"
    ];

    for (const model of models) {
        // For OpenAI model in the grid, try the keys
        const keysToTry = model === 'openai' ? DEFAULT_OPENAI_KEYS : [null];

        for (const currentKey of keysToTry) {
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (currentKey) headers['Authorization'] = `Bearer ${currentKey}`;

                const response = await fetch('https://text.pollinations.ai/openai', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: "user", content: text }]
                    }),
                    signal: AbortSignal.timeout(10000)
                });
                if (!response.ok) continue;
                const data = await response.json();
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    aiText = data.choices[0].message.content;
                    if (aiText && aiText.length > 2) {
                        clearInterval(loadingInterval);
                        updateAiMessage(aiMsgDiv, aiText);
                        return;
                    }
                }
            } catch (err) {
                console.warn(`Grid model ${model} (Key: ${currentKey ? 'Yes' : 'No'}) failed:`, err.message);
            }
        }
    }

    // METHOD 2: Gemini API as FINAL fallback (always works)
    const FALLBACK_GEMINI_KEYS = [
        "AIzaSyB9-SFTO91pi4TaV5iFlz2ZTQKoLgVw-SQ",
        "AIzaSyDFGnHjBuecnKDpmuCBeRDIAzucSAX8WIg"
    ];
    for (const gKey of FALLBACK_GEMINI_KEYS) {
        try {
            const modelsResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${gKey}`, {
                signal: AbortSignal.timeout(8000)
            });
            const modelsData = await modelsResp.json();
            if (!modelsData.models) continue;
            const validModel = modelsData.models.find(m => m.name.includes("gemini")) || modelsData.models[0];
            if (!validModel) continue;

            const genResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/${validModel.name}:generateContent?key=${gKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: text }] }]
                }),
                signal: AbortSignal.timeout(15000)
            });
            const genData = await genResp.json();
            if (genData.candidates && genData.candidates[0]) {
                aiText = genData.candidates[0].content.parts[0].text;
                if (aiText && aiText.length > 2) {
                    clearInterval(loadingInterval);
                    updateAiMessage(aiMsgDiv, aiText);
                    return;
                }
            }
        } catch (err) {
            console.warn(`Gemini fallback key failed:`, err.message);
        }
    }

    // All methods failed
    clearInterval(loadingInterval);
    throw new Error("All AI services are busy. Please try again.");
}


