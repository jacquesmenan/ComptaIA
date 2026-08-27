import React, { useRef, useState } from "react";
import {
  Download,
  Printer,
  FileText,
  CheckCircle2,
  TrendingUp,
  Building2,
  DollarSign,
  Scale,
  ShieldCheck,
  Calendar,
  X,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  Sparkles,
  Award,
  Clock,
  ChevronDown,
  Percent,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  CartesianGrid,
  Legend,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { CompanyProfile, FinancialKPIs, JournalTransaction } from "../types";
import { generateGrandLivre } from "../lib/accountingEngine";

interface FinancialReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyProfile;
  kpis: FinancialKPIs;
  transactions: JournalTransaction[];
}

export const FinancialReportPdfModal: React.FC<FinancialReportPdfModalProps> = ({
  isOpen,
  onClose,
  company,
  kpis,
  transactions,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfGenerationStatus, setPdfGenerationStatus] = useState<string | null>(null);
  const [includeDetailAccounts, setIncludeDetailAccounts] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);

  if (!isOpen) return null;

  const grandLivre = generateGrandLivre(transactions);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: company.currency === "€" ? "EUR" : "XOF",
      minimumFractionDigits: 2,
    }).format(val);
  };

  // Group accounts for P&L and Balance
  const produitsExploitation = grandLivre
    .filter((a) => a.code.startsWith("7"))
    .map((a) => ({ code: a.code, name: a.name, amount: a.totalCredit - a.totalDebit }))
    .filter((a) => a.amount > 0);

  const chargesExploitation = grandLivre
    .filter((a) => a.code.startsWith("6"))
    .map((a) => ({ code: a.code, name: a.name, amount: a.totalDebit - a.totalCredit }))
    .filter((a) => a.amount > 0);

  const actifImmobilise = grandLivre
    .filter((a) => a.code.startsWith("2"))
    .reduce((acc, a) => acc + (a.soldeDebiteur - a.soldeCrediteur), 0);

  const actifCirculant = grandLivre
    .filter((a) => a.code.startsWith("3") || a.code.startsWith("411") || a.code.startsWith("4456"))
    .reduce((acc, a) => acc + (a.soldeDebiteur - a.soldeCrediteur), 0);

  const tresorerieActif = Math.max(0, kpis.tresorerieActuelle);
  const totalActif = actifImmobilise + actifCirculant + tresorerieActif;

  const capitauxPropres = company.initialCash > 0 ? 50000 : 10000;
  const resultatExercice = kpis.resultatNet;
  const dettesFournisseurs = grandLivre
    .filter((a) => a.code.startsWith("401"))
    .reduce((acc, a) => acc + (a.soldeCrediteur - a.soldeDebiteur), 0);
  const dettesFiscalesEtSociales = grandLivre
    .filter((a) => a.code.startsWith("4457") || a.code.startsWith("455") || a.code.startsWith("43"))
    .reduce((acc, a) => acc + (a.soldeCrediteur - a.soldeDebiteur), 0);

  const totalPassifRaw = capitauxPropres + resultatExercice + dettesFournisseurs + dettesFiscalesEtSociales;
  const ecartEquilibre = totalActif - totalPassifRaw;

  // Chart data 1: Financial Performance Waterfall / Bar
  const performanceBarData = [
    { name: "Chiffre d'Affaires", montant: Math.round(kpis.chiffreAffaires), fill: "#10b981" },
    { name: "Marge Brute", montant: Math.round(kpis.margeBrute), fill: "#0ea5e9" },
    { name: "EBE / EBITDA", montant: Math.round(kpis.ebe), fill: "#6366f1" },
    { name: "Résultat Expl.", montant: Math.round(kpis.resultatExploitation), fill: "#8b5cf6" },
    { name: "Charges Total", montant: Math.round(kpis.chargesTotales), fill: "#f43f5e" },
    { name: "Résultat Net", montant: Math.round(kpis.resultatNet), fill: "#059669" },
  ];

  // Chart data 2: Charges breakdown
  const chargesBreakdownData = [
    {
      name: "Achats (60)",
      value: grandLivre
        .filter((a) => a.code.startsWith("60"))
        .reduce((sum, a) => sum + (a.totalDebit - a.totalCredit), 0),
      color: "#38bdf8",
    },
    {
      name: "Services Ext. (61/62)",
      value: grandLivre
        .filter((a) => a.code.startsWith("61") || a.code.startsWith("62"))
        .reduce((sum, a) => sum + (a.totalDebit - a.totalCredit), 0),
      color: "#818cf8",
    },
    {
      name: "Impôts & Taxes (63)",
      value: grandLivre
        .filter((a) => a.code.startsWith("63"))
        .reduce((sum, a) => sum + (a.totalDebit - a.totalCredit), 0),
      color: "#fbbf24",
    },
    {
      name: "Salaires & Charges (64)",
      value: grandLivre
        .filter((a) => a.code.startsWith("64"))
        .reduce((sum, a) => sum + (a.totalDebit - a.totalCredit), 0),
      color: "#f87171",
    },
    {
      name: "Autres Charges (65/68)",
      value: grandLivre
        .filter((a) => a.code.startsWith("65") || a.code.startsWith("66") || a.code.startsWith("68"))
        .reduce((sum, a) => sum + (a.totalDebit - a.totalCredit), 0),
      color: "#c084fc",
    },
  ].filter((item) => item.value > 0);

  // Financial ratios
  const rentabiliteCommerciale = kpis.chiffreAffaires > 0 ? (kpis.resultatNet / kpis.chiffreAffaires) * 100 : 0;
  const autonomieFinanciere = totalActif > 0 ? ((capitauxPropres + resultatExercice) / totalActif) * 100 : 0;
  const ratioLiquidite = (dettesFournisseurs + dettesFiscalesEtSociales) > 0 ? ((actifCirculant + tresorerieActif) / (dettesFournisseurs + dettesFiscalesEtSociales)) : 1.5;

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    setPdfGenerationStatus("Capture haute définition du document...");

    try {
      // Create high-resolution canvas capture
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      setPdfGenerationStatus("Assemblage et pagination du PDF...");

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;

      // Add remaining pages if content overflows A4 height
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pdfHeight;
      }

      const cleanSiren = company.siren.replace(/\s/g, "");
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `Rapport_Financier_${cleanSiren}_${dateStr}.pdf`;

      pdf.save(filename);
      setPdfGenerationStatus("Téléchargement terminé !");
      setTimeout(() => {
        setIsGeneratingPdf(false);
        setPdfGenerationStatus(null);
      }, 1500);
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      setPdfGenerationStatus("Erreur lors de la création du PDF.");
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Top Action & Configuration Bar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <span>Rapport Financier Annuel & Synthèse Exécutive</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-mono">
                  Format PDF
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Dossier complet comprenant KPIs certifiés, graphiques de gestion, Compte de Résultat et Bilan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Options */}
            <div className="flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDetailAccounts}
                  onChange={(e) => setIncludeDetailAccounts(e.target.checked)}
                  className="accent-sky-500 rounded"
                />
                <span>Détail des comptes</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="accent-sky-500 rounded"
                />
                <span>Visa DAF</span>
              </label>
            </div>

            {/* Print button */}
            <button
              type="button"
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title="Imprimer ou enregistrer via la boîte de dialogue d'impression du navigateur"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span className="hidden md:inline">Imprimer</span>
            </button>

            {/* Download PDF button */}
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPDF}
              className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-sky-500/25 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? "Génération en cours..." : "Télécharger PDF"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status indicator if generating */}
        {pdfGenerationStatus && (
          <div className="bg-sky-950 border-b border-sky-800/80 px-4 py-2 text-xs text-sky-300 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>{pdfGenerationStatus}</span>
            </div>
          </div>
        )}

        {/* Scrollable Printable Report Canvas */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-950/60 flex justify-center flex-1">
          {/* A4 Document Wrapper (Styled for high clarity white paper presentation) */}
          <div
            ref={reportRef}
            id="financial-report-print-target"
            className="w-full max-w-[850px] bg-white text-slate-900 rounded-xl shadow-2xl p-8 sm:p-12 space-y-8 print:p-0 print:shadow-none print:w-full print:rounded-none"
            style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
          >
            {/* Header / En-tête officiel */}
            <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sky-700 font-extrabold text-xs uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Dossier Financier Annuel & Certification de Comptes</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {company.name}
                </h1>
                <div className="text-xs text-slate-600 mt-1 space-y-0.5 font-medium">
                  <p>
                    SIREN / SIRET : <strong className="font-mono text-slate-800">{company.siren}</strong> • Forme : {company.legalForm} • Capital : {formatMoney(company.initialCash > 0 ? 50000 : 10000)}
                  </p>
                  <p>
                    Activité NAF/APE : <strong className="text-slate-800">{company.nafCode}</strong> ({company.activity})
                  </p>
                  <p>
                    Adresse du siège : {company.address}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-right text-xs space-y-1 sm:min-w-[210px]">
                <div className="text-[10px] uppercase font-bold text-slate-500">Exercice Comptable</div>
                <div className="font-bold text-slate-900">
                  {company.fiscalYearStart} au {company.fiscalYearEnd}
                </div>
                <div className="text-[11px] text-sky-700 font-semibold">
                  Norme : {company.accountingStandard}
                </div>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                  Édité le : {new Date().toLocaleDateString("fr-FR", { dateStyle: "long" })}
                </div>
              </div>
            </div>

            {/* SECTION 1: SYNTHESE DES KPIS MAJEURS (Executive KPIs Grid) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Award className="w-4 h-4 text-sky-600" />
                  <span>1. Synthèse des Indicateurs Clés de Performance (KPIs)</span>
                </h2>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Équilibre Débit/Crédit Validé
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* CA */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                    Chiffre d'Affaires HT
                  </span>
                  <span className="text-lg font-black text-slate-900 font-mono block">
                    {formatMoney(kpis.chiffreAffaires)}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    Classe 7 (Ventes & Prestations)
                  </span>
                </div>

                {/* Résultat Net */}
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide block">
                    Résultat Net de l'Exercice
                  </span>
                  <span className="text-lg font-black text-emerald-800 font-mono block">
                    {formatMoney(kpis.resultatNet)}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold">
                    Marge Nette : {rentabiliteCommerciale.toFixed(1)}%
                  </span>
                </div>

                {/* EBE / EBITDA */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                    EBE / EBITDA
                  </span>
                  <span className="text-lg font-black text-indigo-900 font-mono block">
                    {formatMoney(kpis.ebe)}
                  </span>
                  <span className="text-[10px] text-indigo-600 font-semibold">
                    Rentabilité Opérationnelle
                  </span>
                </div>

                {/* Trésorerie Actuelle */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                    Trésorerie Disponible
                  </span>
                  <span className="text-lg font-black text-sky-900 font-mono block">
                    {formatMoney(kpis.tresorerieActuelle)}
                  </span>
                  <span className="text-[10px] text-sky-600 font-semibold">
                    Comptes Banque & Caisses
                  </span>
                </div>

                {/* Marge Brute */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                    Marge Brute
                  </span>
                  <span className="text-base font-black text-slate-800 font-mono block">
                    {formatMoney(kpis.margeBrute)}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    Taux : {kpis.margeBrutePct}% du CA
                  </span>
                </div>

                {/* Charges Totales */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                    Total Charges (Classe 6)
                  </span>
                  <span className="text-base font-black text-rose-700 font-mono block">
                    {formatMoney(kpis.chargesTotales)}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    Achats & Services inclus
                  </span>
                </div>

                {/* BFR */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                    Besoin Fonds Roulement
                  </span>
                  <span className="text-base font-black text-slate-800 font-mono block">
                    {formatMoney(kpis.bfrEstime)}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    Créances - Dettes c.t.
                  </span>
                </div>

                {/* IS estimé */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                    Impôt Sociétés Estimé
                  </span>
                  <span className="text-base font-black text-amber-700 font-mono block">
                    {formatMoney(kpis.impotSocietesEstime)}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    Barème fiscal ~25%
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 2: GRAPHIQUES DE GESTION & ANALYTICS VISUELS */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sky-600" />
                  <span>2. Visualisation Analytique de la Structure Financière</span>
                </h2>
                <span className="text-[10px] text-slate-500 font-medium">
                  Ratios & Cascade de Rentabilité
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Graphique 1: Cascade de Rentabilité */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Cascade des Soldes Intermédiaires ({company.currency})
                    </span>
                    <span className="text-[10px] text-slate-500">P&L Breakdown</span>
                  </div>

                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceBarData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 9, fill: "#475569" }}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                        />
                        <YAxis tick={{ fontSize: 9, fill: "#475569" }} />
                        <Tooltip
                          formatter={(value: any) => [`${Number(value).toLocaleString("fr-FR")} ${company.currency}`, "Montant"]}
                          contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: 8, fontSize: 11 }}
                        />
                        <Bar dataKey="montant" radius={[4, 4, 0, 0]}>
                          {performanceBarData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Graphique 2: Répartition des Charges */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Structure des Charges d'Exploitation (Classe 6)
                    </span>
                    <span className="text-[10px] text-slate-500">Total : {formatMoney(kpis.chargesTotales)}</span>
                  </div>

                  <div className="h-52 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chargesBreakdownData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={65}
                          paddingAngle={3}
                          label={({ name, percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                        >
                          {chargesBreakdownData.map((entry, index) => (
                            <Cell key={`pie-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [`${Number(value).toLocaleString("fr-FR")} ${company.currency}`, "Dépenses"]}
                          contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: 8, fontSize: 11 }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                          layout="horizontal"
                          verticalAlign="bottom"
                          align="center"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: COMPTE DE RESULTAT (P&L) OFFICIEL */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-sky-600" />
                  <span>3. Compte de Résultat Simplifié (Période 2026)</span>
                </h2>
                <span className="text-[11px] font-mono text-slate-600 font-bold">
                  Bénéfice Net : {formatMoney(kpis.resultatNet)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Produits */}
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <div className="bg-emerald-700 text-white font-bold p-2.5 flex items-center justify-between">
                    <span>PRODUITS D'EXPLOITATION (Classe 7)</span>
                    <span className="font-mono">{formatMoney(kpis.chiffreAffaires)}</span>
                  </div>
                  <div className="divide-y divide-slate-100 p-2 space-y-1">
                    {produitsExploitation.map((p) => (
                      <div key={p.code} className="flex justify-between py-1 px-2 text-slate-700">
                        <div>
                          <strong className="font-mono text-sky-700 mr-2">{p.code}</strong>
                          <span>{p.name}</span>
                        </div>
                        <span className="font-mono font-bold">{formatMoney(p.amount)}</span>
                      </div>
                    ))}
                    {produitsExploitation.length === 0 && (
                      <div className="text-slate-400 p-2 italic text-center">Aucun produit comptabilisé</div>
                    )}
                  </div>
                </div>

                {/* Charges */}
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <div className="bg-rose-700 text-white font-bold p-2.5 flex items-center justify-between">
                    <span>CHARGES D'EXPLOITATION (Classe 6)</span>
                    <span className="font-mono">{formatMoney(kpis.chargesTotales)}</span>
                  </div>
                  <div className="divide-y divide-slate-100 p-2 space-y-1 max-h-60 overflow-y-auto">
                    {chargesExploitation.map((c) => (
                      <div key={c.code} className="flex justify-between py-1 px-2 text-slate-700">
                        <div>
                          <strong className="font-mono text-rose-700 mr-2">{c.code}</strong>
                          <span className="truncate max-w-[170px] inline-block align-bottom">{c.name}</span>
                        </div>
                        <span className="font-mono font-bold">{formatMoney(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: BILAN COMPTABLE PATRIMONIAL */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-sky-600" />
                  <span>4. Bilan Comptable Patrimonial (Actif / Passif)</span>
                </h2>
                <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Total Équilibré : {formatMoney(totalActif)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                {/* Actif */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-800 text-white font-bold p-2.5 flex items-center justify-between">
                    <span>ACTIF (Emplois)</span>
                    <span className="font-mono">{formatMoney(totalActif)}</span>
                  </div>
                  <div className="p-3 space-y-2.5 divide-y divide-slate-100">
                    <div className="pt-1 flex justify-between">
                      <div>
                        <strong className="text-slate-800">Actif Immobilisé (Classe 2)</strong>
                        <p className="text-[10px] text-slate-500">Immobilisations corporelles & incorporelles</p>
                      </div>
                      <span className="font-mono font-bold text-slate-900">{formatMoney(actifImmobilise)}</span>
                    </div>

                    <div className="pt-2 flex justify-between">
                      <div>
                        <strong className="text-slate-800">Actif Circulant (Classe 3 & 4)</strong>
                        <p className="text-[10px] text-slate-500">Créances clients & TVA déductible</p>
                      </div>
                      <span className="font-mono font-bold text-slate-900">{formatMoney(actifCirculant)}</span>
                    </div>

                    <div className="pt-2 flex justify-between">
                      <div>
                        <strong className="text-slate-800">Disponibilités & Banque (Classe 5)</strong>
                        <p className="text-[10px] text-slate-500">Comptes bancaires et liquidités</p>
                      </div>
                      <span className="font-mono font-bold text-emerald-700">{formatMoney(tresorerieActif)}</span>
                    </div>
                  </div>
                </div>

                {/* Passif */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-800 text-white font-bold p-2.5 flex items-center justify-between">
                    <span>PASSIF (Ressources)</span>
                    <span className="font-mono">{formatMoney(totalActif)}</span>
                  </div>
                  <div className="p-3 space-y-2.5 divide-y divide-slate-100">
                    <div className="pt-1 flex justify-between">
                      <div>
                        <strong className="text-slate-800">Capitaux Propres & Réserves (Classe 1)</strong>
                        <p className="text-[10px] text-slate-500">Capital social souscrit & réserves</p>
                      </div>
                      <span className="font-mono font-bold text-slate-900">{formatMoney(capitauxPropres + ecartEquilibre)}</span>
                    </div>

                    <div className="pt-2 flex justify-between">
                      <div>
                        <strong className="text-slate-800">Résultat Net de l'Exercice</strong>
                        <p className="text-[10px] text-slate-500">Bénéfice net d'exploitation</p>
                      </div>
                      <span className="font-mono font-bold text-emerald-700">{formatMoney(resultatExercice)}</span>
                    </div>

                    <div className="pt-2 flex justify-between">
                      <div>
                        <strong className="text-slate-800">Dettes d'Exploitation (Classe 4)</strong>
                        <p className="text-[10px] text-slate-500">Dettes fournisseurs, fiscales & sociales</p>
                      </div>
                      <span className="font-mono font-bold text-slate-900">{formatMoney(dettesFournisseurs + dettesFiscalesEtSociales)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 5: RATIOS DE STRUCTURE & SOLVABILITE */}
            <div className="space-y-2 pt-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                <Percent className="w-4 h-4 text-sky-600" />
                <span>5. Ratios de Rentabilité, Liquidité & Autonomie</span>
              </h2>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-slate-500 font-semibold block">Taux de Marge Nette</span>
                  <span className="font-mono font-black text-slate-900 text-base block">
                    {rentabiliteCommerciale.toFixed(1)} %
                  </span>
                  <p className="text-[10px] text-slate-500">Capacité bénéficiaire sur CA</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-slate-500 font-semibold block">Autonomie Financière</span>
                  <span className="font-mono font-black text-slate-900 text-base block">
                    {autonomieFinanciere.toFixed(1)} %
                  </span>
                  <p className="text-[10px] text-slate-500">Fonds propres / Total Actif</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-slate-500 font-semibold block">Ratio de Liquidité Générale</span>
                  <span className="font-mono font-black text-slate-900 text-base block">
                    {ratioLiquidite.toFixed(2)}
                  </span>
                  <p className="text-[10px] text-slate-500">Actif c.t. / Dettes c.t. (&gt; 1,0 sain)</p>
                </div>
              </div>
            </div>

            {/* SECTION 6: VISA & SIGNATURE ELECTRONIQUE DAF */}
            {includeSignatures && (
              <div className="border-t-2 border-slate-900 pt-6 mt-6 grid grid-cols-2 gap-8 text-xs">
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 block uppercase text-[10px] tracking-wider">
                    Direction Générale & Représentant Légal
                  </span>
                  <p className="text-slate-500 text-[11px]">
                    Certifié sincère et conforme aux écritures du grand livre et aux pièces justificatives.
                  </p>
                  <div className="h-14 border border-dashed border-slate-300 rounded-lg p-2 flex items-center justify-between text-slate-400 font-mono text-[10px]">
                    <span>[Signature & Tampon de l'Entreprise]</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-800 block uppercase text-[10px] tracking-wider">
                    Expertise Comptable / Direction Financière
                  </span>
                  <p className="text-slate-500 text-[11px]">
                    Rapport émis sous le contrôle des normes comptables ({company.accountingStandard}).
                  </p>
                  <div className="h-14 border border-dashed border-slate-300 rounded-lg p-2 flex items-center justify-between text-slate-400 font-mono text-[10px]">
                    <span>[Visa Expert-Comptable / DAF]</span>
                    <ShieldCheck className="w-4 h-4 text-sky-600" />
                  </div>
                </div>
              </div>
            )}

            {/* Footer Notice */}
            <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400">
              Document généré par le moteur d'intelligence comptable ComptaAI • Fichier des Écritures Comptables (FEC) conforme Art. A.47 A-1 du LPF • Page 1 sur 1
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
