/**
 * CHAT CONTROLLER — phone.com
 * 
 * Drives the Socratic Agent dialogue feed.
 * Bridges:
 *   User Input (text/voice/vision) -> PhoneAI -> PhoneVoice (Kokoro/synthesizer)
 *   Also triggers real-time state adaptation based on interaction content.
 */

import { PhoneAI } from './ai.js';
import { PhoneVoice } from './voice.js';
import { PEARL } from './pearl.js';
import { PhoneState } from './state.js';
import { PhoneDashboard } from './dashboard.js';
import { PhoneKeystrokes } from './keystrokes.js';
import { VAAM } from './vaam.js';

export const PhoneChat = (() => {
  let btnSendChat, chatUserInput, chatFeed;
  let btnToggleTts, btnToggleHandsfree, btnMic, btnEnableWebLLM;
  let btnAttachImage, fileImageInput, chatImagePreviewContainer, chatImagePreview, btnRemovePreview;
  let ragStatusBadge, agentBackendStatus;

  let ttsEnabled = true;
  let handsFreeEnabled = false;
  let attachedImageBase64 = null;
  
  // System Console Routing State
  let isAwaitingEmailDraftPermission = false;
  let cachedDistressText = "";
  
  // Document Viewer UI
  let docViewer, docTitle, docEditor, btnCloseDoc, btnSaveDoc;
  let currentDocFilename = null;

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
    btnEnableWebLLM = document.getElementById('btn-enable-webllm');
    
    docViewer = document.getElementById('chat-document-viewer');
    docTitle = document.getElementById('doc-title');
    docEditor = document.getElementById('doc-editor');
    btnCloseDoc = document.getElementById('btn-close-doc');
    btnSaveDoc = document.getElementById('btn-save-doc');

    if (!chatFeed) return; // Exit if not on page

    // 2. Setup Event Listeners
    btnSendChat.addEventListener('click', sendUserMessage);
    chatUserInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendUserMessage();
    });

    btnToggleTts.addEventListener('click', toggleTTS);
    btnToggleHandsfree.addEventListener('click', toggleHandsFree);

    if (btnEnableWebLLM) {
      btnEnableWebLLM.addEventListener('click', async () => {
        const progressContainer = document.getElementById('webllm-progress-container');
        const progressBar = document.getElementById('webllm-progress-bar');
        const progressText = document.getElementById('webllm-progress-text');
        
        btnEnableWebLLM.disabled = true;
        progressContainer.classList.remove('hidden');
        
        try {
          // Dynamically import WebLLMManager if needed or use existing
          const { WebLLMManager } = await import('./webllm-manager.js');
          await WebLLMManager.init((progress, text) => {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = text;
          });
          
          PhoneAI.setActiveBackend('webllm');
          updateStatusIndicators();
          progressText.textContent = 'Engine Loaded Successfully.';
          setTimeout(() => progressContainer.classList.add('hidden'), 3000);
          btnEnableWebLLM.style.display = 'none'; // Hide once loaded
        } catch (e) {
          progressText.textContent = 'Failed to load Engine. Check console.';
          btnEnableWebLLM.disabled = false;
        }
      });
    }

    // Mic controls
    if (btnMic) {
      btnMic.addEventListener('click', () => {
        if (!PhoneVoice.isListening()) {
          appendMessage(`<strong>[Skill Unlocked]</strong> You have equipped the Voice Interface. Grant your browser microphone access to speak directly to the System Console.`, false);
        }
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

    // Document Viewer controls
    if (btnCloseDoc) {
      btnCloseDoc.addEventListener('click', closeDocumentViewer);
    }
    if (btnSaveDoc) {
      btnSaveDoc.addEventListener('click', saveCurrentDocument);
    }

    // 3. Initialize AI, Voice, and Biometrics
    PhoneKeystrokes.init('chat-user-input');
    await PhoneAI.init();
    PhoneVoice.init();

    // Wire the AI Core Widget voice toggle to real Kokoro loading
    document.addEventListener('zen:voice-toggle', async (e) => {
      const { enabled } = e.detail;
      if (enabled) {
        PhoneVoice.setTTSEnabled(true);
        if (!PhoneVoice.isKokoroLoaded() && !PhoneVoice.isKokoroLoading()) {
          try {
            await PhoneVoice.loadKokoro((pct) => {
              console.log(`[chat] Kokoro loading: ${pct}%`);
            });
            console.log('[chat] Kokoro loaded — neural TTS active');
          } catch (err) {
            console.warn('[chat] Kokoro failed to load, falling back to browser TTS:', err.message);
          }
        }
      } else {
        PhoneVoice.setTTSEnabled(false);
      }
    });

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
    
    // 5. Update status if running in offline heuristics mode  
    if (PhoneAI.getStatus().backend === 'offline') {
      // Don't warn — offline is the default experience. Just update status text.
      if (agentBackendStatus) {
        agentBackendStatus.textContent = 'ready (local)';
      }
    }
  }

  // Global Error Boundary (Professional Safety)
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    if (chatFeed) {
      appendMessage(`<em>[System Recovered from Error: ${event.reason?.message || 'Unknown network error'}]</em>`, false);
    }
  });

  function updateStatusIndicators() {
    const aiStatus = PhoneAI.getStatus();
    
    // Backend status indicator
    if (agentBackendStatus) {
      if (aiStatus.backend === 'offline') {
        agentBackendStatus.textContent = 'offline heuristics';
      } else {
        agentBackendStatus.textContent = `${aiStatus.backend} (${aiStatus.model})`;
      }
    }
  }

  // ─── Document Viewer Logic ───
  function openDocumentViewer(filename, content) {
    if (!docViewer) return;
    currentDocFilename = filename;
    docTitle.textContent = filename || "New Document";
    docEditor.value = content || "";
    docViewer.classList.remove('hidden');
  }

  function closeDocumentViewer() {
    if (!docViewer) return;
    docViewer.classList.add('hidden');
    currentDocFilename = null;
  }

  async function saveCurrentDocument() {
    if (!currentDocFilename || !docEditor) return;
    const content = docEditor.value;
    try {
      const response = await fetch('http://localhost:3001/api/inventory/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: currentDocFilename, content })
      });
      if (response.ok) {
        btnSaveDoc.textContent = "Saved!";
        setTimeout(() => btnSaveDoc.textContent = "Save", 2000);
      } else {
        alert("Failed to save document");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving document to Inventory");
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
      appendMessage(`<strong>[Mode Activated]</strong> Hands-Free Mode initiated. The system will automatically capture your voice and respond aloud. Grant microphone access to proceed.`, false);
      PhoneVoice.startListening();
    } else {
      appendMessage(`<strong>[Mode Deactivated]</strong> Hands-Free Mode offline. Manual controls restored.`, false);
      PhoneVoice.stopListening();
    }
  }

  // Append a bubble to the feed
  function appendMessage(text, isUser = false, imageBase64 = null) {
    if (!chatFeed) return;

    const div = document.createElement('div');
    div.className = `chat-message ${isUser ? 'user' : 'agent'}`;
    
    let contentHTML = `<p>${text}</p>`; // Allow HTML for links
    
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

    // Harvest and reset keystroke metrics
    const ksMetrics = PhoneKeystrokes.getMetrics();
    if (typeof VAAM !== 'undefined') {
      VAAM.recordKeystrokes(ksMetrics);
    }
    PhoneKeystrokes.reset();

    // Clear input and previews
    chatUserInput.value = '';
    clearImageAttachment();

    // 1. Append User Message
    appendMessage(escapeHTML(text), true, imageToSend);

    // Stop listening while generating
    if (handsFreeEnabled) {
      PhoneVoice.stopListening();
    }

    // 2. Handle Guild Routing (Layers 2 & 3: Agency & Attention Stewardship)
    if (isAwaitingEmailDraftPermission) {
      if (text.toLowerCase().match(/\b(yes|yeah|sure|okay|ok|do it|please)\b/)) {
        isAwaitingEmailDraftPermission = false;
        
        // Pull real mentor email from the Mentorship Portal
        let mentorEmail = 'guild@example.com';
        let mentorName = 'Guild Master';
        try {
          const saved = localStorage.getItem('zen_mentor');
          if (saved) {
            const mentor = JSON.parse(saved);
            if (mentor.email) mentorEmail = mentor.email;
            if (mentor.name) mentorName = mentor.name;
          }
        } catch (e) {}

        const state = PhoneState.load();
        const clientName = state.name || 'Your Client';

        const emailBody = `Hi ${mentorName},\n\nI'm reaching out because I've been feeling a lot of emotional load recently, specifically regarding:\n\n"${cachedDistressText}"\n\nI wanted to share this with you so we can discuss it in our next session.\n\nBest,\n${clientName}`;
        const mailtoLink = `mailto:${encodeURIComponent(mentorEmail)}?subject=Checking In - Support Needed&body=${encodeURIComponent(emailBody)}`;
        
        const htmlMsg = `Here is a draft for <strong>${escapeHTML(mentorName)}</strong>. <a href="${mailtoLink}" target="_blank" style="color:var(--color-accent); text-decoration:underline;">Click here to open in your email client</a>, or copy it below:<br><br><pre style="white-space: pre-wrap; background: var(--color-surface); padding: var(--space-xs); border-radius: var(--radius-sm); font-size: 0.8rem; margin: 8px 0; border: 1px solid var(--color-border);">${escapeHTML(emailBody)}</pre>You can also use the <strong>Mentor Portal</strong> tab to send a full weekly check-in. Are you ready to return to our work in the <strong>${PEARL.getState()}</strong> phase?`;
        
        appendMessage(htmlMsg, false);
      } else {
        isAwaitingEmailDraftPermission = false;
        appendMessage("I understand. Whenever you are ready, we can return to the work.", false);
      }
      return;
    }

    // 3. Check Raid Intervention (Layer 1: Boundary Setting)
    if (typeof PEARL !== 'undefined' && PEARL.checkRaidIntervention(text)) {
      isWaitingForResponse = false;
      updateStatus('Standing by', 'ready');
      appendMessage("I am a System Console, and this sounds like a deeply important Raid best explored with a human Paladin. Would you like me to draft an SOS summarizing what we just discussed so you can share it with them?", false);
      return;
    }

    // 4. Append typing indicator / stream container
    const agentMsgDiv = document.createElement('div');
    agentMsgDiv.className = 'chat-message agent';
    agentMsgDiv.id = 'typing-indicator';
    const textP = document.createElement('p');
    textP.innerHTML = '<em>Thinking...</em>';
    agentMsgDiv.appendChild(textP);
    chatFeed.appendChild(agentMsgDiv);
    chatFeed.scrollTop = chatFeed.scrollHeight;

    // 5. Fetch response from AI with PEARL context and Language
    let promptContext = "";
    if (typeof PEARL !== 'undefined') {
      promptContext = PEARL.getSystemPromptModifier() + "\n";
    }
    const state = PhoneState.load();
    const lang = state.language === 'es' ? 'Spanish' : 'English';
    promptContext += `IMPORTANT: You must respond entirely in ${lang}.\n\n`;

    let response;
    let accumulatedText = "";
    const onChunk = (chunk) => {
      if (accumulatedText === "") {
        textP.innerHTML = ""; // Clear "Thinking..."
      }
      accumulatedText += chunk;
      textP.textContent = accumulatedText;
      chatFeed.scrollTop = chatFeed.scrollHeight;
    };
    
    // The Worker Route Trigger
    if (text.trim().startsWith('/work ')) {
      const taskDescription = text.trim().substring(6);
      console.log('[phonethagoras] Routing to Worker Model for:', taskDescription);
      response = await PhoneAI.work(promptContext + taskDescription);
    } else {
      // Standard Chat Router
      response = await PhoneAI.chat(promptContext + text, imageToSend, onChunk);
    }

    // 5. Handle Tool Calls vs Standard Messages
    if (response && response.type === 'tool_call') {
      agentMsgDiv.remove();
      handleToolCall(response.call);
      return;
    }

    // Clean up typing indicator ID and set final formatted text
    agentMsgDiv.removeAttribute('id');
    if (response && response.message && response.message.content) {
      let finalContent = response.message.content;
      textP.innerHTML = escapeHTML(finalContent).replace(/\n/g, '<br>');
    } else {
      // Fallback if response structure is missing
      agentMsgDiv.remove();
    }

    // 6. Speak response if enabled
    if (ttsEnabled) {
      await PhoneVoice.speak(response);
    } else {
      if (handsFreeEnabled) {
        PhoneVoice.startListening();
      }
    }

    // 7. Advance PEARL Phase
    if (typeof PEARL !== 'undefined') {
      PEARL.advanceState(text);
      let state = PhoneState.load();
      state.pearlState = PEARL.getState();
      PhoneState.save(state);
    }

    // 8. Dynamically update attributes based on user message keywords
    adaptStateBasedOnMessage(text);
  }

  async function handleToolCall(call) {
    const args = JSON.parse(call.function.arguments);
    const { name } = call.function;

    let htmlMsg = ``;
    if (name === 'read_file') {
      htmlMsg = `I need to read your file <strong>${args.filename}</strong> to proceed.`;
    } else if (name === 'write_file') {
      htmlMsg = `I have drafted an update for <strong>${args.filename}</strong>:<br><pre style="white-space: pre-wrap; background: var(--color-surface); padding: var(--space-xs); border-radius: var(--radius-sm); font-size: 0.8rem; margin: 8px 0; border: 1px solid var(--color-border); max-height: 200px; overflow-y: auto;">${escapeHTML(args.content)}</pre>Do you approve these changes?`;
    } else if (name === 'web_search') {
      htmlMsg = `I want to search the web for <strong>"${args.query}"</strong>.`;
    } else if (name === 'read_url') {
      htmlMsg = `I want to read the webpage at <a href="${args.url}" target="_blank" style="color:var(--color-accent);">${args.url}</a>. Do you approve?`;
    } else if (name === 'remember_fact') {
      htmlMsg = `I want to extract the following skill for your S.I.L.K. profile (System for Interactive Learning & Knowledge):<br><strong>"${args.fact}"</strong><br>Do you approve?`;
    } else if (name === 'semantic_search') {
      htmlMsg = `I want to search your Inventory for:<br><strong>"${args.query}"</strong><br>Do you approve?`;
    } else if (name === 'generate_casework_summary') {
      htmlMsg = `I want to generate a Party Sync for your Guild and save it to your Inventory.<br><br><strong>Summary:</strong> ${args.summary}<br><br>Do you approve?`;
    } else {
      htmlMsg = `I want to execute the tool <strong>${name}</strong> with arguments: <code>${JSON.stringify(args)}</code>. Do you approve?`;
    }

    const toolCallId = 'tool_' + Date.now();
    htmlMsg += `
      <div style="margin-top: 10px; display: flex; gap: 10px;" id="${toolCallId}">
        <button onclick="window.approveToolCall('${toolCallId}', '${name}', '${encodeURIComponent(JSON.stringify(args))}')" style="background: var(--color-accent); color: white; padding: 5px 15px; border-radius: 4px; font-weight: bold;">Approve</button>
        <button onclick="window.denyToolCall('${toolCallId}')" style="background: transparent; color: var(--color-text-muted); border: 1px solid var(--color-border); padding: 5px 15px; border-radius: 4px;">Deny</button>
      </div>
    `;

    appendMessage(htmlMsg, false);
  }

  async function sendSystemMessageToAI(msg) {
    appendMessage(msg, true);
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message agent';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = '<p>Thinking...</p>';
    chatFeed.appendChild(typingDiv);
    chatFeed.scrollTop = chatFeed.scrollHeight;

    let promptContext = "";
    if (typeof PEARL !== 'undefined') promptContext = PEARL.getSystemPromptModifier() + "\n";
    
    const response = await PhoneAI.chat(promptContext + msg, null);
    
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) typingIndicator.remove();

    if (response && response.type === 'tool_call') {
      handleToolCall(response.call);
      return;
    }

    appendMessage(response, false);
  }

  // Global handlers for the tool call buttons
  window.approveToolCall = async (divId, name, argsStr) => {
    document.getElementById(divId).innerHTML = "<em>Action approved.</em>";
    const args = JSON.parse(decodeURIComponent(argsStr));

    try {
      if (name === 'read_file') {
        const res = await fetch(`http://localhost:3001/api/inventory/read?file=${args.filename}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        openDocumentViewer(args.filename, data.content);
        sendSystemMessageToAI(`(System) I have read the file. Here is the content:\n\n${data.content}`);
      } else if (name === 'write_file') {
        const res = await fetch(`http://localhost:3001/api/inventory/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        openDocumentViewer(args.filename, args.content);
        sendSystemMessageToAI(`(System) I have successfully updated the file ${args.filename}. What next?`);
      } else if (name === 'web_search') {
        const res = await fetch(`http://localhost:3001/api/search?q=${encodeURIComponent(args.query)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        sendSystemMessageToAI(`(System) Web Search Results:\n\n${JSON.stringify(data.results.slice(0, 5))}`);
      } else if (name === 'read_url') {
        const res = await fetch(`http://localhost:3001/api/fetch?url=${encodeURIComponent(args.url)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        sendSystemMessageToAI(`(System) Webpage Content:\n\n${data.text}`);
      } else if (name === 'remember_fact') {
        const res = await fetch(`http://localhost:3001/api/memory/remember`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fact: args.fact })
        });
        sendSystemMessageToAI(`(System) Skill saved to S.I.L.K. profile.`);
      } else if (name === 'semantic_search') {
        const res = await fetch(`http://localhost:3001/api/inventory/search?q=${encodeURIComponent(args.query)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const searchResults = data.results.map(r => `File: ${r.filename}\nContent:\n${r.content}`).join('\n\n---\n\n');
        sendSystemMessageToAI(`(System) Semantic Search Results from Inventory:\n\n${searchResults}`);
      } else if (name === 'generate_casework_summary') {
        // Fetch recent memories
        const memoryRes = await fetch(`http://localhost:3001/api/memory/recall`);
        const memoryData = await memoryRes.json();
        const facts = (memoryData.facts || []).map(f => `- ${f.fact} (${f.created_at})`).join('\n');
        
        const timestamp = new Date().toISOString().split('T')[0];
        const reportContent = `# ACAP Casework Summary\n**Date:** ${timestamp}\n\n## AI Summary\n${args.summary}\n\n## Recent S.I.L.K. Skill Extractions\n${facts}`;
        
        const filename = `casework_summary_${timestamp}.md`;
        const writeRes = await fetch(`http://localhost:3001/api/inventory/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, content: reportContent })
        });
        
        if (!writeRes.ok) throw new Error("Failed to write summary file");
        
        openDocumentViewer(filename, reportContent);
        sendSystemMessageToAI(`(System) Generated casework summary and saved to ${filename}.`);
      }
    } catch (e) {
      console.error(e);
      sendSystemMessageToAI(`(System) Tool execution failed: ${e.message}`);
    }
  };

  window.denyToolCall = (divId) => {
    document.getElementById(divId).innerHTML = "<em>Action denied.</em>";
    sendSystemMessageToAI(`(System) The user denied the action.`);
  };

  function adaptStateBasedOnMessage(text) {
    const cleanText = text.toLowerCase();
    let state = PhoneState.load();

    // Require compound phrases that signal genuine engagement, not single common words.
    // Only bump at most ONE stat per message to prevent inflation.
    const signals = [
      { stat: 'mind',  patterns: [/\b(figur\w+ out|thinking about|understand|analyz|research|study|learn\w+ about|read\w+ about|curious about)\b/] },
      { stat: 'heart', patterns: [/\b(feel\w+ (like|about|scared|brave|strong)|open\w* up|trust\w* (my|the)|love\w* (my|the)|emotional|vulnerable)\b/] },
      { stat: 'body',  patterns: [/\b(work\w* out|exercis|breath\w* (in|deep)|physical|my body|somatic|health\w* (goal|plan))\b/] },
      { stat: 'act',   patterns: [/\b(build\w* (a|my|the)|start\w* (a|my)|project|creat\w* (a|my)|apply\w* (for|to)|launch|ship)\b/] },
    ];

    for (const { stat, patterns } of signals) {
      const matched = patterns.some(p => p.test(cleanText));
      if (matched) {
        state.shape[stat] = Math.min(state.shape[stat] + 1, 100);
        PhoneState.save(state);
        console.log(`[phone-chat] Adapted state: +1 ${stat} from deliberate language`);
        return; // Only one bump per message
      }
    }
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── 10. Server-Sent Events (SSE) Listener ───
  function initSSE() {
    const evtSource = new EventSource('http://localhost:3001/api/events');
    evtSource.addEventListener("file_updated", (event) => {
      try {
        const data = JSON.parse(event.data);
        appendMessage(`<strong>[System Alert]</strong> The Guild Master or an external process just updated the file: <code>${data.filename}</code> in your Inventory.<br><br>Type <code>/work Please read ${data.filename}</code> to review the new changes.`, false);
        if (ttsEnabled) {
          PhoneVoice.speak(`Alert: The file ${data.filename} was just updated in your inventory.`);
        }
      } catch(e){}
    });
    evtSource.onerror = (err) => {
      console.warn("SSE Error (Sidecar might be offline)");
    };
  }

  // Delay starting SSE to ensure sidecar is up and we don't block main init
  setTimeout(initSSE, 2000);

  return {
    init
  };
})();
