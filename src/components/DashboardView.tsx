import React, { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Scale,
  ShieldCheck,
  AlertCircle,
  FileText,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ScanLine,
  Landmark,
  Building2,
  CheckCircle2,
  Clock,
  ArrowDownRight,
  Zap,
  Filter,
  Layers,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  CompanyProfile,
  FinancialKPIs,
  JournalTransaction,
  AnomalyReport,
  FiscalDeadline,
  PredictiveCashAlert,
} from "../types";
import {
  getUpcomingFiscalDeadlines,
  detectRecurringTransactions,
  computePredictiveCashFlow30Days,
} from "../lib/accountingEngine";
import { FiscalDeadlineAlertBanner } from "./FiscalDeadlineAlertBanner";
import { PredictiveCashAlertBanner } from "./PredictiveCashAlertBanner";
import { AlertSummaryCard } from "./AlertSummaryCard";
import { AlertNotificationSettings, defaultAlertSettings } from "../types/alertSettings";
import { AlertSettingsModal } from "./AlertSettingsModal";

interface DashboardViewProps {
  company: CompanyProfile;
  kpis: FinancialKPIs;
  transactions: JournalTransaction[];
  anomalies: AnomalyReport[];
  onNavigateTab?: (tab: string) => void;
  setActiveTab?: (tab: string) => void;
  onOpenStoreGuide?: () => void;
  alertSettings?: AlertNotificationSettings;
  onSaveAlertSettings?: (settings: AlertNotificationSettings) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  company,
  kpis,
  transactions,
  anomalies,
  onNavigateTab,
  setActiveTab,
  onOpenStoreGuide,
  alertSettings,
  onSaveAlertSettings,
}) => {
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [currentAlertSettings, setCurrentAlertSettings] = useState<AlertNotificationSettings>(() => {
    if (alertSettings) return alertSettings;
    const saved = localStorage.getItem("compta_alert_settings");
    return saved ? JSON.parse(saved) : defaultAlertSettings;
  });

  const handleUpdateAlertSettings = (newSettings: AlertNotificationSettings) => {
    setCurrentAlertSettings(newSettings);
    localStorage.setItem("compta_alert_settings", JSON.stringify(newSettings));
    if (onSaveAlertSettings) {
      onSaveAlertSettings(newSettings);
    }
  };

  const handleNavigate = (tab: string) => {
    if (typeof onNavigateTab === "function") {
      onNavigateTab(tab);
    }
    if (typeof setActiveTab === "function") {
      setActiveTab(tab);
    }
  };

  const [deadlines, setDeadlines] = React.useState<FiscalDeadline[]>(() =>
    getUpcomingFiscalDeadlines(company, kpis)
  );

  // AI Predictive Cash Flow Alert computation
  const recurringList = React.useMemo(() => {
    return detectRecurringTransactions(transactions, [], company);
  }, [transactions, company]);

  const cashAlert: PredictiveCashAlert = React.useMemo(() => {
    return computePredictiveCashFlow30Days(
      kpis.tresorerieActuelle,
      recurringList,
      deadlines
    );
  }, [kpis.tresorerieActuelle, recurringList, deadlines]);

  // Sync deadlines if company standard or kpis update
  React.useEffect(() => {
    setDeadlines(getUpcomingFiscalDeadlines(company, kpis));
  }, [company.accountingStandard, kpis.tvaNetDue, kpis.chiffreAffaires]);

  const handleUpdateDeadlineStatus = (id: string, newStatus: "PENDING" | "PAID" | "SCHEDULED") => {
    setDeadlines((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
    );
  };

  // Chart Data: Monthly Trends
  const monthlyData = [
    { month: "Nov 25", ca: 32000, charges: 16500, tresorerie: 42000 },
    { month: "Déc 25", ca: 48000, charges: 21000, tresorerie: 55000 },
    { month: "Jan 26", ca: 51000, charges: 19800, tresorerie: 64200 },
    {
      month: "Fév 26",
      ca: kpis.chiffreAffaires,
      charges: kpis.chargesTotales,
      tresorerie: kpis.tresorerieActuelle,
    },
  ];

  // Expense Distribution by Accounting Class
  const expenseCategories = [
    { name: "Services & Cloud (618)", value: 3200, color: "#38bdf8" },
    { name: "Loyer & Bureaux (613)", value: 4500, color: "#818cf8" },
    { name: "Matériel Informatique (218)", value: 4165, color: "#34d399" },
    { name: "Repas & Frais Pro (625)", value: 380, color: "#fbbf24" },
  ];

  // State for chart mode in DashboardView
  const [dashboardChartTab, setDashboardChartTab] = useState<"PROJECTION" | "HISTORIC">("PROJECTION");
  const [showInflowsOnly, setShowInflowsOnly] = useState<boolean>(false);
  const [showOutflowsOnly, setShowOutflowsOnly] = useState<boolean>(false);

  // Prepare 30-day projection chart dataset with formatted dates
  const forecastChartData = useMemo(() => {
    return cashAlert.dailyForecast.map((pt) => {
      const d = new Date(pt.date);
      const dayLabel = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      return {
        ...pt,
        displayDate: dayLabel,
        // formatted metrics for tooltip & recharts
        positiveBalance: pt.projectedBalance >= 0 ? pt.projectedBalance : 0,
        negativeBalance: pt.projectedBalance < 0 ? pt.projectedBalance : 0,
      };
    });
  }, [cashAlert.dailyForecast]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: company.currency === "€" ? "EUR" : "XOF",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Hero Financial Status Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/70 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Comptabilité Autonome Temps Réel
              </span>
              <span className="text-slate-400 text-xs font-mono">
                Exercice 2026 ({company.accountingStandard})
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Tableau de Bord & Santé Financière
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Automatisation intégrale des flux : saisie, TVA, balance et compte de résultat sans expert-comptable externe.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleNavigate("invoicing")}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Créer une facture</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate("scan")}
              className="bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-lg shadow-sky-500/25 flex items-center gap-2 transition cursor-pointer"
            >
              <ScanLine className="w-4 h-4" />
              <span>Scanner une pièce</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate("advisor")}
              className="bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>Audit DAF IA</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual Notification Banner for TVA & Social Deadlines in next 7 days */}
      <FiscalDeadlineAlertBanner
        deadlines={deadlines}
        company={company}
        kpis={kpis}
        onNavigateTab={handleNavigate}
        setActiveTab={handleNavigate}
        onUpdateDeadlineStatus={handleUpdateDeadlineStatus}
      />

      {/* AI Predictive Cash Flow Alerts & 30-Day Deficit Warning */}
      <PredictiveCashAlertBanner
        cashAlert={cashAlert}
        company={company}
        onNavigateTab={handleNavigate}
        setActiveTab={handleNavigate}
      />

      {/* User-Configurable Custom Alert & Budget Thresholds Module */}
      <AlertSummaryCard
        settings={currentAlertSettings}
        onOpenSettings={() => setIsAlertModalOpen(true)}
        cashAlert={cashAlert}
        kpis={kpis}
        company={company}
        transactions={transactions}
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Chiffre d'Affaires */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Chiffre d'Affaires HT
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white font-mono">
              {formatMoney(kpis.chiffreAffaires)}
            </span>
            <span className="text-xs font-bold text-emerald-400 flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +22.4%
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Marge Brute : {kpis.margeBrutePct}%</span>
            <span className="text-slate-500 font-mono">Classe 7</span>
          </div>
        </div>

        {/* Trésorerie Actuelle */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Trésorerie Disponible
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-400 font-mono">
              {formatMoney(kpis.tresorerieActuelle)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Runway : ~{kpis.runwayMonths} mois</span>
            <span className="text-slate-500 font-mono">Compte 512</span>
          </div>
        </div>

        {/* Résultat Net Estimé */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Résultat Net Comptable
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white font-mono">
              {formatMoney(kpis.resultatNet)}
            </span>
            <span className="text-xs text-indigo-400 font-medium">
              (IS ~{formatMoney(kpis.impotSocietesEstime)})
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>EBE (EBITDA) : {formatMoney(kpis.ebe)}</span>
            <span className="text-emerald-400 font-medium">Bénéficiaire</span>
          </div>
        </div>

        {/* Position TVA */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Position TVA Nette
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-300 font-mono">
              {formatMoney(Math.abs(kpis.tvaNetDue))}
            </span>
            <span className="text-xs font-semibold text-slate-300">
              {kpis.tvaNetDue >= 0 ? "À Décaisser" : "Crédit TVA"}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Coll: {formatMoney(kpis.tvaCollectee)}</span>
            <span>Déd: {formatMoney(kpis.tvaDeductible)}</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts & Predictive 30-Day Cashflow Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Card with Dual View (30-Day Predictive vs. Historic Trend) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    {dashboardChartTab === "PROJECTION" ? (
                      <>
                        <Zap className="w-4 h-4 text-emerald-400" />
                        <span>Projection de Trésorerie à 30 Jours (IA & Flux Récurrents)</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-4 h-4 text-sky-400" />
                        <span>Évolution Chiffre d'Affaires vs Trésorerie</span>
                      </>
                    )}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {dashboardChartTab === "PROJECTION"
                    ? `Modélisation prédictive intégrant ${cashAlert.recurringTransactions.length} flux récurrents (abonnements, loyers, salaires) et obligations fiscales.`
                    : "Suivi comptable consolidé mensuel en temps réel (exercice 2025-2026)."}
                </p>
              </div>

              {/* Chart Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setDashboardChartTab("PROJECTION")}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    dashboardChartTab === "PROJECTION"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Projection 30 Jours</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDashboardChartTab("HISTORIC")}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    dashboardChartTab === "HISTORIC"
                      ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Historique Mensuel</span>
                </button>
              </div>
            </div>

            {/* Quick Projection Indicators Bar */}
            {dashboardChartTab === "PROJECTION" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Solde Actuel</span>
                  <span className="font-mono font-bold text-white text-xs">
                    {formatMoney(kpis.tresorerieActuelle)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Point Bas Projeté</span>
                  <span
                    className={`font-mono font-bold text-xs ${
                      cashAlert.minProjectedBalance < 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {formatMoney(cashAlert.minProjectedBalance)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Flux Récurrents IA</span>
                  <span className="font-mono font-bold text-sky-400 text-xs">
                    {cashAlert.recurringTransactions.length} flux détectés
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Horizon & Risque</span>
                  <span
                    className={`font-mono font-bold text-xs ${
                      cashAlert.hasRisk ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {cashAlert.hasRisk ? `Alerte J+${cashAlert.daysUntilDeficit || 30}` : "Sécurisé"}
                  </span>
                </div>
              </div>
            )}

            {/* Chart Area */}
            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                {dashboardChartTab === "PROJECTION" ? (
                  <AreaChart
                    data={forecastChartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorCashProjection" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={cashAlert.minProjectedBalance < 0 ? "#f43f5e" : "#10b981"}
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor={cashAlert.minProjectedBalance < 0 ? "#f43f5e" : "#10b981"}
                          stopOpacity={0.0}
                        />
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
                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 z-50 min-w-[210px]">
                              <div className="font-bold text-white flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
                                <span>{data.date} (J+{data.dayOffset})</span>
                                <span
                                  className={`font-mono font-bold ${
                                    data.projectedBalance < 0 ? "text-rose-400" : "text-emerald-400"
                                  }`}
                                >
                                  {formatMoney(data.projectedBalance)}
                                </span>
                              </div>
                              {data.inflows > 0 && (
                                <div className="text-emerald-400 text-[11px] flex justify-between">
                                  <span>Encaissements :</span>
                                  <span className="font-mono font-bold">+{formatMoney(data.inflows)}</span>
                                </div>
                              )}
                              {data.outflows > 0 && (
                                <div className="text-rose-400 text-[11px] flex justify-between">
                                  <span>Décaissements :</span>
                                  <span className="font-mono font-bold">-{formatMoney(data.outflows)}</span>
                                </div>
                              )}
                              {data.details && data.details.length > 0 && (
                                <div className="pt-1.5 border-t border-slate-800 space-y-0.5">
                                  <span className="text-[10px] text-slate-500 font-semibold block">
                                    Événements & Échéances :
                                  </span>
                                  {data.details.map((d: string, idx: number) => (
                                    <div key={idx} className="text-[10px] text-slate-300 truncate">
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
                      dataKey="projectedBalance"
                      name="Trésorerie Prévisionnelle"
                      stroke={cashAlert.minProjectedBalance < 0 ? "#f43f5e" : "#10b981"}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorCashProjection)"
                    />
                  </AreaChart>
                ) : (
                  <AreaChart
                    data={monthlyData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorCa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorTresor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        color: "#f8fafc",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="ca"
                      name="Chiffre d'Affaires"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCa)"
                    />
                    <Area
                      type="monotone"
                      dataKey="tresorerie"
                      name="Trésorerie"
                      stroke="#34d399"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorTresor)"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Footer of Chart Card */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            {dashboardChartTab === "PROJECTION" ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Modèle IA alimenté par {cashAlert.recurringTransactions.length} récurrences</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleNavigate("advisor")}
                  className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>Simuler les scénarios DAF IA</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-sky-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> CA Facturé
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Trésorerie Réelle
                  </span>
                </div>
                <span className="text-slate-500">Mise à jour automatique à chaque saisie</span>
              </>
            )}
          </div>
        </div>

        {/* Expenses Donut Breakdown & Recurring Transactions Summary */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-white text-base">Répartition & Flux Clés</h3>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                Charges & MRR
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-2">Comptes de charges et flux prévisibles</p>
            
            <div className="h-40 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => formatMoney(Number(value))}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400">Charges Totales</span>
                <span className="text-xs font-extrabold text-white font-mono">
                  {formatMoney(kpis.chargesTotales)}
                </span>
              </div>
            </div>
          </div>

          {/* Key Recurring Transactions Quick List */}
          <div className="space-y-1.5 border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
              <span>Flux Récurrents Détectés ({cashAlert.recurringTransactions.length})</span>
              <span className="text-sky-400">Impact 30j</span>
            </div>
            {cashAlert.recurringTransactions.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 text-xs border border-slate-800/60"
              >
                <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      rec.type === "INFLOW" ? "bg-emerald-400" : "bg-rose-400"
                    }`}
                  />
                  <span className="text-slate-300 truncate text-[11px]">{rec.name}</span>
                </div>
                <span
                  className={`font-mono font-bold text-[11px] ${
                    rec.type === "INFLOW" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {rec.type === "INFLOW" ? "+" : "-"}
                  {formatMoney(rec.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Alerts & Recent Autonomous Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Anomaly & Risk Detection Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-sm">Contrôle & Audit IA</h3>
              </div>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                Score: 96/100
              </span>
            </div>

            <div className="space-y-3">
              {anomalies.map((anom) => (
                <div
                  key={anom.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        anom.severity === "HIGH"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : anom.severity === "MEDIUM"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                      }`}
                    >
                      {anom.type}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">{anom.entryRef}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200">{anom.title}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{anom.description}</p>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-sky-400 font-medium">
                      Action : {anom.recommendation}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Contrôles fiscaux & FEC :</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Conforme
            </span>
          </div>
        </div>

        {/* Recent Journal Transactions */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-sm">Dernières Écritures Comptables</h3>
              <p className="text-xs text-slate-400">Générées automatiquement par le moteur d'IA</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("journal")}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Voir le Grand Livre</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Journal</th>
                  <th className="pb-2 font-medium">Tiers / Pièce</th>
                  <th className="pb-2 font-medium">Montant HT</th>
                  <th className="pb-2 font-medium">TTC</th>
                  <th className="pb-2 font-medium text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.slice(0, 5).map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 font-mono text-slate-300">{tx.date}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          tx.journalCode === "VE"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : tx.journalCode === "AC"
                            ? "bg-sky-500/20 text-sky-300"
                            : "bg-indigo-500/20 text-indigo-300"
                        }`}
                      >
                        {tx.journalCode}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <div className="font-semibold text-slate-200 truncate max-w-[180px]">
                        {tx.partnerName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{tx.pieceNumber}</div>
                    </td>
                    <td className="py-2.5 font-mono text-slate-300">{formatMoney(tx.amountHT)}</td>
                    <td className="py-2.5 font-mono font-bold text-white">
                      {formatMoney(tx.amountTTC)}
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          tx.status === "RECONCILED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {tx.status === "RECONCILED" ? "Rapproché" : "Validé"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Fiscal & Social Deadlines Summary Panel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-bold text-white text-sm">
                Calendrier des Échéances Fiscales & Sociales (Suivi Temps Réel)
              </h3>
              <p className="text-xs text-slate-400">
                Décomptes automatiques des obligations TVA, cotisations salariales/patronales et acomptes fiscaux
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleNavigate("tax")}
            className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Ouvrir le module Fiscalité & TVA</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {deadlines.map((item) => {
            const isCritical = item.daysRemaining <= 3;
            const isWarn = item.daysRemaining > 3 && item.daysRemaining <= 7;
            const isScheduled = item.status === "SCHEDULED" || item.status === "PAID";

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition ${
                  isScheduled
                    ? "bg-slate-950/60 border-emerald-500/30"
                    : isCritical
                    ? "bg-slate-950 border-rose-500/40 hover:border-rose-400"
                    : isWarn
                    ? "bg-slate-950 border-amber-500/40 hover:border-amber-400"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isScheduled
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : isCritical
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : isWarn
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {isScheduled
                      ? "✓ Programmé"
                      : item.daysRemaining <= 7
                      ? `Dans ${item.daysRemaining} j (Urgent)`
                      : `Dans ${item.daysRemaining} j`}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{item.dueDate}</span>
                </div>

                <h4 className="font-bold text-white text-xs line-clamp-1 mb-1">{item.title}</h4>
                <div className="text-[11px] text-slate-400 mb-2 truncate">{item.authority}</div>

                <div className="flex items-baseline justify-between pt-2 border-t border-slate-900 text-xs">
                  <span className="text-slate-500 text-[11px]">Montant dû :</span>
                  <span className="font-mono font-bold text-white">
                    {formatMoney(item.amountEstimated)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alert Settings Modal */}
      <AlertSettingsModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        settings={currentAlertSettings}
        onSaveSettings={handleUpdateAlertSettings}
        company={company}
        kpis={kpis}
        transactions={transactions}
      />
    </div>
  );
};
