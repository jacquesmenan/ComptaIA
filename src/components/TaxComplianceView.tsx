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
} from "lucide-react";
import { CompanyProfile, FinancialKPIs, JournalTransaction } from "../types";
import { downloadFile, getUpcomingFiscalDeadlines } from "../lib/accountingEngine";

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
  const [selectedPeriod, setSelectedPeriod] = useState<string>("2026-02");

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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Landmark className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              Déclarations Fiscales & Calcul de TVA Automatisé
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Calcul en temps réel de la TVA collectée vs déductible, pré-remplissage CA3 et calendrier fiscal officiel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCA3}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger Bordereau CA3</span>
          </button>
        </div>
      </div>

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
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-base">
              Pré-remplissage Officiel Déclaration CA3 (Télédéclaration)
            </h3>
            <p className="text-xs text-slate-400">
              Formulaire Cerfa n°3310-CA3 pré-calculé par les écritures comptables
            </p>
          </div>
          <span className="bg-slate-950 text-slate-300 font-mono text-xs px-2.5 py-1 rounded-lg border border-slate-800">
            Régime : {company.vatRegime}
          </span>
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
            Télédéclarations EDI-TVA / DSN
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
    </div>
  );
};
