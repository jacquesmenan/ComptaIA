import React, { useState, useId } from "react";
import {
  Calculator,
  TrendingUp,
  Percent,
  DollarSign,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Send,
  Copy,
  Check,
  Building,
  Briefcase,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Globe2,
} from "lucide-react";
import { CompanyProfile, FinancialKPIs } from "../types";

interface CostLine {
  id: string;
  label: string;
  category: "ACHATS" | "MAIN_DOEUVRE" | "SOUS_TRAITANCE" | "FRAIS_ANNEXES";
  amountHT: number;
}

interface QuoteMarginCalculatorProps {
  company: CompanyProfile;
  kpis: FinancialKPIs;
  onAskAiAdvisor?: (promptText: string) => void;
  onOpenCurrencyConverter?: () => void;
}

export const QuoteMarginCalculator: React.FC<QuoteMarginCalculatorProps> = ({
  company,
  kpis,
  onAskAiAdvisor,
  onOpenCurrencyConverter,
}) => {
  const quoteTitleId = useId();
  const quoteSellingPriceId = useId();
  const quoteVatRateId = useId();
  const quoteTaxRateId = useId();
  const quoteTargetMarginId = useId();

  // Mode: "SIMPLE" | "DETAILED"
  const [mode, setMode] = useState<"SIMPLE" | "DETAILED">("SIMPLE");

  // General parameters
  const [docType, setDocType] = useState<"DEVIS" | "FACTURE">("DEVIS");
  const [quoteTitle, setQuoteTitle] = useState("Proposition Commerciale - Projet Alpha");
  const [clientName, setClientName] = useState("Client Grand Compte SAS");
  
  // Simple Mode Inputs
  const [sellingPriceHT, setSellingPriceHT] = useState<number>(5000);
  const [directCostHT, setDirectCostHT] = useState<number>(2000);
  const [vatRate, setVatRate] = useState<number>(20);
  const [isTaxRate, setIsTaxRate] = useState<number>(25); // IS 15% or 25%
  const [targetMarginPct, setTargetMarginPct] = useState<number>(40);

  // Detailed Mode Items
  const [costLines, setCostLines] = useState<CostLine[]>([
    { id: "1", label: "Achats fournitures / Licences", category: "ACHATS", amountHT: 1200 },
    { id: "2", label: "Prestation technique & Main d'œuvre (3 jours)", category: "MAIN_DOEUVRE", amountHT: 1500 },
    { id: "3", label: "Frais de déplacement & Logistique", category: "FRAIS_ANNEXES", amountHT: 300 },
  ]);
  const [detailedSellingPriceHT, setDetailedSellingPriceHT] = useState<number>(6000);

  const [copiedSummary, setCopiedSummary] = useState(false);

  // Presets
  const applyPreset = (preset: "SERVICES" | "PRODUCTS" | "DEVELOPMENT" | "HIGH_MARGIN") => {
    if (preset === "SERVICES") {
      setQuoteTitle("Mission de Conseil Stratégique / DAF Externalisé");
      setSellingPriceHT(4500);
      setDirectCostHT(900);
      setTargetMarginPct(70);
    } else if (preset === "PRODUCTS") {
      setQuoteTitle("Livraison Matériel & Équipements Informatiques");
      setSellingPriceHT(12000);
      setDirectCostHT(8400);
      setTargetMarginPct(30);
    } else if (preset === "DEVELOPMENT") {
      setQuoteTitle("Développement d'Application Web & Intégration");
      setSellingPriceHT(8500);
      setDirectCostHT(3200);
      setTargetMarginPct(55);
    } else if (preset === "HIGH_MARGIN") {
      setQuoteTitle("Formation Professionnelle & Coaching Dirigeant");
      setSellingPriceHT(3000);
      setDirectCostHT(400);
      setTargetMarginPct(85);
    }
  };

  // Calculations
  const activeSellingPrice = mode === "SIMPLE" ? sellingPriceHT : detailedSellingPriceHT;
  const activeDirectCost =
    mode === "SIMPLE"
      ? directCostHT
      : costLines.reduce((sum, item) => sum + (Number(item.amountHT) || 0), 0);

  const margeBruteEuro = Math.max(0, activeSellingPrice - activeDirectCost);
  const tauxMargeBrute = activeSellingPrice > 0 ? (margeBruteEuro / activeSellingPrice) * 100 : 0;
  const tauxMarque = activeDirectCost > 0 ? (margeBruteEuro / activeDirectCost) * 100 : 0;
  const coeffMultiplicateur = activeDirectCost > 0 ? activeSellingPrice / activeDirectCost : 0;

  const montantTVA = (activeSellingPrice * vatRate) / 100;
  const prixVenteTTC = activeSellingPrice + montantTVA;

  // Impact on Corporate Net Income
  const impotsSocietesSurMarge = (margeBruteEuro * isTaxRate) / 100;
  const contributionNette = margeBruteEuro - impotsSocietesSurMarge;

  const resultatNetActuel = kpis.resultatNet;
  const resultatNetProjete = resultatNetActuel + contributionNette;
  const progressionResultatNetPct =
    resultatNetActuel > 0
      ? (contributionNette / resultatNetActuel) * 100
      : contributionNette > 0
      ? 100
      : 0;

  const chiffreAffairesActuel = kpis.chiffreAffaires;
  const chiffreAffairesProjete = chiffreAffairesActuel + activeSellingPrice;
  const progressionCAPct =
    chiffreAffairesActuel > 0 ? (activeSellingPrice / chiffreAffairesActuel) * 100 : 100;

  // Recommended minimum floor price for target margin
  const prixPlancherCible =
    targetMarginPct < 100 ? activeDirectCost / (1 - targetMarginPct / 100) : activeDirectCost;

  // Format currency
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: company.currency === "€" ? "EUR" : "XOF",
      minimumFractionDigits: 2,
    }).format(val);
  };

  // Add line to detailed cost
  const handleAddCostLine = () => {
    setCostLines((prev) => [
      ...prev,
      {
        id: `cost-${Date.now()}`,
        label: "Nouveau poste de coût direct",
        category: "ACHATS",
        amountHT: 500,
      },
    ]);
  };

  const handleRemoveCostLine = (id: string) => {
    setCostLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdateCostLine = (id: string, field: keyof CostLine, value: any) => {
    setCostLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  // Copy quote summary to clipboard
  const handleCopySummary = () => {
    const text = `=== SIMULATION DE MARGE COMMERCIALE (${docType}) ===
Document : ${quoteTitle}
Client : ${clientName}
--------------------------------------------------
Prix de Vente HT : ${formatMoney(activeSellingPrice)} (TTC : ${formatMoney(prixVenteTTC)})
Coûts Directs de Revient : ${formatMoney(activeDirectCost)}
Marge Brute Réalisée : ${formatMoney(margeBruteEuro)} (${tauxMargeBrute.toFixed(1)}%)
Contribution Nette après IS (${isTaxRate}%) : ${formatMoney(contributionNette)}
--------------------------------------------------
IMPACT SUR L'ENTREPRISE :
- Résultat Net actuel : ${formatMoney(resultatNetActuel)} ➔ Projeté : ${formatMoney(resultatNetProjete)} (+${progressionResultatNetPct.toFixed(1)}%)
- CA Annuel actuel : ${formatMoney(chiffreAffairesActuel)} ➔ Projeté : ${formatMoney(chiffreAffairesProjete)}
Date de calcul : ${new Date().toLocaleDateString("fr-FR")}`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 3000);
  };

  // Ask AI Advisor
  const handleAskAdvisor = () => {
    if (!onAskAiAdvisor) return;
    const prompt = `Voici ma simulation de ${docType.toLowerCase()} pour "${quoteTitle}" (Client: ${clientName}) :
- Prix de Vente HT : ${formatMoney(activeSellingPrice)}
- Coût de revient direct : ${formatMoney(activeDirectCost)}
- Marge brute calculée : ${formatMoney(margeBruteEuro)} (Taux de marge : ${tauxMargeBrute.toFixed(1)}%)
- Impact estimé sur mon Résultat Net : +${formatMoney(contributionNette)} (Nouveau résultat : ${formatMoney(resultatNetProjete)})

Analyse ce devis : Est-il suffisamment rentable pour mon entreprise ? Quelles marges de négociation me conseilles-tu d'accorder au client sans dégrader ma rentabilité ?`;
    onAskAiAdvisor(prompt);
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Calculator className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Calculateur de Marges & Simulateur Résultat Net</span>
              <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-mono">
                Devis & Factures
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulez instantanément la rentabilité de vos offres commerciales et mesurez leur impact sur le résultat net global.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-500 font-medium mr-1">Modèles :</span>
          <button
            type="button"
            onClick={() => applyPreset("SERVICES")}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] px-2.5 py-1 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            Prestation Conseil
          </button>
          <button
            type="button"
            onClick={() => applyPreset("DEVELOPMENT")}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] px-2.5 py-1 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            Projet IT / Agence
          </button>
          <button
            type="button"
            onClick={() => applyPreset("PRODUCTS")}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] px-2.5 py-1 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            Vente Marchandises
          </button>
        </div>
      </div>

      {/* Mode & Document Type Switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
        <div className="sm:col-span-6 flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setDocType("DEVIS")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
              docType === "DEVIS"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Devis Prévisionnel
          </button>
          <button
            type="button"
            onClick={() => setDocType("FACTURE")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
              docType === "FACTURE"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Facture à Émettre
          </button>
        </div>

        <div className="sm:col-span-6 flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setMode("SIMPLE")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
              mode === "SIMPLE"
                ? "bg-slate-800 text-sky-400 font-bold border border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Mode Rapide (Forfait)
          </button>
          <button
            type="button"
            onClick={() => setMode("DETAILED")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
              mode === "DETAILED"
                ? "bg-slate-800 text-sky-400 font-bold border border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Mode Détaillé
          </button>
          {onOpenCurrencyConverter && (
            <button
              type="button"
              onClick={onOpenCurrencyConverter}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 hover:text-white hover:bg-emerald-950/80 border border-emerald-800/60 transition cursor-pointer flex items-center gap-1"
              title="Évaluer en devises étrangères (USD, GBP, CHF, XOF...)"
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Multidevise</span>
            </button>
          )}
        </div>
      </div>

      {/* Inputs & Simulation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Form (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-sky-400" />
              <span>Paramètres de la Transaction Commerciale</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor={quoteTitleId} className="text-[11px] text-slate-400 font-medium block mb-1">
                  Intitulé du devis / prestation
                </label>
                <input
                  id={quoteTitleId}
                  type="text"
                  value={quoteTitle}
                  onChange={(e) => setQuoteTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">
                  Nom du prospect / client
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Mode Simple Inputs */}
            {mode === "SIMPLE" ? (
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={quoteSellingPriceId} className="text-[11px] text-slate-300 font-bold block mb-1 flex items-center justify-between">
                      <span>Prix de Vente Proposé (HT)</span>
                      <span className="text-sky-400 font-mono">{company.currency}</span>
                    </label>
                    <div className="relative">
                      <input
                        id={quoteSellingPriceId}
                        type="number"
                        min="0"
                        step="50"
                        value={sellingPriceHT}
                        onChange={(e) => setSellingPriceHT(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-slate-900 border border-sky-500/40 rounded-lg px-3 py-2 text-sm font-mono font-bold text-sky-400 focus:outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-300 font-bold block mb-1 flex items-center justify-between">
                      <span>Coût Direct de Revient (HT)</span>
                      <span className="text-rose-400 font-mono">{company.currency}</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={directCostHT}
                        onChange={(e) => setDirectCostHT(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-slate-900 border border-rose-500/30 rounded-lg px-3 py-2 text-sm font-mono font-bold text-rose-300 focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <label htmlFor={quoteVatRateId} className="text-[10px] text-slate-400 block mb-1">Taux TVA</label>
                    <select
                      id={quoteVatRateId}
                      value={vatRate}
                      onChange={(e) => setVatRate(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value={20}>20% (Normal)</option>
                      <option value={10}>10% (Intermédiaire)</option>
                      <option value={5.5}>5.5% (Réduit)</option>
                      <option value={18}>18% (SYSCOHADA)</option>
                      <option value={0}>0% (Exonéré/Export)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor={quoteTaxRateId} className="text-[10px] text-slate-400 block mb-1">Barème IS</label>
                    <select
                      id={quoteTaxRateId}
                      value={isTaxRate}
                      onChange={(e) => setIsTaxRate(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value={25}>25% (Taux normal)</option>
                      <option value={15}>15% (Taux réduit PME)</option>
                      <option value={30}>30% (Zone UEMOA)</option>
                      <option value={0}>0% (Franchise)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor={quoteTargetMarginId} className="text-[10px] text-slate-400 block mb-1">Marge Cible (%)</label>
                    <input
                      id={quoteTargetMarginId}
                      type="number"
                      min="5"
                      max="95"
                      value={targetMarginPct}
                      onChange={(e) => setTargetMarginPct(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Mode Détaillé Inputs */
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">
                    Décomposition des Postes de Coûts Directs
                  </span>
                  <button
                    type="button"
                    onClick={handleAddCostLine}
                    className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter un coût</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {costLines.map((line) => (
                    <div
                      key={line.id}
                      className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-xs"
                    >
                      <input
                        type="text"
                        value={line.label}
                        onChange={(e) => handleUpdateCostLine(line.id, "label", e.target.value)}
                        className="flex-1 bg-transparent text-slate-200 border-none focus:outline-none text-xs"
                        placeholder="Libellé du coût..."
                      />

                      <select
                        value={line.category}
                        onChange={(e) => handleUpdateCostLine(line.id, "category", e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-400"
                      >
                        <option value="ACHATS">Achats</option>
                        <option value="MAIN_DOEUVRE">Main d'œuvre</option>
                        <option value="SOUS_TRAITANCE">Sous-traitance</option>
                        <option value="FRAIS_ANNEXES">Frais annexes</option>
                      </select>

                      <div className="w-24">
                        <input
                          type="number"
                          min="0"
                          value={line.amountHT}
                          onChange={(e) =>
                            handleUpdateCostLine(line.id, "amountHT", Math.max(0, Number(e.target.value)))
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right font-mono text-xs text-rose-300 focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCostLine(line.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition cursor-pointer"
                        title="Supprimer la ligne"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Coûts de Revient :</span>
                  <span className="font-mono font-bold text-rose-400">
                    {formatMoney(activeDirectCost)}
                  </span>
                </div>

                <div className="pt-1">
                  <label className="text-[11px] text-slate-300 font-bold block mb-1">
                    Prix de Vente Total Facturé au Client (HT)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={detailedSellingPriceHT}
                    onChange={(e) => setDetailedSellingPriceHT(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-900 border border-sky-500/40 rounded-lg px-3 py-2 text-sm font-mono font-bold text-sky-400 focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSummary ? "Copié dans le presse-papier !" : "Copier la Fiche de Rentabilité"}</span>
            </button>

            {onAskAiAdvisor && (
              <button
                type="button"
                onClick={handleAskAdvisor}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/20 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Conseil DAF IA sur ce Devis</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Results, Margins & Net Impact Dashboard (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Main Profitability KPI Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Analyse de la Marge Réalisée
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  tauxMargeBrute >= 40
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : tauxMargeBrute >= 20
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                }`}
              >
                {tauxMargeBrute >= 40
                  ? "Excellente Rentabilité"
                  : tauxMargeBrute >= 20
                  ? "Marge Standard"
                  : "Marge Faible / Risque"}
              </span>
            </div>

            {/* Big Numbers Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Marge Brute HT
                </span>
                <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">
                  {formatMoney(margeBruteEuro)}
                </div>
                <span className="text-[10px] text-emerald-500/90 font-medium">
                  {tauxMargeBrute.toFixed(1)}% du prix HT
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Contribution Nette (Après IS)
                </span>
                <div className="text-xl font-black font-mono text-sky-400 mt-0.5">
                  {formatMoney(contributionNette)}
                </div>
                <span className="text-[10px] text-slate-500">
                  IS déduit (~{isTaxRate}%) : {formatMoney(impotsSocietesSurMarge)}
                </span>
              </div>
            </div>

            {/* Margin Gauges & Multipliers */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Taux de Marge Brute :</span>
                <span className="font-mono font-bold text-white">{tauxMargeBrute.toFixed(1)} %</span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    tauxMargeBrute >= 40
                      ? "bg-emerald-500"
                      : tauxMargeBrute >= 20
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, tauxMargeBrute))}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-400">
                <div>
                  Taux de Marque : <strong className="text-slate-200 font-mono">{tauxMarque.toFixed(1)}%</strong>
                </div>
                <div>
                  Coeff. Multiplicateur : <strong className="text-slate-200 font-mono">{coeffMultiplicateur.toFixed(2)}x</strong>
                </div>
              </div>
            </div>
          </div>

          {/* SIMULATION IMPACT SUR LE RESULTAT NET GLOBAL */}
          <div className="bg-gradient-to-br from-slate-950 to-indigo-950/40 border border-indigo-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                  2. Impact sur le Résultat Net Global
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
                +{progressionResultatNetPct.toFixed(1)}% de profit
              </span>
            </div>

            {/* Comparison Box */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Résultat Net Actuel</span>
                <span className="font-mono font-bold text-slate-200 text-sm">
                  {formatMoney(resultatNetActuel)}
                </span>
                <span className="text-[10px] text-slate-500 block">Exercice en cours</span>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                <span className="text-[10px] text-emerald-300 block font-semibold">
                  Résultat Net Projeté
                </span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {formatMoney(resultatNetProjete)}
                </span>
                <span className="text-[10px] text-emerald-400 block font-bold">
                  +{formatMoney(contributionNette)}
                </span>
              </div>
            </div>

            {/* Revenue comparison */}
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">Chiffre d'Affaires Global :</span>
                <div className="font-mono text-slate-300 text-xs">
                  {formatMoney(chiffreAffairesActuel)} ➔ <strong className="text-white font-bold">{formatMoney(chiffreAffairesProjete)}</strong>
                </div>
              </div>
              <span className="text-xs font-bold font-mono text-sky-400 bg-sky-950/60 px-2 py-1 rounded border border-sky-800">
                +{progressionCAPct.toFixed(1)}% CA
              </span>
            </div>

            {/* Strategic Pricing Advice */}
            <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-xs">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-slate-300 leading-relaxed text-[11px]">
                <strong className="text-amber-300">Prix Plancher DAF : </strong>
                Pour garantir votre marge cible de {targetMarginPct}%, le prix de vente HT ne doit pas descendre sous{" "}
                <span className="font-mono font-bold text-white">{formatMoney(prixPlancherCible)}</span>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
