/**
 * CHAT CONTROLLER — phone.com
 * 
 * Drives the Socratic Agent dialogue feed.
 * Bridges:
 *   User Input (text/voice/vision) -> PhoneAI -> PhoneVoice (Kokoro/synthesizer)
 *   Also triggers real-time state adaptation based on interaction content.
 */

const PhoneChat = (() => {
  let btnSendChat, chatUserInput, chatFeed;
  let btnToggleTts, btnToggleHandsfree, btnMic;
  let btnAttachImage, fileImageInput, chatImagePreviewContainer, chatImagePreview, btnRemovePreview;
  let ragStatusBadge, agentBackendStatus;

  let ttsEnabled = true;
  let handsFreeEnabled = false;
  let attachedImageBase64 = null;

  async function init() {
    // 1. Grab DOM Elements
    btnSendChat = document.getElementById('btn-send-chat');
    chatUserInput = document.getElementById('chat-user-input');
    chatFeed = document.getElementById('chat-feed');
    btnToggleTts = document.getElementById('btn-toggle-tts');
    btnToggleHandsfree = document.getElementById('btn-toggle-handsfree');
    btnMic = document.getElementById('btn-mic');
    btnAttachImage = document.getElementById('btn-attach-image');
    fileImageInput = document.getElementById('file-image-input');
    chatImagePreviewContainer = document.getElementById('chat-image-preview-container');
    chatImagePreview = document.getElementById('chat-image-preview');
    btnRemovePreview = document.getElementById('btn-remove-preview');
    ragStatusBadge = document.getElementById('rag-status-badge');
    agentBackendStatus = document.getElementById('agent-backend-status');

    if (!chatFeed) return; // Exit if not on page

    // 2. Setup Event Listeners
    btnSendChat.addEventListener('click', sendUserMessage);
    chatUserInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendUserMessage();
    });

    btnToggleTts.addEventListener('click', toggleTTS);
    btnToggleHandsfree.addEventListener('click', toggleHandsFree);

    // Mic controls
    if (btnMic) {
      btnMic.addEventListener('click', () => {
        PhoneVoice.toggleListening();
      });
    }

    // Vision/Image attachment controls
    if (btnAttachImage && fileImageInput) {
      btnAttachImage.addEventListener('click', () => fileImageInput.click());
      fileImageInput.addEventListener('change', handleImageSelect);
    }
    if (btnRemovePreview) {
      btnRemovePreview.addEventListener('click', clearImageAttachment);
    }

    // 3. Initialize AI and Voice engines
    await PhoneAI.init();
    PhoneVoice.init();

    // Wire STT callbacks to Chat
    PhoneVoice.setCallbacks(
      // On interim transcript
      (text) => {
        if (chatUserInput) chatUserInput.value = text;
      },
      // On final transcript
      (text) => {
        if (chatUserInput) chatUserInput.value = text;
        if (handsFreeEnabled) {
          sendUserMessage();
        }
      }
    );

    // 4. Update status indicators
    updateStatusIndicators();
  }

  function updateStatusIndicators() {
    const aiStatus = PhoneAI.getStatus();
    
    // RAG Status
    if (ragStatusBadge) {
      if (aiStatus.isLoaded) {
        ragStatusBadge.textContent = 'RAG: Online';
        ragStatusBadge.style.color = 'var(--color-mind)';
        ragStatusBadge.style.borderColor = 'hsla(195, 85%, 55%, 0.3)';
        ragStatusBadge.style.background = 'hsla(195, 85%, 55%, 0.08)';
      } else {
        ragStatusBadge.textContent = 'RAG: Offline';
        ragStatusBadge.style.color = 'var(--color-text-dim)';
        ragStatusBadge.style.borderColor = 'var(--color-border)';
        ragStatusBadge.style.background = 'var(--color-surface)';
      }
    }

    // Backend status indicator
    if (agentBackendStatus) {
      if (aiStatus.backend === 'offline') {
        agentBackendStatus.textContent = 'offline heuristics';
      } else {
        agentBackendStatus.textContent = `${aiStatus.backend} (${aiStatus.model})`;
      }
    }
  }

  // Vision handler
  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      attachedImageBase64 = event.target.result.split(',')[1];
      if (chatImagePreview && chatImagePreviewContainer) {
        chatImagePreview.src = event.target.result;
        chatImagePreviewContainer.classList.remove('hidden');
      }
    };
    reader.readAsDataURL(file);
  }

  function clearImageAttachment() {
    attachedImageBase64 = null;
    if (fileImageInput) fileImageInput.value = '';
    if (chatImagePreviewContainer) chatImagePreviewContainer.classList.add('hidden');
    if (chatImagePreview) chatImagePreview.src = '';
  }

  function toggleTTS() {
    ttsEnabled = !ttsEnabled;
    PhoneVoice.setTTSEnabled(ttsEnabled);
    if (btnToggleTts) {
      btnToggleTts.textContent = ttsEnabled ? '🔊 Voice: On' : '🔇 Voice: Off';
      btnToggleTts.classList.toggle('active', ttsEnabled);
    }
  }

  function toggleHandsFree() {
    handsFreeEnabled = !handsFreeEnabled;
    PhoneVoice.setHandsFree(handsFreeEnabled);
    if (btnToggleHandsfree) {
      btnToggleHandsfree.textContent = handsFreeEnabled ? '🔁 Hands-Free: On' : '🔁 Hands-Free: Off';
      btnToggleHandsfree.classList.toggle('active', handsFreeEnabled);
    }
    // Toggle mic based on hands-free
    if (handsFreeEnabled) {
      PhoneVoice.startListening();
    } else {
      PhoneVoice.stopListening();
    }
  }

  // Append a bubble to the feed
  function appendMessage(text, isUser = false, imageBase64 = null) {
    if (!chatFeed) return;

    const div = document.createElement('div');
    div.className = `chat-message ${isUser ? 'user' : 'agent'}`;
    
    let contentHTML = `<p>${escapeHTML(text)}</p>`;
    
    if (imageBase64) {
      contentHTML += `<img src="data:image/jpeg;base64,${imageBase64}" class="chat-message-image" alt="User vision input">`;
    }

    div.innerHTML = contentHTML;
    chatFeed.appendChild(div);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  // Send message loop
  async function sendUserMessage() {
    const text = chatUserInput.value.trim();
    const imageToSend = attachedImageBase64;
    
    if (!text && !imageToSend) return;

    // Clear input and previews
    chatUserInput.value = '';
    clearImageAttachment();

    // 1. Append User Message
    appendMessage(text, true, imageToSend);

    // Stop listening while generating
    if (handsFreeEnabled) {
      PhoneVoice.stopListening();
    }

    // 2. Append typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message agent';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = '<p>Thinking...</p>';
    chatFeed.appendChild(typingDiv);
    chatFeed.scrollTop = chatFeed.scrollHeight;

    // 3. Fetch response from AI
    const response = await PhoneAI.chat(text, imageToSend);

    // Remove typing indicator
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) typingIndicator.remove();

    // 4. Append Agent Message
    appendMessage(response, false);

    // 5. Speak response if enabled
    if (ttsEnabled) {
      await PhoneVoice.speak(response);
    } else {
      // If voice is disabled and hands-free is enabled, resume listening immediately
      if (handsFreeEnabled) {
        PhoneVoice.startListening();
      }
    }

    // 6. Dynamically update attributes based on user message keywords
    adaptStateBasedOnMessage(text);
  }

  function adaptStateBasedOnMessage(text) {
    const cleanText = text.toLowerCase();
    let state = PhoneState.load();
    let changed = false;

    // Direct keywords mapping
    if (cleanText.match(/\b(think|intellect|mind|reason|logic|learn|read)\b/)) {
      state.shape.mind = Math.min(state.shape.mind + 1, 100);
      changed = true;
    }
    if (cleanText.match(/\b(love|feel|heart|courage|brave|scared|trust)\b/)) {
      state.shape.heart = Math.min(state.shape.heart + 1, 100);
      changed = true;
    }
    if (cleanText.match(/\b(body|health|breath|exercise|physical|somatic|pain)\b/)) {
      state.shape.body = Math.min(state.shape.body + 1, 100);
      changed = true;
    }
    if (cleanText.match(/\b(do|act|make|build|run|work|project)\b/)) {
      state.shape.act = Math.min(state.shape.act + 1, 100);
      changed = true;
    }

    if (changed) {
      PhoneState.save(state);
      PhoneDashboard.render(state);
      PhoneRadar.render(state.shape);
      console.log('[phone-chat] Adapted shape attributes from message content:', state.shape);
    }
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init
  };
})();
