export type AccountingStandard = "PCG" | "SYSCOHADA" | "IFRS";

export type JournalCode = "AC" | "VE" | "BQ" | "OD" | "AN";

export type DocumentType =
  | "FACTURE_ACHAT"
  | "FACTURE_VENTE"
  | "NOTE_DE_FRAIS"
  | "RELEVE_BANCAIRE"
  | "AVOIR"
  | "BULLETIN_PAIE"
  | "AUTRE";

export type TransactionStatus = "VALIDATED" | "DRAFT" | "RECONCILED";

export type CurrencyCode =
  | "EUR"
  | "USD"
  | "GBP"
  | "CHF"
  | "CAD"
  | "JPY"
  | "CNY"
  | "XOF"
  | "AED"
  | "MAD";

export interface ExchangeRateInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  rateToBaseEUR: number; // e.g. 1.085 for USD means 1 EUR = 1.085 USD
  flag: string;
  lastUpdated: string;
}

export interface JournalEntryLine {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number; // Always in company base currency (Devise de tenue de compte)
  credit: number; // Always in company base currency
  description: string;
  lettrage?: string;
  // Multi-currency details for FEC & audit
  originalCurrency?: CurrencyCode | string;
  originalAmountDebit?: number;
  originalAmountCredit?: number;
  exchangeRate?: number;
}

export interface JournalTransaction {
  id: string;
  pieceNumber: string;
  date: string;
  dueDate?: string;
  journalCode: JournalCode;
  partnerName: string;
  partnerTaxId?: string;
  documentType: DocumentType;
  // Converted Base Currency Amounts (devise de tenue de compte)
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  vatRate: number;
  status: TransactionStatus;
  lines: JournalEntryLine[];
  documentUrl?: string;
  rawOcrText?: string;
  confidenceScore?: number;
  aiAuditNotes?: string[];
  createdAt: string;
  
  // Multi-Currency Meta
  isForeignCurrency?: boolean;
  currency?: CurrencyCode | string; // Original invoice currency
  originalAmountHT?: number;
  originalAmountTVA?: number;
  originalAmountTTC?: number;
  exchangeRate?: number; // 1 Base Currency = X Foreign Currency (or Foreign/Base)
  exchangeRateDate?: string;
  exchangeGainOrLoss?: number; // Gain (+) or Loss (-) de change
}

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

export type InvoiceDocType = "INVOICE" | "QUOTE" | "CREDIT_NOTE";

export interface InvoiceClient {
  id?: string;
  name: string;
  contactName?: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  siren?: string;
  vatNumber?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit?: string; // "heure", "jour", "forfait", "unité", "licence", "mois"
  unitPriceHT: number;
  vatRate: number; // e.g. 20, 10, 5.5, 0, 18
  discountPct?: number; // e.g. 0, 5, 10%
  amountHT: number; // (qty * unitPriceHT) * (1 - discount/100)
  amountTVA: number; // amountHT * (vatRate / 100)
  amountTTC: number; // amountHT + amountTVA
  accountCode?: string; // e.g. "706000" for services or "707000" for goods
}

export interface InvoiceTaxSummary {
  vatRate: number;
  baseAmountHT: number;
  taxAmount: number;
}

export interface ClientInvoice {
  id: string;
  number: string; // e.g. "FAC-CLI-2026-012"
  type: InvoiceDocType; // "INVOICE" | "QUOTE" | "CREDIT_NOTE"
  date: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  client: InvoiceClient;
  items: InvoiceLineItem[];
  currency: CurrencyCode | string; // "EUR", "USD", "XOF", "GBP", "CHF"
  exchangeRate?: number; // Rate against company base currency if foreign
  totalBrutHT: number;
  totalDiscount: number;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  taxesSummary: InvoiceTaxSummary[];
  status: InvoiceStatus;
  paymentMethod: "VIREMENT" | "CARTE" | "PRELEVEMENT" | "CHEQUE" | "ESPECES";
  paymentTerms: string; // e.g. "Paiement à 30 jours", "À réception", "Comptant"
  notes?: string;
  legalNotice?: string;
  bankDetails?: {
    bankName: string;
    iban: string;
    bic: string;
  };
  journalTransactionId?: string; // Linked JournalTransaction ID in JournalView
  isBookedInJournal: boolean; // Has it generated an entry in Journal des Ventes (VE)?
  createdAt: string;
  paidAt?: string;
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number; // positive = credit (encaissement), negative = debit (décaissement)
  category: string;
  matchedJournalId?: string;
  status: "MATCHED" | "UNMATCHED";
  confidence?: number;
  currency?: CurrencyCode | string;
  originalAmount?: number;
  exchangeRate?: number;
}

export interface AnomalyReport {
  id: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  type: "TVA" | "DOUBLON" | "EQUILIBRE" | "TRESORERIE" | "FISCAL" | "CONFORMITE" | "DEVISE";
  title: string;
  description: string;
  recommendation: string;
  entryRef?: string;
  detectedAt?: string;
  suggestedFix?: string;
  transactionId?: string;
}

export interface RecurringTransaction {
  id: string;
  name: string;
  type: "INFLOW" | "OUTFLOW";
  amount: number;
  frequency: "MONTHLY" | "WEEKLY" | "QUARTERLY";
  dayOfMonth: number; // 1-31
  category: string;
  confidenceScore: number; // 0 to 1
  isVariable?: boolean;
  nextExecutionDate: string;
  counterparty?: string;
}

export interface CashFlowDailyProjection {
  dayOffset: number; // 0..30
  date: string; // YYYY-MM-DD
  projectedBalance: number;
  inflows: number;
  outflows: number;
  details: string[];
  isNegative: boolean;
}

export interface PredictiveCashAlert {
  hasRisk: boolean;
  minProjectedBalance: number;
  minBalanceDate: string;
  daysUntilDeficit: number | null;
  deficitDate: string | null;
  riskSeverity: "SAFE" | "WARNING" | "CRITICAL";
  summary: string;
  aiRecommendations: string[];
  dailyBurnRate: number;
  projectedRunwayDays: number;
  dailyForecast: CashFlowDailyProjection[];
  recurringTransactions: RecurringTransaction[];
  deficitAmount: number;
}

export interface FiscalDeadline {
  id: string;
  title: string;
  category: "TVA" | "SOCIAL" | "IS" | "CFE" | "TAXE_SALAIRE";
  authority: string; // e.g. "DGFiP", "URSSAF / DSN", "CNPS"
  dueDate: string; // YYYY-MM-DD
  daysRemaining: number;
  isUrgent: boolean; // <= 7 days
  amountEstimated: number;
  description: string;
  actionLabel?: string;
  actionTab?: string;
  status: "PENDING" | "PAID" | "SCHEDULED";
  riskLevel: "CRITICAL" | "WARNING" | "INFO";
}

export interface CompanyProfile {
  name: string;
  legalForm: string; // SAS, SARL, SA, Auto-entrepreneur, EURL
  siren: string;
  vatNumber: string;
  accountingStandard: AccountingStandard;
  currency: CurrencyCode | string; // e.g. "EUR", "XOF", "USD", "€", "FCFA"
  vatRegime: "REEL_NORMAL" | "REEL_SIMPLIFIE" | "FRANCHISE_EN_BASE";
  taxRegime?: string;
  nafCode?: string;
  activity?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  country?: string;
  fiscalYearStart: string; // MM-DD
  fiscalYearEnd: string;
  initialCash: number;
}

export interface AccountPlanItem {
  code: string;
  name: string;
  category: "ACTIF" | "PASSIF" | "CHARGES" | "PRODUITS" | "CAPITAUX" | "TRESORERIE";
  standard: AccountingStandard;
}

export interface FinancialKPIs {
  chiffreAffaires: number;
  chargesTotales: number;
  margeBrute: number;
  margeBrutePct: number;
  ebe: number; // Excédent Brut d'Exploitation (EBITDA)
  resultatExploitation: number;
  resultatNet: number;
  tresorerieActuelle: number;
  bfr: number; // Besoin en Fonds de Roulement
  bfrEstime?: number;
  dsoDays: number; // Days Sales Outstanding
  runwayMonths: number;
  tvaCollectee: number;
  tvaDeductible: number;
  tvaNetDue: number; // If positive = à décaisser, if negative = crédit de TVA
  impotSocietesEstime: number;
  activeAccountsReceivable: number; // Créances clients (411)
  activeAccountsPayable: number; // Dettes fournisseurs (401)
  totalForeignInvoicesCount?: number;
  totalExchangeGains?: number; // Compte 766
  totalExchangeLosses?: number; // Compte 666
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  attachments?: string[];
  suggestedActions?: string[];
}
