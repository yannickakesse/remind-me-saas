/**
 * Types et interfaces du Moteur de Rappels Vocaux Intelligents (Remind Me Voice Engine)
 */

export type VoiceType = "system" | "female" | "male";
export type VoiceLanguage = "fr" | "en" | "es" | "de" | "pt";
export type RepeatVoice = 0 | 1 | 2; // 0 = 1x (sans répétition), 1 = répéter 1x (2 lectures), 2 = répéter 2x (3 lectures)

export interface VoiceSettings {
  voice_reminders: boolean;
  voice_type: VoiceType;
  voice_language: VoiceLanguage;
  repeat_voice: RepeatVoice;
  voice_category_activities?: boolean;
  voice_category_tasks?: boolean;
  voice_category_finances?: boolean;
  voice_category_briefings?: boolean;
  voice_hide_financial_amounts?: boolean;
  voice_include_user_name?: boolean;
  custom_voice_reminder_text?: string;
  voice_playback_rate?: number;
}

export interface DailyActivityItem {
  id?: string;
  title: string;
  timeStr?: string | null; // e.g. "07:00", "14:30"
  status?: "completed" | "pending" | "overdue";
  category?: "activity" | "task" | "payment" | "expense" | "calendar" | string;
}

export interface MorningBriefingVoiceParams {
  userName?: string | null;
  activities?: DailyActivityItem[];
  language?: VoiceLanguage;
  includeUserName?: boolean;
}

export interface MiddayCheckinVoiceParams {
  userName?: string | null;
  completedActivities?: DailyActivityItem[];
  upcomingActivities?: DailyActivityItem[];
  overdueActivities?: DailyActivityItem[];
  language?: VoiceLanguage;
  includeUserName?: boolean;
}

export interface EveningSummaryVoiceParams {
  userName?: string | null;
  completedActivities?: DailyActivityItem[];
  uncompletedActivities?: DailyActivityItem[];
  language?: VoiceLanguage;
  includeUserName?: boolean;
}

export interface IndividualReminderVoiceParams {
  userName?: string | null;
  activityTitle: string;
  timeStr?: string | null;
  leadMinutes?: number;
  category?: string | null;
  amount?: number | string;
  currency?: string;
  daysDiff?: number;
  isOverdue?: boolean;
  language?: VoiceLanguage;
  hideAmount?: boolean;
  includeUserName?: boolean;
  customText?: string;
}

export interface ActivityCompletedVoiceParams {
  userName?: string | null;
  activityTitle: string;
  language?: VoiceLanguage;
  includeUserName?: boolean;
}

export interface VoiceMessageParams {
  userName?: string | null;
  activityTitle?: string;
  timeStr?: string | null; // e.g. "15:00", "09:30"
  dateStr?: string | null; // e.g. "2026-10-01"
  leadMinutes?: number; // 60, 10, etc.
  category?: string | null; // "activity" | "task" | "payment" | "expense" | etc.
  amount?: number | string;
  currency?: string;
  daysDiff?: number;
  kind?: "morning_briefing" | "midday_checkin" | "evening_summary" | "evening_checkin" | "individual_reminder" | "overdue_reminder" | "congratulations" | "custom_reminder" | string;
  activities?: DailyActivityItem[];
  completedActivities?: DailyActivityItem[];
  uncompletedActivities?: DailyActivityItem[];
  upcomingActivities?: DailyActivityItem[];
  overdueActivities?: DailyActivityItem[];
  isOverdue?: boolean;
  language?: VoiceLanguage;
  hideAmount?: boolean;
  includeUserName?: boolean;
  customText?: string;
  now?: Date;
}

export type VoicePriority =
  | "greeting"
  | "section"
  | "routine"
  | "tour"
  | "normal"
  | "preview"
  | "high"
  | "critical";

export interface VoiceSpeakOptions {
  text: string;
  language?: VoiceLanguage;
  voiceType?: VoiceType;
  priority?: VoicePriority;
  repeat?: RepeatVoice;
  rate?: number; // Vitesse de diction (0.8 - 1.2, default 1.0)
  pitch?: number; // Tonalité (0.8 - 1.2, default 1.0)
  volume?: number; // Volume sonore (0.0 - 1.0, default 1.0)
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

/**
 * Architecture évolutive pour futures interactions vocales (IA & Commandes Vocales)
 */
export interface VoiceCommand {
  rawTranscript: string;
  action: "snooze" | "complete" | "confirm" | "reschedule" | "read_summary" | "unknown";
  params?: {
    minutes?: number;
    hours?: number;
    date?: string;
    entityId?: string;
  };
}

export interface VoiceEngineInterface {
  speak(options: VoiceSpeakOptions): Promise<boolean>;
  stop(): void;
  isSupported(): boolean;
  getAvailableVoices(language?: VoiceLanguage): SpeechSynthesisVoice[];
}
