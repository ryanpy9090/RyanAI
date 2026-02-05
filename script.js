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
            // POLLINATIONS AI (High-Res Image as 'Video Frame')
            const seed = Math.floor(Math.random() * 100000);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&nologo=true`;

            // PRELOAD CHECKS via Fetch with RETRY Logic
            let response;
            let retries = 500; // SUPER PERSISTENCE MODE (500 attempts)

            // Priority Model List - Rotates through all models
            const models = [
                'nanobanana', 'gptimage', 'gemini-math', 'dreamshaper', 'absolute-reality', 'majicmix-realistic',
                'kontext', 'zimage', 'flux-schnell', 'flux-pro', 'klein-large',
                'seedream', 'midjourney', 'flux', 'turbo', 'sdxl',
                'flux-realism', 'flux-anime', 'flux-3d', 'any-dark', 'pixart',
                'openjourney', 'sd3', 'playground', 'dalle', 'omnigen'
            ];

            while (retries > 0) {
                try {
                    // Calculate current model using modulo operator for infinite rotation
                    const modelIndex = (500 - retries) % models.length;
                    const currentModel = models[modelIndex];

                    // Update Chat Bubble (every 5 retries or so to avoid flickering)
                    if (retries % 5 === 0) {
                        const bubble = aiMsgDiv.querySelector('.bubble');
                        // Capitalize logic for display
                        const displayModel = currentModel.charAt(0).toUpperCase() + currentModel.slice(1);
                        bubble.innerText = `Rendering (${displayModel})... Loading: ${Math.min(100, Math.floor(((500 - retries) / 500) * 100))}%`;
                    }

                    const currentUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=${currentModel}&seed=${seed}&nologo=true`;

                    response = await fetch(currentUrl);
                    if (response.ok) break; // Success!

                    if (response.status === 502 || response.status === 503 || response.status === 504) {
                        retries--;
                        await new Promise(r => setTimeout(r, 500)); // Faster retries
                    } else {
                        throw new Error(`Server Error: ${response.status}`);
                    }
                } catch (e) {
                    if (retries <= 1) throw e;
                    retries--;
                    await new Promise(r => setTimeout(r, 500)); // Faster retries
                }
            }

            if (!response || !response.ok) throw new Error("Server Overloaded.");

            const blob = await response.blob();
            const objectURL = URL.createObjectURL(blob);

            // RENDER IN CHAT
            aiMsgDiv.innerHTML = `
                <div class="avatar"><ion-icon name="videocam"></ion-icon></div>
                <div class="bubble" style="background: transparent; border: none; padding: 0;">
                    <img src="${objectURL}" style="max-width: 100%; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); transform: scale(1); transition: transform 5s ease;">
                    <p style="margin-top: 0.5rem; font-size: 0.8rem; opacity: 0.7;">Video Preview: ${prompt}</p>
                    <button onclick="(function(){const a=document.createElement('a');a.href='${objectURL}';a.download='ryan-video-${Date.now()}.png';a.click();})()" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3); transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(102, 126, 234, 0.3)'"><ion-icon name="download-outline" style="vertical-align: middle; margin-right: 0.3rem;"></ion-icon>Download Video</button>
                </div>
            `;

            // "Ken Burns" Animation
            setTimeout(() => {
                const img = aiMsgDiv.querySelector('img');
                if (img) img.style.transform = "scale(1.1)";
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

    // Switch to chat view
    switchTab('chat');
}

// Delete chat
function deleteChat(chatId, event) {
    event.stopPropagation();

    if (confirm('Delete this chat?')) {
        chats = chats.filter(c => c.id !== chatId);
        localStorage.setItem('ryan_chats', JSON.stringify(chats));
        loadChatList();

        if (currentChatId === chatId) {
            currentChatId = null;
        }
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

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    const provider = document.getElementById('chat-provider').value;
    const openaiKey = localStorage.getItem('openai_key');
    const geminiKey = localStorage.getItem('gemini_key');
    const anthropicKey = localStorage.getItem('anthropic_key');

    // 0. Check for VIDEO command
    if (text.toLowerCase().startsWith('/video') || text.toLowerCase().startsWith('generate video')) {
        addMessage(text, 'user');
        chatInput.value = '';

        const cleanPrompt = text.replace(/^\/video|generate video/i, '').trim();
        if (!cleanPrompt) {
            addMessage("Please provide a prompt for the video.", 'ai');
            return;
        }

        // TRIGGER BACKGROUND GENERATION
        const videoInput = document.getElementById('video-prompt');
        if (videoInput) videoInput.value = cleanPrompt;

        const genBtn = document.getElementById('generate-video-btn');
        if (genBtn) {
            genBtn.click(); // This now posts to chat directly
        }
        return;
    }

    // 0.5 Check for MUSIC command
    if (text.toLowerCase().startsWith('/music') || text.toLowerCase().startsWith('generate music')) {
        addMessage(text, 'user');
        chatInput.value = '';

        const cleanPrompt = text.replace(/^\/music|generate music/i, '').trim();
        if (!cleanPrompt) {
            addMessage("Please provide a prompt for the music composition.", 'ai');
            return;
        }

        const aiMsgDiv = addMessage("Initializing Sonic Synthesis...", 'ai', true);

        (async () => {
            try {
                updateAiMessage(aiMsgDiv, "Analyzing rhythm and tone... Generating Visual Symphony (Keyless Mode)");

                const seed = Math.floor(Math.random() * 100000);
                const musicVibePrompt = `High-end music visualizer, ${cleanPrompt}, rhythmic patterns, cinematic lighting, digital art`;

                const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(musicVibePrompt)}?model=flux-pro&seed=${seed}&nologo=true`;

                const response = await fetch(imageUrl);
                if (!response.ok) throw new Error("Sonic Engine Overloaded.");

                const blob = await response.blob();
                const objectURL = URL.createObjectURL(blob);

                aiMsgDiv.innerHTML = `
                    <div class="avatar"><ion-icon name="musical-notes"></ion-icon></div>
                    <div class="bubble" style="background: rgba(112, 0, 240, 0.05); border-color: var(--accent-purple); padding: 1.5rem;">
                        <h4 style="margin-bottom: 0.8rem; font-family: var(--font-heading); color: var(--accent-purple);">RYAN AI // SONIC VISUALIZER</h4>
                        <div style="position: relative; overflow: hidden; border-radius: 10px; margin-bottom: 1rem; box-shadow: 0 8px 25px rgba(0,0,0,0.2);">
                            <img src="${objectURL}" style="width: 100%; display: block; transform: scale(1); transition: transform 10s ease;" onload="this.style.transform='scale(1.2)'">
                        </div>
                        <p style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1rem; opacity: 0.9;">
                            <b>COMPOSITION:</b> AI has synthesized a visual representation of <i>"${cleanPrompt}"</i>. This keyless generation uses the CineSynth engine for auditory visualization.
                        </p>
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="(function(){const a=document.createElement('a');a.href='${objectURL}';a.download='ryan-sonic-${Date.now()}.png';a.click();})()" style="flex: 1; padding: 0.6rem; background: linear-gradient(135deg, #7000f0 0%, #007bff 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                                <ion-icon name="download-outline"></ion-icon>Download Visuals
                            </button>
                        </div>
                    </div>
                `;
            } catch (err) {
                updateAiMessage(aiMsgDiv, "Sonic Generation Failed: " + err.message);
            }
        })();
        return;
    }

    // 1. Check for IMAGE command
    if (text.toLowerCase().startsWith('/image') || text.toLowerCase().startsWith('generate image') || text.toLowerCase().startsWith('draw')) {
        addMessage(text, 'user');
        chatInput.value = '';

        const aiMsgDiv = addMessage("Generating visual artifact...", 'ai', true);
        const cleanPrompt = text.replace(/^\/image|generate image|draw/i, '').trim();

        try {
            let blob;
            const hfToken = localStorage.getItem('hf_key');

            // STRATEGY A: NANOBANANA (Primary - Free & High Quality)
            updateAiMessage(aiMsgDiv, "Generating with NanoBanana...");
            const seed = Math.floor(Math.random() * 100000);

            try {
                let nanoResp = await fetch(
                    `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?model=nanobanana&seed=${seed}&nologo=true`
                );

                if (!nanoResp.ok) {
                    updateAiMessage(aiMsgDiv, "NanoBanana busy, trying Gemini Math visuals...");
                    nanoResp = await fetch(
                        `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?model=gemini-math&seed=${seed}&nologo=true`
                    );
                }

                if (nanoResp.ok) {
                    blob = await nanoResp.blob();
                }
            } catch (e) {
                console.log("Primary models failed, trying fallback...");
            }

            // STRATEGY B: HUGGING FACE (If API key exists and NanoBanana failed)
            if (!blob && hfToken) {
                updateAiMessage(aiMsgDiv, "Trying HuggingFace (FLUX)...");
                const hfResp = await fetch(
                    "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev",
                    {
                        headers: { Authorization: `Bearer ${hfToken}` },
                        method: "POST",
                        body: JSON.stringify({ inputs: cleanPrompt }),
                    }
                );
                if (hfResp.ok) blob = await hfResp.blob();
            }

            // STRATEGY C: AI HORDE (Last Resort - Slow but Free)
            if (!blob) {
                updateAiMessage(aiMsgDiv, "Trying AI Horde Relays (External)...");
                const hordeResp = await fetch("https://stablehorde.net/api/v2/generate/sync", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "apikey": "0000000000" },
                    body: JSON.stringify({
                        prompt: cleanPrompt,
                        params: { cfg_scale: 7, height: 512, width: 512, steps: 20 },
                        models: ["stable_diffusion"],
                    })
                });
                const hordeData = await hordeResp.json();
                if (hordeData.generations && hordeData.generations[0]) {
                    const imgResp = await fetch(hordeData.generations[0].img);
                    blob = await imgResp.blob();
                }
            }

            if (!blob) throw new Error("All image synthesis relays failed.");

            const objectURL = URL.createObjectURL(blob);

            // Replace "Generating..." with the image
            aiMsgDiv.innerHTML = `
                <div class="avatar"><ion-icon name="color-palette"></ion-icon></div>
                <div class="bubble" style="background: transparent; border: none; padding: 0;">
                    <img src="${objectURL}" style="max-width: 100%; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    <p style="margin-top: 0.5rem; font-size: 0.8rem; opacity: 0.7;">Generated: ${cleanPrompt}</p>
                    <button onclick="(function(){const a=document.createElement('a');a.href='${objectURL}';a.download='ryan-image-${Date.now()}.png';a.click();})()" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3); transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(102, 126, 234, 0.3)'"><ion-icon name="download-outline" style="vertical-align: middle; margin-right: 0.3rem;"></ion-icon>Download Image</button>
                </div>
            `;
        } catch (error) {
            updateAiMessage(aiMsgDiv, "Generation Failed: " + (error.message || "Unknown Error"));
        }
        return; // PREVENT LLM CALL
    }

    // 2. Normal Chat Logic
    if (provider === 'openai' && !openaiKey) {
        alert("Please configure your OpenAI API Key!");
        modal.classList.add('active');
        return;
    }
    if ((provider === 'gemini' || provider === 'gemini-math' || provider === 'euler-math') && !geminiKey) {
        alert("Please configure your Gemini API Key!");
        modal.classList.add('active');
        return;
    }
    if (provider === 'claude' && !anthropicKey) {
        alert("Please configure your Anthropic API Key for Claude!");
        modal.classList.add('active');
        return;
    }

    addMessage(text, 'user');
    chatInput.value = '';

    const aiMsgDiv = addMessage("Thinking...", 'ai', true);

    try {
        let aiText = "";
        if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: text }]
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            aiText = data.choices[0].message.content;
        } else if (provider !== 'openai' && provider !== 'gemini' && provider !== 'gemini-flash' && provider !== 'edu' && provider !== 'claude' && provider !== 'gemini-math' && provider !== 'euler-math') {
            // QUANTUM GRID GENESIS (Parallel Racing Failover)
            const bridges = [
                'openai-fast', 'turbo', 'qwen', 'nova-fast', 'mistral', 'firework', 'openai', 'llama', 'pi', 'phi', 'gemma',
                'mistral-sh', 'llama-3.3', 'qwen-coder', 'nemotron', 'deepseek', 'hermes', 'claude',
                'unity', 'midjourney', 'flux', 'dalle', 'llava', 'evil', 'p1', 'p7', 'sur'
            ];

            const providerToBridge = {
                'quantum': 'openai-fast', 'gpt4o': 'qwen', 'nova': 'nova-fast', 'flash': 'openai-fast', 'mistral': 'mistral'
            };

            updateAiMessage(aiMsgDiv, "thinking...");

            if (provider === 'quantum') {
                // QUANTUM HYPER-BURST (15-Node Parallel Race)
                try {
                    const racers = [
                        'openai-fast', 'turbo', 'qwen', 'nova-fast', 'mistral', 'firework',
                        'llama', 'gemma', 'phi', 'pi', 'kimi', 'deepseek', 'nemotron', 'command-r', 'sur'
                    ].map(async target => {
                        const r = await fetch(`https://text.pollinations.ai/${encodeURIComponent(text)}?model=${target}&stream=true&seed=${Math.floor(Math.random() * 1000)}`, {
                            signal: AbortSignal.timeout(3000)
                        });
                        if (!r.ok) throw new Error("Latency too high");
                        return r;
                    });

                    let burstAttempts = 0;
                    const burstInterval = setInterval(() => {
                        burstAttempts++;
                        const dots = '.'.repeat((burstAttempts % 3) + 1);
                        updateAiMessage(aiMsgDiv, `loading${dots}`);
                    }, 500);

                    const firstResponse = await Promise.any(racers);
                    clearInterval(burstInterval);

                    const reader = firstResponse.body.getReader();
                    const decoder = new TextDecoder();
                    let fullText = "";

                    updateAiMessage(aiMsgDiv, "");

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        fullText += decoder.decode(value, { stream: true });
                        updateAiMessage(aiMsgDiv, fullText);
                    }
                    if (fullText.length > 2) return;
                } catch (err) {
                    updateAiMessage(aiMsgDiv, "this server is busy switching");
                    console.log("Quantum hyper-burst isolated, falling back to grid failover...");
                }
            }

            // Standard Grid Failover (Sequential)
            const startIdx = Math.max(0, bridges.indexOf(providerToBridge[provider] || provider));
            let success = false;
            let attempts = 0;
            const maxAttempts = 50;

            while (!success && attempts < maxAttempts) {
                const targetModel = bridges[(startIdx + attempts) % bridges.length];
                try {
                    const dots = '.'.repeat((attempts % 3) + 1);
                    updateAiMessage(aiMsgDiv, `loading${dots}`);

                    const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(text)}?model=${targetModel}&system=Ultra+Fast`, {
                        signal: AbortSignal.timeout(2000)
                    });

                    if (response.ok) {
                        aiText = await response.text();
                        if (aiText && aiText.length > 2) {
                            success = true;
                        }
                    } else {
                        updateAiMessage(aiMsgDiv, "this server is busy switching");
                        attempts++;
                    }
                } catch (err) {
                    updateAiMessage(aiMsgDiv, "this server is busy switching");
                    attempts++;
                }
            }

            if (!success) {
                throw new Error("all is busy try again");
            }
        } else if (provider === 'claude') {
            // Claude API via OpenAI-compatible Unified Relay (More stable for custom keys)
            try {
                updateAiMessage(aiMsgDiv, "Establishing secure link to Claude...");

                const response = await fetch('https://text.pollinations.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${anthropicKey}`
                    },
                    body: JSON.stringify({
                        model: "claude",
                        messages: [
                            { role: "system", content: "You are Claude 3.5 Sonnet, a professional AI assistant integrated into the RYAN AI GPT 1.1 platform." },
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
                // FINAL FALLBACK: Attempt the legacy bridge if unified gate is down
                try {
                    updateAiMessage(aiMsgDiv, "Primary link failed. Routing through Neural Bridge...");
                    const altResp = await fetch(`https://text.pollinations.ai/${encodeURIComponent(text)}?model=claude&key=${anthropicKey}`);
                    if (!altResp.ok) throw new Error("Neural Bridge Overloaded.");
                    aiText = await altResp.text();
                } catch (fallbackErr) {
                    throw new Error("CLAUDE SYSTEM DOWN: The Claude engine is currently unreachable via the global relay (502 Gateway). Please ensure your key is valid or try Gemini for high-level tasks. Details: " + err.message);
                }
            }
        } else {
            // Gemini API: Dynamic Model Discovery
            const modelsResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
            const modelsData = await modelsResp.json();

            if (!modelsData.models) {
                console.error("Model List Error:", modelsData);
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

            if (!validModel) {
                throw new Error("No compatible chat models found for this API key.");
            }

            console.log("Using Gemini Model:", validModel.name);

            // Special instructions for Specialized models
            let finalPrompt = text;
            if (provider === 'edu') {
                finalPrompt = "You are a Master Educator and Universal Academic Assistant. Your goal is to explain complex topics simply, provide step-by-step solutions for any subject (Math, Science, History, etc.), and help the student learn effectively. Subject Context: " + text;
            } else if (provider === 'gemini-math') {
                finalPrompt = "You are Sir Isaac Newton, a grandmaster of mathematics. Solve this with absolute precision: " + text;
            } else if (provider === 'euler-math') {
                finalPrompt = "You are Leonhard Euler, a master of logic and complex systems. Analyze and solve this logically: " + text;
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${validModel.name}:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: finalPrompt }] }]
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            aiText = data.candidates[0].content.parts[0].text;
        }

        updateAiMessage(aiMsgDiv, aiText);

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

    // Auto-save chat after adding message
    setTimeout(() => saveCurrentChat(), 500);

    return div;
}

function updateAiMessage(div, newText) {
    const bubble = div.querySelector('.bubble');
    bubble.innerText = newText;
    chatHistory.scrollTop = chatHistory.scrollHeight;
}


