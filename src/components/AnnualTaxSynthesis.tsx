import React, { useState } from "react";
import {
  Calculator,
  TrendingUp,
  Percent,
  Coins,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Scale,
  Calendar,
  Building,
  DollarSign,
  PieChart as PieIcon,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { CompanyProfile, FinancialKPIs, JournalTransaction } from "../types";
import { downloadFile } from "../lib/accountingEngine";

interface AnnualTaxSynthesisProps {
  company: CompanyProfile;
  kpis: FinancialKPIs;
  transactions: JournalTransaction[];
  onOpenTaxReportPdf?: () => void;
}

export const AnnualTaxSynthesis: React.FC<AnnualTaxSynthesisProps> = ({
  company,
  kpis,
  transactions,
  onOpenTaxReportPdf,
}) => {
  // Fiscal Year Selection
  const [fiscalYear, setFiscalYear] = useState<string>("2026");
  
  // Tax adjustments (Tableau 2058-A)
  const [reintegrations, setReintegrations] = useState<number>(0);
  const [deductions, setDeductions] = useState<number>(0);
  const [deficitsAnterieurs, setDeficitsAnterieurs] = useState<number>(0);
  const [creditImpot, setCreditImpot] = useState<number>(0);

  // Tax Rate Mode
  // "PME_FR": 15% up to 42,500€, then 25%
  // "STANDARD_25": flat 25%
  // "SYSCOHADA": 25% with IMF (Minimum Forfaitaire 0.5% of CA)
  // "CUSTOM": custom rate
  const [taxRegimeMode, setTaxRegimeMode] = useState<"PME_FR" | "STANDARD_25" | "SYSCOHADA" | "CUSTOM">(
    company.accountingStandard === "SYSCOHADA" ? "SYSCOHADA" : "PME_FR"
  );
  const [customTaxRate, setCustomTaxRate] = useState<number>(25);
  const [syscohadaIMFPercent, setSyscohadaIMFPercent] = useState<number>(0.5);

  // Accordion details
  const [showAdjustmentDetails, setShowAdjustmentDetails] = useState<boolean>(false);
  const [showAcomptesDetails, setShowAcomptesDetails] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: company.currency === "€" ? "EUR" : "XOF",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Detailed P&L breakdown from transactions
  let produitsExploitation = 0;
  let produitsFinanciers = 0;
  let produitsExceptionnels = 0;

  let chargesAchats = 0;
  let chargesExternes = 0;
  let chargesImpotsTaxes = 0;
  let chargesPersonnel = 0;
  let dotationsAmortissements = 0;
  let chargesFinancieres = 0;
  let chargesExceptionnelles = 0;

  transactions.forEach((tx) => {
    tx.lines.forEach((line) => {
      const code = line.accountCode;
      const credit = line.credit || 0;
      const debit = line.debit || 0;

      // Class 7 (Produits)
      if (code.startsWith("70") || code.startsWith("71") || code.startsWith("72") || code.startsWith("74") || code.startsWith("75")) {
        produitsExploitation += (credit - debit);
      } else if (code.startsWith("76")) {
        produitsFinanciers += (credit - debit);
      } else if (code.startsWith("77")) {
        produitsExceptionnels += (credit - debit);
      }

      // Class 6 (Charges)
      if (code.startsWith("60")) {
        chargesAchats += (debit - credit);
      } else if (code.startsWith("61") || code.startsWith("62")) {
        chargesExternes += (debit - credit);
      } else if (code.startsWith("63")) {
        chargesImpotsTaxes += (debit - credit);
      } else if (code.startsWith("64")) {
        chargesPersonnel += (debit - credit);
      } else if (code.startsWith("68")) {
        dotationsAmortissements += (debit - credit);
      } else if (code.startsWith("66")) {
        chargesFinancieres += (debit - credit);
      } else if (code.startsWith("67")) {
        chargesExceptionnelles += (debit - credit);
      }
    });
  });

  // Fallback / sync with KPIs if transactions are purely sample-driven
  const totalProduitsExploitation = produitsExploitation > 0 ? produitsExploitation : kpis.chiffreAffaires;
  const totalChargesExploitation = chargesAchats + chargesExternes + chargesImpotsTaxes + chargesPersonnel + dotationsAmortissements;
  const realChargesExploitation = totalChargesExploitation > 0 ? totalChargesExploitation : kpis.chargesTotales;

  const totalProduits = totalProduitsExploitation + produitsFinanciers + produitsExceptionnels;
  const totalCharges = realChargesExploitation + chargesFinancieres + chargesExceptionnelles;

  // 1. Résultat d'Exploitation
  const resultatExploitation = totalProduitsExploitation - realChargesExploitation;
  // 2. Résultat Financier
  const resultatFinancier = produitsFinanciers - chargesFinancieres;
  // 3. Résultat Exceptionnel
  const resultatExceptionnel = produitsExceptionnels - chargesExceptionnelles;

  // 4. Résultat Comptable Avant Impôt (RNCAI / EBT)
  const resultatNetAvantImpot = resultatExploitation + resultatFinancier + resultatExceptionnel;

  // 5. Résultat Fiscal Imposable (Passage du résultat comptable au résultat fiscal)
  // Résultat Fiscal = Résultat Comptable + Réintégrations - Déductions - Déficits antérieurs
  const baseFiscaleAvantDeficits = Math.max(0, resultatNetAvantImpot + reintegrations - deductions);
  const resultatFiscalImposable = Math.max(0, baseFiscaleAvantDeficits - deficitsAnterieurs);

  // 6. Calcul de l'Impôt sur les Sociétés (IS)
  let impotSocietesBrut = 0;
  let isTranche1 = 0; // Tranche à 15% (jusqu'à 42 500 €)
  let isTranche2 = 0; // Tranche à 25% (au-delà)
  let imfMontant = 0; // Impôt Minimum Forfaitaire (SYSCOHADA)

  if (resultatFiscalImposable > 0) {
    if (taxRegimeMode === "PME_FR") {
      const plafondTrancheReduite = 42500;
      const baseTranche1 = Math.min(resultatFiscalImposable, plafondTrancheReduite);
      const baseTranche2 = Math.max(0, resultatFiscalImposable - plafondTrancheReduite);

      isTranche1 = baseTranche1 * 0.15;
      isTranche2 = baseTranche2 * 0.25;
      impotSocietesBrut = isTranche1 + isTranche2;
    } else if (taxRegimeMode === "STANDARD_25") {
      impotSocietesBrut = resultatFiscalImposable * 0.25;
      isTranche2 = impotSocietesBrut;
    } else if (taxRegimeMode === "SYSCOHADA") {
      const isTheorique = resultatFiscalImposable * 0.25;
      // Impôt Minimum Forfaitaire (IMF) = e.g. 0.5% du CA HT
      imfMontant = totalProduitsExploitation * (syscohadaIMFPercent / 100);
      impotSocietesBrut = Math.max(isTheorique, imfMontant);
    } else {
      // Custom
      impotSocietesBrut = resultatFiscalImposable * (customTaxRate / 100);
    }
  } else if (taxRegimeMode === "SYSCOHADA" && totalProduitsExploitation > 0) {
    // Under SYSCOHADA, even with deficit, IMF applies
    imfMontant = totalProduitsExploitation * (syscohadaIMFPercent / 100);
    impotSocietesBrut = imfMontant;
  }

  // Net IS after tax credits
  const chargeImpotSocietesNette = Math.max(0, impotSocietesBrut - creditImpot);

  // 7. Résultat Net Après Impôt (Bénéfice ou Perte net de l'exercice)
  const resultatNetApresImpot = resultatNetAvantImpot - chargeImpotSocietesNette;

  // Taux effectif d'imposition
  const effectiveTaxRate = resultatNetAvantImpot > 0
    ? ((chargeImpotSocietesNette / resultatNetAvantImpot) * 100).toFixed(1)
    : "0.0";

  // 8. Échéancier des 4 Acomptes d'IS
  // En France : 4 acomptes de 8.33% / 6.25% ou basés sur l'IS de référence N-1
  const acompte1 = chargeImpotSocietesNette * 0.25;
  const acompte2 = chargeImpotSocietesNette * 0.25;
  const acompte3 = chargeImpotSocietesNette * 0.25;
  const acompte4 = chargeImpotSocietesNette * 0.25;
  const soldeIS = Math.max(0, chargeImpotSocietesNette - (acompte1 + acompte2 + acompte3 + acompte4));

  // Export Liasse / Synthèse Fiscale
  const handleExportFiscalSummary = () => {
    const report = `================================================================================
SYNTHÈSE FISCALE ANNUELLE & DÉTERMINATION DE L'IMPÔT SUR LES SOCIÉTÉS (IS)
================================================================================
Société             : ${company.name}
SIREN / Registre    : ${company.siren}
Exercice Fiscal     : ${fiscalYear} (Clôture au 31/12/${fiscalYear})
Référentiel         : ${company.accountingStandard}
Régime d'imposition : ${company.taxRegime} (Mode : ${taxRegimeMode})
Date d'édition      : ${new Date().toLocaleDateString("fr-FR")}

--------------------------------------------------------------------------------
1. RÉSULTAT COMPTABLE AVANT IMPÔT (RNCAI / EBT)
--------------------------------------------------------------------------------
(+) Chiffre d'Affaires & Produits d'Exploitation : ${formatMoney(totalProduitsExploitation)}
(-) Charges d'Exploitation (Achats, Services, Salaires) : ${formatMoney(realChargesExploitation)}
--------------------------------------------------------------------------------
(=) RÉSULTAT D'EXPLOITATION (REX)               : ${formatMoney(resultatExploitation)}
(+/-) Résultat Financier                        : ${formatMoney(resultatFinancier)}
(+/-) Résultat Exceptionnel                     : ${formatMoney(resultatExceptionnel)}
================================================================================
(=) RÉSULTAT NET AVANT IMPÔT (EBT)              : ${formatMoney(resultatNetAvantImpot)}
================================================================================

--------------------------------------------------------------------------------
2. PASSAGE DU RÉSULTAT COMPTABLE AU RÉSULTAT FISCAL (Tableau 2058-A)
--------------------------------------------------------------------------------
(+) Réintégrations extra-comptables             : ${formatMoney(reintegrations)}
(-) Déductions extra-comptables                 : ${formatMoney(deductions)}
(-) Imputation déficits antérieurs              : ${formatMoney(deficitsAnterieurs)}
--------------------------------------------------------------------------------
(=) RÉSULTAT FISCAL IMPOSABLE (Assiette IS)     : ${formatMoney(resultatFiscalImposable)}
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
3. DÉCOMPTE DE L'IMPÔT SUR LES SOCIÉTÉS (IS)
--------------------------------------------------------------------------------
Régime appliqué : ${
      taxRegimeMode === "PME_FR"
        ? "Barème PME (15% jusqu'à 42 500 €, 25% au-delà - Art. 219 I-b CGI)"
        : taxRegimeMode === "STANDARD_25"
        ? "Taux Normal 25%"
        : taxRegimeMode === "SYSCOHADA"
        ? `SYSCOHADA IS 25% vs IMF ${syscohadaIMFPercent}% du CA`
        : `Taux Personnalisé ${customTaxRate}%`
    }
- Tranche 1 (15% <= 42 500 €)                   : ${formatMoney(isTranche1)}
- Tranche 2 (25% > 42 500 €)                    : ${formatMoney(isTranche2)}
${taxRegimeMode === "SYSCOHADA" ? `- Impôt Minimum Forfaitaire (IMF)            : ${formatMoney(imfMontant)}\n` : ""}- Total IS Brut                                 : ${formatMoney(impotSocietesBrut)}
(-) Crédits d'impôt imputables (CIR/CII/Autre)  : ${formatMoney(creditImpot)}
================================================================================
(=) CHARGE NETTE D'IMPÔT SUR LES SOCIÉTÉS (IS)  : ${formatMoney(chargeImpotSocietesNette)}
(=) TAUX EFFECTIF D'IMPOSITION                  : ${effectiveTaxRate}%
================================================================================

--------------------------------------------------------------------------------
4. RÉSULTAT NET COMPTABLE DE L'EXERCICE (APRÈS IS)
--------------------------------------------------------------------------------
(=) BÉNÉFICE / (PERTE) NET DE L'EXERCICE        : ${formatMoney(resultatNetApresImpot)}
================================================================================

--------------------------------------------------------------------------------
5. ÉCHÉANCIER PRÉVISIONNEL DES ACOMPTES ET SOLDE D'IS
--------------------------------------------------------------------------------
- 1er Acompte (15 Mars ${fiscalYear})                 : ${formatMoney(acompte1)}
- 2e Acompte (15 Juin ${fiscalYear})                  : ${formatMoney(acompte2)}
- 3e Acompte (15 Septembre ${fiscalYear})             : ${formatMoney(acompte3)}
- 4e Acompte (15 Décembre ${fiscalYear})              : ${formatMoney(acompte4)}
- Solde de Liquidation (15 Mai ${Number(fiscalYear) + 1})            : ${formatMoney(soldeIS)}

Document généré par ComptaAI - Synthèse d'aide à la liasse fiscale et à la déclaration Cerfa 2065.
`;

    downloadFile(report, `Synthese_Fiscale_IS_${fiscalYear}_${company.siren.replace(/\s/g, "")}.txt`, "text/plain;charset=utf-8;");
    setToastMessage(`Synthèse fiscale annuelle ${fiscalYear} téléchargée avec succès.`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl relative">
      {/* Toast */}
      {toastMessage && (
        <div className="bg-indigo-900/90 border border-indigo-500/50 text-indigo-100 px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-indigo-300 hover:text-white text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header of the synthesis module */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400">
              <Calculator className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">
                  Synthèse Fiscale Annuelle & Impôt sur les Sociétés (IS)
                </h3>
                <span className="text-[11px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Calcul Automatique
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Détermination automatique du résultat net avant impôt (EBT), de l'assiette fiscale imposable et de la charge d'IS
              </p>
            </div>
          </div>
        </div>

        {/* Action and Year filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Exercice :</span>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer"
            >
              <option value="2026" className="bg-slate-900 text-white">2026 (En cours)</option>
              <option value="2025" className="bg-slate-900 text-white">2025 (Clôturé)</option>
            </select>
          </div>

          {onOpenTaxReportPdf && (
            <button
              type="button"
              onClick={onOpenTaxReportPdf}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition cursor-pointer"
              title="Générer et exporter le rapport officiel en PDF pour l'expert-comptable"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Rapport PDF (Expert-Comptable)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportFiscalSummary}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            title="Télécharger la note de synthèse fiscale annuelle en texte brut"
          >
            <Download className="w-4 h-4" />
            <span>Export Note IS (TXT)</span>
          </button>
        </div>
      </div>

      {/* Top Level Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Résultat Net Avant Impôt (EBT) */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Résultat Avant Impôt (EBT)</span>
            <span className="text-[10px] font-mono bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded border border-sky-800/50">
              Comptable
            </span>
          </div>
          <div className={`text-2xl font-black font-mono ${resultatNetAvantImpot >= 0 ? "text-sky-400" : "text-rose-400"}`}>
            {formatMoney(resultatNetAvantImpot)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            {resultatNetAvantImpot >= 0 ? (
              <span className="text-emerald-400 flex items-center gap-0.5 font-medium">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Bénéfice brut
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-0.5 font-medium">
                <ArrowDownRight className="w-3.5 h-3.5" />
                Déficit brut
              </span>
            )}
            <span className="text-slate-500">•</span>
            <span>Produits - Charges</span>
          </div>
        </div>

        {/* Card 2: Assiette Fiscale Imposable */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Bénéfice Fiscal Imposable</span>
            <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800/50">
              Tableau 2058-A
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-indigo-300">
            {formatMoney(resultatFiscalImposable)}
          </div>
          <div className="text-[11px] text-slate-400">
            Ajusté des réintégrations & déductions
          </div>
        </div>

        {/* Card 3: Charge d'IS Estimée */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-purple-500/30 space-y-1.5 relative overflow-hidden">
          <div className="flex items-center justify-between text-purple-300 text-xs font-bold uppercase tracking-wider">
            <span>Charge d'Impôt IS Estimée</span>
            <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">
              Taux eff. {effectiveTaxRate}%
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {formatMoney(chargeImpotSocietesNette)}
          </div>
          <div className="text-[11px] text-slate-400">
            {taxRegimeMode === "PME_FR"
              ? "Taux PME 15% (≤ 42,5k€) & 25%"
              : taxRegimeMode === "SYSCOHADA"
              ? `IS 25% ou IMF ${syscohadaIMFPercent}% CA`
              : `Taux normal ${taxRegimeMode === "STANDARD_25" ? "25%" : `${customTaxRate}%`}`}
          </div>
        </div>

        {/* Card 4: Résultat Net Après Impôt */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Résultat Net de l'Exercice</span>
            <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800/50">
              Solde Final
            </span>
          </div>
          <div className={`text-2xl font-black font-mono ${resultatNetApresImpot >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatMoney(resultatNetApresImpot)}
          </div>
          <div className="text-[11px] text-slate-400">
            Disponible pour report à nouveau / dividendes
          </div>
        </div>
      </div>

      {/* Main Breakdown Section: Waterfall Computation & Tax Adjustment Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Cascading Waterfall Calculation (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2 text-indigo-400">
              <Layers className="w-4 h-4" />
              Décomposition Détaillée du Résultat Fiscal
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              Art. 38 & 209 du CGI
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Step 1: Produits */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-850">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  (+) Produits d'Exploitation (Chiffre d'Affaires HT)
                </div>
                <div className="text-[11px] text-slate-500">
                  Ventes de marchandises, prestations de services (Classe 70/74)
                </div>
              </div>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                +{formatMoney(totalProduitsExploitation)}
              </span>
            </div>

            {/* Step 2: Charges d'exploitation */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-850">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  (-) Charges d'Exploitation Déductibles
                </div>
                <div className="text-[11px] text-slate-500">
                  Achats ({formatMoney(chargesAchats || realChargesExploitation * 0.4)}), Services ({formatMoney(chargesExternes || realChargesExploitation * 0.3)}), Salaires ({formatMoney(chargesPersonnel || realChargesExploitation * 0.3)})
                </div>
              </div>
              <span className="font-mono font-bold text-rose-400 text-sm">
                -{formatMoney(realChargesExploitation)}
              </span>
            </div>

            {/* Subtotal 1: Résultat d'exploitation */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-950/20 border-y border-indigo-500/20 font-medium">
              <span className="text-slate-300">(=) Résultat d'Exploitation (REX)</span>
              <span className={`font-mono font-bold ${resultatExploitation >= 0 ? "text-indigo-300" : "text-rose-400"}`}>
                {formatMoney(resultatExploitation)}
              </span>
            </div>

            {/* Step 3: Financier & Exceptionnel */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-xl bg-slate-900/40 border border-slate-850 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">Résultat Financier</div>
                  <div className="text-[10px] text-slate-500">Gains/pertes de change & intérêts</div>
                </div>
                <span className={`font-mono font-semibold text-xs ${resultatFinancier >= 0 ? "text-slate-200" : "text-rose-400"}`}>
                  {resultatFinancier >= 0 ? `+${formatMoney(resultatFinancier)}` : formatMoney(resultatFinancier)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/40 border border-slate-850 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">Résultat Exceptionnel</div>
                  <div className="text-[10px] text-slate-500">Cessions & événements rares</div>
                </div>
                <span className={`font-mono font-semibold text-xs ${resultatExceptionnel >= 0 ? "text-slate-200" : "text-rose-400"}`}>
                  {resultatExceptionnel >= 0 ? `+${formatMoney(resultatExceptionnel)}` : formatMoney(resultatExceptionnel)}
                </span>
              </div>
            </div>

            {/* EBT Highlight */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-sky-950/30 border border-sky-500/30">
              <div>
                <span className="font-bold text-white text-xs block">
                  (=) Résultat Net Comptable Avant Impôt (RNCAI)
                </span>
                <span className="text-[11px] text-slate-400">
                  Base comptable avant retraitements de la liasse fiscale
                </span>
              </div>
              <span className={`font-mono font-black text-base ${resultatNetAvantImpot >= 0 ? "text-sky-300" : "text-rose-400"}`}>
                {formatMoney(resultatNetAvantImpot)}
              </span>
            </div>

            {/* Fiscal Adjustments Line */}
            {(reintegrations > 0 || deductions > 0 || deficitsAnterieurs > 0) && (
              <div className="space-y-1.5 p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20">
                <div className="flex justify-between text-[11px]">
                  <span className="text-purple-300 font-medium">(+) Réintégrations fiscales extra-comptables :</span>
                  <span className="font-mono text-purple-300">+{formatMoney(reintegrations)}</span>
                </div>
                {deductions > 0 && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-emerald-400 font-medium">(-) Déductions fiscales :</span>
                    <span className="font-mono text-emerald-400">-{formatMoney(deductions)}</span>
                  </div>
                )}
                {deficitsAnterieurs > 0 && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-amber-300 font-medium">(-) Imputation déficits antérieurs reportables :</span>
                    <span className="font-mono text-amber-300">-{formatMoney(deficitsAnterieurs)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-purple-500/20">
                  <span className="text-white">(=) Résultat Fiscal Imposable :</span>
                  <span className="font-mono text-indigo-300">{formatMoney(resultatFiscalImposable)}</span>
                </div>
              </div>
            )}

            {/* Impôt sur les Sociétés Line */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/40 border border-purple-500/40">
              <div>
                <span className="font-bold text-purple-200 text-xs block">
                  (-) Charge d'Impôt sur les Sociétés (IS)
                </span>
                <span className="text-[11px] text-purple-300/80">
                  {taxRegimeMode === "PME_FR" && resultatFiscalImposable > 0 && (
                    <>
                      Tranche 15% (jusqu'à 42 500 €) : {formatMoney(isTranche1)} • Tranche 25% : {formatMoney(isTranche2)}
                    </>
                  )}
                  {taxRegimeMode === "STANDARD_25" && "Taux unique de 25%"}
                  {taxRegimeMode === "SYSCOHADA" && `IS calculé (max(IS 25%, IMF ${syscohadaIMFPercent}%))`}
                  {taxRegimeMode === "CUSTOM" && `Taux personnalisé de ${customTaxRate}%`}
                </span>
              </div>
              <span className="font-mono font-bold text-white text-base">
                -{formatMoney(chargeImpotSocietesNette)}
              </span>
            </div>

            {/* Final Net Income */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/50 to-slate-900 border border-emerald-500/40">
              <div>
                <span className="font-extrabold text-white text-xs block uppercase tracking-wider">
                  (=) RÉSULTAT NET APRÈS IMPÔT DE L'EXERCICE
                </span>
                <span className="text-[11px] text-emerald-400/80">
                  Capitaux propres & Affectation du résultat
                </span>
              </div>
              <span className={`font-mono font-black text-lg ${resultatNetApresImpot >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatMoney(resultatNetApresImpot)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Tax Parameters, Adjustments & Rate Selector (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Regime & Tax Rate Selector */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-3">
            <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2 text-sky-400 border-b border-slate-800 pb-2.5">
              <Percent className="w-4 h-4" />
              Barème & Paramètres d'Imposition (IS)
            </h4>

            <div className="space-y-2 text-xs">
              <label className="text-slate-300 font-semibold block">
                Régime Fiscal d'Imposition :
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTaxRegimeMode("PME_FR")}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    taxRegimeMode === "PME_FR"
                      ? "bg-indigo-600/20 border-indigo-500 text-white font-bold"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="text-xs">Barème PME (France)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">15% ≤ 42,5k€ puis 25%</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTaxRegimeMode("STANDARD_25")}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    taxRegimeMode === "STANDARD_25"
                      ? "bg-indigo-600/20 border-indigo-500 text-white font-bold"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="text-xs">Taux Normal 25%</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Taux unique standard</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTaxRegimeMode("SYSCOHADA")}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    taxRegimeMode === "SYSCOHADA"
                      ? "bg-indigo-600/20 border-indigo-500 text-white font-bold"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="text-xs">SYSCOHADA / IMF</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">25% ou Minimum Forfaitaire</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTaxRegimeMode("CUSTOM")}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    taxRegimeMode === "CUSTOM"
                      ? "bg-indigo-600/20 border-indigo-500 text-white font-bold"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="text-xs">Taux Personnalisé</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Moduler le taux %</div>
                </button>
              </div>

              {/* Conditional custom rate sliders */}
              {taxRegimeMode === "CUSTOM" && (
                <div className="pt-2 space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Taux d'IS personnalisé :</span>
                    <span className="font-bold text-indigo-400">{customTaxRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="0.5"
                    value={customTaxRate}
                    onChange={(e) => setCustomTaxRate(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              )}

              {taxRegimeMode === "SYSCOHADA" && (
                <div className="pt-2 space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Taux IMF (% sur Chiffre d'Affaires HT) :</span>
                    <span className="font-bold text-amber-400">{syscohadaIMFPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={syscohadaIMFPercent}
                    onChange={(e) => setSyscohadaIMFPercent(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-400">
                    Montant IMF minimal calculé : <span className="font-mono text-white font-semibold">{formatMoney(imfMontant)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Adjustments (Tableau 2058-A) Toggle Card */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-3">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowAdjustmentDetails(!showAdjustmentDetails)}
            >
              <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2 text-purple-400">
                <Scale className="w-4 h-4" />
                Retraitements Fiscaux (Liasse 2058-A)
              </h4>
              <button
                type="button"
                className="text-slate-400 hover:text-white p-1"
                aria-label="Toggle adjustments"
              >
                {showAdjustmentDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Ajustez les éléments extra-comptables non déductibles ou déductibles pour affiner l'assiette d'imposition.
            </p>

            {showAdjustmentDetails && (
              <div className="space-y-3 pt-2 text-xs animate-in fade-in duration-150">
                <div>
                  <label className="text-slate-400 font-medium block mb-1">
                    (+) Réintégrations fiscales (amendes, charges non déductibles) :
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={reintegrations || ""}
                      onChange={(e) => setReintegrations(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0,00"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-purple-500 outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-500 text-xs">
                      {company.currency}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-medium block mb-1">
                    (-) Déductions fiscales (crédits d'impôt, abattements) :
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={deductions || ""}
                      onChange={(e) => setDeductions(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0,00"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-purple-500 outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-500 text-xs">
                      {company.currency}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-medium block mb-1">
                    (-) Déficits fiscaux antérieurs reportables :
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={deficitsAnterieurs || ""}
                      onChange={(e) => setDeficitsAnterieurs(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0,00"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-purple-500 outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-500 text-xs">
                      {company.currency}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-medium block mb-1">
                    (-) Crédits d'impôt imputables directement sur l'IS (CIR, CII...) :
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={creditImpot || ""}
                      onChange={(e) => setCreditImpot(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0,00"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-purple-500 outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-500 text-xs">
                      {company.currency}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Acomptes d'IS & Calendrier de Paiement */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-3">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowAcomptesDetails(!showAcomptesDetails)}
        >
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              Échéancier Prévisionnel des Acomptes & Solde d'IS ({fiscalYear})
            </h4>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-white p-1"
            aria-label="Toggle acomptes"
          >
            {showAcomptesDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          En application de l'article 1668 du CGI, l'impôt sur les sociétés est acquitté au moyen de 4 acomptes trimestriels et d'un solde de liquidation régularisateur.
        </p>

        {showAcomptesDetails && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">1er Acompte</span>
                <span className="font-mono text-amber-400 font-bold">15 Mars</span>
              </div>
              <div className="font-mono text-sm font-bold text-white">
                {formatMoney(acompte1)}
              </div>
              <div className="text-[10px] text-slate-500">Relevé n° 2571-SD</div>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">2e Acompte</span>
                <span className="font-mono text-amber-400 font-bold">15 Juin</span>
              </div>
              <div className="font-mono text-sm font-bold text-white">
                {formatMoney(acompte2)}
              </div>
              <div className="text-[10px] text-slate-500">Relevé n° 2571-SD</div>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">3e Acompte</span>
                <span className="font-mono text-amber-400 font-bold">15 Sept</span>
              </div>
              <div className="font-mono text-sm font-bold text-white">
                {formatMoney(acompte3)}
              </div>
              <div className="text-[10px] text-slate-500">Relevé n° 2571-SD</div>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">4e Acompte</span>
                <span className="font-mono text-amber-400 font-bold">15 Déc</span>
              </div>
              <div className="font-mono text-sm font-bold text-white">
                {formatMoney(acompte4)}
              </div>
              <div className="text-[10px] text-slate-500">Relevé n° 2571-SD</div>
            </div>

            <div className="p-3 bg-indigo-950/40 rounded-xl border border-indigo-500/30 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-indigo-300 font-semibold">Solde IS (2572)</span>
                <span className="font-mono text-indigo-300 font-bold">15 Mai N+1</span>
              </div>
              <div className="font-mono text-sm font-black text-indigo-300">
                {formatMoney(soldeIS)}
              </div>
              <div className="text-[10px] text-indigo-400/80">Régularisation solde</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
