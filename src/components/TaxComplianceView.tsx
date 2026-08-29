import React, { useState } from "react";
import {
  Landmark,
  FileCheck,
  Calendar,
  AlertCircle,
  Download,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  TrendingDown,
  FileSpreadsheet,
  ShieldCheck,
  FileText,
  Calculator,
  Receipt,
  Layers,
  Printer,
  Sparkles,
} from "lucide-react";
import { CompanyProfile, FinancialKPIs, JournalTransaction } from "../types";
import { downloadFile, getUpcomingFiscalDeadlines, generateFECCsv } from "../lib/accountingEngine";
import { AnnualTaxSynthesis } from "./AnnualTaxSynthesis";
import { TaxReportPdfModal } from "./TaxReportPdfModal";

interface TaxComplianceViewProps {
  company: CompanyProfile;
  kpis: FinancialKPIs;
  transactions: JournalTransaction[];
}

export const TaxComplianceView: React.FC<TaxComplianceViewProps> = ({
  company,
  kpis,
  transactions,
}) => {
  const [activeFiscalTab, setActiveFiscalTab] = useState<"IS_SYNTHESIS" | "TVA_CA3" | "CALENDAR_FEC" | "ALL">("IS_SYNTHESIS");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("2026-02");
  const [exportToast, setExportToast] = useState<string | null>(null);
  const [isTaxReportPdfOpen, setIsTaxReportPdfOpen] = useState<boolean>(false);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: company.currency === "€" ? "EUR" : "XOF",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Specific TVA breakdowns
  let tvaImmobilisations = 0;
  let tvaBiensServices = 0;
  transactions.forEach((tx) => {
    tx.lines.forEach((l) => {
      if (l.accountCode === "445620") tvaImmobilisations += l.debit;
      if (l.accountCode === "445660") tvaBiensServices += l.debit;
    });
  });

  const handleExportCA3 = () => {
    const summary = `DECLARATION TVA CA3 - ${company.name}
SIREN : ${company.siren}
PERIODE : ${selectedPeriod}

A. MONTANT DES OPERATIONS :
- Total Ventes & Prestations de services HT : ${formatMoney(kpis.chiffreAffaires)}

B. DECOMPTE DE LA TVA A PAYER :
- Ligne 08 : Opérations imposables à 20% (TVA Collectée) : ${formatMoney(kpis.tvaCollectee)}
- Ligne 19 : Biens constituant des immobilisations : ${formatMoney(tvaImmobilisations)}
- Ligne 20 : Autres biens et services : ${formatMoney(tvaBiensServices)}
- Ligne 23 : Total TVA Déductible : ${formatMoney(kpis.tvaDeductible)}

C. RESULTAT NET DE LA PERIODE :
${
  kpis.tvaNetDue >= 0
    ? `- Ligne 28 : TVA NETTE DUE (A DECAISSER) : ${formatMoney(kpis.tvaNetDue)}`
    : `- Ligne 25 : CREDIT DE TVA A REPORTER : ${formatMoney(Math.abs(kpis.tvaNetDue))}`
}

Généré automatiquement par ComptaAI - Télédéclaration prête pour télétransmission DGFiP / Administration fiscale.`;

    downloadFile(summary, `Declaration_TVA_CA3_${selectedPeriod}_${company.siren.replace(/\s/g, "")}.txt`);
    setExportToast(`Bordereau de déclaration TVA CA3 (${selectedPeriod}) téléchargé avec succès.`);
    setTimeout(() => setExportToast(null), 4500);
  };

  const handleExportFEC = () => {
    const csvContent = generateFECCsv(transactions, company, ";");
    const cleanSiren = (company.siren || "000000000").replace(/[^a-zA-Z0-9]/g, "");
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `${cleanSiren}FEC${dateStr}.csv`;

    downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
    const totalLines = transactions.reduce((acc, tx) => acc + tx.lines.length, 0);
    setExportToast(`Export FEC CSV conforme généré avec succès (${transactions.length} écritures, ${totalLines} lignes - ${filename})`);
    setTimeout(() => setExportToast(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {exportToast && (
        <div className="bg-emerald-900/90 border border-emerald-500/50 text-emerald-100 px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{exportToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportToast(null)}
            className="text-emerald-300 hover:text-white text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Landmark className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              Déclarations Fiscales & Synthèse Annuelle
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Calcul en temps réel du résultat avant impôt, estimation de l'impôt sur les sociétés (IS), TVA CA3 et conformité FEC.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-view Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveFiscalTab("IS_SYNTHESIS")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeFiscalTab === "IS_SYNTHESIS"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Synthèse IS & EBT</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFiscalTab("TVA_CA3")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeFiscalTab === "TVA_CA3"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>TVA (CA3)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFiscalTab("CALENDAR_FEC")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeFiscalTab === "CALENDAR_FEC"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Échéances & FEC</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFiscalTab("ALL")}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeFiscalTab === "ALL"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Vue complète"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsTaxReportPdfOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition cursor-pointer"
            title="Générer et exporter le rapport récapitulatif fiscal officiel en PDF pour l'expert-comptable externe (Liasse 2058-A, Décompte IS, TVA CA3 & FEC)"
          >
            <FileText className="w-4 h-4" />
            <span>Rapport Fiscal PDF (Expert-Comptable)</span>
          </button>

          <button
            type="button"
            onClick={handleExportFEC}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer"
            title="Exporter le Fichier des Écritures Comptables (FEC) au format CSV normalisé (Article A.47 A-1 du LPF)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export FEC (CSV)</span>
          </button>
        </div>
      </div>

      {/* 1. Annual Tax Synthesis (IS, EBT, Tableau 2058-A, Acomptes) */}
      {(activeFiscalTab === "IS_SYNTHESIS" || activeFiscalTab === "ALL") && (
        <AnnualTaxSynthesis
          company={company}
          kpis={kpis}
          transactions={transactions}
          onOpenTaxReportPdf={() => setIsTaxReportPdfOpen(true)}
        />
      )}

      {/* 2. TVA & CA3 Declaration Section */}
      {(activeFiscalTab === "TVA_CA3" || activeFiscalTab === "ALL") && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* TVA Overview Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* TVA Collectée */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase font-semibold">
                  TVA Collectée (Ventes)
                </span>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded">
                  Compte 4457
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {formatMoney(kpis.tvaCollectee)}
              </div>
              <p className="text-[11px] text-slate-400">
                Encaissée auprès de vos clients sur prestations et factures émises.
              </p>
            </div>

            {/* TVA Déductible */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase font-semibold">
                  TVA Déductible (Achats)
                </span>
                <span className="text-[10px] font-mono bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded">
                  Compte 4456
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-sky-400">
                {formatMoney(kpis.tvaDeductible)}
              </div>
              <p className="text-[11px] text-slate-400">
                Dont immo : {formatMoney(tvaImmobilisations)} • Biens & services : {formatMoney(tvaBiensServices)}
              </p>
            </div>

            {/* Net TVA à payer */}
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-300 uppercase font-bold">
                  {kpis.tvaNetDue >= 0 ? "TVA Nette à Décaisser" : "Crédit de TVA"}
                </span>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                  Échéance 19 Fév
                </span>
              </div>
              <div className="text-2xl font-extrabold font-mono text-white">
                {formatMoney(Math.abs(kpis.tvaNetDue))}
              </div>
              <p className="text-[11px] text-slate-400">
                {kpis.tvaNetDue >= 0
                  ? "Montant exigible par l'administration fiscale au titre du mois courant."
                  : "Crédit reportable sur la déclaration du mois suivant."}
              </p>
            </div>
          </div>

          {/* Formulaire CA3 Déclaration Simulation */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">
                  Pré-remplissage Officiel Déclaration CA3 (Télédéclaration)
                </h3>
                <p className="text-xs text-slate-400">
                  Formulaire Cerfa n°3310-CA3 pré-calculé par les écritures comptables
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-950 text-slate-300 font-mono text-xs px-2.5 py-1 rounded-lg border border-slate-800">
                  Régime : {company.vatRegime}
                </span>
                <button
                  type="button"
                  onClick={handleExportCA3}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Bordereau CA3</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Base Imposable */}
              <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-slate-200 text-xs uppercase text-sky-400">
                  I. Opérations Réalisées & Base HT
                </h4>
                <div className="flex justify-between py-1.5 border-b border-slate-900 text-xs">
                  <span className="text-slate-400">01. Ventes et prestations imposables à 20%</span>
                  <span className="font-mono text-white font-semibold">
                    {formatMoney(kpis.chiffreAffaires)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-900 text-xs">
                  <span className="text-slate-400">02. Achats intracommunautaires / Cloud</span>
                  <span className="font-mono text-slate-300">3 200,00 €</span>
                </div>
                <div className="flex justify-between py-1.5 text-xs font-bold text-white">
                  <span>Total Bases Imposables</span>
                  <span className="font-mono text-sky-400">{formatMoney(kpis.chiffreAffaires)}</span>
                </div>
              </div>

              {/* Décompte TVA */}
              <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-slate-200 text-xs uppercase text-amber-400">
                  II. Décompte de la TVA Brute et Déductible
                </h4>
                <div className="flex justify-between py-1.5 border-b border-slate-900 text-xs">
                  <span className="text-slate-400">Ligne 08 : TVA brute due (20%)</span>
                  <span className="font-mono text-white">{formatMoney(kpis.tvaCollectee)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-900 text-xs">
                  <span className="text-slate-400">Ligne 19 : TVA déductible s/ immobilisations</span>
                  <span className="font-mono text-sky-400">-{formatMoney(tvaImmobilisations)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-900 text-xs">
                  <span className="text-slate-400">Ligne 20 : Autres biens et services</span>
                  <span className="font-mono text-sky-400">-{formatMoney(tvaBiensServices)}</span>
                </div>
                <div className="flex justify-between py-1.5 text-xs font-bold text-white border-t border-slate-800 pt-2">
                  <span className="text-amber-300">Ligne 28 : Net à Payer (ou Crédit)</span>
                  <span className="font-mono text-amber-300 text-sm">
                    {formatMoney(Math.abs(kpis.tvaNetDue))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Fiscal Deadlines & FEC Section */}
      {(activeFiscalTab === "CALENDAR_FEC" || activeFiscalTab === "ALL") && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Fiscal Deadlines & Calendar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Échéancier Fiscal & Social Automatisé</h3>
                  <p className="text-xs text-slate-400">
                    Calcul en temps réel selon le régime ({company.taxRegime}) et le référentiel ({company.accountingStandard})
                  </p>
                </div>
              </div>
              <span className="text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-1 rounded-full font-medium">
                Télédéclarations EDI-TVA / DSN / IS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {getUpcomingFiscalDeadlines(company, kpis).map((d) => {
                const isUrgent = d.daysRemaining <= 7;
                return (
                  <div
                    key={d.id}
                    className={`p-3.5 rounded-xl border space-y-1.5 transition ${
                      isUrgent
                        ? "bg-slate-950 border-amber-500/40 hover:border-amber-400"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isUrgent
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-sky-500/20 text-sky-300"
                        }`}
                      >
                        {isUrgent ? `J-${d.daysRemaining} (Urgent)` : `J-${d.daysRemaining}`}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{d.dueDate}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white line-clamp-1">{d.title}</h4>
                    <div className="text-[11px] text-slate-400 truncate">{d.authority}</div>
                    <div className="pt-1 flex items-center justify-between border-t border-slate-900 text-xs">
                      <span className="text-slate-500 text-[11px]">Montant :</span>
                      <span className="font-mono font-bold text-white">
                        {formatMoney(d.amountEstimated)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FEC Compliance Section */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Conformité FEC (Fichier des Écritures Comptables) - Art. A.47 A-1 LPF
                  </h3>
                  <p className="text-xs text-slate-400">
                    Génération normalisée pour l'Administration Fiscale (DGFiP), experts-comptables et commissaires aux comptes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportFEC}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exporter FEC (CSV)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-semibold uppercase text-[10px]">Structure & Norme</div>
                <div className="font-bold text-emerald-400">18 colonnes normalisées</div>
                <p className="text-slate-400 text-[11px]">
                  Respect strict de l'ordre officiel : JournalCode, CompteNum, PieceRef, Débit/Crédit avec virgule, lettrage, devises ISO.
                </p>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-semibold uppercase text-[10px]">Encodage & Format</div>
                <div className="font-bold text-sky-400">CSV délimité (;) + BOM UTF-8</div>
                <p className="text-slate-400 text-[11px]">
                  Lisible directement sur Excel, Google Sheets, Test Compta Demat et tous les progiciels comptables du marché.
                </p>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-semibold uppercase text-[10px]">Nom de fichier légal</div>
                <div className="font-mono text-amber-300 text-[11px] truncate">
                  {(company.siren || "000000000").replace(/[^a-zA-Z0-9]/g, "")}FEC{new Date().toISOString().slice(0, 10).replace(/-/g, "")}.csv
                </div>
                <p className="text-slate-400 text-[11px]">
                  Nomenclature réglementaire : SIREN + FEC + Date de clôture/génération.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Tax Report PDF Modal */}
      <TaxReportPdfModal
        isOpen={isTaxReportPdfOpen}
        onClose={() => setIsTaxReportPdfOpen(false)}
        company={company}
        kpis={kpis}
        transactions={transactions}
      />
    </div>
  );
};

