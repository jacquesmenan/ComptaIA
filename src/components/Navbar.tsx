import React from "react";
import {
  Sparkles,
  Layers,
  FileSpreadsheet,
  PieChart,
  Landmark,
  Scale,
  Bot,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ScanLine,
  Bell,
  Sliders,
  FileText,
  Cloud,
  Database,
} from "lucide-react";
import { AccountingStandard, CompanyProfile } from "../types";

interface NavbarProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  onSelectTab?: (tab: string) => void;
  company: CompanyProfile;
  setCompany?: React.Dispatch<React.SetStateAction<CompanyProfile>>;
  isBalanced?: boolean;
  onOpenStoreGuide?: () => void;
  onOpenMobileGuide?: () => void;
  onOpenAlertSettings?: () => void;
  isMobileSimulator?: boolean;
  setIsMobileSimulator?: (val: boolean) => void;
  cloudSyncStatus?: "synced" | "syncing" | "offline";
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSelectTab,
  company,
  setCompany,
  isBalanced = true,
  onOpenStoreGuide,
  onOpenMobileGuide,
  onOpenAlertSettings,
  isMobileSimulator = false,
  setIsMobileSimulator,
  cloudSyncStatus = "synced",
}) => {
  const handleTabClick = (tabId: string) => {
    if (typeof setActiveTab === "function") {
      setActiveTab(tabId);
    }
    if (typeof onSelectTab === "function") {
      onSelectTab(tabId);
    }
  };

  const handleOpenGuide = () => {
    if (typeof onOpenStoreGuide === "function") {
      onOpenStoreGuide();
    } else if (typeof onOpenMobileGuide === "function") {
      onOpenMobileGuide();
    }
  };

  const navItems = [
    { id: "dashboard", label: "Tableau de Bord", icon: PieChart },
    { id: "invoicing", label: "Facturation", icon: FileText },
    { id: "scan", label: "Scanner & Saisie IA", icon: ScanLine, highlight: true },
    { id: "journal", label: "Journal & Grand Livre", icon: FileSpreadsheet },
    { id: "statements", label: "Bilan & P&L", icon: Scale },
    { id: "tax", label: "TVA & Fiscalité", icon: Landmark },
    { id: "bank", label: "Rapprochement", icon: Layers },
    { id: "advisor", label: "Directeur DAF IA", icon: Bot, isAi: true },
  ];

  const handleStandardChange = (std: AccountingStandard) => {
    if (setCompany) {
      setCompany((prev) => ({ ...prev, accountingStandard: std }));
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      {/* Top Banner / Ticker */}
      <div className="bg-gradient-to-r from-sky-950/60 via-indigo-950/50 to-slate-950 border-b border-slate-800/80 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-medium text-sky-400">
              <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              <span>Moteur Autonome IA Actif (Gemini 3.7 Flash)</span>
            </span>
            <span className="text-slate-500">•</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-sky-400 font-medium text-[11px] bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded">
                <Database className="w-3 h-3 text-sky-400" />
                <span>Base Cloud (europe-west2) :</span>
                {cloudSyncStatus === "synced" && (
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Sync
                  </span>
                )}
                {cloudSyncStatus === "syncing" && (
                  <span className="text-amber-400 font-bold">Syncing...</span>
                )}
                {cloudSyncStatus === "offline" && (
                  <span className="text-slate-400">Hors ligne</span>
                )}
              </span>
            </div>
            <span className="text-slate-500">•</span>
            <div className="flex items-center gap-1.5">
              {isBalanced ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Écritures Équilibrées (Débit = Crédit)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Alerte Déséquilibre Détectée</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-md px-2 py-0.5">
              <span className="text-slate-400 text-[11px]">Norme :</span>
              <button
                type="button"
                onClick={() => handleStandardChange("PCG")}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition ${
                  company.accountingStandard === "PCG"
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Plan Comptable Général (France)"
              >
                PCG
              </button>
              <button
                type="button"
                onClick={() => handleStandardChange("SYSCOHADA")}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition ${
                  company.accountingStandard === "SYSCOHADA"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Système Comptable OHADA (Afrique de l'Ouest & Centrale)"
              >
                SYSCOHADA
              </button>
              <button
                type="button"
                onClick={() => handleStandardChange("IFRS")}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition ${
                  company.accountingStandard === "IFRS"
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="International Financial Reporting Standards"
              >
                IFRS
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenGuide}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/40 hover:to-teal-600/40 border border-emerald-500/40 text-emerald-300 px-2.5 py-0.5 rounded-md text-xs font-medium transition cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>App Store & Play Store</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1 py-0.2 rounded">iOS / Android</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Company Profile */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Compta<span className="text-sky-400">AI</span>
                </h1>
                <span className="bg-sky-950 text-sky-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-sky-800">
                  AUTONOMOUS v2.5
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Building2 className="w-3 h-3 text-slate-500" />
                <span className="font-medium text-slate-300 truncate max-w-[160px] sm:max-w-[240px]">
                  {company.name}
                </span>
                <span className="text-slate-600 hidden sm:inline">({company.legalForm})</span>
              </div>
            </div>
          </div>

          {/* Navigation Items (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800/80">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  id={`nav-btn-${item.id}`}
                  onClick={() => handleTabClick(item.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? item.highlight
                        ? "bg-sky-500 text-white shadow-md shadow-sky-500/25"
                        : item.isAi
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                        : "bg-slate-800 text-sky-400 border border-slate-700 shadow-sm"
                      : item.highlight
                      ? "text-sky-300 hover:bg-sky-950/40 hover:text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive && !item.highlight ? "text-sky-400" : ""}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Tools */}
          <div className="flex items-center gap-2">
            {onOpenAlertSettings && (
              <button
                type="button"
                onClick={onOpenAlertSettings}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Configurer les seuils d'alerte et notifications e-mail"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Alertes & Seuils</span>
              </button>
            )}

            {setIsMobileSimulator && (
              <button
                type="button"
                onClick={() => setIsMobileSimulator(!isMobileSimulator)}
                className={`p-2 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  isMobileSimulator
                    ? "bg-sky-950 border-sky-500/50 text-sky-300"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Tester l'affichage Smartphone iOS / Android"
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden md:inline">Mode Mobile</span>
              </button>
            )}

            <button
              type="button"
              id="quick-scan-top"
              onClick={() => handleTabClick("scan")}
              className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <ScanLine className="w-4 h-4" />
              <span>Saisir une pièce</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Scrollbar (when screen is smaller than lg) */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-800/80 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? "bg-sky-500 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
