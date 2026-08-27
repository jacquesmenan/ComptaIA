import { CurrencyCode, ExchangeRateInfo, JournalEntryLine, JournalTransaction } from "../types";

export const DEFAULT_EXCHANGE_RATES: Record<CurrencyCode, ExchangeRateInfo> = {
  EUR: {
    code: "EUR",
    name: "Euro (€)",
    symbol: "€",
    rateToBaseEUR: 1.0,
    flag: "🇪🇺",
    lastUpdated: "2026-02-26",
  },
  USD: {
    code: "USD",
    name: "Dollar américain ($)",
    symbol: "$",
    rateToBaseEUR: 1.085, // 1 EUR = 1.085 USD  =>  1 USD = 0.92166 EUR
    flag: "🇺🇸",
    lastUpdated: "2026-02-26",
  },
  GBP: {
    code: "GBP",
    name: "Livre Sterling (£)",
    symbol: "£",
    rateToBaseEUR: 0.855, // 1 EUR = 0.855 GBP  =>  1 GBP = 1.16959 EUR
    flag: "🇬🇧",
    lastUpdated: "2026-02-26",
  },
  CHF: {
    code: "CHF",
    name: "Franc Suisse (CHF)",
    symbol: "CHF",
    rateToBaseEUR: 0.965, // 1 EUR = 0.965 CHF
    flag: "🇨🇭",
    lastUpdated: "2026-02-26",
  },
  CAD: {
    code: "CAD",
    name: "Dollar Canadien (CA$)",
    symbol: "CA$",
    rateToBaseEUR: 1.482,
    flag: "🇨🇦",
    lastUpdated: "2026-02-26",
  },
  JPY: {
    code: "JPY",
    name: "Yen Japonais (¥)",
    symbol: "¥",
    rateToBaseEUR: 163.4,
    flag: "🇯🇵",
    lastUpdated: "2026-02-26",
  },
  CNY: {
    code: "CNY",
    name: "Yuan Renminbi (¥)",
    symbol: "¥",
    rateToBaseEUR: 7.82,
    flag: "🇨🇳",
    lastUpdated: "2026-02-26",
  },
  XOF: {
    code: "XOF",
    name: "Franc CFA BCEAO (FCFA)",
    symbol: "FCFA",
    rateToBaseEUR: 655.957, // Parité fixe Zone Franc
    flag: "🌍",
    lastUpdated: "2026-02-26",
  },
  AED: {
    code: "AED",
    name: "Dirham des EAU (AED)",
    symbol: "AED",
    rateToBaseEUR: 3.985,
    flag: "🇦🇪",
    lastUpdated: "2026-02-26",
  },
  MAD: {
    code: "MAD",
    name: "Dirham Marocain (MAD)",
    symbol: "MAD",
    rateToBaseEUR: 10.82,
    flag: "🇲🇦",
    lastUpdated: "2026-02-26",
  },
};

/**
 * Normalize currency string to standard CurrencyCode
 */
export function normalizeCurrencyCode(raw?: string): CurrencyCode {
  if (!raw) return "EUR";
  const upper = raw.trim().toUpperCase();
  if (upper === "€" || upper === "EUR" || upper === "EURO" || upper === "EUROS") return "EUR";
  if (upper === "$" || upper === "USD" || upper === "DOLLAR" || upper === "US DOLLAR") return "USD";
  if (upper === "£" || upper === "GBP" || upper === "POUND" || upper === "LIVRE") return "GBP";
  if (upper === "CHF" || upper === "FRANC SUISSE") return "CHF";
  if (upper === "CAD" || upper === "CA$" || upper === "CAD$") return "CAD";
  if (upper === "JPY" || upper === "¥" || upper === "YEN") return "JPY";
  if (upper === "CNY" || upper === "RMB" || upper === "YUAN") return "CNY";
  if (upper === "XOF" || upper === "FCFA" || upper === "CFA" || upper === "XAF") return "XOF";
  if (upper === "AED") return "AED";
  if (upper === "MAD") return "MAD";
  return "EUR";
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(curr?: string): string {
  const code = normalizeCurrencyCode(curr);
  return DEFAULT_EXCHANGE_RATES[code]?.symbol || "€";
}

/**
 * Get currency flag
 */
export function getCurrencyFlag(curr?: string): string {
  const code = normalizeCurrencyCode(curr);
  return DEFAULT_EXCHANGE_RATES[code]?.flag || "🌐";
}

/**
 * Calculate cross exchange rate: 1 FromCurrency = X ToCurrency
 */
export function getExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  customRates: Record<CurrencyCode, ExchangeRateInfo> = DEFAULT_EXCHANGE_RATES
): number {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);

  if (from === to) return 1.0;

  const rateFrom = customRates[from]?.rateToBaseEUR || 1.0;
  const rateTo = customRates[to]?.rateToBaseEUR || 1.0;

  // Rate From -> EUR = 1 / rateFrom
  // Rate EUR -> To = rateTo
  // Rate From -> To = (1 / rateFrom) * rateTo = rateTo / rateFrom
  const rate = rateTo / rateFrom;
  return Math.round(rate * 1000000) / 1000000;
}

/**
 * Convert an amount between currencies
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  customRate?: number,
  customRates: Record<CurrencyCode, ExchangeRateInfo> = DEFAULT_EXCHANGE_RATES
): {
  convertedAmount: number;
  rateApplied: number;
  fromCode: CurrencyCode;
  toCode: CurrencyCode;
} {
  const fromCode = normalizeCurrencyCode(fromCurrency);
  const toCode = normalizeCurrencyCode(toCurrency);

  if (fromCode === toCode) {
    return {
      convertedAmount: Math.round(amount * 100) / 100,
      rateApplied: 1.0,
      fromCode,
      toCode,
    };
  }

  const rateApplied = customRate !== undefined && customRate > 0
    ? customRate
    : getExchangeRate(fromCode, toCode, customRates);

  const convertedAmount = Math.round(amount * rateApplied * 100) / 100;

  return {
    convertedAmount,
    rateApplied,
    fromCode,
    toCode,
  };
}

/**
 * Checks if a currency differs from the company base currency
 */
export function isForeignCurrency(
  currency: string | undefined,
  baseCurrency: string | undefined
): boolean {
  const from = normalizeCurrencyCode(currency);
  const to = normalizeCurrencyCode(baseCurrency);
  return from !== to;
}

/**
 * Format currency with full precision and symbol
 */
export function formatCurrencyAmount(
  amount: number,
  curr: string,
  locale = "fr-FR"
): string {
  const code = normalizeCurrencyCode(curr);
  const symbol = getCurrencySymbol(code);

  const formattedNumber = Number(amount || 0).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (code === "USD" || code === "CAD") {
    return `${symbol} ${formattedNumber}`;
  }
  if (code === "GBP") {
    return `${symbol}${formattedNumber}`;
  }
  return `${formattedNumber} ${symbol}`;
}

/**
 * Calculate Exchange Gain or Loss (Gains / Pertes de change)
 * In PCG:
 * - Compte 766000: Gains de change
 * - Compte 666000: Pertes de change
 * - Compte 476000: Différences de conversion - Actif (Perte latente)
 * - Compte 477000: Différences de conversion - Passif (Gain latent)
 */
export function calculateExchangeGainLoss(
  originalForeignAmount: number,
  invoiceRate: number,
  paymentRate: number,
  isSale: boolean // true = Facture Vente (Client), false = Facture Achat (Fournisseur)
): {
  amountInBaseAtInvoiceRate: number;
  amountInBaseAtPaymentRate: number;
  difference: number;
  isGain: boolean;
  accountCode: string;
  accountName: string;
} {
  const amountInBaseAtInvoiceRate = originalForeignAmount * invoiceRate;
  const amountInBaseAtPaymentRate = originalForeignAmount * paymentRate;
  
  // For Sale: if payment in base currency > invoice in base currency => Gain (+)
  // For Purchase: if payment in base currency < invoice in base currency => Gain (+)
  let diff = 0;
  if (isSale) {
    diff = amountInBaseAtPaymentRate - amountInBaseAtInvoiceRate;
  } else {
    diff = amountInBaseAtInvoiceRate - amountInBaseAtPaymentRate;
  }

  const isGain = diff >= 0;
  const absDiff = Math.abs(Math.round(diff * 100) / 100);

  return {
    amountInBaseAtInvoiceRate: Math.round(amountInBaseAtInvoiceRate * 100) / 100,
    amountInBaseAtPaymentRate: Math.round(amountInBaseAtPaymentRate * 100) / 100,
    difference: absDiff,
    isGain,
    accountCode: isGain ? "766000" : "666000",
    accountName: isGain ? "Gains de change (Produits financiers)" : "Pertes de change (Charges financières)",
  };
}

/**
 * Convert complete Invoice entries from foreign currency to base currency
 */
export function convertInvoiceToAccountingCurrency(params: {
  foreignCurrency: string;
  baseCurrency: string;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  vatRate: number;
  customExchangeRate?: number;
  accountingStandard?: "PCG" | "SYSCOHADA" | "IFRS";
  documentType?: string;
  partnerName?: string;
  pieceNumber?: string;
}): {
  baseAmountHT: number;
  baseAmountTVA: number;
  baseAmountTTC: number;
  exchangeRate: number;
  isForeign: boolean;
  summaryText: string;
  convertedLines: JournalEntryLine[];
} {
  const fromCode = normalizeCurrencyCode(params.foreignCurrency);
  const toCode = normalizeCurrencyCode(params.baseCurrency);
  const isForeign = fromCode !== toCode;

  // Rate: 1 Foreign Unit = X Base Units (e.g. 1 USD = 0.92166 EUR)
  const exchangeRate =
    params.customExchangeRate !== undefined && params.customExchangeRate > 0
      ? params.customExchangeRate
      : getExchangeRate(fromCode, toCode);

  const baseAmountHT = Math.round(params.amountHT * exchangeRate * 100) / 100;
  const baseAmountTVA = Math.round(params.amountTVA * exchangeRate * 100) / 100;
  // Ensure baseAmountTTC = baseAmountHT + baseAmountTVA to prevent rounding imbalance
  const baseAmountTTC = Math.round((baseAmountHT + baseAmountTVA) * 100) / 100;

  const isSYSCOHADA = params.accountingStandard === "SYSCOHADA";
  const isSale = params.documentType === "FACTURE_VENTE";

  const lines: JournalEntryLine[] = [];

  if (isSale) {
    // Vente : Débit 411 (TTC), Crédit 706/707 (HT), Crédit 4457 (TVA)
    const clientAccount = isSYSCOHADA ? "411100" : "411000";
    const revenueAccount = isSYSCOHADA ? "706000" : "706000";
    const vatAccount = isSYSCOHADA ? "443100" : "445710";

    lines.push({
      id: `L-${Date.now()}-1`,
      accountCode: clientAccount,
      accountName: "Clients - Créances",
      debit: baseAmountTTC,
      credit: 0,
      description: `Facture Vente ${params.partnerName || ""} (${formatCurrencyAmount(params.amountTTC, fromCode)} @ ${exchangeRate.toFixed(4)})`,
      originalCurrency: fromCode,
      originalAmountDebit: params.amountTTC,
      originalAmountCredit: 0,
      exchangeRate,
    });

    lines.push({
      id: `L-${Date.now()}-2`,
      accountCode: revenueAccount,
      accountName: "Prestations & Ventes",
      debit: 0,
      credit: baseAmountHT,
      description: `Produits HT (${formatCurrencyAmount(params.amountHT, fromCode)})`,
      originalCurrency: fromCode,
      originalAmountDebit: 0,
      originalAmountCredit: params.amountHT,
      exchangeRate,
    });

    if (baseAmountTVA > 0) {
      lines.push({
        id: `L-${Date.now()}-3`,
        accountCode: vatAccount,
        accountName: "TVA Collectée",
        debit: 0,
        credit: baseAmountTVA,
        description: `TVA ${params.vatRate}%`,
        originalCurrency: fromCode,
        originalAmountDebit: 0,
        originalAmountCredit: params.amountTVA,
        exchangeRate,
      });
    }
  } else {
    // Achat : Débit 606/618/62 (HT), Débit 4456 (TVA), Crédit 401 (TTC)
    const supplierAccount = isSYSCOHADA ? "401100" : "401000";
    const chargeAccount = isSYSCOHADA ? "605100" : "606300";
    const vatAccount = isSYSCOHADA ? "445200" : "445660";

    lines.push({
      id: `L-${Date.now()}-1`,
      accountCode: chargeAccount,
      accountName: "Achats / Charges d'exploitation",
      debit: baseAmountHT,
      credit: 0,
      description: `Achat HT ${params.partnerName || ""} (${formatCurrencyAmount(params.amountHT, fromCode)} @ ${exchangeRate.toFixed(4)})`,
      originalCurrency: fromCode,
      originalAmountDebit: params.amountHT,
      originalAmountCredit: 0,
      exchangeRate,
    });

    if (baseAmountTVA > 0) {
      lines.push({
        id: `L-${Date.now()}-2`,
        accountCode: vatAccount,
        accountName: "TVA Déductible",
        debit: baseAmountTVA,
        credit: 0,
        description: `TVA ${params.vatRate}% (${formatCurrencyAmount(params.amountTVA, fromCode)})`,
        originalCurrency: fromCode,
        originalAmountDebit: params.amountTVA,
        originalAmountCredit: 0,
        exchangeRate,
      });
    }

    lines.push({
      id: `L-${Date.now()}-3`,
      accountCode: supplierAccount,
      accountName: "Fournisseurs - Dettes",
      debit: 0,
      credit: baseAmountTTC,
      description: `Dette TTC ${params.partnerName || ""} (${formatCurrencyAmount(params.amountTTC, fromCode)})`,
      originalCurrency: fromCode,
      originalAmountDebit: 0,
      originalAmountCredit: params.amountTTC,
      exchangeRate,
    });
  }

  const summaryText = isForeign
    ? `Conversion automatique : ${formatCurrencyAmount(params.amountTTC, fromCode)} converti en ${formatCurrencyAmount(baseAmountTTC, toCode)} au taux de change de 1 ${fromCode} = ${exchangeRate.toFixed(4)} ${toCode}.`
    : `Enregistrement en devise nationale (${toCode}).`;

  return {
    baseAmountHT,
    baseAmountTVA,
    baseAmountTTC,
    exchangeRate,
    isForeign,
    summaryText,
    convertedLines: lines,
  };
}
