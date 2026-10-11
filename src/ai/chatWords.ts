// The handful of things people type at a chat that are not a task: a yes, a
// never mind, a hello, a thank you, a "what can you do". Matched on the whole
// message only, so a real line that happens to contain "no" or "ok" ("no tax",
// "ok make it 25") is never caught here. Checked before the parser, which would
// otherwise answer each of these with the pick-what-you-meant list.
export type ChatWord = 'confirm' | 'cancel' | 'greeting' | 'thanks' | 'help' | 'managerUnlock' | 'managerLock';

const WORDS: Record<Exclude<ChatWord, 'managerUnlock' | 'managerLock'>, RegExp> = {
  confirm:
    /^(?:y|ya|yes|yep|yup|yeah|ok|okay|k|kk|sure|confirm|confirmed|correct|right|good|go|go ahead|do it|done|save|save it|add it|thats it|that is it|thats right|that is right|looks good|looks right|all good|perfect)$/,
  cancel:
    /^(?:n|no|nope|nah|cancel|cancel it|cancel that|nvm|nevermind|never mind|forget it|forget that|scrap it|scrap that|not now|stop|undo|delete that|delete it|remove it|remove that|wait no|no wait|lol nvm|oops)$/,
  greeting: /^(?:hi|hii|hey|heya|hello|yo|sup|good morning|good afternoon|good evening|morning)$/,
  thanks: /^(?:thanks|thank you|thankyou|thx|ty|tysm|cheers|great thanks|ok thanks|okay thanks|thanks a lot)$/,
  help: /^(?:help|help me|what can you do|what can i do|what can i ask|what do you do|how does this work|how do i use this|what is this|commands|examples|\?+)$/,
};

// Lowercase, drop punctuation and a trailing "please", squeeze the spaces.
const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9? ]+/g, ' ')
    .replace(/\b(?:please|pls|plz)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function classifyChatWord(text: string): ChatWord | null {
  const exact = text.trim().toLowerCase();
  if (/^(?:manager|manager sign in|manager login|unlock|sign in as manager)$/.test(exact)) return 'managerUnlock';
  if (/^(?:lock|manager off|lock manager)$/.test(exact)) return 'managerLock';
  const t = normalize(text);
  if (!t || t.length > 24) return null;
  for (const kind of Object.keys(WORDS) as (keyof typeof WORDS)[]) {
    if (WORDS[kind].test(t)) return kind;
  }
  return null;
}

// What AI Mode says when asked what it can do. Short, in the words staff use.
export const HELP_TEXT =
  'Type it the way you would say it. A few that work: "refill for Sarah, HP 65, $34", "ups to toronto 22", ' +
  '"2 kw1", "sale 3 pens 4.50", "track 1Z...", "note call Bob back", "is the hp 65 in stock", "who works saturday". ' +
  'I show a slip to check before anything is saved. Type yes to confirm it, or tell me what to change.';
