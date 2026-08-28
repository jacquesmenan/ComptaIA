import {
  ClientInvoice,
  InvoiceLineItem,
  InvoiceTaxSummary,
  JournalTransaction,
  CompanyProfile,
  InvoiceDocType,
  CurrencyCode,
} from "../types";

/**
 * Calculates line items and aggregates for an invoice (HT, Remise, Taxes, TTC).
 */
export function calculateInvoiceTotals(
  items: InvoiceLineItem[]
): {
  totalBrutHT: number;
  totalDiscount: number;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  taxesSummary: InvoiceTaxSummary[];
  computedItems: InvoiceLineItem[];
} {
  let totalBrutHT = 0;
  let totalDiscount = 0;
  let totalHT = 0;
  let totalTVA = 0;

  const taxesMap = new Map<number, { base: number; tax: number }>();

  const computedItems = items.map((item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPriceHT) || 0;
    const discountPct = Math.min(100, Math.max(0, Number(item.discountPct) || 0));
    const vatRate = Number(item.vatRate) || 0;

    const lineBrutHT = qty * price;
    const lineDiscount = lineBrutHT * (discountPct / 100);
    const lineNetHT = lineBrutHT - lineDiscount;
    const lineTVA = lineNetHT * (vatRate / 100);
    const lineTTC = lineNetHT + lineTVA;

    totalBrutHT += lineBrutHT;
    totalDiscount += lineDiscount;
    totalHT += lineNetHT;
    totalTVA += lineTVA;

    const existingTax = taxesMap.get(vatRate) || { base: 0, tax: 0 };
    taxesMap.set(vatRate, {
      base: existingTax.base + lineNetHT,
      tax: existingTax.tax + lineTVA,
    });

    return {
      ...item,
      quantity: qty,
      unitPriceHT: price,
      discountPct,
      vatRate,
      amountHT: Math.round(lineNetHT * 100) / 100,
      amountTVA: Math.round(lineTVA * 100) / 100,
      amountTTC: Math.round(lineTTC * 100) / 100,
    };
  });

  const taxesSummary: InvoiceTaxSummary[] = Array.from(taxesMap.entries())
    .map(([rate, val]) => ({
      vatRate: rate,
      baseAmountHT: Math.round(val.base * 100) / 100,
      taxAmount: Math.round(val.tax * 100) / 100,
    }))
    .sort((a, b) => b.vatRate - a.vatRate);

  const roundedHT = Math.round(totalHT * 100) / 100;
  const roundedTVA = Math.round(totalTVA * 100) / 100;
  const roundedTTC = Math.round((roundedHT + roundedTVA) * 100) / 100;

  return {
    totalBrutHT: Math.round(totalBrutHT * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalHT: roundedHT,
    totalTVA: roundedTVA,
    totalTTC: roundedTTC,
    taxesSummary,
    computedItems,
  };
}

/**
 * Generates the next sequential invoice or quote number.
 */
export function generateNextInvoiceNumber(
  existingInvoices: ClientInvoice[],
  type: InvoiceDocType = "INVOICE"
): string {
  const currentYear = new Date().getFullYear();
  const prefix = type === "INVOICE" ? "FAC-CLI" : type === "QUOTE" ? "DEV-CLI" : "AVOIR-CLI";
  
  const relevantInvoices = existingInvoices.filter(
    (inv) => inv.type === type && inv.number.includes(`${currentYear}`)
  );

  let maxSeq = 10;
  relevantInvoices.forEach((inv) => {
    const parts = inv.number.split("-");
    const lastPart = parts[parts.length - 1];
    const num = parseInt(lastPart, 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(3, "0");
  return `${prefix}-${currentYear}-${nextSeq}`;
}

/**
 * Generates a formal JournalTransaction for the Sales Journal (VE)
 * with strict double-entry balance and standard-specific account codes.
 */
export function convertInvoiceToJournalTransaction(
  invoice: ClientInvoice,
  company: CompanyProfile
): JournalTransaction {
  const standard = company.accountingStandard || "PCG";
  const txId = `TX-INV-${Date.now().toString().slice(-6)}`;
  const isCreditNote = invoice.type === "CREDIT_NOTE";

  // Standard-specific account codes
  let clientAccountCode = "411000";
  let clientAccountName = "Clients - Créances";
  let salesAccountCode = "706000";
  let salesAccountName = "Prestations de services";
  let vatAccountCode = "445710";
  let vatAccountName = `TVA Collectée (${invoice.taxesSummary[0]?.vatRate || 20}%)`;

  if (standard === "SYSCOHADA") {
    clientAccountCode = "411100";
    clientAccountName = "Clients nationaux";
    salesAccountCode = "706000";
    salesAccountName = "Services vendus";
    vatAccountCode = "443100";
    vatAccountName = `État, TVA facturée sur ventes (${invoice.taxesSummary[0]?.vatRate || 18}%)`;
  } else if (standard === "IFRS") {
    clientAccountCode = "110000";
    clientAccountName = "Trade Accounts Receivable";
    salesAccountCode = "400000";
    salesAccountName = "Operating Revenue / Services";
    vatAccountCode = "215000";
    vatAccountName = "Output VAT Liability";
  }

  const lines = [];

  if (!isCreditNote) {
    // 1. Debit Client (Compte 411 - Montant TTC)
    lines.push({
      id: `L-${txId}-1`,
      accountCode: clientAccountCode,
      accountName: clientAccountName,
      debit: invoice.totalTTC,
      credit: 0,
      description: `Facture ${invoice.number} - ${invoice.client.name}`,
      lettrage: `FC${invoice.number.slice(-3)}`,
    });

    // 2. Credit Ventes (Compte 706/707 - Montant HT)
    lines.push({
      id: `L-${txId}-2`,
      accountCode: salesAccountCode,
      accountName: salesAccountName,
      debit: 0,
      credit: invoice.totalHT,
      description: `${invoice.items[0]?.description || "Prestation de services"} (${invoice.number})`,
    });

    // 3. Credit TVA Collectée (Compte 44571 - Montant TVA)
    if (invoice.totalTVA > 0) {
      lines.push({
        id: `L-${txId}-3`,
        accountCode: vatAccountCode,
        accountName: vatAccountName,
        debit: 0,
        credit: invoice.totalTVA,
        description: `TVA collectée sur ${invoice.number}`,
      });
    }
  } else {
    // Avoir (Credit Note) reverse entries
    lines.push({
      id: `L-${txId}-1`,
      accountCode: clientAccountCode,
      accountName: clientAccountName,
      debit: 0,
      credit: invoice.totalTTC,
      description: `Avoir ${invoice.number} - ${invoice.client.name}`,
    });

    lines.push({
      id: `L-${txId}-2`,
      accountCode: salesAccountCode,
      accountName: salesAccountName,
      debit: invoice.totalHT,
      credit: 0,
      description: `Annulation CA Avoir ${invoice.number}`,
    });

    if (invoice.totalTVA > 0) {
      lines.push({
        id: `L-${txId}-3`,
        accountCode: vatAccountCode,
        accountName: vatAccountName,
        debit: invoice.totalTVA,
        credit: 0,
        description: `Régularisation TVA Avoir ${invoice.number}`,
      });
    }
  }

  return {
    id: txId,
    pieceNumber: invoice.number,
    date: invoice.date,
    dueDate: invoice.dueDate,
    journalCode: "VE",
    partnerName: invoice.client.name,
    partnerTaxId: invoice.client.vatNumber || invoice.client.siren || "",
    documentType: isCreditNote ? "AVOIR" : "FACTURE_VENTE",
    amountHT: invoice.totalHT,
    amountTVA: invoice.totalTVA,
    amountTTC: invoice.totalTTC,
    vatRate: invoice.taxesSummary[0]?.vatRate || 20,
    status: invoice.status === "PAID" ? "RECONCILED" : "VALIDATED",
    currency: invoice.currency,
    isForeignCurrency: invoice.currency !== (company.currency || "EUR"),
    exchangeRate: invoice.exchangeRate || 1.0,
    lines,
    confidenceScore: 1.0,
    aiAuditNotes: [
      `Écriture générée automatiquement depuis le module Facturation (${invoice.number})`,
      `Client : ${invoice.client.name} (${invoice.client.city}, ${invoice.client.country})`,
      `Norme comptable appliquée : ${standard}`,
      `Contrôle de balance Débit = Crédit (${invoice.totalTTC.toLocaleString("fr-FR")} €) validé.`,
    ],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Standard preset items for quick invoice line insertion.
 */
export const presetInvoiceItems = [
  {
    title: "Conseil Stratégique & Audit IA",
    description: "Mission de cadrage stratégique, audit des flux de données et gouvernance IA",
    quantity: 1,
    unit: "forfait",
    unitPriceHT: 8500,
    vatRate: 20,
  },
  {
    title: "Développement & Intégration Solution",
    description: "Prestation d'ingénierie logicielle, intégration API et connecteurs de données",
    quantity: 5,
    unit: "jour",
    unitPriceHT: 1200,
    vatRate: 20,
  },
  {
    title: "Licence Logicielle SaaS Annuelle",
    description: "Abonnement annuel Plateforme Entreprise Nexus AI (accès multi-utilisateurs)",
    quantity: 1,
    unit: "forfait",
    unitPriceHT: 12000,
    vatRate: 20,
  },
  {
    title: "Maintenance & Support Cloud 24/7",
    description: "Support technique de niveau 3, monitoring de performance et MCO cloud",
    quantity: 1,
    unit: "mois",
    unitPriceHT: 2500,
    vatRate: 20,
  },
  {
    title: "Formation & Transfert de Compétences",
    description: "Session de formation certifiante pour les équipes comptables et financières",
    quantity: 2,
    unit: "jour",
    unitPriceHT: 1500,
    vatRate: 20,
  },
];
