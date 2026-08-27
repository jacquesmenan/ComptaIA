import React, { useState } from "react";
import {
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  Landmark,
  Users,
  CreditCard,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Check,
  X,
} from "lucide-react";
import { CompanyProfile, FinancialKPIs, FiscalDeadline } from "../types";

interface FiscalDeadlineAlertBannerProps {
  deadlines: FiscalDeadline[];
  company: CompanyProfile;
  kpis: FinancialKPIs;
  onNavigateTab?: (tab: string) => void;
  setActiveTab?: (tab: string) => void;
  onUpdateDeadlineStatus?: (id: string, newStatus: "PENDING" | "PAID" | "SCHEDULED") => void;
}

export const FiscalDeadlineAlertBanner: React.FC<FiscalDeadlineAlertBannerProps> = ({
  deadlines,
  company,
  kpis,
  onNavigateTab,
  setActiveTab,
  onUpdateDeadlineStatus,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [scheduledIds, setScheduledIds] = useState<Set<string>>(new Set());
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleNavigate = (tab: string) => {
    if (typeof onNavigateTab === "function") {
      onNavigateTab(tab);
    }
    if (typeof setActiveTab === "function") {
      setActiveTab(tab);
    }
  };

  const urgentDeadlines = deadlines.filter(
    (d) => d.daysRemaining <= 7 && d.daysRemaining >= 0 && !scheduledIds.has(d.id)
  );

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: company.currency === "€" ? "EUR" : company.currency === "FCFA" ? "XOF" : "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleScheduleOrPay = (deadline: FiscalDeadline) => {
    setScheduledIds((prev) => new Set(prev).add(deadline.id));
    if (onUpdateDeadlineStatus) {
      onUpdateDeadlineStatus(deadline.id, "SCHEDULED");
    }
    setSuccessToast(`Télérèglement programmé avec succès pour "${deadline.title}"`);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  if (urgentDeadlines.length === 0 && scheduledIds.size === 0) {
    return null;
  }

  if (isDismissed && urgentDeadlines.length > 0) {
    return (
      <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-amber-300 font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>
            {urgentDeadlines.length} échéance(s) fiscale(s) ou sociale(s) requièrent votre attention dans les 7 jours.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className="text-amber-400 hover:text-amber-200 underline text-xs font-semibold cursor-pointer"
        >
          Afficher le rappel
        </button>
      </div>
    );
  }

  const totalUrgentAmount = urgentDeadlines.reduce((sum, d) => sum + (d.amountEstimated || 0), 0);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900/95 to-slate-900 border-2 border-amber-500/40 shadow-2xl shadow-amber-950/30">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Success Notification Toast */}
      {successToast && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-white hover:opacity-80 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                ÉCHÉANCES FISCALES & SOCIALES (&lt; 7 JOURS)
              </span>
              <span className="text-xs text-amber-300/80 font-medium">
                {urgentDeadlines.length} déclaration(s) à télérégler d'urgence
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-white mt-1">
              Rappels de paiement TVA et Cotisations Sociales imminents
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <div className="text-right hidden sm:block">
            <div className="text-[11px] text-slate-400 font-medium">Total estimé à décaisser</div>
            <div className="text-base font-extrabold font-mono text-amber-300">
              {formatMoney(totalUrgentAmount)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Masquer temporairement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards list for each urgent deadline */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 relative z-10">
        {urgentDeadlines.map((deadline) => {
          const isTva = deadline.category === "TVA";
          const isSocial = deadline.category === "SOCIAL";
          const daysText =
            deadline.daysRemaining === 0
              ? "Aujourd'hui !"
              : deadline.daysRemaining === 1
              ? "Demain (J-1)"
              : `Dans ${deadline.daysRemaining} jours (J-${deadline.daysRemaining})`;

          return (
            <div
              key={deadline.id}
              className={`rounded-xl p-4 border transition flex flex-col justify-between ${
                deadline.daysRemaining <= 3
                  ? "bg-slate-950/90 border-rose-500/40 hover:border-rose-400/70"
                  : "bg-slate-950/80 border-amber-500/30 hover:border-amber-400/60"
              }`}
            >
              <div>
                {/* Top status & timing */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      deadline.daysRemaining <= 3
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {daysText}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {deadline.dueDate}
                  </span>
                </div>

                {/* Title & Authority */}
                <div className="flex items-start gap-2 mb-2">
                  <div
                    className={`p-1.5 rounded-lg mt-0.5 flex-shrink-0 ${
                      isTva
                        ? "bg-amber-500/10 text-amber-400"
                        : isSocial
                        ? "bg-sky-500/10 text-sky-400"
                        : "bg-indigo-500/10 text-indigo-400"
                    }`}
                  >
                    {isTva ? (
                      <Landmark className="w-4 h-4" />
                    ) : isSocial ? (
                      <Users className="w-4 h-4" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm leading-snug">
                      {deadline.title}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {deadline.authority}
                    </span>
                  </div>
                </div>

                {/* Amount display */}
                <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800/80 mb-3 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {isTva ? "Solde net exigible :" : "Montant à prélever :"}
                  </span>
                  <span className="text-sm font-extrabold font-mono text-white">
                    {formatMoney(deadline.amountEstimated)}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  {deadline.description}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleNavigate(deadline.actionTab || "tax")}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2 px-2.5 rounded-lg shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <span>{deadline.actionLabel || "Télédéclarer"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleScheduleOrPay(deadline)}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs py-2 px-2.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="Marquer comme télérèglement programmé"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Programmer</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer advice bar */}
      <div className="bg-slate-950/80 px-5 py-2.5 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 relative z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>
            Le moteur comptable télétransmettra les écritures OD de TVA lors de la validation du bordereau CA3.
          </span>
        </div>
        <button
          type="button"
          onClick={() => handleNavigate("tax")}
          className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer text-xs"
        >
          <span>Accéder au module Fiscalité & TVA</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
