import type { VoiceLanguage } from "./types";
import type { TourStep } from "@/components/onboarding/tour-data";

/**
 * ==============================================================================
 * EXPLICATIONS VOCALES CONTEXTUELLES PAR SECTION (PHASE 6)
 * Textes naturels, concis, ciblés et 100% fidèles aux fonctionnalités réelles.
 * Répond point par point aux fonctionnalités de chaque espace de Remind Me.
 * ==============================================================================
 */

export interface SectionVoiceContent {
  fr: string;
  en: string;
  es: string;
  de: string;
  pt: string;
}

export const SECTION_VOICE_GUIDES: Record<string, SectionVoiceContent> = {
  dashboard: {
    fr: "Bienvenue sur votre tableau de bord. En haut, vos finances du mois : ce que vous avez reçu, ce que vous avez payé, votre solde et ce qui reste à encaisser. Juste en dessous, le focus de la journée avec vos séances prévues, puis vos tâches urgentes. Plus bas, vos dépenses programmées et les paiements que vous attendez. Touchez une flèche pour voir le détail.",
    en: "Welcome to your dashboard. At the top, your monthly finances: what you’ve received, what you’ve paid, your balance, and what’s still coming in. Just below that, today’s focus with your scheduled sessions, followed by your urgent tasks. Further down, your scheduled expenses and payments you’re expecting. Tap an arrow to view the details.",
    es: "Bienvenido a tu panel de control. En la parte superior, tus finanzas del mes: lo que has recibido, lo que has pagado, tu saldo y lo que te queda por cobrar. Justo debajo, lo más destacado del día con tus sesiones programadas y, a continuación, tus tareas urgentes. Más abajo, tus gastos programados y los pagos que esperas recibir. Toca una flecha para ver los detalles.",
    de: "Willkommen auf Ihrem Dashboard. Oben sehen Sie Ihre Finanzen des Monats: was Sie erhalten haben, was Sie bezahlt haben, Ihren Kontostand und was noch einzugehen ist. Direkt darunter der Schwerpunkt des Tages mit Ihren geplanten Terminen, gefolgt von Ihren dringenden Aufgaben. Weiter unten Ihre geplanten Ausgaben und die Zahlungen, auf die Sie warten. Tippen Sie auf einen Pfeil, um die Details anzuzeigen.",
    pt: "Bem-vindo ao seu painel de controle. Na parte superior, suas finanças do mês: o que você recebeu, o que pagou, seu saldo e o que ainda está por receber. Logo abaixo, o destaque do dia com suas sessões agendadas e, em seguida, suas tarefas urgentes. Mais abaixo, suas despesas programadas e os pagamentos que você aguarda. Toque em uma seta para ver os detalhes.",
  },

  activities: {
    fr: "Voici vos activités : chacune de vos casquettes professionnelles, avec sa rémunération et ses horaires. Touchez le crayon pour la modifier, les deux traits pour la mettre en pause, et le carton pour l'archiver. Pour en créer une nouvelle, utilisez le bouton plus, en bas de l'écran.",
    en: "Here are your activities: each of your professional roles, along with their pay and schedules. Tap the pencil to edit it, the two lines to pause it, and the card to archive it. To create a new one, use the plus button at the bottom of the screen.",
    es: "Estas son tus actividades: cada una de tus funciones profesionales, con su remuneración y sus horarios. Toca el lápiz para modificarla, las dos líneas para ponerla en pausa y la tarjeta para archivarla. Para crear una nueva, utiliza el botón «más», en la parte inferior de la pantalla.",
    de: "Hier sind Ihre Aktivitäten: jede Ihrer beruflichen Funktionen mit der entsprechenden Vergütung und den Arbeitszeiten. Tippen Sie auf den Bleistift, um sie zu bearbeiten, auf die beiden Striche, um sie zu pausieren, und auf das Karton-Symbol, um sie zu archivieren. Um eine neue Aktivität anzulegen, nutzen Sie die Plus-Schaltfläche am unteren Bildschirmrand.",
    pt: "Aqui estão suas atividades: cada uma de suas funções profissionais, com sua remuneração e horários. Toque no lápis para editá-la, nas duas linhas para colocá-la em pausa e no cartão para arquivá-la. Para criar uma nova, use o botão “mais”, na parte inferior da tela.",
  },

  calendar: {
    fr: "Votre calendrier rassemble vos séances et vos échéances. Choisissez la vue jour, semaine, mois ou agenda. Chaque couleur correspond à une activité, et un conflit d'horaire s'affiche en rouge. Touchez une séance pour la marquer terminée, la reporter ou l'annuler.",
    en: "Your calendar lists your sessions and deadlines. Choose the day, week, month, or agenda view. Each color corresponds to an activity, and schedule conflicts are displayed in red. Tap a session to mark it as completed, reschedule it, or cancel it.",
    es: "Tu calendario reúne tus sesiones y tus fechas límite. Elige la vista diaria, semanal, mensual o de agenda. Cada color corresponde a una actividad, y los conflictos de horario se muestran en rojo. Toca una sesión para marcarla como completada, aplazarla o cancelarla.",
    de: "Ihr Kalender fasst Ihre Termine und Fristen zusammen. Wählen Sie die Tages-, Wochen-, Monats- oder Agenda-Ansicht. Jede Farbe steht für eine Aktivität, und Terminüberschneidungen werden rot angezeigt. Tippen Sie auf einen Termin, um ihn als erledigt zu markieren, zu verschieben oder zu löschen.",
    pt: "Sua agenda reúne suas sessões e prazos. Escolha a visualização por dia, semana, mês ou agenda. Cada cor corresponde a uma atividade, e um conflito de horário é exibido em vermelho. Toque em uma sessão para marcá-la como concluída, adiá-la ou cancelá-la.",
  },

  tasks: {
    fr: "Vos tâches sont rangées par onglets : en retard, aujourd'hui, à venir, sans date et terminées. Touchez une tâche pour la cocher ou la modifier. Les tâches urgentes apparaissent aussi sur votre tableau de bord.",
    en: "Your tasks are organized into tabs: Overdue, Today, Upcoming, Undated, and Completed. Tap a task to check it off or edit it. Urgent tasks also appear on your dashboard.",
    es: "Tus tareas están organizadas en pestañas: pendientes, de hoy, futuras, sin fecha y completadas. Toca una tarea para marcarla como completada o modificarla. Las tareas urgentes también aparecen en tu panel de control.",
    de: "Ihre Aufgaben sind in Registerkarten sortiert: überfällig, heute, anstehend, ohne Datum und erledigt. Tippen Sie auf eine Aufgabe, um sie abzuhaken oder zu bearbeiten. Dringende Aufgaben werden auch auf Ihrem Dashboard angezeigt.",
    pt: "Suas tarefas estão organizadas em abas: atrasadas, hoje, futuras, sem data e concluídas. Toque em uma tarefa para marcá-la como concluída ou editá-la. As tarefas urgentes também aparecem no seu painel de controle.",
  },

  finances: {
    fr: "Dans Finances, vous suivez votre argent réel. La vue globale résume le mois. Dans Revenus, touchez Encaisser quand un paiement arrive. Ajoutez vos dépenses, programmez les charges qui reviennent chaque mois, et fixez vos budgets et vos objectifs d'épargne.",
    en: "In Finance, you track your real money. The overview summarizes the month. In Income, tap “Collect” when a payment comes in. Add your expenses, set up recurring monthly bills, and set your budgets and savings goals.",
    es: "En «Finanzas», puedes llevar un control de tu dinero real. La vista general resume el mes. En «Ingresos», pulsa «Cobrar» cuando recibas un pago. Añade tus gastos, programa los gastos recurrentes mensuales y establece tus presupuestos y objetivos de ahorro.",
    de: "In „Finanzen“ behalten Sie Ihren tatsächlichen Geldfluss im Blick. Die Gesamtansicht fasst den Monat zusammen. Tippen Sie unter „Einnahmen“ auf „Einnahme verbuchen“, sobald eine Zahlung eingeht. Fügen Sie Ihre Ausgaben hinzu, planen Sie wiederkehrende monatliche Kosten ein und legen Sie Ihre Budgets und Sparziele fest.",
    pt: "Na seção Finanças, você acompanha seu dinheiro de verdade. A visão geral resume o mês. Na seção Receitas, toque em “Receber” quando um pagamento chegar. Adicione suas despesas, programe os gastos recorrentes mensais e defina seus orçamentos e metas de poupança.",
  },

  reports: {
    fr: "Les rapports vous montrent ce que chaque activité vous rapporte vraiment : revenus, dépenses, solde et rentabilité par heure. Choisissez la période, puis téléchargez votre bilan en PDF.",
    en: "The reports show you what each activity actually brings in: income, expenses, balance, and hourly profit. Select the time period, then download your report as a PDF.",
    es: "Los informes te muestran lo que realmente te reporta cada actividad: ingresos, gastos, saldo y rentabilidad por hora. Elige el periodo y, a continuación, descarga tu balance en formato PDF.",
    de: "Die Berichte zeigen Ihnen, was Ihnen jede Tätigkeit wirklich einbringt: Einnahmen, Ausgaben, Saldo und Rentabilität pro Stunde. Wählen Sie den Zeitraum aus und laden Sie dann Ihre Bilanz als PDF herunter.",
    pt: "Os relatórios mostram o que cada atividade realmente rende para você: receitas, despesas, saldo e rentabilidade por hora. Escolha o período e, em seguida, baixe seu balanço em PDF.",
  },

  notifications: {
    fr: "Vos notifications sont rangées par jour. Les rappels du même type sont regroupés : touchez la ligne pour les déplier. Le bouton principal traite le rappel, et les trois petits points proposent les autres choix.",
    en: "Your notifications are organized by day. Reminders of the same type are grouped together: tap the line to expand them. The main button handles the reminder, and the three dots offer other options.",
    es: "Tus notificaciones están ordenadas por día. Los recordatorios del mismo tipo se agrupan: toca la línea para desplegarlos. El botón principal gestiona el recordatorio, y los tres puntitos ofrecen otras opciones.",
    de: "Ihre Benachrichtigungen sind nach Tagen sortiert. Erinnerungen derselben Art sind zusammengefasst: Tippen Sie auf die Zeile, um sie aufzuklappen. Mit der Hauptschaltfläche bearbeiten Sie die Erinnerung, und die drei kleinen Punkte bieten weitere Optionen an.",
    pt: "Suas notificações estão organizadas por dia. Os lembretes do mesmo tipo estão agrupados: toque na linha para expandi-los. O botão principal processa o lembrete, e os três pontinhos oferecem outras opções.",
  },

  messages: {
    fr: "L'Inbox réunit au même endroit vos messages officiels et vos alertes importantes de Remind Me.",
    en: "The Inbox brings together your official messages and important alerts from Remind Me in one place.",
    es: "La bandeja de entrada reúne en un mismo lugar tus mensajes oficiales y tus alertas importantes de Remind Me.",
    de: "Der Posteingang fasst Ihre offiziellen Nachrichten und wichtigen Benachrichtigungen von Remind Me an einem Ort zusammen.",
    pt: "A Caixa de Entrada reúne em um único lugar suas mensagens oficiais e seus alertas importantes do Remind Me.",
  },

  settings: {
    fr: "Dans les paramètres, réglez votre profil, la langue et le thème, vos notifications et vos rappels vocaux, la sécurité de votre compte et votre abonnement.",
    en: "In Settings, customize your profile, language, and theme; manage your notifications and voice reminders; and configure your account security and subscription.",
    es: "En los ajustes, configura tu perfil, el idioma y el tema, tus notificaciones y recordatorios de voz, la seguridad de tu cuenta y tu suscripción.",
    de: "Passen Sie in den Einstellungen Ihr Profil, die Sprache und das Design, Ihre Benachrichtigungen und Sprach-Erinnerungen, die Sicherheit Ihres Kontos sowie Ihr Abonnement an.",
    pt: "Nas configurações, defina seu perfil, o idioma e o tema, suas notificações e lembretes de voz, a segurança da sua conta e sua assinatura.",
  },

  clients: {
    fr: "Clients et contacts : enregistrez les organisations et les personnes avec qui vous travaillez, pour les relier à vos activités.",
    en: "Clients and contacts: Save the organizations and people you work with to link them to your activities.",
    es: "Clientes y contactos: registra las organizaciones y las personas con las que trabajas para vincularlas a tus actividades.",
    de: "Kunden und Kontakte: Speichern Sie die Organisationen und Personen, mit denen Sie zusammenarbeiten, um sie mit Ihren Aktivitäten zu verknüpfen.",
    pt: "Clientes e contatos: registre as organizações e as pessoas com quem você trabalha, para vinculá-las às suas atividades.",
  },
};

/**
 * Scripts oraux concis et naturels par étape de guide interactif (5 langues officielles)
 */
export const TOUR_STEP_VOICE_SCRIPTS: Record<string, Record<VoiceLanguage, string>> = {
  welcome: {
    fr: "Bienvenue sur Remind Me. Ce guide introductif rapide vous présente l'architecture de votre application et les principes clés pour piloter vos activités et votre trésorerie sans stress.",
    en: "Welcome to Remind Me. This quick introductory tour presents the architecture of your application and key principles to manage your activities and cashflow stress-free.",
    es: "Bienvenido a Remind Me. Esta guía introductoria rápida le presenta la arquitectura de la aplicación y los principios clave para gestionar sus actividades y tesorería sin estrés.",
    de: "Willkommen bei Remind Me. Diese kurze Einführung zeigt Ihnen die Struktur Ihrer Anwendung und die wichtigsten Prinzipien für ein stressfreies Arbeiten.",
    pt: "Bem-vindo ao Remind Me. Este guia rápido apresenta a estrutura do aplicativo e os princípios fundamentais para gerenciar suas atividades e fluxo de caixa sem estresse.",
  },
  "nav-general": {
    fr: "Navigation Générale et Espaces de Travail. Accédez instantanément à vos activités, votre calendrier, vos tâches, vos finances, votre inbox et vos rapports.",
    en: "General Navigation and Workspaces. Gain instant access to your activities, calendar, tasks, finances, inbox, and reports.",
    es: "Navegación General y Espacios de Trabajo. Acceda al instante a sus actividades, calendario, tareas, finanzas, buzón e informes.",
    de: "Hauptnavigation und Arbeitsbereiche. Erhalten Sie direkten Zugriff auf Ihre Aktivitäten, den Kalender, Aufgaben, Finanzen, Posteingang und Berichte.",
    pt: "Navegação Geral e Espaços de Trabalho. Acesse instantaneamente suas atividades, calendário, tarefas, finanças, caixa de entrada e relatórios.",
  },
  dashboard: {
    fr: "Tableau de Bord Central. Consultez chaque matin vos indicateurs financiers réels, vos urgences à traiter et votre programme du jour.",
    en: "Central Dashboard. Check your real financial KPIs, urgent matters to handle, and today's schedule every morning.",
    es: "Panel de Control Central. Consulte cada mañana sus indicadores financieros reales, urgencias por resolver y su agenda diaria.",
    de: "Zentrales Dashboard. Prüfen Sie jeden Morgen Ihre tatsächlichen Finanz-KPIs, dringende Aufgaben und den heutigen Zeitplan.",
    pt: "Painel Central. Consulte todas as manhãs seus indicadores financeiros reais, urgências a tratar e a programação do dia.",
  },
  "activities-and-calendar": {
    fr: "Activités et Calendrier Intelligent. Configurez vos métiers et missions avec leurs rémunérations et visualisez vos créneaux sans conflit d'horaires.",
    en: "Activities and Smart Calendar. Configure your contracts and missions with their compensations and view your schedule without conflicts.",
    es: "Actividades y Calendario Inteligente. Configure sus contratos y misiones con sus remuneraciones y visualice sus horarios sin conflictos.",
    de: "Aktivitäten und intelligenter Kalender. Konfigurieren Sie Verträge und Aufträge mit Vergütungen und überblicken Sie Ihre Termine konfliktfrei.",
    pt: "Atividades e Calendário Inteligente. Configure seus contratos e missões com suas remunerações e visualize seus horários sem conflitos.",
  },
  "tasks-and-commitments": {
    fr: "Tâches et Engagements Prioritaires. Suivez vos échéances, activez des rappels sonores précis et validez ou reportez vos to-dos en un clic.",
    en: "Tasks and Priority Commitments. Track deadlines, enable precise sound reminders, and complete or postpone your to-dos with one click.",
    es: "Tareas y Compromisos Prioritarios. Siga sus plazos, active recordatorios sonoros precisos y complete o posponga sus pendientes con un clic.",
    de: "Aufgaben und Prioritäten. Verfolgen Sie Fristen, aktivieren Sie punktgenaue Audio-Erinnerungen und erledigen oder verschieben Sie To-Dos mit einem Klick.",
    pt: "Tarefas e Compromissos Prioritários. Acompanhe prazos, ative lembretes sonoros precisos e conclua ou adie tarefas com um clique.",
  },
  "finances-real-cashflow": {
    fr: "Gestion Financière et Trésorerie Réelle. Séparez rigoureusement les sommes prévues de l'argent réellement encaissé et pilotez vos dépenses sereinement.",
    en: "Financial Management and Real Cashflow. Strictly separate expected revenue from actually collected cash and manage your expenses with confidence.",
    es: "Gestión Financiera y Tesorería Real. Separe rigurosamente los ingresos previstos del dinero realmente cobrado y controle sus gastos con confianza.",
    de: "Finanzmanagement und Cashflow. Trennen Sie prognostizierte Einnahmen strikt von tatsächlich erhaltenem Geld und steuern Sie Ihre Ausgaben verlässlich.",
    pt: "Gestão Financeira e Fluxo de Caixa Real. Separe com rigor os valores previstos do dinheiro efetivamente recebido e gerencie despesas com segurança.",
  },
  "inbox-and-notifications": {
    fr: "Inbox et Centre de Notifications. Traitez vos encaissements et paiements prioritaires dans l'Inbox et suivez l'historique de vos alertes sans doublon.",
    en: "Inbox and Notifications Center. Process your urgent collections and payments in the Inbox and review your alerts history with zero duplication.",
    es: "Buzón y Centro de Notificaciones. Gestione cobros y pagos prioritarios en el Buzón y revise el historial de alertas sin duplicados.",
    de: "Inbox und Benachrichtigungszentrum. Bearbeiten Sie fällige Zahlungen im Posteingang und behalten Sie den Verlauf Ihrer Benachrichtigungen im Blick.",
    pt: "Inbox e Central de Notificações. Processe recebimentos e pagamentos prioritários na Inbox e acompanhe o histórico de alertas sem duplicações.",
  },
  "settings-and-customization": {
    fr: "Paramètres et Personnalisation. Ajustez votre devise par défaut, votre fuseau horaire, vos options vocales et la sécurité de vos données.",
    en: "Settings and Customization. Adjust your default currency, timezone, voice settings, and strict data security preferences.",
    es: "Configuración y Personalización. Ajuste su divisa predeterminada, zona horaria, opciones de voz y la seguridad de sus datos.",
    de: "Einstellungen und Anpassung. Konfigurieren Sie Standardwährung, Zeitzone, Sprachoptionen und Sicherheitseinstellungen.",
    pt: "Configurações e Personalização. Ajuste sua moeda padrão, fuso horário, opções de voz e segurança de dados.",
  },
  "tour-completed": {
    fr: "Vous êtes prêt à démarrer. Retrouvez des guides spécialisés dans chaque section et démarrez dès maintenant en créant votre première activité.",
    en: "You are ready to get started. Access specialized interactive guides in each section and start right now by creating your first activity.",
    es: "Está listo para comenzar. Acceda a guías interactivas en cada sección y comience ahora mismo creando su primera actividad.",
    de: "Sie sind startklar. Entdecken Sie bereichsspezifische Leitfäden in jedem Menü und beginnen Sie mit Ihrer ersten Aktivität.",
    pt: "Você está pronto para começar. Encontre guias especializados em cada seção e comece agora mesmo criando sua primeira atividade.",
  },

  // Guides spécialisés (Dashboard)
  "dash-header": {
    fr: "Vue d'ensemble du Tableau de Bord. Donnez-vous une vision immédiate de vos priorités et accédez aux actions rapides dès votre connexion.",
    en: "Dashboard Overview. Get an instant view of your priorities and access quick creation shortcuts as soon as you log in.",
    es: "Resumen del Panel. Obtenga una visión inmediata de sus prioridades y utilice atajos rápidos de creación nada más iniciar sesión.",
    de: "Dashboard-Übersicht. Verschaffen Sie sich sofort einen Überblick über Ihre Prioritäten und nutzen Sie Schnellaktionen.",
    pt: "Visão Geral do Painel. Obtenha uma visão imediata de suas prioridades e utilize atalhos rápidos de criação ao iniciar a sessão.",
  },
  "dash-kpis": {
    fr: "Les KPIs Financiers Réels. Ces quatre compteurs vous montrent la réalité comptable du mois : revenus attendus, encaissés, dépenses payées et votre solde net réel.",
    en: "Real Financial KPIs. These four counters display this month's accounting reality: expected revenue, collected revenue, paid expenses, and net cash balance.",
    es: "KPIs Financieros Reales. Estos cuatro contadores muestran la realidad contable del mes: ingresos previstos, cobrados, gastos pagados y su saldo neto real.",
    de: "Echte Finanz-KPIs. Diese vier Zähler zeigen Ihre monatliche Finanzrealität: erwartete und erhaltene Einnahmen, bezahlte Ausgaben und den Netto-Saldo.",
    pt: "KPIs Financeiros Reais. Esses quatro indicadores mostram a realidade contábil do mês: receitas esperadas, recebidas, despesas pagas e seu saldo líquido real.",
  },
  "dash-attention": {
    fr: "Panneau Nécessite votre attention. Traitez en priorité les factures échues, dépenses urgentes et tâches arrivées à échéance.",
    en: "Attention Required Panel. Prioritize overdue invoices, urgent expenses to pay, and deadline-critical tasks.",
    es: "Panel Atención Requerida. Trate con prioridad facturas vencidas, gastos urgentes y tareas que han llegado a su fecha límite.",
    de: "Dringende Hinweise. Bearbeiten Sie vorrangig überfällige Rechnungen, dringende Ausgaben und fällige Aufgaben.",
    pt: "Painel Atenção Necessária. Trate com prioridade faturas vencidas, despesas urgentes e tarefas no prazo final.",
  },
  "dash-today": {
    fr: "Votre Journée en un Coup d'Œil. Retrouvez vos séances et rendez-vous planifiés aujourd'hui par ordre chronologique.",
    en: "Your Day at a Glance. View all sessions, appointments, and tasks scheduled for today in chronological order.",
    es: "Su Día de un Vistazo. Consulte sus sesiones, citas y tareas programadas para hoy en estricto orden cronológico.",
    de: "Ihr Tag im Überblick. Sehen Sie alle heutigen Termine, Arbeitseinheiten und Aufgaben in chronologischer Reihenfolge.",
    pt: "Seu Dia em um Relance. Veja suas sessões, compromissos e tarefas programadas para hoje em ordem cronológica.",
  },

  // Activités
  "act-header": {
    fr: "Gestion des Activités et Missions. Cloisonnez vos différents métiers et contrats avec leurs rémunérations et fréquences respectives.",
    en: "Activities and Missions Management. Separate your different jobs and contracts with their respective rates and schedules.",
    es: "Gestión de Actividades y Misiones. Organice sus trabajos y contratos con sus respectivas tarifas y frecuencias.",
    de: "Aktivitäten- und Auftragsverwaltung. Strukturieren Sie Berufe und Verträge mit individuellen Honoraren und Zeiten.",
    pt: "Gestão de Atividades e Missões. Organize seus diferentes trabalhos e contratos com suas respectivas remunerações e horários.",
  },
  "act-create": {
    fr: "Créer une Nouvelle Activité. Définissez son nom, sa couleur d'agenda, son mode de rémunération et son client associé.",
    en: "Create a New Activity. Define its title, calendar color, compensation model, and linked client account.",
    es: "Crear una Nueva Actividad. Defina su nombre, color de agenda, modelo de remuneración y cliente asociado.",
    de: "Neue Aktivität erstellen. Legen Sie Name, Kalenderfarbe, Vergütungsmodell und den verknüpften Kunden fest.",
    pt: "Criar uma Nova Atividade. Defina nome, cor de calendário, modelo de remuneração e cliente associado.",
  },
  "act-nature": {
    fr: "Nature de l'Activité et Évolution. Distinguez les missions ponctuelles, temporaires ou récurrentes et transformez vos habitudes en routines pérennes.",
    en: "Activity Nature and Evolution. Distinguish one-off, temporary, or recurring missions, and upgrade regular habits into long-term routines.",
    es: "Naturaleza de la Actividad y Evolución. Distinga misiones puntuales, temporales o recurrentes y transforme hábitos en rutinas duraderas.",
    de: "Aktivitätsart und Entwicklung. Unterscheiden Sie einmalige, befristete und wiederkehrende Aufgaben und machen Sie Gewohnheiten zu Routinen.",
    pt: "Natureza da Atividade e Evolução. Diferencie missões pontuais, temporárias ou recorrentes e transforme hábitos regulares em rotinas duradouras.",
  },

  // Calendrier
  "cal-views": {
    fr: "Sélecteur de Vues du Calendrier. Basculez en un clic entre la vue Mois, Semaine, Jour et Agenda selon votre besoin.",
    en: "Calendar View Selector. Switch between Month, Week, Day, and Agenda views with a single click.",
    es: "Selector de Vistas del Calendario. Alterne entre vistas de Mes, Semana, Día y Agenda con un solo clic.",
    de: "Kalenderansichten. Wechseln Sie mit einem Klick zwischen Monats-, Wochen-, Tages- und Agenda-Ansicht.",
    pt: "Seletor de Visualizações do Calendário. Alterne entre as visões Mês, Semana, Dia e Agenda com um único clique.",
  },
  "cal-grid": {
    fr: "Grille de Planning et Détection des Conflits. Visualisez vos séances avec leurs couleurs dédiées et évitez les chevauchements d'horaires.",
    en: "Schedule Grid and Conflict Detection. View sessions in their distinctive colors and avoid overlapping time slots automatically.",
    es: "Cuadrícula de Horarios y Detección de Conflictos. Vea sus sesiones con colores dedicados y evite solapamientos automáticamente.",
    de: "Terminraster und Konflikterkennung. Erkennen Sie Aktivitäten an ihren Farben und vermeiden Sie Überschneidungen.",
    pt: "Grade de Horários e Detecção de Conflitos. Visualize suas sessões com cores dedicadas e evite conflitos de horário automaticamente.",
  },

  // Tâches
  "task-create": {
    fr: "Création d'une Tâche et Priorisation. Attribuez une priorité, une échéance et programmez un rappel sonore à la minute exacte.",
    en: "Task Creation and Prioritization. Assign a priority level, due date, and schedule an exact-minute audio reminder.",
    es: "Creación de Tareas y Priorización. Asigne prioridad, fecha límite y programe un recordatorio sonoro al minuto exacto.",
    de: "Aufgabenerstellung und Priorisierung. Weisen Sie Priorität und Fälligkeit zu und planen Sie minutengenaue Audio-Erinnerungen.",
    pt: "Criação de Tarefas e Priorização. Atribua prioridade, prazo e programe um lembrete sonoro no minuto exato.",
  },
  "task-tabs": {
    fr: "Filtres Temporels et Cycle de Vie. Isolez les tâches en retard, celles du jour et utilisez le report rapide plus sept jours en un geste.",
    en: "Time Filters and Task Lifecycle. Isolate overdue items, today's to-dos, and use the quick plus seven days snooze in one action.",
    es: "Filtros Temporales y Ciclo de Vida. Aísle tareas vencidas, del día y use la posposición rápida de más siete días fácilmente.",
    de: "Zeitfilter und Aufgabenzyklus. Filtern Sie überfällige und heutige To-Dos und verschieben Sie Termine bequem um sieben Tage.",
    pt: "Filtros Temporais e Ciclo de Vida. Isole tarefas atrasadas, do dia e utilize o adiamento rápido de mais sete dias com facilidade.",
  },

  // Finances
  "fin-header": {
    fr: "Vue d'ensemble de la Trésorerie. Suivez vos encaissements réels, vos décaissements et votre solde disponible sans aucune approximation.",
    en: "Cashflow Overview. Track your actual received funds, disbursed expenses, and net balance without approximations.",
    es: "Visión General de la Tesorería. Supervise cobros reales, desembolsos y su saldo disponible sin estimaciones erróneas.",
    de: "Cashflow-Überblick. Behalten Sie echte Geldeingänge, Ausgaben und den verfügbaren Saldo ohne Schätzungen im Blick.",
    pt: "Visão Geral do Fluxo de Caixa. Acompanhe recebimentos reais, desembolsos e seu saldo disponível sem estimativas imprecisas.",
  },
  "fin-tabs": {
    fr: "Les Cinq Volets Financiers. Pilotez vos revenus, dépenses, charges programmées, budgets de plafonnement et cagnottes d'épargne.",
    en: "Five Financial Modules. Steer your income, expenses, scheduled recurring bills, monthly budgets, and savings goals.",
    es: "Cinco Módulos Financieros. Gestione ingresos, gastos, pagos programados, presupuestos mensuales y metas de ahorro.",
    de: "Fünf Finanzbereiche. Steuern Sie Einnahmen, Ausgaben, Daueraufträge, Monatsbudgets und Sparziele.",
    pt: "Cinco Módulos Financeiros. Gerencie receitas, despesas, pagamentos recorrentes, orçamentos mensais e metas de poupança.",
  },
  "fin-export": {
    fr: "Export Comptable CSV. Téléchargez vos écritures complètes prêtes pour votre comptabilité et certifiées sans double comptage.",
    en: "Accounting CSV Export. Download complete transaction records ready for accounting, verified with zero double counting.",
    es: "Exportación Contable CSV. Descargue sus asientos completos listos para contabilidad y certificados sin doble cómputo.",
    de: "Buchhaltungs-Export als CSV. Laden Sie alle Buchungen formatiert herunter, garantiert ohne Doppelbuchungen.",
    pt: "Exportação Contábil CSV. Baixe todos os lançamentos prontos para sua contabilidade e certificados sem contagem dupla.",
  },

  // Inbox
  "inbox-header": {
    fr: "L'Inbox, Boîte de Traitement Financier. Centralisez les paiements attendus, les échéances échues et les dépenses à régler d'urgence.",
    en: "The Inbox, Financial Action Center. Centralize expected payments, overdue dates, and bills requiring urgent settlement.",
    es: "El Buzón, Centro de Gestión Financiera. Centralice cobros pendientes, vencimientos y gastos que requieren pago urgente.",
    de: "Inbox, Ihr Finanz-Aktionszentrum. Bündeln Sie anstehende Einnahmen, Fälligkeiten und dringend zu begleichende Rechnungen.",
    pt: "A Inbox, Centro de Ação Financeira. Centralize pagamentos esperados, vencimentos e despesas que requerem pagamento urgente.",
  },
  "inbox-tabs": {
    fr: "Organisation en Trois Onglets. Traitez l'urgent dans À traiter, anticipez dans En attente et vérifiez vos opérations dans l'Historique.",
    en: "Three-Tab Organization. Handle urgent matters in To Process, anticipate in Pending, and inspect past resolutions in History.",
    es: "Organización en Tres Pestañas. Gestione lo urgente en Por tratar, anticipe en Pendiente y revise el Historial.",
    de: "Drei klare Register. Erledigen Sie Dringendes unter Zu bearbeiten, planen Sie unter Anstehend und prüfen Sie den Verlauf.",
    pt: "Organização em Três Abas. Trate o urgente em A processar, antecipe em Pendente e consulte resoluções no Histórico.",
  },
  "inbox-kpis": {
    fr: "Synthèse des Sommes en Jeu. Visualisez d'un coup d'œil le total exact des montants à encaisser et des dépenses à régler.",
    en: "Summary of Amounts at Stake. See at a glance the exact totals to collect and expenses to pay for the active tab.",
    es: "Resumen de Importes en Juego. Conozca al instante el total exacto por cobrar y los gastos por liquidar.",
    de: "Zusammenfassung der Beträge. Überblicken Sie auf einen Blick alle fälligen Einnahmen und offenen Ausgaben.",
    pt: "Síntese dos Valores em Jogo. Visualize rapidamente o total exato a receber e as despesas a liquidar na aba ativa.",
  },

  // Notifications
  "notif-header": {
    fr: "Centre de Notifications et Alertes. Suivez les rappels d'échéances, les alertes de séances et les renouvellements de contrat.",
    en: "Notifications and Alerts Center. Track deadline reminders, upcoming session alerts, and contract renewals seamlessly.",
    es: "Centro de Notificaciones y Alertas. Siga avisos de plazos, alertas de sesiones y renovaciones de contratos.",
    de: "Benachrichtigungs- und Alarmzentrum. Verfolgen Sie Fristen, Terminerinnerungen und Vertragsverlängerungen.",
    pt: "Central de Notificações e Alertas. Acompanhe lembretes de prazos, alertas de sessões e renovações de contratos.",
  },
  "notif-filters": {
    fr: "Filtres Multi-Critères Avancés. Isolez vos alertes par type, statut de lecture, période temporelle ou activité concernée.",
    en: "Advanced Multi-Criteria Filters. Filter alerts by type, read status, timeframe, or specific professional activity.",
    es: "Filtros Multi-Criterio Avanzados. Filtre alertas por tipo, estado de lectura, período temporal o actividad relacionada.",
    de: "Erweiterte Filteroptionen. Sortieren Sie Meldungen nach Typ, Lesestatus, Zeitraum oder spezifischer Tätigkeit.",
    pt: "Filtros Multi-Critérios Avançados. Isole alertas por tipo, status de leitura, período ou atividade específica.",
  },
  "notif-actions": {
    fr: "Actions Rapides et Historique. Validez vos séances, renouvelez vos missions et résolvez vos alertes en un clic sans changer de page.",
    en: "Quick Actions and Resolution History. Confirm sessions, renew contracts, and resolve alerts with one click right on the page.",
    es: "Acciones Rápidas e Historial. Valide sesiones, renueve contratos y resuelva alertas en un solo clic sin cambiar de página.",
    de: "Schnellaktionen und Verlauf. Bestätigen Sie Termine, verlängern Sie Aufträge und erledigen Sie Meldungen mit einem Klick.",
    pt: "Ações Rápidas e Histórico. Valide sessões, renove contratos e resolva alertas com um clique sem sair da página.",
  },

  // Clients
  "cli-header": {
    fr: "Clients et Organisations Professionnelles. Gérez votre carnet d'adresses et associez vos contacts directement à vos activités.",
    en: "Clients and Professional Accounts. Manage your contacts directory and link client accounts directly to your activities.",
    es: "Clientes y Cuentas Profesionales. Gestione su directorio de contactos y vincule clientes directamente a sus actividades.",
    de: "Kunden- und Unternehmensverwaltung. Verwalten Sie Adressen und verknüpfen Sie Ansprechpartner direkt mit Ihren Tätigkeiten.",
    pt: "Clientes e Contas Profissionais. Gerencie sua agenda de contatos e vincule clientes diretamente às suas atividades.",
  },
  "cli-create": {
    fr: "Nouveau Contact ou Organisation. Enregistrez les coordonnées téléphoniques et emails de vos partenaires d'un simple geste.",
    en: "New Contact or Organization. Save phone numbers, email addresses, and professional profiles in a single step.",
    es: "Nuevo Contacto u Organización. Guarde teléfonos, correos electrónicos y perfiles profesionales en un solo paso.",
    de: "Neuer Kontakt oder Auftraggeber. Speichern Sie Telefonnummern, E-Mails und Firmenprofile in einem Schritt.",
    pt: "Novo Contato ou Organização. Salve telefones, e-mails e informações corporativas em um simples passo.",
  },

  // Rapports
  "rep-kpi": {
    fr: "Calcul de Rentabilité Réelle. Comparez vos heures enregistrées avec vos encaissements pour connaître votre taux horaire effectif.",
    en: "Real Profitability Analysis. Compare actual calendar hours with collected revenue to determine your true hourly rate.",
    es: "Cálculo de Rentabilidad Real. Compare sus horas registradas con los cobros efectivos para conocer su tarifa horaria real.",
    de: "Echte Rentabilitätsberechnung. Vergleichen Sie geleistete Stunden mit Geldeingängen für Ihren realen Stundensatz.",
    pt: "Cálculo de Rentabilidade Real. Compare horas registradas no calendário com receitas recebidas para saber sua taxa horária real.",
  },
  "rep-export": {
    fr: "Exportation et Impression de Bilans. Générez des bilans imprimables soignés ou téléchargez vos synthèses CSV pour votre comptable.",
    en: "Reports Export and Printing. Generate clean printable summaries or download verified CSV reports for your accountant.",
    es: "Exportación e Impresión de Balances. Genere resúmenes imprimibles o descargue informes CSV certificados para su contable.",
    de: "Berichtsexport und Druckfunktion. Erstellen Sie druckfertige Übersichten oder exportieren Sie CSV-Berichte für die Buchhaltung.",
    pt: "Exportação e Impressão de Balanços. Gere resumos imprimíveis ou baixe relatórios CSV certificados para sua contabilidade.",
  },

  // Paramètres
  "set-tabs": {
    fr: "Paramètres et Personnalisation Complète. Ajustez vos profils, testez les voix de guidage et gérez vos notifications push.",
    en: "Settings and Full Customization. Adjust user profiles, test voice guidance preferences, and configure push notifications.",
    es: "Configuración y Personalización Completa. Ajuste perfiles, pruebe las voces de guía y configure notificaciones push.",
    de: "Umfassende Einstellungen. Verwalten Sie Profile, testen Sie Sprachoptionen und konfigurieren Sie Push-Benachrichtigungen.",
    pt: "Configurações e Personalização Completa. Ajuste perfis, teste vozes de orientação e configure notificações push.",
  },
};

/**
 * Récupère le texte vocal concis d'une section pour la langue spécifiée.
 */
export function getSectionVoiceGuide(section: string, language: VoiceLanguage = "fr"): string {
  const content = SECTION_VOICE_GUIDES[section] || SECTION_VOICE_GUIDES["dashboard"];
  if (!content) {
    return "";
  }
  return content[language] || content.fr;
}

/**
 * Formate le texte oral naturel et concis pour une étape de guide interactif.
 * Combine le titre avec le rôle essentiel ou une description synthétique.
 */
export function getTourStepVoiceText(step: TourStep, language: VoiceLanguage = "fr"): string {
  if (!step) return "";

  // 1. Recherche prioritaire dans les scripts localisés rédigés spécifiquement pour l'oral
  const stepScript = step.id ? TOUR_STEP_VOICE_SCRIPTS[step.id] : undefined;
  if (stepScript && stepScript[language]) {
    return stepScript[language];
  }

  // 2. Si un script existe en français et que la langue demandée est 'fr'
  if (stepScript?.fr) {
    return stepScript.fr;
  }

  // 3. Fallback dynamique : extraction et nettoyage des éléments textuels de l'étape
  const title = (step.title || "").replace(/[👋🚀✨💡⚙️]/g, "").trim();

  // Priorité au rôle précis s'il existe
  let detail = step.purpose || step.description || "";
  detail = detail.trim();

  // Si la description contient plusieurs phrases, garder les 2 premières pour ne pas alourdir l'audio
  const sentences = detail.split(/(?<=[.!?])\s+/);
  const brief = sentences.slice(0, 2).join(" ");

  if (!title) return brief;
  if (!brief) return title;

  return `${title}. ${brief}`;
}
