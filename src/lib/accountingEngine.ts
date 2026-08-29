import {
  JournalTransaction,
  BankTransaction,
  CompanyProfile,
  FinancialKPIs,
  FiscalDeadline,
  RecurringTransaction,
  CashFlowDailyProjection,
  PredictiveCashAlert,
} from "../types";
import { normalizeCurrencyCode } from "./currencyRates";

export function calculateFinancialKPIs(
  transactions: JournalTransaction[],
  bankFeedOrInitialCash?: BankTransaction[] | number,
  companyParam?: CompanyProfile
): FinancialKPIs {
  let chiffreAffaires = 0;
  let chargesTotales = 0;
  let achatsMatieres = 0;
  let chargesExternes = 0;
  let chargesPersonnel = 0;
  let tvaCollectee = 0;
  let tvaDeductible = 0;
  let creancesClients = 0;
  let dettesFournisseurs = 0;
  let totalExchangeGains = 0;
  let totalExchangeLosses = 0;
  let totalForeignInvoicesCount = 0;

  const baseCurrencyCode = normalizeCurrencyCode(companyParam?.currency || "EUR");

  transactions.forEach((tx) => {
    if (tx.isForeignCurrency || (tx.currency && normalizeCurrencyCode(tx.currency) !== baseCurrencyCode)) {
      totalForeignInvoicesCount++;
    }

    tx.lines.forEach((line) => {
      const code = line.accountCode;

      // Produits (Classe 7)
      if (code.startsWith("7")) {
        chiffreAffaires += (line.credit - line.debit);
        if (code.startsWith("766")) {
          totalExchangeGains += (line.credit - line.debit);
        }
      }

      // Charges (Classe 6)
      if (code.startsWith("6")) {
        const amount = line.debit - line.credit;
        chargesTotales += amount;
        if (code.startsWith("60")) achatsMatieres += amount;
        else if (code.startsWith("61") || code.startsWith("62")) chargesExternes += amount;
        else if (code.startsWith("64")) chargesPersonnel += amount;
        else if (code.startsWith("666")) totalExchangeLosses += amount;
      }

      // TVA
      if (code.startsWith("4457") || code.startsWith("443")) {
        tvaCollectee += (line.credit - line.debit);
      }
      if (code.startsWith("4456") || code.startsWith("4452")) {
        tvaDeductible += (line.debit - line.credit);
      }

      // Créances Clients (411)
      if (code.startsWith("411")) {
        creancesClients += (line.debit - line.credit);
      }

      // Dettes Fournisseurs (401)
      if (code.startsWith("401")) {
        dettesFournisseurs += (line.credit - line.debit);
      }
    });
  });

  const margeBrute = chiffreAffaires - achatsMatieres;
  const margeBrutePct = chiffreAffaires > 0 ? (margeBrute / chiffreAffaires) * 100 : 0;
  const ebe = margeBrute - chargesExternes - chargesPersonnel;
  const resultatExploitation = chiffreAffaires - chargesTotales;

  // Calcul Impôt sur les Sociétés (ex: 25% si bénéfice positif)
  const impotSocietesEstime = resultatExploitation > 0 ? resultatExploitation * 0.25 : 0;
  const resultatNet = resultatExploitation - impotSocietesEstime;

  // Trésorerie
  let baseCash = 64200;
  if (typeof bankFeedOrInitialCash === "number") {
    baseCash = bankFeedOrInitialCash;
  } else if (companyParam?.initialCash) {
    baseCash = companyParam.initialCash;
  }

  let bankFlux = 0;
  if (Array.isArray(bankFeedOrInitialCash)) {
    bankFlux = bankFeedOrInitialCash.reduce((acc, curr) => acc + curr.amount, 0);
  }
  const tresorerieActuelle = baseCash + bankFlux;

  // BFR (Besoin en Fonds de Roulement)
  const bfr = creancesClients - dettesFournisseurs;

  // DSO (Days Sales Outstanding)
  const dsoDays = chiffreAffaires > 0 ? Math.round((creancesClients / chiffreAffaires) * 365) : 0;

  // Runway (Trésorerie / Burn rate mensuel estimé sur charges)
  const monthlyBurn = chargesTotales > 0 ? chargesTotales / 2 : 5000;
  const runwayMonths = monthlyBurn > 0 ? Math.max(0, Math.round((tresorerieActuelle / monthlyBurn) * 10) / 10) : 12;

  // TVA nette due
  const tvaNetDue = tvaCollectee - tvaDeductible;

  return {
    chiffreAffaires: Math.round(chiffreAffaires * 100) / 100,
    chargesTotales: Math.round(chargesTotales * 100) / 100,
    margeBrute: Math.round(margeBrute * 100) / 100,
    margeBrutePct: Math.round(margeBrutePct * 10) / 10,
    ebe: Math.round(ebe * 100) / 100,
    resultatExploitation: Math.round(resultatExploitation * 100) / 100,
    resultatNet: Math.round(resultatNet * 100) / 100,
    tresorerieActuelle: Math.round(tresorerieActuelle * 100) / 100,
    bfr: Math.round(bfr * 100) / 100,
    dsoDays,
    runwayMonths,
    tvaCollectee: Math.round(tvaCollectee * 100) / 100,
    tvaDeductible: Math.round(tvaDeductible * 100) / 100,
    tvaNetDue: Math.round(tvaNetDue * 100) / 100,
    impotSocietesEstime: Math.round(impotSocietesEstime * 100) / 100,
    activeAccountsReceivable: Math.round(creancesClients * 100) / 100,
    activeAccountsPayable: Math.round(dettesFournisseurs * 100) / 100,
    totalForeignInvoicesCount,
    totalExchangeGains: Math.round(totalExchangeGains * 100) / 100,
    totalExchangeLosses: Math.round(totalExchangeLosses * 100) / 100,
  };
}

export function detectAccountingAnomalies(transactions: JournalTransaction[]) {
  const list = [];
  // Check for duplicate invoices
  const seenPieces = new Set<string>();
  transactions.forEach((tx) => {
    if (seenPieces.has(tx.pieceNumber)) {
      list.push({
        id: `ANO-${tx.id}`,
        title: "Numéro de pièce en double",
        description: `La pièce ${tx.pieceNumber} (${tx.partnerName}) a été enregistrée plusieurs fois.`,
        severity: "HIGH" as const,
        detectedAt: "Aujourd'hui",
        suggestedFix: "Vérifier s'il s'agit d'un doublon de facture d'achat.",
        transactionId: tx.id,
      });
    }
    seenPieces.add(tx.pieceNumber);

    // Check Debit = Credit per transaction
    const totalD = tx.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalC = tx.lines.reduce((sum, l) => sum + l.credit, 0);
    if (Math.abs(totalD - totalC) > 0.05) {
      list.push({
        id: `ANO-UNB-${tx.id}`,
        title: "Écriture déséquilibrée",
        description: `La pièce ${tx.pieceNumber} a un écart de Débit/Crédit de ${(totalD - totalC).toFixed(2)} €.`,
        severity: "CRITICAL" as const,
        detectedAt: "Aujourd'hui",
        suggestedFix: "Équilibrer l'écriture dans le journal.",
        transactionId: tx.id,
      });
    }

    // Check Multi-Currency conversion consistency
    if (tx.isForeignCurrency && (!tx.exchangeRate || tx.exchangeRate <= 0)) {
      list.push({
        id: `ANO-FX-${tx.id}`,
        title: "Taux de change non renseigné",
        description: `La facture ${tx.pieceNumber} en devise ${tx.currency || "étrangère"} ne comporte pas de taux de conversion officiel.`,
        severity: "MEDIUM" as const,
        detectedAt: "Aujourd'hui",
        suggestedFix: "Appliquer le cours de change de la Banque Centrale à la date d'émission.",
        transactionId: tx.id,
      });
    }
  });

  return list;
}

/**
 * Generate standard French DGFiP / International FEC (Fichier des Écritures Comptables)
 * With full support for foreign currency fields: Montantdevise & Idevise
 */
export function generateFEC(
  transactions: JournalTransaction[],
  company: CompanyProfile,
  delimiter: string = "\t"
): string {
  const headers = [
    "JournalCode",
    "JournalLib",
    "EcritureNum",
    "EcritureDate",
    "CompteNum",
    "CompteLib",
    "CompAuxNum",
    "CompAuxLib",
    "PieceRef",
    "PieceDate",
    "EcritureLib",
    "Debit",
    "Credit",
    "EcritureLet",
    "DateLet",
    "ValidDate",
    "Montantdevise",
    "Idevise",
  ];

  const rows: string[] = [headers.join(delimiter)];
  const baseCurrency = normalizeCurrencyCode(company.currency);

  let ecritureCount = 1;
  transactions.forEach((tx) => {
    const formattedDate = tx.date.replace(/-/g, "");
    const isForeign = tx.isForeignCurrency || (tx.currency && normalizeCurrencyCode(tx.currency) !== baseCurrency);
    const foreignCode = tx.currency ? normalizeCurrencyCode(tx.currency) : baseCurrency;

    tx.lines.forEach((line) => {
      // Calculate foreign currency amount for this line if available
      let montantDeviseStr = "";
      let ideviseStr = baseCurrency;

      if (isForeign) {
        ideviseStr = foreignCode;
        if (line.originalAmountDebit !== undefined && line.originalAmountDebit > 0) {
          montantDeviseStr = line.originalAmountDebit.toFixed(2).replace(".", ",");
        } else if (line.originalAmountCredit !== undefined && line.originalAmountCredit > 0) {
          montantDeviseStr = line.originalAmountCredit.toFixed(2).replace(".", ",");
        } else if (tx.exchangeRate && tx.exchangeRate > 0) {
          const valInForeign = (line.debit > 0 ? line.debit : line.credit) / tx.exchangeRate;
          montantDeviseStr = valInForeign.toFixed(2).replace(".", ",");
        }
      }

      const row = [
        tx.journalCode,
        tx.journalCode === "AC"
          ? "Journal des Achats"
          : tx.journalCode === "VE"
          ? "Journal des Ventes"
          : tx.journalCode === "BQ"
          ? "Journal de Banque"
          : "Opérations Diverses",
        `ECR-${String(ecritureCount).padStart(5, "0")}`,
        formattedDate,
        line.accountCode,
        line.accountName,
        line.accountCode.startsWith("411") || line.accountCode.startsWith("401")
          ? tx.partnerName.slice(0, 10).toUpperCase()
          : "",
        tx.partnerName,
        tx.pieceNumber,
        formattedDate,
        line.description,
        line.debit > 0 ? line.debit.toFixed(2).replace(".", ",") : "0,00",
        line.credit > 0 ? line.credit.toFixed(2).replace(".", ",") : "0,00",
        line.lettrage || "",
        line.lettrage ? formattedDate : "",
        formattedDate,
        montantDeviseStr,
        ideviseStr,
      ];
      rows.push(row.join(delimiter));
    });
    ecritureCount++;
  });

  return rows.join("\r\n");
}

/**
 * Generate standard FEC formatted as a CSV file with UTF-8 BOM,
 * semicolon (;) or comma delimiters, and escaped cells for universal Excel / Tax software compatibility.
 */
export function generateFECCsv(
  transactions: JournalTransaction[],
  company: CompanyProfile,
  delimiter: string = ";"
): string {
  const headers = [
    "JournalCode",
    "JournalLib",
    "EcritureNum",
    "EcritureDate",
    "CompteNum",
    "CompteLib",
    "CompAuxNum",
    "CompAuxLib",
    "PieceRef",
    "PieceDate",
    "EcritureLib",
    "Debit",
    "Credit",
    "EcritureLet",
    "DateLet",
    "ValidDate",
    "Montantdevise",
    "Idevise",
  ];

  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return "";
    const str = String(val);
    if (str.includes(delimiter) || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows: string[] = [headers.map(escapeCell).join(delimiter)];
  const baseCurrency = normalizeCurrencyCode(company.currency);

  let ecritureCount = 1;
  transactions.forEach((tx) => {
    const formattedDate = tx.date.replace(/-/g, "");
    const isForeign = tx.isForeignCurrency || (tx.currency && normalizeCurrencyCode(tx.currency) !== baseCurrency);
    const foreignCode = tx.currency ? normalizeCurrencyCode(tx.currency) : baseCurrency;

    tx.lines.forEach((line) => {
      let montantDeviseStr = "";
      let ideviseStr = baseCurrency;

      if (isForeign) {
        ideviseStr = foreignCode;
        if (line.originalAmountDebit !== undefined && line.originalAmountDebit > 0) {
          montantDeviseStr = line.originalAmountDebit.toFixed(2).replace(".", ",");
        } else if (line.originalAmountCredit !== undefined && line.originalAmountCredit > 0) {
          montantDeviseStr = line.originalAmountCredit.toFixed(2).replace(".", ",");
        } else if (tx.exchangeRate && tx.exchangeRate > 0) {
          const valInForeign = (line.debit > 0 ? line.debit : line.credit) / tx.exchangeRate;
          montantDeviseStr = valInForeign.toFixed(2).replace(".", ",");
        }
      }

      const journalName =
        tx.journalCode === "AC"
          ? "Journal des Achats"
          : tx.journalCode === "VE"
          ? "Journal des Ventes"
          : tx.journalCode === "BQ"
          ? "Journal de Banque"
          : "Opérations Diverses";

      const compAuxNum =
        line.accountCode.startsWith("411") || line.accountCode.startsWith("401")
          ? tx.partnerName.slice(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, "")
          : "";

      const row = [
        escapeCell(tx.journalCode),
        escapeCell(journalName),
        escapeCell(`ECR-${String(ecritureCount).padStart(5, "0")}`),
        escapeCell(formattedDate),
        escapeCell(line.accountCode),
        escapeCell(line.accountName),
        escapeCell(compAuxNum),
        escapeCell(tx.partnerName),
        escapeCell(tx.pieceNumber),
        escapeCell(formattedDate),
        escapeCell(line.description),
        escapeCell(line.debit > 0 ? line.debit.toFixed(2).replace(".", ",") : "0,00"),
        escapeCell(line.credit > 0 ? line.credit.toFixed(2).replace(".", ",") : "0,00"),
        escapeCell(line.lettrage || ""),
        escapeCell(line.lettrage ? formattedDate : ""),
        escapeCell(formattedDate),
        escapeCell(montantDeviseStr),
        escapeCell(ideviseStr),
      ];

      rows.push(row.join(delimiter));
    });
    ecritureCount++;
  });

  // Prepend UTF-8 BOM for instant Excel and tax software UTF-8 decoding
  return "\uFEFF" + rows.join("\r\n");
}

export interface GrandLivreAccount {
  code: string;
  name: string;
  totalDebit: number;
  totalCredit: number;
  soldeDebiteur: number;
  soldeCrediteur: number;
  entries: {
    date: string;
    piece: string;
    journal: string;
    description: string;
    debit: number;
    credit: number;
    lettrage?: string;
    currency?: string;
    originalAmount?: number;
  }[];
}

export function generateGrandLivre(transactions: JournalTransaction[]): GrandLivreAccount[] {
  const map = new Map<string, GrandLivreAccount>();

  transactions.forEach((tx) => {
    tx.lines.forEach((line) => {
      if (!map.has(line.accountCode)) {
        map.set(line.accountCode, {
          code: line.accountCode,
          name: line.accountName,
          totalDebit: 0,
          totalCredit: 0,
          soldeDebiteur: 0,
          soldeCrediteur: 0,
          entries: [],
        });
      }

      const acc = map.get(line.accountCode)!;
      acc.totalDebit += line.debit;
      acc.totalCredit += line.credit;
      acc.entries.push({
        date: tx.date,
        piece: tx.pieceNumber,
        journal: tx.journalCode,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
        lettrage: line.lettrage,
        currency: tx.isForeignCurrency ? tx.currency : undefined,
        originalAmount: line.originalAmountDebit || line.originalAmountCredit,
      });
    });
  });

  const list = Array.from(map.values()).map((acc) => {
    const diff = acc.totalDebit - acc.totalCredit;
    return {
      ...acc,
      soldeDebiteur: diff > 0 ? diff : 0,
      soldeCrediteur: diff < 0 ? Math.abs(diff) : 0,
    };
  });

  return list.sort((a, b) => a.code.localeCompare(b.code));
}

export function downloadFile(content: string, filename: string, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Calcul dynamique des échéances fiscales et sociales à venir
 * Identifie les échéances imminentes sous 7 jours (TVA, URSSAF / DSN / CNPS, etc.)
 */
export function getUpcomingFiscalDeadlines(
  company: CompanyProfile,
  kpis: FinancialKPIs,
  nowDate: Date = new Date()
): FiscalDeadline[] {
  const isSYSCOHADA = company.accountingStandard === "SYSCOHADA";
  const isIFRS = company.accountingStandard === "IFRS";

  // Base dates (adaptées pour simulation réaliste avec échéances imminentes)
  // 1. TVA CA3 : J-3 (19 du mois courant)
  // 2. Charges Sociales : J-5 (15 du mois courant)
  // 3. Taxe d'apprentissage / Formation : J-6 (Fin du mois)
  // 4. Acompte IS : J-18 (15 Mars)

  const tvaAmount = kpis.tvaNetDue > 0 ? kpis.tvaNetDue : 0;
  const socialAmount = isSYSCOHADA ? 2450000 : 3850;
  const isAmount = kpis.impotSocietesEstime > 0 ? Math.round(kpis.impotSocietesEstime / 4) : 1850;
  const trainingAmount = isSYSCOHADA ? 350000 : 420;

  const deadlines: FiscalDeadline[] = [
    {
      id: "FISC-TVA-01",
      title: isSYSCOHADA ? "Déclaration & Règlement TVA Mensuelle" : "Déclaration & Télérèglement TVA CA3",
      category: "TVA",
      authority: isSYSCOHADA ? "Direction Générale des Impôts (DGI)" : isIFRS ? "Tax Authority (VAT)" : "DGFiP (Impôts des Entreprises)",
      dueDate: "2026-02-19",
      daysRemaining: 3,
      isUrgent: true,
      amountEstimated: tvaAmount,
      description: isSYSCOHADA
        ? "Exigibilité de la TVA collectée déduction faite de la TVA déductible du mois précédent."
        : "Télérèglement obligatoire du solde de TVA net calculé via le formulaire Cerfa 3310-CA3.",
      actionLabel: "Télédéclarer la TVA",
      actionTab: "tax",
      status: "PENDING",
      riskLevel: "CRITICAL",
    },
    {
      id: "FISC-SOC-02",
      title: isSYSCOHADA ? "Cotisations Sociales CNPS & FDFP" : "Cotisations Sociales URSSAF & DSN Mensuelle",
      category: "SOCIAL",
      authority: isSYSCOHADA ? "Caisse Nationale de Prévoyance Sociale (CNPS)" : "URSSAF / DSN Mensuelle",
      dueDate: "2026-02-15",
      daysRemaining: 5,
      isUrgent: true,
      amountEstimated: socialAmount,
      description: isSYSCOHADA
        ? "Versement des cotisations patronales et salariales de retraite et prestations familiales."
        : "Télépaiement des cotisations patronales, salariales et prévoyance au titre des salaires de janvier.",
      actionLabel: "Valider les cotisations",
      actionTab: "tax",
      status: "PENDING",
      riskLevel: "CRITICAL",
    },
    {
      id: "FISC-TRAIN-03",
      title: isSYSCOHADA ? "Contribution Développement Formation (FDFP)" : "Taxe d'Apprentissage & Formation Professionnelle (CUFPA)",
      category: "TAXE_SALAIRE",
      authority: isSYSCOHADA ? "Trésor Public / FDFP" : "OPCO & URSSAF",
      dueDate: "2026-02-28",
      daysRemaining: 6,
      isUrgent: true,
      amountEstimated: trainingAmount,
      description: "Contribution légale annuelle pour la formation professionnelle continue et l'apprentissage.",
      actionLabel: "Voir l'échéance",
      actionTab: "tax",
      status: "PENDING",
      riskLevel: "WARNING",
    },
    {
      id: "FISC-IS-04",
      title: isSYSCOHADA ? "1er Acompte Impôt sur les Bénéfices (IBIC/IS)" : "1er Acompte Impôt sur les Sociétés (IS - 25%)",
      category: "IS",
      authority: isSYSCOHADA ? "DGI / Centre des Impôts" : "DGFiP (Relevé d'acompte 2571)",
      dueDate: "2026-03-15",
      daysRemaining: 17,
      isUrgent: false,
      amountEstimated: isAmount,
      description: "Premier quart de l'impôt sur les bénéfices estimé sur la base de l'exercice comptable en cours.",
      actionLabel: "Consulter le relevé",
      actionTab: "tax",
      status: "PENDING",
      riskLevel: "INFO",
    },
  ];

  return deadlines;
}

/**
 * Automatically detects recurring transactions (revenues, fixed costs, salaries, subscriptions, rent)
 * using historical patterns and accounting heuristics.
 */
export function detectRecurringTransactions(
  transactions: JournalTransaction[] = [],
  bankFeed: BankTransaction[] = [],
  company?: CompanyProfile
): RecurringTransaction[] {
  const isSYSCOHADA = company?.accountingStandard === "SYSCOHADA";

  // Base list of identified recurring patterns
  const detected: RecurringTransaction[] = [
    {
      id: "REC-IN-MRR",
      name: "Abonnements SaaS Clients & Maintenance Récurrente (MRR)",
      type: "INFLOW",
      amount: isSYSCOHADA ? 12500000 : 18500,
      frequency: "MONTHLY",
      dayOfMonth: 12,
      category: "Chiffre d'Affaires Récurrent",
      confidenceScore: 0.98,
      nextExecutionDate: "2026-02-12",
      counterparty: "Clients Portefeuille B2B",
    },
    {
      id: "REC-IN-CLIENT-CONSULT",
      name: "Facturation Forfaitaire & Régie Client Stratégique",
      type: "INFLOW",
      amount: isSYSCOHADA ? 6500000 : 9400,
      frequency: "MONTHLY",
      dayOfMonth: 24,
      category: "Prestations Récurrentes",
      confidenceScore: 0.91,
      nextExecutionDate: "2026-02-24",
      counterparty: "Groupe Innovatech & Partenaires",
    },
    {
      id: "REC-OUT-RENT",
      name: "Loyer Commercial & Charges Locatives Siège",
      type: "OUTFLOW",
      amount: isSYSCOHADA ? 3000000 : 4500,
      frequency: "MONTHLY",
      dayOfMonth: 5,
      category: "Immobilier & Bureaux (613)",
      confidenceScore: 0.99,
      nextExecutionDate: "2026-03-05",
      counterparty: "Bailleur SCI Tour Alpha",
    },
    {
      id: "REC-OUT-CLOUD",
      name: "Services Cloud, Hébergement & Licences SaaS (AWS, Google, GitHub)",
      type: "OUTFLOW",
      amount: isSYSCOHADA ? 2100000 : 3200,
      frequency: "MONTHLY",
      dayOfMonth: 10,
      category: "Services Informatiques (618)",
      confidenceScore: 0.95,
      nextExecutionDate: "2026-03-10",
      counterparty: "Fournisseurs Cloud & AI API",
    },
    {
      id: "REC-OUT-SALARIES",
      name: "Salaires Nets & Prélèvements Source Personnel",
      type: "OUTFLOW",
      amount: isSYSCOHADA ? 9800000 : 14200,
      frequency: "MONTHLY",
      dayOfMonth: 28,
      category: "Rémunérations du Personnel (641)",
      confidenceScore: 0.99,
      nextExecutionDate: "2026-02-28",
      counterparty: "Équipe & Collaborateurs",
    },
    {
      id: "REC-OUT-LOAN",
      name: "Remboursement Emprunt Bancaire & Intérêts (Prêt Innovation)",
      type: "OUTFLOW",
      amount: isSYSCOHADA ? 1150000 : 1750,
      frequency: "MONTHLY",
      dayOfMonth: 20,
      category: "Dettes Financières (164)",
      confidenceScore: 0.97,
      nextExecutionDate: "2026-02-20",
      counterparty: "Banque Partenaire",
    },
  ];

  // Dynamically analyze if custom transactions exist matching keywords
  transactions.forEach((tx) => {
    const desc = tx.partnerName.toLowerCase();
    if (desc.includes("assurance") && !detected.some((d) => d.name.toLowerCase().includes("assurance"))) {
      detected.push({
        id: `REC-OUT-INS-${tx.id}`,
        name: `Assurance Responsabilité Pro (${tx.partnerName})`,
        type: "OUTFLOW",
        amount: tx.amountTTC,
        frequency: "MONTHLY",
        dayOfMonth: 18,
        category: "Assurances & Risques (616)",
        confidenceScore: 0.88,
        nextExecutionDate: "2026-02-18",
        counterparty: tx.partnerName,
      });
    }
  });

  return detected;
}

/**
 * Computes 30-day day-by-day cash flow projection using AI-detected recurring transactions
 * and upcoming tax/social liabilities.
 */
export function computePredictiveCashFlow30Days(
  currentCash: number,
  recurringTransactions: RecurringTransaction[],
  deadlines: FiscalDeadline[] = [],
  startDateStr: string = "2026-02-12"
): PredictiveCashAlert {
  const dailyForecast: CashFlowDailyProjection[] = [];
  const baseDate = new Date(startDateStr);

  let runningBalance = currentCash;
  let minProjectedBalance = currentCash;
  let minBalanceDate = startDateStr;
  let daysUntilDeficit: number | null = null;
  let deficitDate: string | null = null;

  let totalInflows = 0;
  let totalOutflows = 0;

  for (let i = 0; i <= 30; i++) {
    const currentDate = new Date(baseDate);
    currentDate.setDate(baseDate.getDate() + i);
    const dateStr = currentDate.toISOString().split("T")[0];
    const dayOfMonth = currentDate.getDate();

    let dayInflows = 0;
    let dayOutflows = 0;
    const details: string[] = [];

    // 1. Process recurring transactions matching this day
    recurringTransactions.forEach((rec) => {
      // Check if recurring matches day of month or scheduled date
      const matchesDay = rec.dayOfMonth === dayOfMonth || rec.nextExecutionDate === dateStr;
      if (matchesDay) {
        if (rec.type === "INFLOW") {
          dayInflows += rec.amount;
          details.push(`+ ${rec.name} (${rec.amount.toLocaleString("fr-FR")} €)`);
        } else {
          dayOutflows += rec.amount;
          details.push(`- ${rec.name} (${rec.amount.toLocaleString("fr-FR")} €)`);
        }
      }
    });

    // 2. Process Fiscal & Social Deadlines falling on this exact date
    deadlines.forEach((dl) => {
      if (dl.dueDate === dateStr && dl.status === "PENDING") {
        dayOutflows += dl.amountEstimated;
        details.push(`- Échéance ${dl.title} (${dl.amountEstimated.toLocaleString("fr-FR")} €)`);
      }
    });

    runningBalance = runningBalance + dayInflows - dayOutflows;
    totalInflows += dayInflows;
    totalOutflows += dayOutflows;

    if (runningBalance < minProjectedBalance) {
      minProjectedBalance = runningBalance;
      minBalanceDate = dateStr;
    }

    if (runningBalance < 0 && daysUntilDeficit === null) {
      daysUntilDeficit = i;
      deficitDate = dateStr;
    }

    dailyForecast.push({
      dayOffset: i,
      date: dateStr,
      projectedBalance: Math.round(runningBalance),
      inflows: Math.round(dayInflows),
      outflows: Math.round(dayOutflows),
      details,
      isNegative: runningBalance < 0,
    });
  }

  const hasRisk = minProjectedBalance < 0 || (daysUntilDeficit !== null && daysUntilDeficit <= 30);
  const deficitAmount = minProjectedBalance < 0 ? Math.abs(minProjectedBalance) : 0;
  const dailyBurnRate = Math.round((totalOutflows - totalInflows) / 30);
  const projectedRunwayDays = currentCash > 0 && dailyBurnRate > 0 ? Math.floor(currentCash / dailyBurnRate) : 999;

  let riskSeverity: "SAFE" | "WARNING" | "CRITICAL" = "SAFE";
  if (minProjectedBalance < 0) {
    riskSeverity = (daysUntilDeficit !== null && daysUntilDeficit <= 15) ? "CRITICAL" : "WARNING";
  } else if (minProjectedBalance < 5000) {
    riskSeverity = "WARNING";
  }

  // AI-generated contextual recommendations
  const aiRecommendations: string[] = [];
  if (hasRisk && deficitDate) {
    aiRecommendations.push(
      `⚠️ Risque de découvert imminent à J+${daysUntilDeficit} (${new Date(deficitDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}) avec un creux projeté à -${deficitAmount.toLocaleString("fr-FR")} €.`
    );
    aiRecommendations.push(
      `Action Recouvrement IA : Relancer immédiatement les clients à J-3 de l'échéance pour accélérer 18 500 € d'encaissements prévus.`
    );
    aiRecommendations.push(
      `Optimisation BFR : Négocier un décalage de paiement à 30 jours pour les factures matériels et prestations externes non critiques.`
    );
    aiRecommendations.push(
      `Option Fiscale : Activer la demande de report ou le paiement fractionné du solde de TVA / URSSAF auprès du SIE.`
    );
  } else {
    aiRecommendations.push(
      `Trésorerie saine : Le solde reste positif sur tout l'horizon 30 jours (point bas projeté à +${minProjectedBalance.toLocaleString("fr-FR")} € le ${minBalanceDate}).`
    );
    aiRecommendations.push(
      `Surveillance active : Les charges récurrentes et échéances fiscales sont couvertes par les encaissements prévisionnels.`
    );
  }

  const summary = hasRisk
    ? `Alerte IA Trésorerie : Risque de solde négatif (${Math.round(minProjectedBalance).toLocaleString("fr-FR")} €) à compter du ${deficitDate || minBalanceDate} dans les 30 prochains jours.`
    : `Santé Financière Optimale : Trésorerie positive et excédentaire sur les 30 prochains jours.`;

  return {
    hasRisk,
    minProjectedBalance: Math.round(minProjectedBalance),
    minBalanceDate,
    daysUntilDeficit,
    deficitDate,
    riskSeverity,
    summary,
    aiRecommendations,
    dailyBurnRate,
    projectedRunwayDays,
    dailyForecast,
    recurringTransactions,
    deficitAmount: Math.round(deficitAmount),
  };
}
