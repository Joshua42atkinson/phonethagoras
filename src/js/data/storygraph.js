// ════════════════════════════════════════════════════════════
// StoryGraph Adapter
// ════════════════════════════════════════════════════════════
// Converts Rust `StoryGraph` JSON into the React player's
// curriculum format. This bridges the Leptos authoring tool
// with the playdaydream.com player.
//
// Expected input shape (from common/src/expert.rs):
//   {
//     nodes: [
//       {
//         id, title, content, subject_word,
//         image_url, audio_url, target_freq,
//         choices: [{ id, label, description, leads_to, pitch_gate }]
//       }
//     ],
//     connections: [{ from, to }]
//   }
//
// Output shape (React curriculum):
//   {
//     id, title, description, ageRange, wordCount, start,
//     nodes: { [id]: { id, title, focusWord, channel, story, image,
//                     depth, droneHz, exits: { up, right, down, left } } }
//   }

const Channel = Object.freeze({
  MIND:   'mind',
  HEART:  'heart',
  BODY:   'body',
  ACTION: 'act',
});

// Simple heuristic: map focus words to channels
const WORD_TO_CHANNEL = {
  presence: Channel.BODY,
  bias: Channel.MIND,
  patience: Channel.BODY,
  resilience: Channel.ACTION,
  clarity: Channel.MIND,
  feelings: Channel.HEART,
  joy: Channel.HEART,
  worry: Channel.BODY,
  sadness: Channel.BODY,
  brave: Channel.ACTION,
  courage: Channel.ACTION,
  wonder: Channel.HEART,
  growth: Channel.ACTION,
};

function guessChannel(focusWord) {
  const key = focusWord?.toLowerCase();
  return WORD_TO_CHANNEL[key] || Channel.HEART;
}

function guessVirtue(choiceLabel) {
  const label = choiceLabel.toLowerCase();
  if (label.includes('look') || label.includes('see') || label.includes('closer')) return 'curiosity';
  if (label.includes('speak') || label.includes('say') || label.includes('ask')) return 'courage';
  if (label.includes('sit') || label.includes('quiet') || label.includes('listen')) return 'depth';
  if (label.includes('step') || label.includes('cross') || label.includes('go')) return 'courage';
  if (label.includes('stay') || label.includes('wait')) return 'patience';
  if (label.includes('dance') || label.includes('sing') || label.includes('play')) return 'joy';
  if (label.includes('run')) return 'courage';
  return 'curiosity';
}

// Extract a depth question from content if embedded with --- delimiter
function extractDepth(content) {
  if (!content) return '';
  const parts = content.split('---');
  if (parts.length >= 2) {
    return parts[1].replace(/^\s*depth[:\s]*/i, '').trim();
  }
  return '';
}

function extractStory(content) {
  if (!content) return '';
  const parts = content.split('---');
  return parts[0].trim();
}

// Map StoryGraph choices to directional exits
// choices[0] → up, [1] → right, [2] → down, [3] → left
function mapExits(choices) {
  const dirs = ['up', 'right', 'down', 'left'];
  const exits = { up: null, right: null, down: null, left: null };
  (choices || []).forEach((c, i) => {
    const dir = dirs[i];
    if (!dir) return;
    exits[dir] = {
      label: c.label || 'Continue',
      to: c.leads_to,
      virtue: c.virtue || guessVirtue(c.label),
    };
  });
  return exits;
}

export function adaptStoryGraph(storyGraph) {
  const nodes = storyGraph.nodes || [];
  if (nodes.length === 0) {
    throw new Error('StoryGraph has no nodes');
  }

  // Find start node (first node with no incoming connections, or just first)
  const allTargets = new Set((storyGraph.connections || []).map((c) => c.to));
  const startNode = nodes.find((n) => !allTargets.has(n.id)) || nodes[0];

  // Build React curriculum nodes map
  const curriculumNodes = {};
  nodes.forEach((n) => {
    const focusWord = n.subject_word || n.title || 'Word';
    curriculumNodes[n.id] = {
      id: n.id,
      title: n.title,
      focusWord,
      channel: n.channel || guessChannel(focusWord),
      story: extractStory(n.content),
      image: n.image_url || '/images/threshold.png',
      depth: n.depth || extractDepth(n.content),
      droneHz: n.target_freq || 174.6,
      exits: mapExits(n.choices),
    };
  });

  return {
    id: storyGraph.id || 'custom-adventure',
    title: storyGraph.title || 'Custom Adventure',
    description: storyGraph.description || storyGraph.age_range
      ? `An adventure for ages ${storyGraph.age_range}.`
      : 'An adventure authored just for you.',
    ageRange: storyGraph.age_range || '6-12',
    wordCount: nodes.length,
    start: startNode.id,
    nodes: curriculumNodes,
  };
}
