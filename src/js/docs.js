/**
 * DOCS TRANSLATION & HANDS-FREE QUESTIONNAIRE MODULE — phone.com
 * 
 * Enables Guild Officers to drop Quest intake documents into a shared space.
 * The client's AI interprets them, parses the client "character sheet" state,
 * structures it as a dynamic resume (Skills, Attitudes, Ambitions),
 * and conducts a hands-free voice questionnaire to complete missing fields.
 */

import { PhoneState } from './state.js';
import { PhoneVoice } from './voice.js';
import { PhoneChat } from './chat.js';
import { PhoneSync } from './sync.js';

export const PhoneDocs = (() => {
  let docListContainer, formPanel, skillsContainer, attitudesContainer, ambitionsContainer;
  let startVoiceBtn, stopVoiceBtn, voiceStatusText, downloadDocBtn;
  let activeDocument = null;
  let originalChatCallbacks = null;
  
  // WIOA Template Structured by Skills, Attitudes, and Ambitions
  const availableTemplates = [
    {
      id: 'wioa-intake',
      name: 'WIOA_Workforce_Readiness_Plan.json',
      title: 'WIOA Workforce Readiness Plan & Intake Form',
      description: 'Intake resume and developmental mapping plan for transitional placement.',
      
      // 1. SKILLS (From shape attributes & narrative)
      skills: [
        { key: 'client_name', label: 'Client Name / Identifier', statePath: 'name' },
        { key: 'narrative', label: 'Lived Experience Summary', statePath: 'story', format: (v) => v ? v.substring(0, 100) + '...' : 'No narrative logged yet.' },
        { key: 'mind_skill', label: 'Cognitive Reasoning (Mind)', statePath: 'shape.mind', format: (v) => `${v}/100 [Sage Capacity]` },
        { key: 'heart_skill', label: 'Emotional Resilience (Heart)', statePath: 'shape.heart', format: (v) => `${v}/100 [Hero Capacity]` },
        { key: 'body_skill', label: 'Social Connection (Body)', statePath: 'shape.body', format: (v) => `${v}/100 [Caregiver Capacity]` },
        { key: 'act_skill', label: 'Execution Readiness (Act)', statePath: 'shape.act', format: (v) => `${v}/100 [Jester Capacity]` }
      ],

      // 2. ATTITUDES (From roots & pulse)
      attitudes: [
        { key: 'own_attitude', label: 'Internal Locus of Control (Autonomy)', statePath: 'roots.own', format: (v) => `${(v * 100).toFixed(0)}% sovereignty` },
        { key: 'bond_attitude', label: 'Tribal Integration (Relatedness)', statePath: 'roots.bond', format: (v) => `${(v * 100).toFixed(0)}% connection` },
        { key: 'skill_attitude', label: 'Mastery Drive (Competence)', statePath: 'roots.skill', format: (v) => `${(v * 100).toFixed(0)}% capability` },
        { key: 'focus_attitude', label: 'Attention Stewardship (Focus)', statePath: 'pulse.focus', format: (v) => `${(v * 100).toFixed(0)}% control` },
        { key: 'guard_resilience', label: 'Autonomic Regulation (Guard)', statePath: 'pulse.guard', format: (v) => `${(v * 100).toFixed(0)}% stability` }
      ],

      // 3. AMBITIONS (From walk goals + interactive voice questionnaire)
      ambitionsStatic: [
        { key: 'current_milestone', label: 'Active Development Path', statePath: 'walk.path.goal' },
        { key: 'current_dare', label: 'Current Active Challenge', statePath: 'walk.dare' }
      ],
      voiceQuestions: [
        { key: 'target_industry', label: 'Target Employment Industry', question: 'What is your target employment industry?', value: '', placeholder: 'e.g., Technology, Healthcare, Construction' },
        { key: 'start_date', label: 'Preferred Start Date', question: 'What is your preferred start date?', value: '', placeholder: 'e.g., Immediate, Next month' },
        { key: 'weekly_hours', label: 'Available Weekly Hours', question: 'How many weekly hours are you available to work?', value: '', placeholder: 'e.g., 20, 30, 40 hours' },
        { key: 'primary_obstacle', label: 'Primary Transitional Obstacle', question: 'What is your primary transitional obstacle right now?', value: '', placeholder: 'e.g., Transportation, Childcare, Housing' }
      ]
    }
  ];

  let currentQuestionIdx = -1;
  let voiceActive = false;

  function init() {
    docListContainer = document.getElementById('docs-list');
    formPanel = document.getElementById('card-doc-form');
    skillsContainer = document.getElementById('doc-skills-fields');
    attitudesContainer = document.getElementById('doc-attitudes-fields');
    ambitionsContainer = document.getElementById('doc-ambitions-fields');
    startVoiceBtn = document.getElementById('btn-start-voice-qa');
    stopVoiceBtn = document.getElementById('btn-stop-voice-qa');
    voiceStatusText = document.getElementById('voice-qa-status');
    downloadDocBtn = document.getElementById('btn-download-completed-doc');

    if (!docListContainer) return;

    renderSharedFolderList();

    startVoiceBtn.addEventListener('click', startVoiceQuestionnaire);
    stopVoiceBtn.addEventListener('click', stopVoiceQuestionnaire);
    downloadDocBtn.addEventListener('click', downloadCompletedDoc);
  }

  function renderSharedFolderList() {
    docListContainer.innerHTML = '';
    
    // Check if Google Drive is authorized
    let isDriveConnected = false;
    if (typeof PhoneSync !== 'undefined') {
      const auth = PhoneSync.getAuthState();
      isDriveConnected = !!(auth && auth.authorized);
    }

    if (!isDriveConnected) {
      docListContainer.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--color-text-dim); border: 1px dashed var(--color-border); border-radius: 6px;">
          <p style="font-size: 0.85rem; margin-bottom: 1rem;">Connect your Google Drive in Settings to access shared guild folders.</p>
          <button class="btn btn-secondary" onclick="document.getElementById('nav-settings').click()" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Go to Settings</button>
        </div>
      `;
      return;
    }

    availableTemplates.forEach(tpl => {
      const div = document.createElement('div');
      div.className = 'doc-item';
      div.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: var(--color-surface-2);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        margin-bottom: 0.8rem;
        transition: border-color var(--transition-fast);
      `;
      
      div.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.2rem; max-width: 75%;">
          <span style="font-size: 0.85rem; font-family: var(--font-mono); color: var(--color-accent); font-weight: 500;">📄 ${tpl.name}</span>
          <span style="font-size: 0.85rem; font-weight: 500; color: var(--color-text);">${tpl.title}</span>
          <span style="font-size: 0.75rem; color: var(--color-text-muted);">${tpl.description}</span>
        </div>
        <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Translate & Autofill</button>
      `;

      div.querySelector('button').addEventListener('click', () => selectTemplate(tpl));
      docListContainer.appendChild(div);
    });
  }

  function resolveStateValue(state, path) {
    const parts = path.split('.');
    let val = state;
    for (const part of parts) {
      if (val === null || val === undefined) return undefined;
      val = val[part];
    }
    return val;
  }

  function selectTemplate(tpl) {
    activeDocument = JSON.parse(JSON.stringify(tpl)); // Deep copy template
    const state = PhoneState.load();

    // 1. Populate Skills (Autofilled)
    skillsContainer.innerHTML = '';
    activeDocument.skills.forEach(f => {
      const rawVal = resolveStateValue(state, f.statePath);
      const val = f.format ? f.format(rawVal) : rawVal;
      renderAutofillRow(skillsContainer, f.label, val);
    });

    // 2. Populate Attitudes (Autofilled)
    attitudesContainer.innerHTML = '';
    activeDocument.attitudes.forEach(f => {
      const rawVal = resolveStateValue(state, f.statePath);
      const val = f.format ? f.format(rawVal) : rawVal;
      renderAutofillRow(attitudesContainer, f.label, val);
    });

    // 3. Populate static Ambitions (Autofilled) and Dynamic Voice Questions
    ambitionsContainer.innerHTML = '';
    // Static ones first
    activeDocument.ambitionsStatic.forEach(f => {
      const rawVal = resolveStateValue(state, f.statePath);
      const val = f.format ? f.format(rawVal) : rawVal;
      renderAutofillRow(ambitionsContainer, f.label, val);
    });

    // Append a separator
    const sep = document.createElement('div');
    sep.style.cssText = 'margin: 1rem 0 0.5rem 0; padding-bottom: 0.3rem; border-bottom: 1px dashed var(--color-border); font-size: 0.75rem; text-transform: uppercase; color: var(--color-accent); font-family: var(--font-mono); font-weight: bold;';
    sep.textContent = 'Voice Verification Questions';
    ambitionsContainer.appendChild(sep);

    // Render interactive voice fields
    activeDocument.voiceQuestions.forEach((q, idx) => {
      const div = document.createElement('div');
      div.id = `voice-field-row-${idx}`;
      div.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        padding: 0.8rem;
        border-radius: var(--radius-sm);
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-border);
        margin-top: 0.5rem;
        transition: all var(--transition-fast);
      `;
      div.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem;">
          <span style="font-weight: 500; color: var(--color-text-muted);">${q.label}</span>
          <span class="voice-field-status" id="voice-field-status-${idx}" style="color: var(--color-text-dim);">[Empty]</span>
        </div>
        <input type="text" id="voice-input-${idx}" style="width: 100%; background: var(--color-surface-2); border: 1px solid var(--color-border); border-radius: 4px; padding: 0.4rem; color: var(--color-text); font-size: 0.85rem;" placeholder="${q.placeholder}" value="${q.value}">
      `;
      
      const input = div.querySelector('input');
      input.addEventListener('change', () => {
        q.value = input.value;
        updateFieldRowUI(idx);
        checkFormCompletion();
      });

      ambitionsContainer.appendChild(div);
    });

    // Show Form Card
    formPanel.classList.remove('hidden');
    formPanel.scrollIntoView({ behavior: 'smooth' });

    // Reset Q&A index
    currentQuestionIdx = -1;
    updateVoiceStatusUI();
  }

  function renderAutofillRow(container, label, val) {
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--color-border-subtle); font-size: 0.85rem;';
    div.innerHTML = `
      <span style="color: var(--color-text-muted);">${label}</span>
      <span style="font-weight: 500; color: var(--color-success); text-align: right; word-break: break-all; max-width: 60%;">${val || '—'} <span style="font-size: 0.7rem; opacity: 0.8; white-space: nowrap;">[Autofilled]</span></span>
    `;
    container.appendChild(div);
  }

  function updateFieldRowUI(idx) {
    const row = document.getElementById(`voice-field-row-${idx}`);
    const status = document.getElementById(`voice-field-status-${idx}`);
    const input = document.getElementById(`voice-input-${idx}`);
    const q = activeDocument.voiceQuestions[idx];

    if (!row || !status || !input) return;

    input.value = q.value;

    if (q.value.trim().length > 0) {
      row.style.borderColor = 'var(--color-success)';
      row.style.background = 'hsla(145, 65%, 48%, 0.03)';
      status.textContent = '[Completed]';
      status.style.color = 'var(--color-success)';
    } else {
      row.style.borderColor = 'var(--color-border)';
      row.style.background = 'var(--color-bg-elevated)';
      status.textContent = '[Empty]';
      status.style.color = 'var(--color-text-dim)';
    }
  }

  function updateVoiceStatusUI() {
    if (!voiceStatusText) return;
    if (voiceActive) {
      startVoiceBtn.classList.add('hidden');
      stopVoiceBtn.classList.remove('hidden');
      voiceStatusText.textContent = `Active: Question ${currentQuestionIdx + 1}/${activeDocument.voiceQuestions.length}`;
      voiceStatusText.style.color = 'var(--color-accent)';
    } else {
      startVoiceBtn.classList.remove('hidden');
      stopVoiceBtn.classList.add('hidden');
      voiceStatusText.textContent = `Voice Questionnaire Standby`;
      voiceStatusText.style.color = 'var(--color-text-muted)';
    }
  }

  function startVoiceQuestionnaire() {
    if (!activeDocument) return;
    voiceActive = true;
    updateVoiceStatusUI();

    // Store original chat callbacks to restore them later
    if (typeof PhoneChat !== 'undefined') {
      originalChatCallbacks = {
        onChange: (text) => {
          const input = document.getElementById('chat-user-input');
          if (input) input.value = text;
        },
        onFinal: (text) => {
          // Normal chat submit
        }
      };
    }

    // Set voice callbacks for the document form questionnaire
    PhoneVoice.setCallbacks(
      // On interim speech
      (text) => {
        if (currentQuestionIdx >= 0 && currentQuestionIdx < activeDocument.voiceQuestions.length) {
          const input = document.getElementById(`voice-input-${currentQuestionIdx}`);
          if (input) input.value = text;
        }
      },
      // On final speech
      (text) => {
        handleSpokenAnswer(text);
      }
    );

    PhoneVoice.setTTSEnabled(true);
    PhoneVoice.setHandsFree(true);

    currentQuestionIdx = 0;
    speakNextQuestion();
  }

  function stopVoiceQuestionnaire() {
    voiceActive = false;
    PhoneVoice.cancel();
    PhoneVoice.setHandsFree(false);
    
    if (originalChatCallbacks) {
      PhoneVoice.setCallbacks(originalChatCallbacks.onChange, originalChatCallbacks.onFinal);
    }

    updateVoiceStatusUI();
    currentQuestionIdx = -1;
  }

  async function speakNextQuestion() {
    if (!voiceActive) return;
    const questions = activeDocument.voiceQuestions;

    if (currentQuestionIdx >= questions.length) {
      completeIntakeForm();
      return;
    }

    const q = questions[currentQuestionIdx];
    
    // Highlight the active voice question row
    for (let i = 0; i < questions.length; i++) {
      const row = document.getElementById(`voice-field-row-${i}`);
      if (row) {
        if (i === currentQuestionIdx) {
          row.style.borderColor = 'var(--color-accent)';
          row.style.boxShadow = '0 0 10px hsla(38, 92%, 56%, 0.1)';
        } else {
          row.style.boxShadow = 'none';
          updateFieldRowUI(i);
        }
      }
    }

    let intro = '';
    if (currentQuestionIdx === 0) {
      intro = 'Starting your character sheet intake. Please answer aloud after each question. Question one: ';
    } else {
      intro = `Question ${currentQuestionIdx + 1}: `;
    }

    const speakText = intro + q.question;
    voiceStatusText.textContent = `Speaking: "${q.question}"`;

    await PhoneVoice.speak(speakText);
    voiceStatusText.textContent = `Listening for: "${q.label}"...`;
    updateVoiceStatusUI();
  }

  function handleSpokenAnswer(answerText) {
    if (!voiceActive || currentQuestionIdx < 0) return;
    
    const questions = activeDocument.voiceQuestions;
    const q = questions[currentQuestionIdx];

    q.value = answerText;
    updateFieldRowUI(currentQuestionIdx);

    currentQuestionIdx++;
    speakNextQuestion();
  }

  function checkFormCompletion() {
    if (!activeDocument) return false;
    const allVoiceDone = activeDocument.voiceQuestions.every(q => q.value.trim().length > 0);
    if (allVoiceDone) {
      downloadDocBtn.disabled = false;
      return true;
    }
    downloadDocBtn.disabled = true;
    return false;
  }

  async function completeIntakeForm() {
    voiceActive = false;
    updateVoiceStatusUI();
    PhoneVoice.setHandsFree(false);

    if (originalChatCallbacks) {
      PhoneVoice.setCallbacks(originalChatCallbacks.onChange, originalChatCallbacks.onFinal);
    }

    voiceStatusText.textContent = 'Intake Plan Synced successfully!';
    voiceStatusText.style.color = 'var(--color-success)';

    await PhoneVoice.speak('Character sheet resume compilation complete. Synced to Google Drive share.');

    // Save to PhoneSync mock drive files
    if (typeof PhoneSync !== 'undefined') {
      const files = PhoneSync.getDriveFiles();
      const filename = `Completed_${activeDocument.name}`;
      
      const payload = {
        title: activeDocument.title,
        completedAt: new Date().toISOString(),
        skills: {},
        attitudes: {},
        ambitions: {}
      };

      const state = PhoneState.load();
      activeDocument.skills.forEach(f => {
        payload.skills[f.key] = resolveStateValue(state, f.statePath);
      });
      activeDocument.attitudes.forEach(f => {
        payload.attitudes[f.key] = resolveStateValue(state, f.statePath);
      });
      activeDocument.ambitionsStatic.forEach(f => {
        payload.ambitions[f.key] = resolveStateValue(state, f.statePath);
      });
      activeDocument.voiceQuestions.forEach(q => {
        payload.ambitions[q.key] = q.value;
      });

      files[filename] = {
        content: payload,
        syncedAt: new Date().toISOString()
      };
      
      localStorage.setItem('zen_mock_drive_files', JSON.stringify(files));
    }

    checkFormCompletion();
  }

  function downloadCompletedDoc() {
    if (!activeDocument) return;
    
    const payload = {
      title: activeDocument.title,
      completedAt: new Date().toISOString(),
      skills: {},
      attitudes: {},
      ambitions: {}
    };

    const state = PhoneState.load();
    activeDocument.skills.forEach(f => {
      payload.skills[f.key] = resolveStateValue(state, f.statePath);
    });
    activeDocument.attitudes.forEach(f => {
      payload.attitudes[f.key] = resolveStateValue(state, f.statePath);
    });
    activeDocument.ambitionsStatic.forEach(f => {
      payload.ambitions[f.key] = resolveStateValue(state, f.statePath);
    });
    activeDocument.voiceQuestions.forEach(q => {
      payload.ambitions[q.key] = q.value;
    });

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Completed_${activeDocument.name}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    init,
    renderSharedFolderList
  };
})();

