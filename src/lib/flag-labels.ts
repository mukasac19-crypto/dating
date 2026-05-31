import type { Flag, FlagCategory, AnalysisResult } from '@/types';
import {
  DollarSign,
  ExternalLink,
  Heart,
  Clock,
  ShieldAlert,
  UserX,
  Globe,
  Brain,
  EyeOff,
  AlertCircle,
  Quote,
  Users,
  CalendarX,
  Frown,
  Target,
  MessageSquare,
  Video,
  Hourglass,
  Sprout,
  HeartHandshake,
  Handshake,
  CheckCheck,
  Smile,
  Sun,
  Activity,
  ShieldCheck,
  Sparkles,
  Flower2,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

export type VerdictLevel = 'safe' | 'caution' | 'concerning' | 'danger';

export interface VerdictMeta {
  level: VerdictLevel;
  title: string;
  oneLine: string;
  emoji: string;
  tone: {
    surface: string;
    text: string;
    ring: string;
    accent: string;
    chip: string;
  };
}

const VERDICT_META: Record<VerdictLevel, Omit<VerdictMeta, 'level'>> = {
  safe: {
    title: 'Looks okay',
    oneLine: 'Nothing major stood out. Stay aware and trust your gut.',
    emoji: '🌿',
    tone: {
      surface: 'bg-emerald-50',
      text: 'text-emerald-900',
      ring: 'ring-emerald-200',
      accent: 'text-emerald-700',
      chip: 'bg-emerald-100 text-emerald-800',
    },
  },
  caution: {
    title: 'Take it slow',
    oneLine: 'A few things are worth knowing before you go further.',
    emoji: '🟡',
    tone: {
      surface: 'bg-amber-50',
      text: 'text-amber-950',
      ring: 'ring-amber-200',
      accent: 'text-amber-700',
      chip: 'bg-amber-100 text-amber-900',
    },
  },
  concerning: {
    title: 'Be careful',
    oneLine: 'Several signs here suggest this person may not be safe to trust.',
    emoji: '⚠️',
    tone: {
      surface: 'bg-rose-50',
      text: 'text-rose-950',
      ring: 'ring-rose-200',
      accent: 'text-rose-700',
      chip: 'bg-rose-100 text-rose-900',
    },
  },
  danger: {
    title: 'Step back',
    oneLine: "There are serious warning signs. Please don't ignore them.",
    emoji: '🛑',
    tone: {
      surface: 'bg-red-50',
      text: 'text-red-950',
      ring: 'ring-red-300',
      accent: 'text-red-700',
      chip: 'bg-red-100 text-red-900',
    },
  },
};

export function getVerdict(result: AnalysisResult): VerdictMeta {
  const flags = result.flags || [];
  const hasImmediate = flags.some(
    (f) => f.safetyLevel === 'immediate_danger' || f.severity === 'critical'
  );
  const highRedCount = flags.filter(
    (f) => f.type === 'red' && (f.severity === 'high' || f.severity === 'critical')
  ).length;
  const mediumRedCount = flags.filter(
    (f) => f.type === 'red' && f.severity === 'medium'
  ).length;
  const risk = result.riskScore ?? 0;

  let level: VerdictLevel;
  if (hasImmediate || risk >= 80) {
    level = 'danger';
  } else if (highRedCount >= 1 || risk >= 60) {
    level = 'concerning';
  } else if (mediumRedCount >= 1 || risk >= 30) {
    level = 'caution';
  } else {
    level = 'safe';
  }

  return { level, ...VERDICT_META[level] };
}

interface CategoryLabel {
  title: string;
  oneLine: string;
}

const CATEGORY_LABELS: Record<FlagCategory, CategoryLabel> = {
  financial_ask: {
    title: 'Brought up money',
    oneLine: 'Mentioned money, gifts, or financial help — a common scam signal.',
  },
  off_platform_push: {
    title: 'Wants to move off the app',
    oneLine: 'Pushing to chat on WhatsApp, Telegram, or by phone earlier than usual.',
  },
  love_bombing: {
    title: 'Too much affection, too fast',
    oneLine: 'Strong emotions and grand statements before you really know each other.',
  },
  urgency_pressure: {
    title: 'Rushing you',
    oneLine: "Pressuring decisions or replies on a timeline that isn't yours.",
  },
  boundary_violation: {
    title: 'Pushing past your limits',
    oneLine: "Asking for things after you've said no or expressed discomfort.",
  },
  identity_inconsistency: {
    title: 'Story keeps changing',
    oneLine: 'Details about who they are or where they live don\'t line up.',
  },
  timezone_mismatch: {
    title: "Timezone doesn't add up",
    oneLine: 'Message times don\'t match where they say they are.',
  },
  emotional_manipulation: {
    title: 'Playing on your emotions',
    oneLine: 'Using guilt, sympathy, or flattery to steer the conversation.',
  },
  avoidance_pattern: {
    title: 'Dodges direct questions',
    oneLine: 'Changes the subject or stays vague when asked specifics.',
  },
  suspicious_behavior: {
    title: 'Something feels off',
    oneLine: 'Patterns that don\'t fit a normal getting-to-know-you chat.',
  },
  gaslighting: {
    title: 'Twisting your words',
    oneLine: 'Making you doubt things you said or felt.',
  },
  isolation_attempt: {
    title: 'Trying to separate you from others',
    oneLine: 'Suggesting your friends or family don\'t understand or aren\'t safe.',
  },
  timeline_inconsistency: {
    title: 'Timeline doesn\'t fit',
    oneLine: 'What they say about their past or schedule contradicts itself.',
  },
  guilt_tripping: {
    title: 'Making you feel guilty',
    oneLine: 'Framing your boundaries or pace as unfair to them.',
  },
  remembers_details: {
    title: 'Remembers what you said',
    oneLine: 'Brings up things you mentioned earlier — a sign of real interest.',
  },
  asks_reciprocal_questions: {
    title: 'Curious about you',
    oneLine: 'Asks about your life as much as they share their own.',
  },
  video_call_offer: {
    title: 'Offered to video chat',
    oneLine: 'Willing to be seen on camera — a strong sign they are who they say.',
  },
  respects_pace: {
    title: 'Lets you set the pace',
    oneLine: "Doesn't push for more than you're ready for.",
  },
  patient_response: {
    title: 'Patient with you',
    oneLine: 'Comfortable when replies take time. No pressure.',
  },
  genuine_interest: {
    title: 'Genuinely interested',
    oneLine: 'Engages with what you say rather than steering to themselves.',
  },
  respects_boundaries: {
    title: 'Respects your limits',
    oneLine: 'Backs off when you say no — without pushing back.',
  },
  consistent_communication: {
    title: 'Stays in steady contact',
    oneLine: 'Replies in a predictable, reliable rhythm.',
  },
  emotional_maturity: {
    title: 'Handles emotions well',
    oneLine: 'Talks through feelings calmly rather than reacting.',
  },
  transparency: {
    title: 'Open and honest',
    oneLine: 'Shares about themselves without seeming to hide.',
  },
  healthy_pacing: {
    title: 'Moving at a healthy pace',
    oneLine: 'Things are unfolding naturally, not rushed.',
  },
  mutual_respect: {
    title: 'Respectful',
    oneLine: 'Treats you as an equal — your views, time, and feelings matter.',
  },
  supportive_behavior: {
    title: 'Supportive of you',
    oneLine: 'Encourages you, your relationships, and your independence.',
  },
  authentic_sharing: {
    title: 'Shares about themselves',
    oneLine: 'Opens up about their own life, not just asking about yours.',
  },
  appropriate_vulnerability: {
    title: 'Opens up appropriately',
    oneLine: 'Shows real feelings at a comfortable pace, neither cold nor overwhelming.',
  },
};

export function getCategoryLabel(category: FlagCategory): CategoryLabel {
  return (
    CATEGORY_LABELS[category] || {
      title: category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      oneLine: '',
    }
  );
}

const CATEGORY_ICONS: Record<FlagCategory, LucideIcon> = {
  // red flag categories
  financial_ask: DollarSign,
  off_platform_push: ExternalLink,
  love_bombing: Heart,
  urgency_pressure: Clock,
  boundary_violation: ShieldAlert,
  identity_inconsistency: UserX,
  timezone_mismatch: Globe,
  emotional_manipulation: Brain,
  avoidance_pattern: EyeOff,
  suspicious_behavior: AlertCircle,
  gaslighting: Quote,
  isolation_attempt: Users,
  timeline_inconsistency: CalendarX,
  guilt_tripping: Frown,
  // green flag categories
  remembers_details: Target,
  asks_reciprocal_questions: MessageSquare,
  video_call_offer: Video,
  respects_pace: Hourglass,
  patient_response: Sprout,
  genuine_interest: HeartHandshake,
  respects_boundaries: ShieldCheck,
  consistent_communication: CheckCheck,
  emotional_maturity: Smile,
  transparency: Sun,
  healthy_pacing: Activity,
  mutual_respect: Handshake,
  supportive_behavior: HeartHandshake,
  authentic_sharing: Sparkles,
  appropriate_vulnerability: Flower2,
};

export function getCategoryIcon(category: FlagCategory): LucideIcon {
  return CATEGORY_ICONS[category] || AlertTriangle;
}

export interface PlainFlag {
  id: string;
  type: 'red' | 'green';
  severity: Flag['severity'];
  title: string;
  oneLine: string;
  action?: string;
  raw: Flag;
}

export function toPlainFlag(flag: Flag): PlainFlag {
  const label = getCategoryLabel(flag.category);
  return {
    id: flag.id,
    type: flag.type,
    severity: flag.severity,
    title: label.title,
    oneLine: label.oneLine || flag.message,
    action: flag.whatToDo,
    raw: flag,
  };
}

const SEVERITY_RANK: Record<NonNullable<Flag['severity']>, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function pickTopThings(flags: Flag[], max = 3): PlainFlag[] {
  const reds = flags
    .filter((f) => f.type === 'red')
    .slice()
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.severity ?? 'low'] - SEVERITY_RANK[b.severity ?? 'low']
    );
  const greens = flags.filter((f) => f.type === 'green');

  const result: Flag[] = [];
  result.push(...reds.slice(0, Math.min(max, reds.length)));
  if (result.length < max && greens.length > 0) {
    result.push(...greens.slice(0, max - result.length));
  }

  return result.slice(0, max).map(toPlainFlag);
}

export function pickNextSteps(result: AnalysisResult, max = 3): string[] {
  const actions = new Set<string>();
  const flags = result.flags || [];

  flags
    .filter((f) => f.type === 'red')
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.severity ?? 'low'] - SEVERITY_RANK[b.severity ?? 'low']
    )
    .forEach((f) => {
      if (f.whatToDo) actions.add(f.whatToDo.trim());
    });

  if (actions.size < max) {
    flags
      .filter((f) => f.type === 'green')
      .forEach((f) => {
        if (f.whatToDo) actions.add(f.whatToDo.trim());
      });
  }

  const verdict = getVerdict(result);
  if (actions.size === 0) {
    if (verdict.level === 'safe') {
      actions.add('Keep things light, suggest a short video call before meeting up.');
      actions.add("Trust your instincts as the conversation continues.");
    } else if (verdict.level === 'caution') {
      actions.add('Ask one direct question that tests their consistency.');
      actions.add('Hold off on sharing personal details (address, workplace, finances).');
    } else {
      actions.add('Do not send money, gifts, or private photos.');
      actions.add('Tell a friend about this conversation and share screenshots.');
    }
  }

  return Array.from(actions).slice(0, max);
}

export interface SeverityChip {
  label: string;
  className: string;
}

export function getSeverityChip(flag: Flag): SeverityChip | null {
  if (flag.type === 'green') {
    return { label: 'Positive', className: 'bg-emerald-100 text-emerald-800' };
  }
  switch (flag.severity) {
    case 'critical':
      return { label: 'Critical', className: 'bg-red-600 text-white' };
    case 'high':
      return { label: 'Serious', className: 'bg-rose-200 text-rose-900' };
    case 'medium':
      return { label: 'Worth knowing', className: 'bg-amber-100 text-amber-900' };
    case 'low':
    default:
      return { label: 'Minor', className: 'bg-stone-200 text-stone-800' };
  }
}
