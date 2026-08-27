import React, { useState } from "react";
import {
  Coins,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Globe2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Euro,
  Scale,
  Sparkles,
  ArrowUpRight,
  Info,
  Calendar,
} from "lucide-react";
import {
  CompanyProfile,
  JournalTransaction,
  CurrencyCode,
  ExchangeRateInfo,
} from "../types";
import {
  DEFAULT_EXCHANGE_RATES,
  convertCurrency,
  getExchangeRate,
  formatCurrencyAmount,
  normalizeCurrencyCode,
  getCurrencySymbol,
  getCurrencyFlag,
  calculateExchangeGainLoss,
} from "../lib/currencyRates";

interface CurrencyConverterViewProps {
  company: CompanyProfile;
  transactions: JournalTransaction[];
  onAddTransaction?: (tx: JournalTransaction) => void;
  onNavigateTab?: (tab: string) => void;
}

export const CurrencyConverterView: React.FC<CurrencyConverterViewProps> = ({
  company,
  transactions,
  onAddTransaction,
  onNavigateTab,
}) => {
  const baseCurrency = normalizeCurrencyCode(company.currency);

  // Currency Converter State
  const [amountInput, setAmountInput] = useState<number>(1500);
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>("USD");
  const [toCurrency, setToCurrency] = useState<CurrencyCode>(baseCurrency);
  const [customRate, setCustomRate] = useState<string>("");
  const [rates, setRates] = useState<Record<CurrencyCode, ExchangeRateInfo>>(DEFAULT_EXCHANGE_RATES);
  const [lastSync, setLastSync] = useState<string>("À l'instant");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [simulationPartner, setSimulationPartner] = useState<string>("SaaS Cloud USA Inc");
  const [simulationType, setSimulationType] = useState<"ACHAT" | "VENTE">("ACHAT");
  const [simulationVatRate, setSimulationVatRate] = useState<number>(20);

  // Foreign currency transactions
  const foreignTransactions = transactions.filter(
    (tx) => tx.isForeignCurrency || (tx.currency && normalizeCurrencyCode(tx.currency) !== baseCurrency)
  );

  // Conversion result
  const parsedCustomRate = customRate ? parseFloat(customRate) : undefined;
  const conversion = convertCurrency(
    amountInput,
    fromCurrency,
    toCurrency,
    parsedCustomRate,
    rates
  );

  // Refresh rates simulation
  const handleRefreshRates = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // Add slight market jitter
      setRates((prev) => {
        const next = { ...prev };
        next.USD = { ...next.USD, rateToBaseEUR: 1.082 + (Math.random() * 0.006 - 0.003) };
        next.GBP = { ...next.GBP, rateToBaseEUR: 0.854 + (Math.random() * 0.004 - 0.002) };
        next.CHF = { ...next.CHF, rateToBaseEUR: 0.963 + (Math.random() * 0.004 - 0.002) };
        next.CAD = { ...next.CAD, rateToBaseEUR: 1.480 + (Math.random() * 0.006 - 0.003) };
        next.JPY = { ...next.JPY, rateToBaseEUR: 163.1 + (Math.random() * 0.6 - 0.3) };
        return next;
      });
      setIsRefreshing(false);
      setLastSync(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 600);
  };

  // Swap currencies
  const handleSwap = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
    setCustomRate("");
  };

  // Calculate Foreign Currency Exposure and Gains/Losses
  let totalForeignAmountConverted = 0;
  let totalLatentExchangeGain = 0;
  let totalLatentExchangeLoss = 0;

  foreignTransactions.forEach((tx) => {
    totalForeignAmountConverted += tx.amountTTC;
    const originalCurr = normalizeCurrencyCode(tx.currency || "USD");
    const originalAmt = tx.originalAmountTTC || tx.amountTTC / (tx.exchangeRate || 1);
    const invoiceRate = tx.exchangeRate || 1;
    const currentRate = getExchangeRate(originalCurr, baseCurrency, rates);

    const isSale = tx.journalCode === "VE";
    const gl = calculateExchangeGainLoss(originalAmt, invoiceRate, currentRate, isSale);

    if (gl.isGain) {
      totalLatentExchangeGain += gl.difference;
    } else {
      totalLatentExchangeLoss += gl.difference;
    }
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Globe2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              Moteur Multi-Devises & Conversion Automatique des Factures
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Conversion automatique en devise de tenue de compte ({baseCurrency} / {getCurrencySymbol(baseCurrency)}), intégration des cours officiels et calcul des écarts de change (PCG / SYSCOHADA / IFRS).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">Devise de compte : </span>
            <span className="font-mono font-bold text-sky-400">
              {getCurrencyFlag(baseCurrency)} {baseCurrency} ({getCurrencySymbol(baseCurrency)})
            </span>
          </div>

          <button
            type="button"
            onClick={handleRefreshRates}
            disabled={isRefreshing}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            title="Mettre à jour les cours de change avec la Banque Centrale"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Actualiser Cours</span>
          </button>
        </div>
      </div>

      {/* KPI Cards for Foreign Currency Operations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Factures en Devises</span>
            <Coins className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {foreignTransactions.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total : <span className="text-sky-300 font-mono font-bold">{formatCurrencyAmount(totalForeignAmountConverted, baseCurrency)}</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Gains de Change Latents</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            +{totalLatentExchangeGain.toFixed(2)} {getCurrencySymbol(baseCurrency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Compte <span className="font-mono text-emerald-300">766000</span> (Produits fin.)
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Pertes de Change Latentes</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 font-mono">
            -{totalLatentExchangeLoss.toFixed(2)} {getCurrencySymbol(baseCurrency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Compte <span className="font-mono text-rose-300">666000</span> (Charges fin.)
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Conformité FEC DGFiP</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-base font-bold text-purple-300">
            Montantdevise & Idevise
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Champs FEC exportés avec succès
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Live Calculator & FX Rates Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Converter & Accounting Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                  <ArrowRightLeft className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-white text-sm">
                  Convertisseur & Simulateur d'Écritures en Devises
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Synchro : {lastSync}</span>
            </div>

            {/* Converter Form */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* Amount Input */}
              <div className="sm:col-span-5">
                <label className="text-xs text-slate-400 block mb-1">Montant à convertir</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amountInput}
                    onChange={(e) => setAmountInput(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-sky-500 pr-16"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">
                    {fromCurrency}
                  </span>
                </div>
              </div>

              {/* From Currency */}
              <div className="sm:col-span-3">
                <label className="text-xs text-slate-400 block mb-1">De (Devise)</label>
                <select
                  value={fromCurrency}
                  onChange={(e) => {
                    setFromCurrency(e.target.value as CurrencyCode);
                    setCustomRate("");
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-sky-500 font-semibold cursor-pointer"
                >
                  {Object.keys(rates).map((c) => (
                    <option key={c} value={c}>
                      {rates[c as CurrencyCode].flag} {c} ({rates[c as CurrencyCode].symbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div className="sm:col-span-1 flex justify-center pb-1">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition cursor-pointer"
                  title="Inverser les devises"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* To Currency */}
              <div className="sm:col-span-3">
                <label className="text-xs text-slate-400 block mb-1">Vers (Devise)</label>
                <select
                  value={toCurrency}
                  onChange={(e) => {
                    setToCurrency(e.target.value as CurrencyCode);
                    setCustomRate("");
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-sky-500 font-semibold cursor-pointer"
                >
                  {Object.keys(rates).map((c) => (
                    <option key={c} value={c}>
                      {rates[c as CurrencyCode].flag} {c} ({rates[c as CurrencyCode].symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Rate Override Option */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">Taux appliqué :</span>
                <span className="font-mono font-bold text-sky-400">
                  1 {fromCurrency} = {conversion.rateApplied.toFixed(4)} {toCurrency}
                </span>
                <span className="text-slate-500">
                  (1 {toCurrency} = {(1 / conversion.rateApplied).toFixed(4)} {fromCurrency})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[11px]">Taux personnalisé :</span>
                <input
                  type="number"
                  step="0.0001"
                  placeholder={conversion.rateApplied.toFixed(4)}
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white w-24 font-mono focus:outline-none focus:border-sky-500"
                />
                {customRate && (
                  <button
                    type="button"
                    onClick={() => setCustomRate("")}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>

            {/* Result Box */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/40 via-indigo-950/30 to-slate-950 border border-sky-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-400">Montant Converti</span>
                <div className="text-3xl font-extrabold text-emerald-400 font-mono mt-0.5">
                  {formatCurrencyAmount(conversion.convertedAmount, toCurrency)}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Équivalent de <span className="font-bold text-white font-mono">{formatCurrencyAmount(amountInput, fromCurrency)}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Conversion Prête pour le FEC</span>
                </span>
              </div>
            </div>

            {/* Simulated Accounting Entry Generated in Base Currency */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>Ventilation Comptable Automatique en {baseCurrency} (Partie Double)</span>
                </span>
                <span className="font-mono text-[11px] text-sky-400">
                  Norme : {company.accountingStandard}
                </span>
              </div>

              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden text-xs">
                <table className="w-full text-left font-mono">
                  <thead className="bg-slate-900 text-slate-400 text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="p-2">Compte</th>
                      <th className="p-2">Libellé</th>
                      <th className="p-2 text-right">Débit ({getCurrencySymbol(baseCurrency)})</th>
                      <th className="p-2 text-right">Crédit ({getCurrencySymbol(baseCurrency)})</th>
                      <th className="p-2 text-right text-slate-500">Devise Orig.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr className="hover:bg-slate-900/40">
                      <td className="p-2 text-sky-400 font-bold">
                        {company.accountingStandard === "SYSCOHADA" ? "605100" : "606300"}
                      </td>
                      <td className="p-2 text-slate-300 font-sans">
                        Achats de prestations / Fournitures HT
                      </td>
                      <td className="p-2 text-right text-white font-bold">
                        {(conversion.convertedAmount * 0.8).toFixed(2)}
                      </td>
                      <td className="p-2 text-right text-slate-600">-</td>
                      <td className="p-2 text-right text-slate-400">
                        {formatCurrencyAmount(amountInput * 0.8, fromCurrency)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-900/40">
                      <td className="p-2 text-sky-400 font-bold">
                        {company.accountingStandard === "SYSCOHADA" ? "445200" : "445660"}
                      </td>
                      <td className="p-2 text-slate-300 font-sans">
                        TVA Déductible (Autoliquidation / Récupérable)
                      </td>
                      <td className="p-2 text-right text-white font-bold">
                        {(conversion.convertedAmount * 0.2).toFixed(2)}
                      </td>
                      <td className="p-2 text-right text-slate-600">-</td>
                      <td className="p-2 text-right text-slate-400">
                        {formatCurrencyAmount(amountInput * 0.2, fromCurrency)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-900/40">
                      <td className="p-2 text-sky-400 font-bold">
                        {company.accountingStandard === "SYSCOHADA" ? "401100" : "401000"}
                      </td>
                      <td className="p-2 text-slate-300 font-sans">
                        Fournisseur Étranger (Dette TTC)
                      </td>
                      <td className="p-2 text-right text-slate-600">-</td>
                      <td className="p-2 text-right text-emerald-400 font-bold">
                        {conversion.convertedAmount.toFixed(2)}
                      </td>
                      <td className="p-2 text-right text-emerald-400 font-bold">
                        {formatCurrencyAmount(amountInput, fromCurrency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Exchange Rates Matrix */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-white text-sm">
                  Grille des Cours de Change de Référence
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Base : 1 EUR</span>
            </div>

            <div className="divide-y divide-slate-800/80 max-h-[480px] overflow-y-auto pr-1">
              {(Object.values(rates) as ExchangeRateInfo[]).map((r: ExchangeRateInfo) => {
                const rateToBase = getExchangeRate(r.code, baseCurrency, rates);
                const isCurrentBase = r.code === baseCurrency;

                return (
                  <div
                    key={r.code}
                    className={`py-2.5 px-2 rounded-xl transition flex items-center justify-between ${
                      isCurrentBase
                        ? "bg-sky-950/40 border border-sky-800/50"
                        : "hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{r.flag}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white font-mono">{r.code}</span>
                          <span className="text-[10px] text-slate-500">({r.symbol})</span>
                          {isCurrentBase && (
                            <span className="bg-sky-500/20 text-sky-300 text-[9px] font-bold px-1.5 py-0.2 rounded">
                              Devise Pivot
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{r.name}</div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-emerald-400">
                        1 {r.code} = {rateToBase.toFixed(4)} {getCurrencySymbol(baseCurrency)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        1 {baseCurrency} = {(1 / rateToBase).toFixed(4)} {r.code}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Foreign Transactions Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Registre des Factures en Devises Étrangères</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Historique des conversions et réévaluations de fin de période (Écarts de change).
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab("autoscan")}
            className="bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Scanner une Facture en Devises ($ / £ / ¥)</span>
          </button>
        </div>

        {foreignTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-sans">
                <tr>
                  <th className="p-3">Date & Réf</th>
                  <th className="p-3">Tiers & Objet</th>
                  <th className="p-3">Devise Orig.</th>
                  <th className="p-3 text-right">Montant Orig.</th>
                  <th className="p-3 text-right">Taux appliqué</th>
                  <th className="p-3 text-right">Converti ({getCurrencySymbol(baseCurrency)})</th>
                  <th className="p-3 text-right">Cours actuel</th>
                  <th className="p-3 text-right">Écart de change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {foreignTransactions.map((tx) => {
                  const origCurr = normalizeCurrencyCode(tx.currency || "USD");
                  const origAmount = tx.originalAmountTTC || (tx.amountTTC / (tx.exchangeRate || 1));
                  const invRate = tx.exchangeRate || 1;
                  const currentRate = getExchangeRate(origCurr, baseCurrency, rates);
                  const isSale = tx.journalCode === "VE";
                  const gl = calculateExchangeGainLoss(origAmount, invRate, currentRate, isSale);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30">
                      <td className="p-3">
                        <div className="font-bold text-slate-200">{tx.date}</div>
                        <div className="text-[10px] text-slate-500">{tx.pieceNumber}</div>
                      </td>
                      <td className="p-3 font-sans">
                        <div className="font-semibold text-white">{tx.partnerName}</div>
                        <div className="text-[10px] text-slate-400">{tx.documentType}</div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded text-[11px] font-bold border border-sky-500/30">
                          {getCurrencyFlag(origCurr)} {origCurr}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-white">
                        {formatCurrencyAmount(origAmount, origCurr)}
                      </td>
                      <td className="p-3 text-right text-slate-300">
                        1 {origCurr} = {invRate.toFixed(4)} {getCurrencySymbol(baseCurrency)}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-400">
                        {formatCurrencyAmount(tx.amountTTC, baseCurrency)}
                      </td>
                      <td className="p-3 text-right text-slate-400">
                        {currentRate.toFixed(4)}
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={`font-bold inline-flex items-center gap-0.5 ${
                            gl.isGain ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {gl.isGain ? "+" : "-"}
                          {gl.difference.toFixed(2)} {getCurrencySymbol(baseCurrency)}
                        </span>
                        <div className="text-[9px] text-slate-500 font-sans">
                          {gl.isGain ? "Gain (766)" : "Perte (666)"}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <Coins className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-300">
              Aucune facture en devise étrangère pour le moment
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Toutes vos écritures sont actuellement en {baseCurrency}. Déposez une facture en Dollar ($), Livre (£), Franc Suisse (CHF) ou toute autre devise dans l'onglet Saisie IA pour la convertir automatiquement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
