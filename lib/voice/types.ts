/**
 * Types et interfaces du Moteur de Rappels Vocaux Intelligents (Remind Me Voice Engine)
 */

export type VoiceType = "system" | "female" | "male";
export type VoiceLanguage = "fr" | "en" | "es";
export type RepeatVoice = 0 | 1 | 2; // 0 = 1x (sans répétition), 1 = répéter 1x (2 lectures), 2 = répéter 2x (3 lectures)

export interface VoiceSettings {
  voice_reminders: boolean;
  voice_type: VoiceType;
  voice_language: VoiceLanguage;
  repeat_voice: RepeatVoice;
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
}

export interface MiddayCheckinVoiceParams {
  userName?: string | null;
  completedActivities?: DailyActivityItem[];
  upcomingActivities?: DailyActivityItem[];
  overdueActivities?: DailyActivityItem[];
  language?: VoiceLanguage;
}

export interface EveningSummaryVoiceParams {
  userName?: string | null;
  completedActivities?: DailyActivityItem[];
  uncompletedActivities?: DailyActivityItem[];
  language?: VoiceLanguage;
}

export interface IndividualReminderVoiceParams {
  userName?: string | null;
  activityTitle: string;
  timeStr?: string | null;
  category?: string | null;
  isOverdue?: boolean;
  language?: VoiceLanguage;
}

export interface ActivityCompletedVoiceParams {
  userName?: string | null;
  activityTitle: string;
  language?: VoiceLanguage;
}

export interface VoiceMessageParams {
  userName?: string | null;
  activityTitle?: string;
  timeStr?: string | null; // e.g. "15:00", "09:30"
  dateStr?: string | null; // e.g. "2026-10-01"
  category?: string | null; // "activity" | "task" | "payment" | "expense" | etc.
  kind?: "morning_briefing" | "midday_checkin" | "evening_summary" | "evening_checkin" | "individual_reminder" | "overdue_reminder" | "congratulations" | string;
  activities?: DailyActivityItem[];
  completedActivities?: DailyActivityItem[];
  uncompletedActivities?: DailyActivityItem[];
  upcomingActivities?: DailyActivityItem[];
  overdueActivities?: DailyActivityItem[];
  isOverdue?: boolean;
  language?: VoiceLanguage;
  now?: Date;
}

export interface VoiceSpeakOptions {
  text: string;
  language?: VoiceLanguage;
  voiceType?: VoiceType;
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
