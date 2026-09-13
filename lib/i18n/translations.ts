import type { SupportedLocale, TranslationKey } from "./types";

export const TRANSLATIONS: Record<SupportedLocale, Record<TranslationKey, string>> = {
  en: {
    // Nav
    "nav.notifications": "Notifications",
    "nav.dashboard": "Dashboard",
    "nav.activities": "Activities",
    "nav.calendar": "Calendar",
    "nav.tasks": "Tasks",
    "nav.finances": "Finances",
    "nav.clients": "Clients & Contacts",
    "nav.reports": "Reports",
    "nav.settings": "Settings",

    // Attention
    "attention.title": "Needs Your Attention",
    "attention.subtitle": "Critical items requiring review or action today.",
    "attention.all_clear": "All caught up! No urgent alerts right now.",
    "attention.overdue_payment": "Overdue Payment",
    "attention.due_expense": "Expense Due",
    "attention.urgent_task": "Urgent Task",
    "attention.upcoming_activity": "Upcoming Activity",
    "attention.conflit_alert": "Schedule Conflict Detected",

    // Activity
    "notif.activity_upcoming.title": "Upcoming Activity",
    "notif.activity_upcoming.body": "{name} is scheduled for {time}.",
    "notif.activity_reminder.title": "Activity Starting Soon",
    "notif.activity_reminder.body": "{name} begins in {minutes} minutes ({time}).",
    "notif.activity_conflict.title": "Schedule Conflict Alert",
    "notif.activity_conflict.body": "Overlap detected between {activity1} and {activity2} at {time}.",

    // Payment
    "notif.payment_upcoming.title": "Upcoming Payment Expected",
    "notif.payment_upcoming.body": "You are expecting {amount} {currency} from {client} on {date}.",
    "notif.payment_due_today.title": "Payment Due Today",
    "notif.payment_due_today.body": "{amount} {currency} from {client} is expected today. Mark as received once in your bank account.",
    "notif.payment_overdue.title": "Payment Overdue",
    "notif.payment_overdue.body": "{amount} {currency} from {client} was due {days} days ago and has not been marked as received.",
    "notif.payment_received.title": "Payment Confirmed",
    "notif.payment_received.body": "Received {amount} {currency} for {label}. Financial totals updated.",

    // Expense
    "notif.expense_upcoming.title": "Upcoming Planned Expense",
    "notif.expense_upcoming.body": "{label} ({amount} {currency}) is scheduled for {date}.",
    "notif.expense_due_today.title": "Expense Due Today",
    "notif.expense_due_today.body": "{label} ({amount} {currency}) is due today.",
    "notif.expense_overdue.title": "Expense Overdue",
    "notif.expense_overdue.body": "{label} ({amount} {currency}) is past its due date.",
    "notif.expense_warning.title": "Large Expense Warning",
    "notif.expense_warning.body": "Upcoming expense {label} ({amount} {currency}) represents a significant portion of your projected cashflow.",

    // Task
    "notif.task_due_today.title": "Task Due Today",
    "notif.task_due_today.body": "{title} is due today.",
    "notif.task_due_soon.title": "Task Due Soon",
    "notif.task_due_soon.body": "{title} is due in 2 hours.",
    "notif.task_overdue.title": "Task Overdue",
    "notif.task_overdue.body": "{title} was due on {date}.",

    // Summaries
    "notif.daily_summary.title": "Your Daily Briefing",
    "notif.daily_summary.body": "Today: {activityCount} activities, {paymentCount} expected payments, {taskCount} tasks.",
    "notif.weekly_summary.title": "Weekly Activity Summary",
    "notif.weekly_summary.body": "This week: {incomeTotal} {currency} received across {activityCount} completed activities.",

    // Actions
    "actions.mark_received": "Mark as received",
    "actions.mark_paid": "Mark as paid",
    "actions.snooze": "Snooze",
    "actions.snooze_1d": "Tomorrow",
    "actions.snooze_3d": "In 3 days",
    "actions.snooze_1w": "Next week",
    "actions.view_item": "View details",
    "actions.dismiss": "Dismiss",
    "actions.mark_all_read": "Mark all as read",
    "actions.filter_all": "All",
    "actions.filter_unread": "Unread",
    "actions.filter_overdue": "Overdue & Urgent",
    "actions.empty_title": "You're all caught up",
    "actions.empty_desc": "No notifications requiring your attention at this time.",
  },

  fr: {
    // Nav
    "nav.notifications": "Notifications",
    "nav.dashboard": "Tableau de bord",
    "nav.activities": "Activités",
    "nav.calendar": "Calendrier",
    "nav.tasks": "Tâches",
    "nav.finances": "Finances",
    "nav.clients": "Clients & Contacts",
    "nav.reports": "Rapports",
    "nav.settings": "Paramètres",

    // Attention
    "attention.title": "Nécessite votre attention",
    "attention.subtitle": "Éléments critiques nécessitant une vérification ou une action aujourd'hui.",
    "attention.all_clear": "Tout est à jour ! Aucune alerte urgente en ce moment.",
    "attention.overdue_payment": "Paiement en retard",
    "attention.due_expense": "Dépense à payer",
    "attention.urgent_task": "Tâche urgente",
    "attention.upcoming_activity": "Activité à venir",
    "attention.conflit_alert": "Conflit d'horaire détecté",

    // Activity
    "notif.activity_upcoming.title": "Activité à venir",
    "notif.activity_upcoming.body": "{name} est prévu à {time}.",
    "notif.activity_reminder.title": "Activité imminente",
    "notif.activity_reminder.body": "{name} commence dans {minutes} minutes ({time}).",
    "notif.activity_conflict.title": "Alerte conflit d'horaire",
    "notif.activity_conflict.body": "Chevauchement détecté entre {activity1} et {activity2} à {time}.",

    // Payment
    "notif.payment_upcoming.title": "Paiement attendu prochainement",
    "notif.payment_upcoming.body": "Vous attendez {amount} {currency} de {client} le {date}.",
    "notif.payment_due_today.title": "Paiement attendu aujourd'hui",
    "notif.payment_due_today.body": "{amount} {currency} de {client} attendus aujourd'hui. Marquez comme reçu dès encaissement.",
    "notif.payment_overdue.title": "Paiement en retard",
    "notif.payment_overdue.body": "{amount} {currency} de {client} étaient dus il y a {days} jours et n'ont pas encore été reçus.",
    "notif.payment_received.title": "Paiement encaissé",
    "notif.payment_received.body": "Encaissement de {amount} {currency} enregistré pour {label}.",

    // Expense
    "notif.expense_upcoming.title": "Dépense programmée imminente",
    "notif.expense_upcoming.body": "{label} ({amount} {currency}) est prévue pour le {date}.",
    "notif.expense_due_today.title": "Dépense à régler aujourd'hui",
    "notif.expense_due_today.body": "{label} ({amount} {currency}) arrive à échéance aujourd'hui.",
    "notif.expense_overdue.title": "Dépense en retard",
    "notif.expense_overdue.body": "La dépense {label} ({amount} {currency}) a dépassé sa date d'échéance.",
    "notif.expense_warning.title": "Avertissement charge importante",
    "notif.expense_warning.body": "La dépense {label} ({amount} {currency}) représente une part majeure de votre trésorerie disponible.",

    // Task
    "notif.task_due_today.title": "Tâche pour aujourd'hui",
    "notif.task_due_today.body": "{title} arrive à échéance aujourd'hui.",
    "notif.task_due_soon.title": "Tâche imminente",
    "notif.task_due_soon.body": "{title} est due dans 2 heures.",
    "notif.task_overdue.title": "Tâche en retard",
    "notif.task_overdue.body": "{title} était due le {date}.",

    // Summaries
    "notif.daily_summary.title": "Votre brief du matin",
    "notif.daily_summary.body": "Aujourd'hui : {activityCount} activités, {paymentCount} encaissements attendus, {taskCount} tâches.",
    "notif.weekly_summary.title": "Bilan hebdomadaire",
    "notif.weekly_summary.body": "Cette semaine : {incomeTotal} {currency} encaissés sur {activityCount} créneaux réalisés.",

    // Actions
    "actions.mark_received": "Marquer comme reçu",
    "actions.mark_paid": "Marquer comme payé",
    "actions.snooze": "Répéter",
    "actions.snooze_1d": "Demain",
    "actions.snooze_3d": "Dans 3 jours",
    "actions.snooze_1w": "La semaine prochaine",
    "actions.view_item": "Voir l'élément",
    "actions.dismiss": "Ignorer",
    "actions.mark_all_read": "Tout marquer comme lu",
    "actions.filter_all": "Toutes",
    "actions.filter_unread": "Non lues",
    "actions.filter_overdue": "En retard & Urgentes",
    "actions.empty_title": "Vous êtes à jour",
    "actions.empty_desc": "Aucune notification ne nécessite votre attention pour le moment.",
  },

  es: {
    // Nav
    "nav.notifications": "Notificaciones",
    "nav.dashboard": "Panel de control",
    "nav.activities": "Actividades",
    "nav.calendar": "Calendario",
    "nav.tasks": "Tareas",
    "nav.finances": "Finanzas",
    "nav.clients": "Clientes & Contactos",
    "nav.reports": "Informes",
    "nav.settings": "Ajustes",

    // Attention
    "attention.title": "Requiere tu atención",
    "attention.subtitle": "Elementos críticos que requieren revisión o acción hoy.",
    "attention.all_clear": "¡Todo al día! No hay alertas urgentes.",
    "attention.overdue_payment": "Pago atrasado",
    "attention.due_expense": "Gasto pendiente",
    "attention.urgent_task": "Tarea urgente",
    "attention.upcoming_activity": "Próxima actividad",
    "attention.conflit_alert": "Conflicto de horario detectado",

    // Activity
    "notif.activity_upcoming.title": "Próxima actividad",
    "notif.activity_upcoming.body": "{name} está programada para las {time}.",
    "notif.activity_reminder.title": "Actividad que comienza pronto",
    "notif.activity_reminder.body": "{name} comienza en {minutes} minutos ({time}).",
    "notif.activity_conflict.title": "Alerta de conflicto de horario",
    "notif.activity_conflict.body": "Superposición detectada entre {activity1} y {activity2} a las {time}.",

    // Payment
    "notif.payment_upcoming.title": "Pago esperado pronto",
    "notif.payment_upcoming.body": "Esperas {amount} {currency} de {client} el {date}.",
    "notif.payment_due_today.title": "Pago pendiente hoy",
    "notif.payment_due_today.body": "Se esperan {amount} {currency} de {client} hoy.",
    "notif.payment_overdue.title": "Pago atrasado",
    "notif.payment_overdue.body": "El pago de {amount} {currency} de {client} venció hace {days} días.",
    "notif.payment_received.title": "Pago recibido",
    "notif.payment_received.body": "Se registró el cobro de {amount} {currency} para {label}.",

    // Expense
    "notif.expense_upcoming.title": "Gasto programado próximo",
    "notif.expense_upcoming.body": "{label} ({amount} {currency}) está previsto para el {date}.",
    "notif.expense_due_today.title": "Gasto vence hoy",
    "notif.expense_due_today.body": "{label} ({amount} {currency}) vence hoy.",
    "notif.expense_overdue.title": "Gasto atrasado",
    "notif.expense_overdue.body": "{label} ({amount} {currency}) ha superado su fecha de vencimiento.",
    "notif.expense_warning.title": "Aviso de gasto grande",
    "notif.expense_warning.body": "El gasto {label} ({amount} {currency}) representa una parte importante de tu saldo disponible.",

    // Task
    "notif.task_due_today.title": "Tarea para hoy",
    "notif.task_due_today.body": "{title} vence hoy.",
    "notif.task_due_soon.title": "Tarea vence pronto",
    "notif.task_due_soon.body": "{title} vence en 2 horas.",
    "notif.task_overdue.title": "Tarea atrasada",
    "notif.task_overdue.body": "{title} venció el {date}.",

    // Summaries
    "notif.daily_summary.title": "Tu resumen diario",
    "notif.daily_summary.body": "Hoy: {activityCount} actividades, {paymentCount} pagos esperados, {taskCount} tareas.",
    "notif.weekly_summary.title": "Resumen semanal",
    "notif.weekly_summary.body": "Esta semana: {incomeTotal} {currency} recibidos en {activityCount} actividades.",

    // Actions
    "actions.mark_received": "Marcar como recibido",
    "actions.mark_paid": "Marcar como pagado",
    "actions.snooze": "Posponer",
    "actions.snooze_1d": "Mañana",
    "actions.snooze_3d": "En 3 días",
    "actions.snooze_1w": "La próxima semana",
    "actions.view_item": "Ver detalles",
    "actions.dismiss": "Descartar",
    "actions.mark_all_read": "Marcar todo como leído",
    "actions.filter_all": "Todas",
    "actions.filter_unread": "No leídas",
    "actions.filter_overdue": "Atrasadas & Urgentes",
    "actions.empty_title": "Todo al día",
    "actions.empty_desc": "No hay notificaciones que requieran tu atención.",
  },

  de: {
    // Nav
    "nav.notifications": "Benachrichtigungen",
    "nav.dashboard": "Übersicht",
    "nav.activities": "Aktivitäten",
    "nav.calendar": "Kalender",
    "nav.tasks": "Aufgaben",
    "nav.finances": "Finanzen",
    "nav.clients": "Kunden & Kontakte",
    "nav.reports": "Berichte",
    "nav.settings": "Einstellungen",

    // Attention
    "attention.title": "Erfordert Ihre Aufmerksamkeit",
    "attention.subtitle": "Wichtige Elemente, die heute geprüft oder bearbeitet werden müssen.",
    "attention.all_clear": "Alles auf dem neuesten Stand! Keine dringenden Warnungen.",
    "attention.overdue_payment": "Überfällige Zahlung",
    "attention.due_expense": "Fällige Ausgabe",
    "attention.urgent_task": "Dringende Aufgabe",
    "attention.upcoming_activity": "Bevorstehende Aktivität",
    "attention.conflit_alert": "Terminkonflikt erkannt",

    // Activity
    "notif.activity_upcoming.title": "Bevorstehende Aktivität",
    "notif.activity_upcoming.body": "{name} ist für {time} geplant.",
    "notif.activity_reminder.title": "Aktivität beginnt bald",
    "notif.activity_reminder.body": "{name} beginnt in {minutes} Minuten ({time}).",
    "notif.activity_conflict.title": "Terminkonflikt-Warnung",
    "notif.activity_conflict.body": "Überschneidung zwischen {activity1} und {activity2} um {time}.",

    // Payment
    "notif.payment_upcoming.title": "Bevorstehende Zahlung erwartet",
    "notif.payment_upcoming.body": "Sie erwarten {amount} {currency} von {client} am {date}.",
    "notif.payment_due_today.title": "Zahlung heute fällig",
    "notif.payment_due_today.body": "{amount} {currency} von {client} werden heute erwartet.",
    "notif.payment_overdue.title": "Zahlung überfällig",
    "notif.payment_overdue.body": "{amount} {currency} von {client} waren vor {days} Tagen fällig.",
    "notif.payment_received.title": "Zahlung erhalten",
    "notif.payment_received.body": "Eingang von {amount} {currency} für {label} erfasst.",

    // Expense
    "notif.expense_upcoming.title": "Bevorstehende geplante Ausgabe",
    "notif.expense_upcoming.body": "{label} ({amount} {currency}) ist für den {date} geplant.",
    "notif.expense_due_today.title": "Ausgabe heute fällig",
    "notif.expense_due_today.body": "{label} ({amount} {currency}) ist heute fällig.",
    "notif.expense_overdue.title": "Ausgabe überfällig",
    "notif.expense_overdue.body": "{label} ({amount} {currency}) ist überfällig.",
    "notif.expense_warning.title": "Warnung vor hoher Ausgabe",
    "notif.expense_warning.body": "Die Ausgabe {label} ({amount} {currency}) macht einen großen Teil Ihres verfügbaren Guthabens aus.",

    // Task
    "notif.task_due_today.title": "Aufgabe heute fällig",
    "notif.task_due_today.body": "{title} ist heute fällig.",
    "notif.task_due_soon.title": "Aufgabe bald fällig",
    "notif.task_due_soon.body": "{title} ist in 2 Stunden fällig.",
    "notif.task_overdue.title": "Aufgabe überfällig",
    "notif.task_overdue.body": "{title} war am {date} fällig.",

    // Summaries
    "notif.daily_summary.title": "Ihr Tagesüberblick",
    "notif.daily_summary.body": "Heute: {activityCount} Aktivitäten, {paymentCount} Zahlungen, {taskCount} Aufgaben.",
    "notif.weekly_summary.title": "Wochenübersicht",
    "notif.weekly_summary.body": "Diese Woche: {incomeTotal} {currency} bei {activityCount} Aktivitäten eingenommen.",

    // Actions
    "actions.mark_received": "Als erhalten markieren",
    "actions.mark_paid": "Als bezahlt markieren",
    "actions.snooze": "Schlummern",
    "actions.snooze_1d": "Morgen",
    "actions.snooze_3d": "In 3 Tagen",
    "actions.snooze_1w": "Nächste Woche",
    "actions.view_item": "Details anzeigen",
    "actions.dismiss": "Schließen",
    "actions.mark_all_read": "Alle als gelesen markieren",
    "actions.filter_all": "Alle",
    "actions.filter_unread": "Ungelesen",
    "actions.filter_overdue": "Überfällig & Dringend",
    "actions.empty_title": "Alles erledigt",
    "actions.empty_desc": "Keine Benachrichtigungen erfordern derzeit Ihre Aufmerksamkeit.",
  },

  pt: {
    // Nav
    "nav.notifications": "Notificações",
    "nav.dashboard": "Painel",
    "nav.activities": "Atividades",
    "nav.calendar": "Calendário",
    "nav.tasks": "Tarefas",
    "nav.finances": "Finanças",
    "nav.clients": "Clientes & Contactos",
    "nav.reports": "Relatórios",
    "nav.settings": "Definições",

    // Attention
    "attention.title": "Requer a sua atenção",
    "attention.subtitle": "Itens críticos que requerem revisão ou ação hoje.",
    "attention.all_clear": "Tudo em dia! Sem alertas urgentes neste momento.",
    "attention.overdue_payment": "Pagamento em atraso",
    "attention.due_expense": "Despesa a pagar",
    "attention.urgent_task": "Tarefa urgente",
    "attention.upcoming_activity": "Próxima atividade",
    "attention.conflit_alert": "Conflito de horário detetado",

    // Activity
    "notif.activity_upcoming.title": "Próxima atividade",
    "notif.activity_upcoming.body": "{name} está agendada para as {time}.",
    "notif.activity_reminder.title": "Atividade a começar em breve",
    "notif.activity_reminder.body": "{name} começa em {minutes} minutos ({time}).",
    "notif.activity_conflict.title": "Alerta de conflito de horário",
    "notif.activity_conflict.body": "Sobreposição detetada entre {activity1} e {activity2} às {time}.",

    // Payment
    "notif.payment_upcoming.title": "Pagamento esperado em breve",
    "notif.payment_upcoming.body": "Espera {amount} {currency} de {client} em {date}.",
    "notif.payment_due_today.title": "Pagamento esperado hoje",
    "notif.payment_due_today.body": "{amount} {currency} de {client} esperados hoje.",
    "notif.payment_overdue.title": "Pagamento em atraso",
    "notif.payment_overdue.body": "{amount} {currency} de {client} venceram há {days} dias.",
    "notif.payment_received.title": "Pagamento recebido",
    "notif.payment_received.body": "Recebimento de {amount} {currency} registado para {label}.",

    // Expense
    "notif.expense_upcoming.title": "Despesa programada próxima",
    "notif.expense_upcoming.body": "{label} ({amount} {currency}) está agendada para {date}.",
    "notif.expense_due_today.title": "Despesa a pagar hoje",
    "notif.expense_due_today.body": "{label} ({amount} {currency}) vence hoje.",
    "notif.expense_overdue.title": "Despesa em atraso",
    "notif.expense_overdue.body": "{label} ({amount} {currency}) ultrapassou a data de vencimento.",
    "notif.expense_warning.title": "Aviso de despesa elevada",
    "notif.expense_warning.body": "A despesa {label} ({amount} {currency}) representa uma parte significativa do saldo disponível.",

    // Task
    "notif.task_due_today.title": "Tarefa para hoje",
    "notif.task_due_today.body": "{title} vence hoje.",
    "notif.task_due_soon.title": "Tarefa a vencer em breve",
    "notif.task_due_soon.body": "{title} vence em 2 horas.",
    "notif.task_overdue.title": "Tarefa em atraso",
    "notif.task_overdue.body": "{title} venceu em {date}.",

    // Summaries
    "notif.daily_summary.title": "O seu resumo diário",
    "notif.daily_summary.body": "Hoje: {activityCount} atividades, {paymentCount} pagamentos esperados, {taskCount} tarefas.",
    "notif.weekly_summary.title": "Resumo semanal",
    "notif.weekly_summary.body": "Esta semana: {incomeTotal} {currency} recebidos em {activityCount} atividades.",

    // Actions
    "actions.mark_received": "Marcar como recebido",
    "actions.mark_paid": "Marcar como pago",
    "actions.snooze": "Adiar",
    "actions.snooze_1d": "Amanhã",
    "actions.snooze_3d": "Em 3 dias",
    "actions.snooze_1w": "Na próxima semana",
    "actions.view_item": "Ver detalhes",
    "actions.dismiss": "Dispensar",
    "actions.mark_all_read": "Marcar tudo como lido",
    "actions.filter_all": "Todas",
    "actions.filter_unread": "Não lidas",
    "actions.filter_overdue": "Em atraso & Urgentes",
    "actions.empty_title": "Tudo em dia",
    "actions.empty_desc": "Sem notificações a requerer a sua atenção.",
  },
};
