import React from "react";
import {
  Sliders,
  Bell,
  AlertTriangle,
  Mail,
  Percent,
  CheckCircle2,
  TrendingDown,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { AlertNotificationSettings } from "../types/alertSettings";
import { CompanyProfile, FinancialKPIs, JournalTransaction, PredictiveCashAlert } from "../types";

interface AlertSummaryCardProps {
  settings: AlertNotificationSettings;
  onOpenSettings: () => void;
  cashAlert: PredictiveCashAlert;
  kpis: FinancialKPIs;
  company: CompanyProfile;
  transactions: JournalTransaction[];
}

export const AlertSummaryCard: React.FC<AlertSummaryCardProps> = ({
  settings,
  onOpenSettings,
  cashAlert,
  kpis,
  company,
  transactions,
}) => {
  // Calculate expenses for each budget rule
  const budgetAlerts = settings.budgetThresholds.filter((b) => {
    if (!b.enabled) return false;
    const prefixes = b.accountPrefix.split(",").map((p) => p.trim());
    let sum = 0;
    transactions.forEach((tx) => {
      tx.lines.forEach((l) => {
        if (prefixes.some((prefix) => l.accountCode.startsWith(prefix))) {
          sum += l.debit || 0;
        }
      });
    });
    const consumption = (sum / (b.monthlyBudget || 1)) * 100;
    return consumption >= b.alertThresholdPercent;
  });

  const isCashAtRisk =
    kpis.tresorerieActuelle < settings.cashMinimumThreshold ||
    (cashAlert.daysUntilDeficit !== null &&
      cashAlert.daysUntilDeficit <= settings.cashProjectionDeficitDays);

  const hasAnyActiveAlert = isCashAtRisk || budgetAlerts.length > 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              hasAnyActiveAlert
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}
          >
            {hasAnyActiveAlert ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">
                Surveillance Budgets & Alertes Personnalisées
              </h3>
              {settings.enabled ? (
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Notifications Email Actives
                </span>
              ) : (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                  Désactivé
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Destinataire : <strong className="text-sky-400 font-mono">{settings.email}</strong> • {settings.budgetThresholds.filter((b) => b.enabled).length} budgets surveillés
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto shadow-sm"
        >
          <Sliders className="w-4 h-4 text-sky-400" />
          <span>Configurer les Seuils</span>
        </button>
      </div>

      {/* Grid of Key Alert Thresholds */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Cash Minimum Threshold */}
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
            kpis.tresorerieActuelle < settings.cashMinimumThreshold
              ? "bg-rose-950/20 border-rose-800/80"
              : "bg-slate-950/60 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
              Seuil Trésorerie Plancher
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              Min: {settings.cashMinimumThreshold.toLocaleString("fr-FR")} {company.currency}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <span className="font-mono text-base font-extrabold text-white">
              {kpis.tresorerieActuelle.toLocaleString("fr-FR")} {company.currency}
            </span>
            <span
              className={`font-semibold text-[11px] ${
                kpis.tresorerieActuelle >= settings.cashMinimumThreshold
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              {kpis.tresorerieActuelle >= settings.cashMinimumThreshold ? "Sécurisé" : "⚠️ Sous le seuil"}
            </span>
          </div>
        </div>

        {/* 30-Day Deficit Projection */}
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
            cashAlert.hasRisk
              ? "bg-rose-950/20 border-rose-800/80"
              : "bg-slate-950/60 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold flex items-center gap-1">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              Risque Découvert Projeté
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              Alerte &lt; J+{settings.cashProjectionDeficitDays}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <span className="font-mono text-base font-extrabold text-white">
              {cashAlert.minProjectedBalance < 0
                ? `${cashAlert.minProjectedBalance.toLocaleString("fr-FR")} ${company.currency}`
                : `+${cashAlert.minProjectedBalance.toLocaleString("fr-FR")} ${company.currency}`}
            </span>
            <span
              className={`font-semibold text-[11px] ${
                cashAlert.minProjectedBalance >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {cashAlert.daysUntilDeficit
                ? `Alerte J+${cashAlert.daysUntilDeficit}`
                : "Excédentaire"}
            </span>
          </div>
        </div>

        {/* Budgets Over-Threshold summary */}
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
            budgetAlerts.length > 0
              ? "bg-amber-950/20 border-amber-800/80"
              : "bg-slate-950/60 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-sky-400" />
              Budgets de Charges
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              {settings.budgetThresholds.length} règles
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <span className="font-mono text-base font-extrabold text-white">
              {budgetAlerts.length} alerte{budgetAlerts.length > 1 ? "s" : ""}
            </span>
            <span
              className={`font-semibold text-[11px] ${
                budgetAlerts.length === 0 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {budgetAlerts.length === 0 ? "Tous sous contrôle" : "Dépassement imminent"}
            </span>
          </div>
        </div>
      </div>

      {/* If any budget alert is active, show detailed strip */}
      {budgetAlerts.length > 0 && (
        <div className="mt-3 p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl space-y-2 text-xs">
          <span className="font-bold text-amber-300 block">
            ⚠️ Postes de charges approchant ou dépassant le plafond configuré :
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {budgetAlerts.map((b) => (
              <div
                key={b.id}
                className="bg-slate-950/80 p-2 rounded-lg border border-amber-800/40 flex items-center justify-between"
              >
                <span className="text-slate-300 font-medium truncate max-w-[180px]">
                  {b.category}
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  Plafond: {b.monthlyBudget.toLocaleString("fr-FR")} {company.currency} ({b.alertThresholdPercent}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
