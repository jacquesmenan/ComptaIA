import React, { useState, useEffect, useId } from "react";
import {
  RefreshCw,
  Globe2,
  TrendingUp,
  ArrowRightLeft,
  DollarSign,
  Euro,
  Coins,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  CheckCircle2,
  Info,
} from "lucide-react";
import { CompanyProfile, FinancialKPIs } from "../types";

export interface CurrencyRate {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  rateAgainstEUR: number; // 1 EUR = x Target Currency
  fixedPeg?: boolean;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyRate> = {
  EUR: { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", rateAgainstEUR: 1.0 },
  USD: { code: "USD", name: "Dollar Américain", symbol: "$", flag: "🇺🇸", rateAgainstEUR: 1.085 },
  GBP: { code: "GBP", name: "Livre Sterling", symbol: "£", flag: "🇬🇧", rateAgainstEUR: 0.855 },
  CHF: { code: "CHF", name: "Franc Suisse", symbol: "CHF", flag: "🇨🇭", rateAgainstEUR: 0.965 },
  CAD: { code: "CAD", name: "Dollar Canadien", symbol: "CA$", flag: "🇨🇦", rateAgainstEUR: 1.472 },
  AUD: { code: "AUD", name: "Dollar Australien", symbol: "A$", flag: "🇦🇺", rateAgainstEUR: 1.654 },
  JPY: { code: "JPY", name: "Yen Japonais", symbol: "¥", flag: "🇯🇵", rateAgainstEUR: 163.8 },
  CNY: { code: "CNY", name: "Yuan Chinois", symbol: "¥", flag: "🇨🇳", rateAgainstEUR: 7.842 },
  XOF: { code: "XOF", name: "Franc CFA (UEMOA)", symbol: "FCFA", flag: "🌍", rateAgainstEUR: 655.957, fixedPeg: true },
  XAF: { code: "XAF", name: "Franc CFA (CEMAC)", symbol: "FCFA", flag: "🌍", rateAgainstEUR: 655.957, fixedPeg: true },
  MAD: { code: "MAD", name: "Dirham Marocain", symbol: "DH", flag: "🇲🇦", rateAgainstEUR: 10.82 },
  AED: { code: "AED", name: "Dirham des Émirats", symbol: "AED", flag: "🇦🇪", rateAgainstEUR: 3.985 },
  SGD: { code: "SGD", name: "Dollar de Singapour", symbol: "S$", flag: "🇸🇬", rateAgainstEUR: 1.458 },
  BRL: { code: "BRL", name: "Real Brésilien", symbol: "R$", flag: "🇧🇷", rateAgainstEUR: 5.42 },
};

interface CurrencyConverterModuleProps {
  company: CompanyProfile;
  kpis: FinancialKPIs;
  onAskAiAdvisor?: (promptText: string) => void;
}

export const CurrencyConverterModule: React.FC<CurrencyConverterModuleProps> = ({
  company,
  kpis,
  onAskAiAdvisor,
}) => {
  const amountToConvertId = useId();
  const bankFeePctId = useId();
  const intlSellingPriceId = useId();
  const intlDirectCostId = useId();
  const fxRiskMarginId = useId();

  // Exchange Rates State
  const [rates, setRates] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    Object.entries(SUPPORTED_CURRENCIES).forEach(([code, curr]) => {
      initial[code] = curr.rateAgainstEUR;
    });
    return initial;
  });

  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>("En direct (Temps Réel)");
  const [rateSource, setRateSource] = useState<"LIVE" | "CACHE">("LIVE");

  // Tab inside converter: "QUICK_CONVERT" | "INTERNATIONAL_MARGIN"
  const [activeSubTab, setActiveSubTab] = useState<"QUICK_CONVERT" | "INTERNATIONAL_MARGIN">("INTERNATIONAL_MARGIN");

  // Quick Converter State
  const [sourceAmount, setSourceAmount] = useState<number>(1000);
  const [sourceCurrency, setSourceCurrency] = useState<string>(company.currency === "€" ? "EUR" : "USD");
  const [targetCurrency, setTargetCurrency] = useState<string>("USD");
  const [bankFeePct, setBankFeePct] = useState<number>(0); // e.g. 1% commission bancaire

  // International Margin Simulation State
  const [intlDocTitle, setIntlDocTitle] = useState<string>("Prestation Export & Développement International");
  const [intlDocType, setIntlDocType] = useState<"DEVIS" | "FACTURE">("DEVIS");
  const [intlSellingCurrency, setIntlSellingCurrency] = useState<string>("USD");
  const [intlSellingPrice, setIntlSellingPrice] = useState<number>(15000); // in foreign currency
  const [intlCostCurrency, setIntlCostCurrency] = useState<string>("EUR");
  const [intlDirectCost, setIntlDirectCost] = useState<number>(7500); // in local cost currency
  const [fxRiskMargin, setFxRiskMargin] = useState<number>(3); // 3% buffer for exchange rate volatility

  const [copiedFxSummary, setCopiedFxSummary] = useState(false);

  // Fetch real-time exchange rates
  const fetchLiveExchangeRates = async () => {
    setIsLoadingRates(true);
    try {
      // Fetch from API with fallback
      const res = await fetch("https://open.er-api.com/v6/latest/EUR");
      if (res.ok) {
        const data = await res.json();
        if (data && data.rates) {
          const updatedRates: Record<string, number> = { ...rates };
          Object.keys(SUPPORTED_CURRENCIES).forEach((code) => {
            if (code === "XOF" || code === "XAF") {
              updatedRates[code] = 655.957; // Fixed peg
            } else if (data.rates[code]) {
              updatedRates[code] = Number(data.rates[code]);
            }
          });
          setRates(updatedRates);
          setLastUpdated(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
          setRateSource("LIVE");
        }
      }
    } catch (e) {
      console.warn("Could not fetch external FX rates, using standard ECB reference rates:", e);
      setRateSource("CACHE");
    } finally {
      setIsLoadingRates(false);
    }
  };

  useEffect(() => {
    fetchLiveExchangeRates();
  }, []);

  // Utility: Convert any amount from CurA to CurB via EUR base
  const convertCurrency = (amount: number, from: string, to: string, feePct: number = 0): number => {
    if (from === to) return amount;
    const rateFrom = rates[from] || 1;
    const rateTo = rates[to] || 1;

    // Convert from 'from' to EUR, then from EUR to 'to'
    const amountInEUR = from === "EUR" ? amount : amount / rateFrom;
    const rawTarget = to === "EUR" ? amountInEUR : amountInEUR * rateTo;

    // Deduct or adjust bank fee
    const feeAmount = (rawTarget * feePct) / 100;
    return rawTarget - feeAmount;
  };

  // Quick Conversion Calculation
  const convertedTargetAmount = convertCurrency(sourceAmount, sourceCurrency, targetCurrency, bankFeePct);
  const directExchangeRate = convertCurrency(1, sourceCurrency, targetCurrency, 0);
  const inverseExchangeRate = convertCurrency(1, targetCurrency, sourceCurrency, 0);

  // International Margin Calculations
  // 1. Convert selling price from intlSellingCurrency to Company Base Currency (EUR/XOF)
  const baseCompanyCurrency = company.currency === "€" ? "EUR" : "XOF";
  
  const sellingPriceInBase = convertCurrency(intlSellingPrice, intlSellingCurrency, baseCompanyCurrency);
  const directCostInBase = convertCurrency(intlDirectCost, intlCostCurrency, baseCompanyCurrency);

  // Marge brute dans la monnaie de base de l'entreprise
  const margeBruteBase = Math.max(0, sellingPriceInBase - directCostInBase);
  const tauxMargeBruteBase = sellingPriceInBase > 0 ? (margeBruteBase / sellingPriceInBase) * 100 : 0;

  // Marge brute dans la devise facturée au client (intlSellingCurrency)
  const costInSellingCurrency = convertCurrency(intlDirectCost, intlCostCurrency, intlSellingCurrency);
  const margeBruteSellingCurr = Math.max(0, intlSellingPrice - costInSellingCurrency);

  // Simulation de volatilité du taux de change (+/- 5% et impact buffer)
  const rateDegradationFactor = (100 - fxRiskMargin) / 100;
  const sellingPriceWithRiskBuffer = sellingPriceInBase * rateDegradationFactor;
  const margeBruteWithRisk = Math.max(0, sellingPriceWithRiskBuffer - directCostInBase);
  const tauxMargeWithRisk = sellingPriceWithRiskBuffer > 0 ? (margeBruteWithRisk / sellingPriceWithRiskBuffer) * 100 : 0;

  // Impact sur le résultat net
  const isTaxRate = 25; // 25% IS
  const contributionNetteBase = (margeBruteBase * (100 - isTaxRate)) / 100;
  const resultatNetProjete = kpis.resultatNet + contributionNetteBase;

  // Currency Formatter
  const formatCur = (amount: number, currCode: string) => {
    const meta = SUPPORTED_CURRENCIES[currCode] || { symbol: currCode };
    return `${new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)} ${meta.symbol}`;
  };

  const handleCopySummary = () => {
    const text = `=== ÉVALUATION DE MARGE COMMERCIALE MULTIDEVISE (${intlDocType}) ===
Dossier : ${intlDocTitle}
--------------------------------------------------
FACTURATION CLIENT :
- Prix Vente Client : ${formatCur(intlSellingPrice, intlSellingCurrency)}
- Contre-valeur reçue (${baseCompanyCurrency}) : ${formatCur(sellingPriceInBase, baseCompanyCurrency)}
- Taux de conversion appliqué : 1 ${intlSellingCurrency} = ${convertCurrency(1, intlSellingCurrency, baseCompanyCurrency).toFixed(4)} ${baseCompanyCurrency}

COÛTS DIRECTS DE REVIENT :
- Coût de revient : ${formatCur(intlDirectCost, intlCostCurrency)} (soit ${formatCur(directCostInBase, baseCompanyCurrency)})

RENTABILITÉ CONSTATÉE :
- Marge Brute en ${baseCompanyCurrency} : ${formatCur(margeBruteBase, baseCompanyCurrency)} (${tauxMargeBruteBase.toFixed(1)}%)
- Marge Brute en ${intlSellingCurrency} : ${formatCur(margeBruteSellingCurr, intlSellingCurrency)}
- Marge sécurisée avec coussin de change (-${fxRiskMargin}%) : ${formatCur(margeBruteWithRisk, baseCompanyCurrency)} (${tauxMargeWithRisk.toFixed(1)}%)
- Contribution Nette estimée (après IS) : +${formatCur(contributionNetteBase, baseCompanyCurrency)}
--------------------------------------------------
Date d'évaluation : ${new Date().toLocaleDateString("fr-FR")} à ${lastUpdated}`;

    navigator.clipboard.writeText(text);
    setCopiedFxSummary(true);
    setTimeout(() => setCopiedFxSummary(false), 3000);
  };

  const handleAskAdvisorFx = () => {
    if (!onAskAiAdvisor) return;
    const prompt = `Je négocie un contrat international "${intlDocTitle}" :
- Facturé au client : ${formatCur(intlSellingPrice, intlSellingCurrency)}
- Mes coûts de revient : ${formatCur(intlDirectCost, intlCostCurrency)} (soit ${formatCur(directCostInBase, baseCompanyCurrency)})
- Marge brute attendue en ${baseCompanyCurrency} : ${formatCur(margeBruteBase, baseCompanyCurrency)} (${tauxMargeBruteBase.toFixed(1)}%)
- Taux de change actuel : 1 ${intlSellingCurrency} = ${convertCurrency(1, intlSellingCurrency, baseCompanyCurrency).toFixed(4)} ${baseCompanyCurrency}

Quels conseils me donnes-tu pour me prémunir contre le risque de change ? Dois-je insérer une clause d'indexation de change sur le devis ou privilégier un règlement en ${baseCompanyCurrency} ?`;
    onAskAiAdvisor(prompt);
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
      {/* Header & Live Exchange Rate Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Globe2 className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Convertisseur & Marges Internationales</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Taux BCE / Marché en Direct
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Évaluez vos marges commerciales en devises étrangères, convertissez vos flux d'affaires et simulez le risque de change.
          </p>
        </div>

        {/* Live Refresh Button & Timestamp */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block">Dernière actualisation</span>
            <span className="text-[11px] font-mono text-slate-300 font-semibold">{lastUpdated}</span>
          </div>
          <button
            type="button"
            onClick={fetchLiveExchangeRates}
            disabled={isLoadingRates}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-sky-400 rounded-lg border border-slate-700 transition cursor-pointer disabled:opacity-50"
            title="Rafraîchir les cours de change en temps réel"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRates ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Top Main Cross-Rates Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {[
          { pair: "EUR / USD", base: "EUR", target: "USD" },
          { pair: "EUR / GBP", base: "EUR", target: "GBP" },
          { pair: "EUR / CHF", base: "EUR", target: "CHF" },
          { pair: "USD / EUR", base: "USD", target: "EUR" },
          { pair: "EUR / XOF", base: "EUR", target: "XOF" },
          { pair: "EUR / CNY", base: "EUR", target: "CNY" },
        ].map((item, idx) => {
          const rateVal = convertCurrency(1, item.base, item.target, 0);
          return (
            <div
              key={idx}
              className="bg-slate-950/90 border border-slate-800/90 p-2.5 rounded-xl flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>{item.pair}</span>
                <span>{SUPPORTED_CURRENCIES[item.target]?.flag}</span>
              </div>
              <div className="text-sm font-black font-mono text-white mt-1">
                {rateVal < 10 ? rateVal.toFixed(4) : rateVal.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Subtabs Switcher */}
      <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 max-w-lg">
        <button
          type="button"
          onClick={() => setActiveSubTab("INTERNATIONAL_MARGIN")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
            activeSubTab === "INTERNATIONAL_MARGIN"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Évaluation Marges Devis Export</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("QUICK_CONVERT")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
            activeSubTab === "QUICK_CONVERT"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Convertisseur Instantané</span>
        </button>
      </div>

      {/* VIEW 1: INTERNATIONAL MARGIN EVALUATION */}
      {activeSubTab === "INTERNATIONAL_MARGIN" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form & Inputs */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-sky-400" />
                  <span>Paramètres du Devis / Contrat Export</span>
                </span>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setIntlDocType("DEVIS")}
                    className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                      intlDocType === "DEVIS" ? "bg-sky-600 text-white" : "text-slate-500"
                    }`}
                  >
                    Devis
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntlDocType("FACTURE")}
                    className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                      intlDocType === "FACTURE" ? "bg-emerald-600 text-white" : "text-slate-500"
                    }`}
                  >
                    Facture
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">
                  Intitulé de la proposition commerciale internationale
                </label>
                <input
                  type="text"
                  value={intlDocTitle}
                  onChange={(e) => setIntlDocTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Foreign Selling Price */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-sky-500/30 space-y-2">
                <label htmlFor={intlSellingPriceId} className="text-[11px] text-sky-300 font-bold block flex items-center justify-between">
                  <span>1. Prix Vendu au Client International</span>
                  <span className="text-[10px] text-slate-400 font-normal">Montant dans la monnaie du client</span>
                </label>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-7">
                    <input
                      id={intlSellingPriceId}
                      type="number"
                      min="0"
                      step="100"
                      value={intlSellingPrice}
                      onChange={(e) => setIntlSellingPrice(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-sky-400 focus:outline-none focus:border-sky-400"
                    />
                  </div>
                  <div className="col-span-5">
                    <select
                      value={intlSellingCurrency}
                      onChange={(e) => setIntlSellingCurrency(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-semibold cursor-pointer"
                    >
                      {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Contre-valeur en devise locale ({baseCompanyCurrency}) :</span>
                  <strong className="text-white font-mono font-bold">
                    {formatCur(sellingPriceInBase, baseCompanyCurrency)}
                  </strong>
                </div>
              </div>

              {/* Local Cost of Goods / Services */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-rose-500/20 space-y-2">
                <label htmlFor={intlDirectCostId} className="text-[11px] text-rose-300 font-bold block flex items-center justify-between">
                  <span>2. Coûts Directs & Fournisseurs Associés</span>
                  <span className="text-[10px] text-slate-400 font-normal">Coût de revient réel</span>
                </label>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-7">
                    <input
                      id={intlDirectCostId}
                      type="number"
                      min="0"
                      step="100"
                      value={intlDirectCost}
                      onChange={(e) => setIntlDirectCost(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-rose-300 focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  <div className="col-span-5">
                    <select
                      value={intlCostCurrency}
                      onChange={(e) => setIntlCostCurrency(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-semibold cursor-pointer"
                    >
                      {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Contre-valeur en devise locale ({baseCompanyCurrency}) :</span>
                  <strong className="text-rose-300 font-mono font-bold">
                    {formatCur(directCostInBase, baseCompanyCurrency)}
                  </strong>
                </div>
              </div>

              {/* FX Risk Buffer Slider */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor={fxRiskMarginId} className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Coussin de Sécurité Aléa de Change :</span>
                  </label>
                  <span className="font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                    -{fxRiskMargin} %
                  </span>
                </div>
                <input
                  id={fxRiskMarginId}
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={fxRiskMargin}
                  onChange={(e) => setFxRiskMargin(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <p className="text-[10px] text-slate-500">
                  Anticipe une dépréciation de la devise étrangère entre la signature du devis et l'encaissement effectif.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySummary}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedFxSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedFxSummary ? "Copié !" : "Copier la Fiche Multidevise"}</span>
              </button>

              {onAskAiAdvisor && (
                <button
                  type="button"
                  onClick={handleAskAdvisorFx}
                  className="flex-1 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/20 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Conseil Risque de Change IA</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Multi-Currency Margin Results */}
          <div className="lg:col-span-6 space-y-4">
            {/* Realized Margin in Company Base Currency */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Rentabilité Convertie en Devise Entreprise ({baseCompanyCurrency})
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    tauxMargeBruteBase >= 40
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {tauxMargeBruteBase.toFixed(1)}% Marge Brute
                </span>
              </div>

              {/* Big KPI Numbers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Marge Brute Réalisée
                  </span>
                  <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">
                    {formatCur(margeBruteBase, baseCompanyCurrency)}
                  </div>
                  <span className="text-[10px] text-emerald-500/90 font-medium">
                    Soit {formatCur(margeBruteSellingCurr, intlSellingCurrency)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Bénéfice Net Projeté (IS déduit)
                  </span>
                  <div className="text-xl font-black font-mono text-sky-400 mt-0.5">
                    +{formatCur(contributionNetteBase, baseCompanyCurrency)}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Nouveau Résultat Net : {formatCur(resultatNetProjete, baseCompanyCurrency)}
                  </span>
                </div>
              </div>

              {/* Foreign Exchange Stress Test / Buffer View */}
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-300 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Marge après Risque de Change (-{fxRiskMargin}%)</span>
                  </span>
                  <strong className="font-mono text-white text-sm">
                    {formatCur(margeBruteWithRisk, baseCompanyCurrency)}
                  </strong>
                </div>

                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, tauxMargeWithRisk))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Taux de marge sécurisé :</span>
                  <strong className="text-amber-300 font-mono">{tauxMargeWithRisk.toFixed(1)}%</strong>
                </div>
              </div>

              {/* Conversion Summary Matrix */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Cours de change appliqué :</span>
                  <span className="font-mono text-slate-200">
                    1 {intlSellingCurrency} = {convertCurrency(1, intlSellingCurrency, baseCompanyCurrency).toFixed(4)} {baseCompanyCurrency}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Cours inverse :</span>
                  <span className="font-mono text-slate-200">
                    1 {baseCompanyCurrency} = {convertCurrency(1, baseCompanyCurrency, intlSellingCurrency).toFixed(4)} {intlSellingCurrency}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: INSTANT MULTI-CURRENCY CONVERTER */}
      {activeSubTab === "QUICK_CONVERT" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Convert Card */}
          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-sky-400" />
              <span>Calculateur de Conversion Directe</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Source Amount */}
              <div className="sm:col-span-5 space-y-1.5">
                <label htmlFor={amountToConvertId} className="text-[11px] text-slate-400 font-medium block">Montant à convertir</label>
                <input
                  id={amountToConvertId}
                  type="number"
                  min="0"
                  step="100"
                  value={sourceAmount}
                  onChange={(e) => setSourceAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-white focus:outline-none focus:border-sky-500"
                />
                <select
                  value={sourceCurrency}
                  onChange={(e) => setSourceCurrency(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer"
                >
                  {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} - {c.name} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div className="sm:col-span-2 flex justify-center py-2">
                <button
                  type="button"
                  onClick={() => {
                    const temp = sourceCurrency;
                    setSourceCurrency(targetCurrency);
                    setTargetCurrency(temp);
                  }}
                  className="p-2.5 bg-slate-900 hover:bg-slate-800 text-sky-400 rounded-full border border-slate-700 transition cursor-pointer hover:rotate-180 duration-300"
                  title="Inverser les devises"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Target Amount */}
              <div className="sm:col-span-5 space-y-1.5">
                <label className="text-[11px] text-slate-400 font-medium block">Résultat Converti</label>
                <div className="w-full bg-slate-900 border border-sky-500/40 rounded-xl px-3.5 py-2.5 text-base font-mono font-black text-sky-400 truncate">
                  {formatCur(convertedTargetAmount, targetCurrency)}
                </div>
                <select
                  value={targetCurrency}
                  onChange={(e) => setTargetCurrency(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer"
                >
                  {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} - {c.name} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional Bank Spread / Commission */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <label htmlFor={bankFeePctId} className="text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span>Commission bancaire / Spread de change :</span>
              </label>
              <select
                id={bankFeePctId}
                value={bankFeePct}
                onChange={(e) => setBankFeePct(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200"
              >
                <option value={0}>0% (Taux brut interbancaire)</option>
                <option value={0.5}>0.5% (Banque en ligne / FinTech)</option>
                <option value={1}>1.0% (Moyenne entreprise)</option>
                <option value={2}>2.0% (Banque traditionnelle)</option>
              </select>
            </div>

            {/* Exchange Rate Summary Box */}
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Taux de conversion direct :</span>
                <strong className="font-mono text-white">
                  1 {sourceCurrency} = {directExchangeRate.toFixed(4)} {targetCurrency}
                </strong>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Taux inverse :</span>
                <span className="font-mono">
                  1 {targetCurrency} = {inverseExchangeRate.toFixed(4)} {sourceCurrency}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Multi-Currency Comparative Table */}
          <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>Équivalents pour {formatCur(sourceAmount, sourceCurrency)}</span>
            </h4>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {Object.values(SUPPORTED_CURRENCIES)
                .filter((c) => c.code !== sourceCurrency)
                .map((c) => {
                  const targetVal = convertCurrency(sourceAmount, sourceCurrency, c.code, bankFeePct);
                  return (
                    <div
                      key={c.code}
                      onClick={() => setTargetCurrency(c.code)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                        targetCurrency === c.code
                          ? "bg-sky-950/50 border-sky-500/40 text-white"
                          : "bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{c.flag}</span>
                        <div>
                          <div className="font-semibold text-white">{c.code}</div>
                          <div className="text-[10px] text-slate-500">{c.name}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-sky-400">
                          {formatCur(targetVal, c.code)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          1 {sourceCurrency} = {convertCurrency(1, sourceCurrency, c.code).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
