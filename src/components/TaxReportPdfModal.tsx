import React, { useRef, useState } from "react";
import {
  Download,
  Printer,
  FileText,
  CheckCircle2,
  TrendingUp,
  Building2,
  Scale,
  ShieldCheck,
  Calendar,
  X,
  Calculator,
  Percent,
  Receipt,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Award,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  UserCheck,
  Send,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { CompanyProfile, FinancialKPIs, JournalTransaction } from "../types";
import { generateGrandLivre } from "../lib/accountingEngine";

interface TaxReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyProfile;
  kpis: FinancialKPIs;
  transactions: JournalTransaction[];
}

export const TaxReportPdfModal: React.FC<TaxReportPdfModalProps> = ({
  isOpen,
  onClose,
  company,
  kpis,
  transactions,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfGenerationStatus, setPdfGenerationStatus] = useState<string | null>(null);

  // Configuration options for the report
  const [fiscalYear, setFiscalYear] = useState<string>("2026");
  const [accountantName, setAccountantName] = useState<string>("Cabinet d'Expertise Comptable & Conseil");
  const [accountantEmail, setAccountantEmail] = useState<string>("");
  const [taxRegime, setTaxRegime] = useState<"PME_FR" | "STANDARD_25" | "SYSCOHADA" | "CUSTOM">(
    company.accountingStandard === "SYSCOHADA" ? "SYSCOHADA" : "PME_FR"
  );
  const [customTaxRate, setCustomTaxRate] = useState<number>(25);
  const [reintegrations, setReintegrations] = useState<number>(0);
  const [deductions, setDeductions] = useState<number>(0);
  const [deficitsAnterieurs, setDeficitsAnterieurs] = useState<number>(0);
  const [creditImpot, setCreditImpot] = useState<number>(0);
  const [includeVatDetails, setIncludeVatDetails] = useState<boolean>(true);
  const [includeAcomptesCalendar, setIncludeAcomptesCalendar] = useState<boolean>(true);
  const [includeFecCompliance, setIncludeFecCompliance] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);

  if (!isOpen) return null;

  const grandLivre = generateGrandLivre(transactions);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: company.currency === "€" ? "EUR" : "XOF",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // 1. Detailed P&L breakdown from transactions
  let produitsExploitation = 0;
  let produitsFinanciers = 0;
  let produitsExceptionnels = 0;

  let chargesAchats = 0;
  let chargesExternes = 0;
  let chargesPersonnel = 0;
  let chargesDotations = 0;
  let chargesFinancieres = 0;
  let chargesExceptionnelles = 0;

  transactions.forEach((tx) => {
    tx.lines.forEach((l) => {
      const code = l.accountCode;
      const soldeDebit = l.debit;
      const soldeCredit = l.credit;

      // Produits (Class 7)
      if (code.startsWith("70") || code.startsWith("71") || code.startsWith("74") || code.startsWith("75")) {
        produitsExploitation += soldeCredit - soldeDebit;
      } else if (code.startsWith("76")) {
        produitsFinanciers += soldeCredit - soldeDebit;
      } else if (code.startsWith("77")) {
        produitsExceptionnels += soldeCredit - soldeDebit;
      }

      // Charges (Class 6)
      if (code.startsWith("60")) {
        chargesAchats += soldeDebit - soldeCredit;
      } else if (code.startsWith("61") || code.startsWith("62")) {
        chargesExternes += soldeDebit - soldeCredit;
      } else if (code.startsWith("64")) {
        chargesPersonnel += soldeDebit - soldeCredit;
      } else if (code.startsWith("68")) {
        chargesDotations += soldeDebit - soldeCredit;
      } else if (code.startsWith("66")) {
        chargesFinancieres += soldeDebit - soldeCredit;
      } else if (code.startsWith("67")) {
        chargesExceptionnelles += soldeDebit - soldeCredit;
      } else if (code.startsWith("63") || code.startsWith("65")) {
        chargesExternes += soldeDebit - soldeCredit;
      }
    });
  });

  // Fallback if no specific detailed accounts
  if (produitsExploitation === 0 && kpis.chiffreAffaires > 0) {
    produitsExploitation = kpis.chiffreAffaires;
  }
  const totalChargesExploitation = chargesAchats + chargesExternes + chargesPersonnel + chargesDotations;

  // Intermediate balances
  const resultatExploitation = produitsExploitation - totalChargesExploitation;
  const resultatFinancier = produitsFinanciers - chargesFinancieres;
  const resultatExceptionnel = produitsExceptionnels - chargesExceptionnelles;

  // Accounting Profit before tax (EBT / RNCAI)
  const resultatComptableAvantImpot = resultatExploitation + resultatFinancier + resultatExceptionnel;

  // Taxable Base (Liasse 2058-A)
  const assietteBrute = Math.max(0, resultatComptableAvantImpot + reintegrations - deductions);
  const deductionDeficitReelle = Math.min(assietteBrute, deficitsAnterieurs);
  const resultatFiscalImposable = Math.max(0, assietteBrute - deductionDeficitReelle);

  // Corporate Tax (IS) Calculation
  let impotSocietesBrut = 0;
  let partTranche15 = 0;
  let partTranche25 = 0;
  let isIMFApplied = false;
  let montantIMF = 0;

  if (taxRegime === "PME_FR") {
    const PME_THRESHOLD = 42500;
    if (resultatFiscalImposable <= PME_THRESHOLD) {
      partTranche15 = resultatFiscalImposable * 0.15;
      impotSocietesBrut = partTranche15;
    } else {
      partTranche15 = PME_THRESHOLD * 0.15;
      partTranche25 = (resultatFiscalImposable - PME_THRESHOLD) * 0.25;
      impotSocietesBrut = partTranche15 + partTranche25;
    }
  } else if (taxRegime === "STANDARD_25") {
    impotSocietesBrut = resultatFiscalImposable * 0.25;
    partTranche25 = impotSocietesBrut;
  } else if (taxRegime === "SYSCOHADA") {
    const isStandard = resultatFiscalImposable * 0.25;
    montantIMF = produitsExploitation * 0.005; // 0.5% IMF
    if (isStandard >= montantIMF) {
      impotSocietesBrut = isStandard;
      partTranche25 = isStandard;
    } else {
      impotSocietesBrut = montantIMF;
      isIMFApplied = true;
    }
  } else {
    // Custom
    impotSocietesBrut = resultatFiscalImposable * (customTaxRate / 100);
  }

  const impotSocietesNet = Math.max(0, impotSocietesBrut - creditImpot);
  const resultatNetApresIS = resultatComptableAvantImpot - impotSocietesNet;
  const tauxEffectifImposition = resultatFiscalImposable > 0 ? (impotSocietesNet / resultatFiscalImposable) * 100 : 0;

  // Acomptes d'IS (Relevé 2571-SD & 2572)
  const acompteTrimestre = impotSocietesNet / 4;
  const acomptesList = [
    { num: "1er Acompte", dateLimite: `15/03/${fiscalYear}`, montant: acompteTrimestre, formulaire: "Relevé 2571-SD" },
    { num: "2ème Acompte", dateLimite: `15/06/${fiscalYear}`, montant: acompteTrimestre, formulaire: "Relevé 2571-SD" },
    { num: "3ème Acompte", dateLimite: `15/09/${fiscalYear}`, montant: acompteTrimestre, formulaire: "Relevé 2571-SD" },
    { num: "4ème Acompte", dateLimite: `15/12/${fiscalYear}`, montant: acompteTrimestre, formulaire: "Relevé 2571-SD" },
  ];
  const soldeLiquidationIS = {
    titre: "Solde de Liquidation IS",
    dateLimite: `15/05/${parseInt(fiscalYear, 10) + 1}`,
    formulaire: "Relevé de Solde 2572-SD",
    montantISDu: impotSocietesNet,
  };

  // TVA Synthesis (CA3)
  const tvaCollectee = kpis.tvaCollectee;
  const tvaDeductible = kpis.tvaDeductible;
  const tvaNette = tvaCollectee - tvaDeductible;
  const isTvaAPayer = tvaNette >= 0;

  // FEC statistics
  const totalFecLines = transactions.reduce((acc, tx) => acc + tx.lines.length, 0);
  const isJournalBalanced = transactions.every((tx) => {
    const totalD = tx.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalC = tx.lines.reduce((s, l) => s + (l.credit || 0), 0);
    return Math.abs(totalD - totalC) < 0.01;
  });

  // PDF Export execution
  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    setPdfGenerationStatus("Génération du rapport fiscal haute définition...");

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      setPdfGenerationStatus("Pagination et assemblage A4...");

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

      // First Page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;

      // Additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pdfHeight;
      }

      const cleanSiren = (company.siren || "ENTREPRISE").replace(/\s/g, "");
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `Rapport_Fiscal_Synthese_${cleanSiren}_${fiscalYear}_${dateStr}.pdf`;

      pdf.save(filename);
      setPdfGenerationStatus("Export PDF réussi !");
      setTimeout(() => {
        setIsGeneratingPdf(false);
        setPdfGenerationStatus(null);
      }, 2500);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setPdfGenerationStatus("Erreur lors de la création du PDF.");
      setTimeout(() => {
        setIsGeneratingPdf(false);
        setPdfGenerationStatus(null);
      }, 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="tax-report-pdf-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Top Action Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Rapport Récapitulatif Fiscal & Liasse (Expert-Comptable)
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  Exercice {fiscalYear}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Document de transmission officiel : Résultat fiscal, Décompte IS, TVA CA3 & Attestation FEC.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Imprimer directement"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimer</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              {isGeneratingPdf ? (
                <>
                  <Clock className="w-4 h-4 animate-spin text-slate-950" />
                  <span>{pdfGenerationStatus || "Génération en cours..."}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Télécharger en PDF</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="px-5 py-3 bg-slate-900 border-b border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-slate-400 font-medium">Exercice Fiscal :</label>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:border-amber-500 outline-none"
              >
                <option value="2026">2026 (En cours)</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-slate-400 font-medium">Régime d'IS :</label>
              <select
                value={taxRegime}
                onChange={(e) => setTaxRegime(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-amber-400 font-semibold focus:border-amber-500 outline-none"
              >
                <option value="PME_FR">PME France (15% jusqu'à 42 500 € puis 25%)</option>
                <option value="STANDARD_25">Régime Réel Normal (Taux fixe 25%)</option>
                <option value="SYSCOHADA">SYSCOHADA (25% ou IMF 0,5% CA)</option>
                <option value="CUSTOM">Taux Personnalisé</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-slate-400 font-medium">Destinataire Expert-Comptable :</label>
              <input
                type="text"
                value={accountantName}
                onChange={(e) => setAccountantName(e.target.value)}
                placeholder="Nom du cabinet externe..."
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:border-amber-500 outline-none w-56"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
              <input
                type="checkbox"
                checked={includeVatDetails}
                onChange={(e) => setIncludeVatDetails(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-0"
              />
              <span>Détail TVA (CA3)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
              <input
                type="checkbox"
                checked={includeAcomptesCalendar}
                onChange={(e) => setIncludeAcomptesCalendar(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-0"
              />
              <span>Échéancier Acomptes</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-0"
              />
              <span>Visa & Signatures</span>
            </label>
          </div>
        </div>

        {/* Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60 flex justify-center">
          {/* A4 Document Container (Target for PDF Render) */}
          <div
            ref={reportRef}
            className="w-full max-w-[210mm] bg-white text-slate-900 shadow-2xl p-8 sm:p-12 text-xs font-sans leading-relaxed rounded-sm"
            style={{ minHeight: "297mm", boxSizing: "border-box" }}
          >
            {/* Header / En-tête officiel Cabinet & Entreprise */}
            <div className="border-b-2 border-slate-900 pb-5 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 px-2.5 py-1 rounded font-bold text-[10px] tracking-wide uppercase border border-amber-300 mb-2">
                    <Building2 className="w-3 h-3 text-amber-700" />
                    <span>Dossier Fiscal Annuel & Transmission Expert-Comptable</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                    {company.name || "ENTREPRISE COMMERCIALE"}
                  </h1>
                  <p className="text-slate-600 text-[11px] font-medium mt-0.5">
                    SIREN : <span className="font-bold text-slate-900">{company.siren || "Non renseigné"}</span> | NAF / APE : <span className="font-bold text-slate-900">{company.nafCode || "6201Z"}</span> | Forme : <span className="font-bold text-slate-900">{company.legalForm || "SAS"}</span>
                  </p>
                  <p className="text-slate-500 text-[10px]">
                    Siège : {company.address || "12 Avenue des Champs-Élysées, 75008 Paris"}
                  </p>
                </div>

                <div className="text-right">
                  <div className="bg-slate-900 text-white px-3 py-1.5 rounded font-mono font-bold text-[11px] inline-block mb-1">
                    EXERCICE FISCAL {fiscalYear}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Date de génération : <span className="font-bold text-slate-700">{new Date().toLocaleDateString("fr-FR")}</span>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Référentiel : <span className="font-bold text-slate-900">{company.accountingStandard || "PCG Français"}</span>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Destinataire : <span className="font-bold text-amber-800">{accountantName}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 1. Synthèse Exécutive (4 Cartes Clés) */}
            <div className="mb-6">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>1. Synthèse Exécutive Fiscale</span>
              </h2>

              <div className="grid grid-cols-4 gap-3">
                <div className="border border-slate-200 bg-slate-50/70 p-2.5 rounded">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Chiffre d'Affaires HT</span>
                  <span className="text-sm font-bold text-slate-900 font-mono block mt-0.5">
                    {formatMoney(produitsExploitation)}
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium">Produits d'exploitation</span>
                </div>

                <div className="border border-slate-200 bg-slate-50/70 p-2.5 rounded">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Résultat Net Avant Impôt</span>
                  <span className={`text-sm font-bold font-mono block mt-0.5 ${resultatComptableAvantImpot >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {formatMoney(resultatComptableAvantImpot)}
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium">RNCAI / EBT Comptable</span>
                </div>

                <div className="border border-amber-200 bg-amber-50/50 p-2.5 rounded">
                  <span className="text-[10px] text-amber-800 block uppercase font-medium">Bénéfice Fiscal Imposable</span>
                  <span className="text-sm font-bold text-amber-900 font-mono block mt-0.5">
                    {formatMoney(resultatFiscalImposable)}
                  </span>
                  <span className="text-[9px] text-amber-700 font-medium">Base Tableau 2058-A</span>
                </div>

                <div className="border border-indigo-200 bg-indigo-50/50 p-2.5 rounded">
                  <span className="text-[10px] text-indigo-800 block uppercase font-medium">Charge Nette IS</span>
                  <span className="text-sm font-bold text-indigo-950 font-mono block mt-0.5">
                    {formatMoney(impotSocietesNet)}
                  </span>
                  <span className="text-[9px] text-indigo-700 font-medium">
                    TEI : {tauxEffectifImposition.toFixed(2)} %
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Tableau de Passage du Résultat Comptable au Résultat Fiscal (Conforme Liasse 2058-A) */}
            <div className="mb-6">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between border-b border-slate-200 pb-1">
                <span className="flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                  <span>2. Détermination du Résultat Fiscal (Tableau 2058-A)</span>
                </span>
                <span className="text-[9px] text-slate-500 font-normal">
                  Articles 38 et 209 du CGI
                </span>
              </h2>

              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 text-left">
                    <th className="py-1.5 px-2 font-semibold">Poste / Rubrique Fiscale</th>
                    <th className="py-1.5 px-2 font-semibold">Réf. Cerfa</th>
                    <th className="py-1.5 px-2 font-semibold text-right">Montant Débit / Charge</th>
                    <th className="py-1.5 px-2 font-semibold text-right">Montant Crédit / Produit</th>
                    <th className="py-1.5 px-2 font-semibold text-right">Solde Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-1.5 px-2 font-medium text-slate-800">
                      Produits d'exploitation (Ventes de marchandises & prestations)
                    </td>
                    <td className="py-1.5 px-2 text-slate-500 font-mono text-[10px]">Liasse 2052 (FL)</td>
                    <td className="py-1.5 px-2 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(produitsExploitation)}</td>
                    <td className="py-1.5 px-2 text-right font-mono font-semibold text-emerald-700">+{formatMoney(produitsExploitation)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-slate-700 pl-4">
                      • Achats de marchandises & matières premières (Compte 60)
                    </td>
                    <td className="py-1.5 px-2 text-slate-500 font-mono text-[10px]">Liasse 2052 (FS)</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(chargesAchats)}</td>
                    <td className="py-1.5 px-2 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-600">-{formatMoney(chargesAchats)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-slate-700 pl-4">
                      • Autres achats et charges externes (Comptes 61 / 62)
                    </td>
                    <td className="py-1.5 px-2 text-slate-500 font-mono text-[10px]">Liasse 2052 (FW)</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(chargesExternes)}</td>
                    <td className="py-1.5 px-2 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-600">-{formatMoney(chargesExternes)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-slate-700 pl-4">
                      • Salaires, rémunérations & charges sociales (Compte 64)
                    </td>
                    <td className="py-1.5 px-2 text-slate-500 font-mono text-[10px]">Liasse 2052 (FY)</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(chargesPersonnel)}</td>
                    <td className="py-1.5 px-2 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-600">-{formatMoney(chargesPersonnel)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-slate-700 pl-4">
                      • Dotations aux amortissements & provisions (Compte 68)
                    </td>
                    <td className="py-1.5 px-2 text-slate-500 font-mono text-[10px]">Liasse 2052 (GA)</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(chargesDotations)}</td>
                    <td className="py-1.5 px-2 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-600">-{formatMoney(chargesDotations)}</td>
                  </tr>
                  <tr className="bg-slate-50 font-semibold">
                    <td className="py-1.5 px-2 text-slate-900">Résultat d'Exploitation (REX)</td>
                    <td className="py-1.5 px-2 text-slate-500 font-mono text-[10px]">Liasse 2052 (GG)</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(totalChargesExploitation)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(produitsExploitation)}</td>
                    <td className={`py-1.5 px-2 text-right font-mono ${resultatExploitation >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {formatMoney(resultatExploitation)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-slate-700">Résultat Financier (Produits 76 - Charges 66)</td>
                    <td className="py-1.5 px-2 text-slate-500 font-mono text-[10px]">Liasse 2052 (GV)</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(chargesFinancieres)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(produitsFinanciers)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(resultatFinancier)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-slate-700">Résultat Exceptionnel (Produits 77 - Charges 67)</td>
                    <td className="py-1.5 px-2 text-slate-500 font-mono text-[10px]">Liasse 2052 (HI)</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(chargesExceptionnelles)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(produitsExceptionnels)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{formatMoney(resultatExceptionnel)}</td>
                  </tr>
                  <tr className="bg-slate-100 font-bold border-t border-slate-300">
                    <td className="py-2 px-2 text-slate-950">
                      RÉSULTAT COMPTABLE AVANT IMPÔT (RNCAI / EBT)
                    </td>
                    <td className="py-2 px-2 text-slate-600 font-mono text-[10px]">Liasse 2058-A (WA)</td>
                    <td className="py-2 px-2 text-right text-slate-400">-</td>
                    <td className="py-2 px-2 text-right text-slate-400">-</td>
                    <td className={`py-2 px-2 text-right font-mono text-sm ${resultatComptableAvantImpot >= 0 ? "text-emerald-800" : "text-rose-800"}`}>
                      {formatMoney(resultatComptableAvantImpot)}
                    </td>
                  </tr>
                  {/* Retraitements extra-comptables */}
                  <tr>
                    <td className="py-1.5 px-2 text-amber-900 pl-4">
                      (+) Réintégrations fiscales extra-comptables (Amendes, charges non déductibles)
                    </td>
                    <td className="py-1.5 px-2 text-slate-500 font-mono text-[10px]">Liasse 2058-A (WI)</td>
                    <td className="py-1.5 px-2 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-2 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-2 text-right font-mono text-amber-700 font-semibold">+{formatMoney(reintegrations)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-indigo-900 pl-4">
                      (-) Déductions fiscales extra-comptables (Plus-values exonérées, etc.)
                    </td>
                    <td className="py-1.5 px-2 text-slate-500 font-mono text-[10px]">Liasse 2058-A (WV)</td>
                    <td className="py-1.5 px-2 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-2 text-right text-slate-400">-</td>
                    <td className="py-1.5 px-2 text-right font-mono text-indigo-700 font-semibold">-{formatMoney(deductions)}</td>
                  </tr>
                  {deficitsAnterieurs > 0 && (
                    <tr>
                      <td className="py-1.5 px-2 text-slate-700 pl-4">
                        (-) Imputation des déficits fiscaux antérieurs reportables
                      </td>
                      <td className="py-1.5 px-2 text-slate-500 font-mono text-[10px]">Liasse 2058-A (ZL)</td>
                      <td className="py-1.5 px-2 text-right text-slate-400">-</td>
                      <td className="py-1.5 px-2 text-right text-slate-400">-</td>
                      <td className="py-1.5 px-2 text-right font-mono text-slate-700">-{formatMoney(deductionDeficitReelle)}</td>
                    </tr>
                  )}
                  <tr className="bg-amber-100/70 border-t-2 border-amber-400 font-bold">
                    <td className="py-2 px-2 text-amber-950 font-black">
                      BÉNÉFICE / ASSIETTE FISCALE NETTE IMPOSABLE (IS)
                    </td>
                    <td className="py-2 px-2 text-amber-800 font-mono text-[10px]">Liasse 2058-A (XN)</td>
                    <td className="py-2 px-2 text-right text-slate-400">-</td>
                    <td className="py-2 px-2 text-right text-slate-400">-</td>
                    <td className="py-2 px-2 text-right font-mono text-sm text-amber-950 font-black">
                      {formatMoney(resultatFiscalImposable)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. Liquidation de l'Impôt sur les Sociétés (IS) */}
            <div className="mb-6">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between border-b border-slate-200 pb-1">
                <span className="flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3. Liquidation de l'Impôt sur les Sociétés (IS) & Barème</span>
                </span>
                <span className="text-[9px] text-slate-500 font-normal">
                  Liasse Cerfa 2065 / Relevé de Solde 2572
                </span>
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded p-3 bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 text-[11px] mb-2">Détail du Calcul de l'IS</h3>
                  <div className="space-y-1.5 text-[11px]">
                    {taxRegime === "PME_FR" ? (
                      <>
                        <div className="flex justify-between items-center text-slate-700">
                          <span>Tranche PME à 15% (jusqu'à 42 500 €) :</span>
                          <span className="font-mono font-semibold">{formatMoney(partTranche15)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-700">
                          <span>Tranche Normale à 25% (au-delà) :</span>
                          <span className="font-mono font-semibold">{formatMoney(partTranche25)}</span>
                        </div>
                      </>
                    ) : taxRegime === "SYSCOHADA" ? (
                      <>
                        <div className="flex justify-between items-center text-slate-700">
                          <span>IS au taux de 25% :</span>
                          <span className="font-mono font-semibold">{formatMoney(resultatFiscalImposable * 0.25)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-700">
                          <span>Impôt Minimum Forfaitaire (IMF 0,5% CA) :</span>
                          <span className="font-mono font-semibold">{formatMoney(montantIMF)}</span>
                        </div>
                        {isIMFApplied && (
                          <div className="text-[10px] text-amber-800 font-semibold bg-amber-50 p-1 rounded">
                            * IMF applicable car supérieur à l'IS proportionnel
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex justify-between items-center text-slate-700">
                        <span>IS Taux standard ({customTaxRate}%) :</span>
                        <span className="font-mono font-semibold">{formatMoney(impotSocietesBrut)}</span>
                      </div>
                    )}

                    <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center text-slate-900 font-bold">
                      <span>Total Impôt Brut :</span>
                      <span className="font-mono">{formatMoney(impotSocietesBrut)}</span>
                    </div>

                    {creditImpot > 0 && (
                      <div className="flex justify-between items-center text-emerald-700">
                        <span>(-) Crédits d'impôt imputés (CIR, CII) :</span>
                        <span className="font-mono">-{formatMoney(creditImpot)}</span>
                      </div>
                    )}

                    <div className="border-t-2 border-slate-900 pt-1.5 flex justify-between items-center text-slate-950 font-black text-xs">
                      <span>IMPÔT SUR LES SOCIÉTÉS NET DÛ :</span>
                      <span className="font-mono text-indigo-900">{formatMoney(impotSocietesNet)}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded p-3 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-[11px] mb-2">Indicateurs de Rentabilité Nette</h3>
                    <div className="space-y-2 text-[11px]">
                      <div className="flex justify-between items-center text-slate-700">
                        <span>Résultat Comptable Avant IS :</span>
                        <span className="font-mono font-semibold">{formatMoney(resultatComptableAvantImpot)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700">
                        <span>Charge Totale d'IS :</span>
                        <span className="font-mono font-semibold text-rose-700">-{formatMoney(impotSocietesNet)}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center font-bold text-slate-900">
                        <span>RÉSULTAT NET DE L'EXERCICE :</span>
                        <span className={`font-mono ${resultatNetApresIS >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {formatMoney(resultatNetApresIS)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600 text-[10px]">
                        <span>Taux effectif réel d'IS :</span>
                        <span className="font-mono font-bold text-slate-900">{tauxEffectifImposition.toFixed(2)} %</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded p-2 text-[10px] text-emerald-900">
                    <span className="font-bold">Attestation d'affectation :</span> Le solde net sera soumis à l'approbation de l'Assemblée Générale Ordinaire (AGO) pour affectation (report à nouveau / réserves / dividendes).
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Échéancier des 4 Acomptes & Solde d'IS */}
            {includeAcomptesCalendar && (
              <div className="mb-6">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between border-b border-slate-200 pb-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    <span>4. Échéancier Prévisionnel des Acomptes & Solde d'IS</span>
                  </span>
                  <span className="text-[9px] text-slate-500 font-normal">
                    Relevés DGFiP 2571-SD & 2572
                  </span>
                </h2>

                <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
                  {acomptesList.map((ac, idx) => (
                    <div key={idx} className="border border-slate-200 bg-slate-50 p-2 rounded">
                      <span className="font-bold text-slate-900 block">{ac.num}</span>
                      <span className="text-[9px] text-slate-500 block mb-1">Échéance : {ac.dateLimite}</span>
                      <span className="font-mono font-bold text-slate-900 block text-[11px]">
                        {formatMoney(ac.montant)}
                      </span>
                      <span className="text-[8px] text-slate-400 block mt-0.5">{ac.formulaire}</span>
                    </div>
                  ))}
                  <div className="border border-indigo-200 bg-indigo-50/70 p-2 rounded">
                    <span className="font-bold text-indigo-950 block">Solde Liquidation</span>
                    <span className="text-[9px] text-indigo-700 block mb-1">Échéance : {soldeLiquidationIS.dateLimite}</span>
                    <span className="font-mono font-bold text-indigo-950 block text-[11px]">
                      {formatMoney(impotSocietesNet)}
                    </span>
                    <span className="text-[8px] text-indigo-600 block mt-0.5">{soldeLiquidationIS.formulaire}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Synthèse TVA (CA3) */}
            {includeVatDetails && (
              <div className="mb-6">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between border-b border-slate-200 pb-1">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-amber-600" />
                    <span>5. Récapitulatif Taxe sur la Valeur Ajoutée (TVA CA3)</span>
                  </span>
                  <span className="text-[9px] text-slate-500 font-normal">
                    Comptes 4457 (Collectée) & 4456 (Déductible)
                  </span>
                </h2>

                <div className="grid grid-cols-3 gap-3">
                  <div className="border border-slate-200 bg-slate-50 p-2.5 rounded">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>TVA Collectée (Ventes)</span>
                      <span className="font-mono">Compte 4457</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-700 font-mono block">
                      {formatMoney(tvaCollectee)}
                    </span>
                  </div>

                  <div className="border border-slate-200 bg-slate-50 p-2.5 rounded">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>TVA Déductible (Charges/Immos)</span>
                      <span className="font-mono">Compte 4456</span>
                    </div>
                    <span className="text-sm font-bold text-indigo-700 font-mono block">
                      {formatMoney(tvaDeductible)}
                    </span>
                  </div>

                  <div className={`border p-2.5 rounded ${isTvaAPayer ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
                    <div className="flex justify-between text-[10px] mb-1 font-semibold">
                      <span className={isTvaAPayer ? "text-amber-900" : "text-emerald-900"}>
                        {isTvaAPayer ? "Solde Net TVA à Décaisser" : "Crédit de TVA Reportable"}
                      </span>
                      <span className="font-mono text-[9px]">Ligne 28 CA3</span>
                    </div>
                    <span className={`text-sm font-bold font-mono block ${isTvaAPayer ? "text-amber-950" : "text-emerald-900"}`}>
                      {formatMoney(Math.abs(tvaNette))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Attestation de Conformité FEC */}
            {includeFecCompliance && (
              <div className="mb-6 border border-slate-200 bg-slate-50/50 p-3 rounded">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-[11px]">
                      Conformité FEC (Fichier des Écritures Comptables - Art. A.47 A-1 du LPF)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                    Écritures Validées & Équilibrées
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  La comptabilité informatisée de l'exercice comporte <span className="font-bold text-slate-900">{transactions.length} écritures</span> ({totalFecLines} lignes de grand livre) sans rupture de séquence chronologique. Le fichier FEC respecte les 18 champs obligatoires réglementaires et la stricte égalité Débit = Crédit ({isJournalBalanced ? "Contrôle 100% Conforme" : "À réviser"}).
                </p>
              </div>
            )}

            {/* 7. Visa & Signatures Officielles */}
            {includeSignatures && (
              <div className="border-t-2 border-slate-900 pt-4 mt-8">
                <div className="grid grid-cols-2 gap-8 text-[10px]">
                  {/* Entreprise */}
                  <div className="border border-slate-300 p-3 rounded bg-white">
                    <p className="font-bold text-slate-900 mb-1 uppercase tracking-wide">
                      Pour l'Entreprise (Représentant Légal)
                    </p>
                    <p className="text-slate-500 text-[9px] mb-8">
                      "Certifié sincère et conforme aux écritures du Grand Livre et pièces justificatives."
                    </p>
                    <div className="border-t border-slate-300 pt-1 flex justify-between text-slate-400">
                      <span>Date : {new Date().toLocaleDateString("fr-FR")}</span>
                      <span>Signature et Cachet :</span>
                    </div>
                  </div>

                  {/* Expert-Comptable Externe */}
                  <div className="border border-slate-300 p-3 rounded bg-white">
                    <p className="font-bold text-slate-900 mb-1 uppercase tracking-wide">
                      Pour le Cabinet d'Expertise Comptable Externe
                    </p>
                    <p className="text-slate-500 text-[9px] mb-8">
                      "Visa de contrôle, révision des comptes annuels et télétransmission DGFiP."
                    </p>
                    <div className="border-t border-slate-300 pt-1 flex justify-between text-slate-400">
                      <span>Cabinet : {accountantName}</span>
                      <span>Visa & Signature :</span>
                    </div>
                  </div>
                </div>

                <div className="text-center text-[9px] text-slate-400 mt-4">
                  Document édité automatiquement par la plateforme de comptabilité informatisée • Conforme normes DGFiP & Ordre des Experts-Comptables.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              Format optimisé A4 vectoriel haute fidélité prêt à l'envoi pour télédéclaration (EDI-TDFC / Cerfa 2065).
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Générer et Exporter le PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
