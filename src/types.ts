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
