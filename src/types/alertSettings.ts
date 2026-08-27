export interface BudgetCategoryThreshold {
  id: string;
  category: string; // e.g. "Achats & Sous-traitance (60)", "Services Extérieurs (61/62)", "Frais de déplacement (625)", "Masse Salariale (64)", "Impôts & Taxes (63)"
  accountPrefix: string; // e.g. "60", "61", "62", "64", "63"
  monthlyBudget: number; // in base currency
  alertThresholdPercent: number; // e.g. 80, 90, 100%
  enabled: boolean;
}

export interface AlertNotificationSettings {
  email: string;
  enabled: boolean;
  emailOnCashRisk: boolean;
  emailOnBudgetExceeded: boolean;
  emailOnFiscalDeadline: boolean;
  emailOnAnomalyDetected: boolean;
  
  // Custom Cash Thresholds
  cashMinimumThreshold: number; // minimum cash reserve e.g. 5000 EUR
  cashRunwayAlertMonths: number; // e.g. < 2 months runway
  cashProjectionDeficitDays: number; // e.g. alert if deficit within 30 days
  
  // Budgets
  budgetThresholds: BudgetCategoryThreshold[];
  
  // Notification history log
  notificationHistory: EmailNotificationLog[];
}

export interface EmailNotificationLog {
  id: string;
  sentAt: string; // ISO date
  toEmail: string;
  subject: string;
  type: "CASH_RISK" | "BUDGET_EXCEEDED" | "FISCAL_DEADLINE" | "ANOMALY";
  preview: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  read?: boolean;
}

export const defaultAlertSettings: AlertNotificationSettings = {
  email: "directeur.financier@entreprise.fr",
  enabled: true,
  emailOnCashRisk: true,
  emailOnBudgetExceeded: true,
  emailOnFiscalDeadline: true,
  emailOnAnomalyDetected: true,
  cashMinimumThreshold: 5000,
  cashRunwayAlertMonths: 2,
  cashProjectionDeficitDays: 20,
  budgetThresholds: [
    {
      id: "b-1",
      category: "Services Extérieurs & Sous-traitance (61/62)",
      accountPrefix: "61,62",
      monthlyBudget: 6000,
      alertThresholdPercent: 85,
      enabled: true,
    },
    {
      id: "b-2",
      category: "Achats & Fournitures Consommables (60)",
      accountPrefix: "60",
      monthlyBudget: 4000,
      alertThresholdPercent: 90,
      enabled: true,
    },
    {
      id: "b-3",
      category: "Frais de Déplacement, Missions & Réceptions (625)",
      accountPrefix: "625",
      monthlyBudget: 1500,
      alertThresholdPercent: 80,
      enabled: true,
    },
    {
      id: "b-4",
      category: "Rémunérations & Charges de Personnel (64)",
      accountPrefix: "64",
      monthlyBudget: 12000,
      alertThresholdPercent: 95,
      enabled: true,
    },
    {
      id: "b-5",
      category: "Publicité, Marketing & Abonnements SaaS (623/651)",
      accountPrefix: "623,651",
      monthlyBudget: 2500,
      alertThresholdPercent: 85,
      enabled: true,
    },
  ],
  notificationHistory: [
    {
      id: "notif-1",
      sentAt: "2026-08-27T08:30:00.000Z",
      toEmail: "directeur.financier@entreprise.fr",
      subject: "⚠️ Alerte DAF : Risque de tension de trésorerie sous 20 jours",
      type: "CASH_RISK",
      preview: "Le solde projeté de trésorerie passe sous le seuil critique (creux estimé à -2 600 € le 15 septembre suite à l'échéance URSSAF/TVA).",
      severity: "CRITICAL",
      read: true,
    },
    {
      id: "notif-2",
      sentAt: "2026-08-25T14:15:00.000Z",
      toEmail: "directeur.financier@entreprise.fr",
      subject: "📊 Alerte Budget : 88% du budget Services Extérieurs (61/62) consommé",
      type: "BUDGET_EXCEEDED",
      preview: "Les dépenses enregistrées atteignent 5 280 € sur un plafond mensuel alloué de 6 000 €.",
      severity: "WARNING",
      read: true,
    },
  ],
};
