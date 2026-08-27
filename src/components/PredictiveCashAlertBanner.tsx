import React, { useState } from "react";
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldAlert,
  Zap,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  HelpCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { CompanyProfile, PredictiveCashAlert, RecurringTransaction } from "../types";

interface PredictiveCashAlertBannerProps {
  cashAlert: PredictiveCashAlert;
  company: CompanyProfile;
  onNavigateTab?: (tab: string) => void;
  setActiveTab?: (tab: string) => void;
  onSimulateScenario?: (scenarioName: string, deltaCash: number) => void;
}

export const PredictiveCashAlertBanner: React.FC<PredictiveCashAlertBannerProps> = ({
  cashAlert,
  company,
  onNavigateTab,
  setActiveTab,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeSimulation, setActiveSimulation] = useState<string | null>(null);
  const [simulatedInflowBoost, setSimulatedInflowBoost] = useState<number>(0);
  const [simulatedOutflowDelay, setSimulatedOutflowDelay] = useState<number>(0);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const handleNavigate = (tab: string) => {
    if (typeof onNavigateTab === "function") {
      onNavigateTab(tab);
    }
    if (typeof setActiveTab === "function") {
      setActiveTab(tab);
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: company.currency === "€" ? "EUR" : "XOF",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isDismissed) return null;

  // Calculate adjusted forecast based on interactive simulation
  const adjustedForecast = cashAlert.dailyForecast.map((point) => {
    let extra = 0;
    if (activeSimulation === "CLIENT_ACCEL" && point.dayOffset >= 5) {
      extra += 12000;
    }
    if (activeSimulation === "SUPPLIER_DELAY" && point.dayOffset >= 10 && point.dayOffset <= 25) {
      extra += 4500;
    }
    if (activeSimulation === "BOTH" && point.dayOffset >= 5) {
      extra += 16500;
    }
    const adjusted = point.projectedBalance + extra + simulatedInflowBoost + simulatedOutflowDelay;
    return {
      ...point,
      adjustedBalance: adjusted,
      isSimulatedNegative: adjusted < 0,
      displayDate: new Date(point.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    };
  });

  const simulatedMinBalance = Math.min(...adjustedForecast.map((p) => p.adjustedBalance));
  const isSimulationRescued = cashAlert.hasRisk && simulatedMinBalance >= 0;

  return (
    <div
      id="predictive-cash-alert-banner"
      className={`rounded-2xl border transition-all duration-300 shadow-xl overflow-hidden ${
        cashAlert.hasRisk
          ? isSimulationRescued
            ? "bg-slate-900 border-emerald-500/50 shadow-emerald-950/20"
            : "bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/30 border-rose-500/40 shadow-rose-950/25"
          : "bg-slate-900/90 border-slate-800"
      }`}
    >
      {/* Alert Header Bar */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
              cashAlert.hasRisk
                ? isSimulationRescued
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse"
                : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
            }`}
          >
            {cashAlert.hasRisk ? (
              isSimulationRescued ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              )
            ) : (
              <Sparkles className="w-5 h-5 text-sky-400" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  cashAlert.hasRisk
                    ? isSimulationRescued
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                IA Prédictive Trésorerie (30 Jours)
              </span>

              {cashAlert.hasRisk && cashAlert.daysUntilDeficit !== null && (
                <span className="text-[10px] bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full animate-bounce">
                  Découvert à J+{cashAlert.daysUntilDeficit} ({new Date(cashAlert.deficitDate || "").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })})
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              {cashAlert.hasRisk
                ? isSimulationRescued
                  ? "Simulation Active : Trésorerie sécurisée et retour en zone positive"
                  : `Risque de Trésorerie Négative Détecté (${formatMoney(cashAlert.minProjectedBalance)} au point bas)`
                : "Trajectoire de Trésorerie Saine & Positive sur 30 Jours"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {cashAlert.hasRisk
                ? `Selon l'analyse IA des 6 flux récurrents et échéances fiscales, le solde bancaire risque d'atteindre un creux négatif de ${formatMoney(cashAlert.deficitAmount)}.`
                : `Les encaissements prévisionnels couvrent l'intégralité des dépenses récurrentes et cotisations fiscales.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            type="button"
            onClick={() => handleNavigate("advisor")}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-indigo-600/25"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Audit DAF IA</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1 transition cursor-pointer border border-slate-700"
          >
            <span>{isExpanded ? "Masquer détails" : "Voir projection"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Interactive Analysis Section */}
      {isExpanded && (
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/80 space-y-6">
          {/* Key Metrics Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] text-slate-400">Point Bas Projeté (Min)</span>
              <div
                className={`text-lg font-bold font-mono mt-1 ${
                  simulatedMinBalance < 0 ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {formatMoney(simulatedMinBalance)}
              </div>
              <span className="text-[10px] text-slate-500">
                Prévu le {new Date(cashAlert.minBalanceDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] text-slate-400">Date 1er Découvert</span>
              <div className="text-lg font-bold font-mono mt-1 text-white">
                {cashAlert.daysUntilDeficit !== null ? `J+${cashAlert.daysUntilDeficit}` : "Aucun"}
              </div>
              <span className="text-[10px] text-slate-500">
                {cashAlert.deficitDate ? cashAlert.deficitDate : "Trésorerie positive"}
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] text-slate-400">Burn Rate Net / Jour</span>
              <div className="text-lg font-bold font-mono mt-1 text-amber-300">
                {formatMoney(Math.abs(cashAlert.dailyBurnRate))} / j
              </div>
              <span className="text-[10px] text-slate-500">Flux net moyen calculé</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] text-slate-400">Flux Récurrents Détectés</span>
              <div className="text-lg font-bold font-mono mt-1 text-sky-400">
                {cashAlert.recurringTransactions.length} récurrences
              </div>
              <span className="text-[10px] text-emerald-400">IA Confiance 96%</span>
            </div>
          </div>

          {/* Interactive Chart: 30-Day Day-by-Day Forecast */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-sky-400" />
                  Courbe Prévisionnelle de Trésorerie à 30 Jours (Simulation IA)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Évolution quotidienne intégrant les encaissements MRR, salaires, loyers et échéance TVA
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <span className="text-slate-300 text-[11px]">Trésorerie Projetée</span>
                </div>
                {activeSimulation && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-300 text-[11px] font-semibold">Avec Simulation IA</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-rose-500" />
                  <span className="text-rose-400 text-[11px]">Seuil 0 €</span>
                </div>
              </div>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={adjustedForecast} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorSimulated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    interval={3}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                  />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-1 z-50">
                            <div className="font-bold text-white flex items-center justify-between gap-3">
                              <span>{data.date} (J+{data.dayOffset})</span>
                              <span
                                className={`font-mono font-bold ${
                                  data.adjustedBalance < 0 ? "text-rose-400" : "text-emerald-400"
                                }`}
                              >
                                {formatMoney(data.adjustedBalance)}
                              </span>
                            </div>
                            {data.inflows > 0 && (
                              <div className="text-emerald-400 text-[11px]">
                                Encaissements : +{formatMoney(data.inflows)}
                              </div>
                            )}
                            {data.outflows > 0 && (
                              <div className="text-rose-400 text-[11px]">
                                Décaissements : -{formatMoney(data.outflows)}
                              </div>
                            )}
                            {data.details && data.details.length > 0 && (
                              <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                                {data.details.map((d: string, idx: number) => (
                                  <div key={idx} className="truncate max-w-[220px]">
                                    {d}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={activeSimulation ? "adjustedBalance" : "projectedBalance"}
                    stroke={activeSimulation ? "#34d399" : "#38bdf8"}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={activeSimulation ? "url(#colorSimulated)" : "url(#colorCash)"}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Decision Simulator & Corrective Action Sandbox */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* AI Recommendations */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                  Recommandations Stratégiques DAF IA
                </h4>
              </div>

              <div className="space-y-2">
                {cashAlert.aiRecommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2"
                  >
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive "What-If" Scenario Simulator */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                    Simulateur de Scénarios Anti-Découvert
                  </h4>
                </div>
                {activeSimulation && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSimulation(null);
                      setSimulatedInflowBoost(0);
                      setSimulatedOutflowDelay(0);
                    }}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-400">
                Testez en direct l'impact de décisions financières pour neutraliser le risque de découvert :
              </p>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setActiveSimulation(activeSimulation === "CLIENT_ACCEL" ? null : "CLIENT_ACCEL")
                  }
                  className={`w-full p-2.5 rounded-lg border text-left text-xs transition cursor-pointer flex items-center justify-between ${
                    activeSimulation === "CLIENT_ACCEL"
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <span className="font-semibold block">⚡ Accélérer l'encaissement Client (+12 000 € à J+5)</span>
                    <span className="text-[11px] text-slate-400">
                      Relance proactive des factures émises en attente de règlement
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">+12 000 €</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActiveSimulation(activeSimulation === "SUPPLIER_DELAY" ? null : "SUPPLIER_DELAY")
                  }
                  className={`w-full p-2.5 rounded-lg border text-left text-xs transition cursor-pointer flex items-center justify-between ${
                    activeSimulation === "SUPPLIER_DELAY"
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <span className="font-semibold block">⏳ Décaler les règlements fournisseurs non critiques (+4 500 €)</span>
                    <span className="text-[11px] text-slate-400">
                      Négociation d'un délai à 30 jours fin de mois
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">+4 500 €</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSimulation(activeSimulation === "BOTH" ? null : "BOTH")}
                  className={`w-full p-2.5 rounded-lg border text-left text-xs transition cursor-pointer flex items-center justify-between ${
                    activeSimulation === "BOTH"
                      ? "bg-emerald-950/60 border-emerald-400 text-emerald-200 shadow-md shadow-emerald-950/40"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <span className="font-semibold block">🚀 Plan Combiné Optimal (+16 500 €)</span>
                    <span className="text-[11px] text-slate-400">
                      Encaissements accélérés + report de charges matérielles
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-300">+16 500 €</span>
                </button>
              </div>
            </div>
          </div>

          {/* Identified Recurring Transactions Matrix */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                  Transactions Récurrentes Détectées par l'IA
                </h4>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                Périodicité Automatisée
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {cashAlert.recurringTransactions.map((tx) => {
                const isInflow = tx.type === "INFLOW";
                return (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          isInflow
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {isInflow ? "Encaissement" : "Décaissement"} • Jour {tx.dayOfMonth}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        IA {Math.round(tx.confidenceScore * 100)}%
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white truncate">{tx.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{tx.counterparty}</div>
                    <div className="pt-1 flex items-baseline justify-between border-t border-slate-900 text-xs">
                      <span className="text-[10px] text-slate-500">{tx.category}</span>
                      <span
                        className={`font-mono font-bold ${
                          isInflow ? "text-emerald-400" : "text-slate-200"
                        }`}
                      >
                        {isInflow ? "+" : "-"}
                        {formatMoney(tx.amount)}
                      </span>
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
