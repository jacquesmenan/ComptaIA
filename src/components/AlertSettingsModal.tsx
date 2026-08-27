import React, { useState } from "react";
import {
  Bell,
  Mail,
  Sliders,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Send,
  Plus,
  Trash2,
  ShieldAlert,
  Clock,
  Settings,
  RefreshCw,
  Eye,
  Info,
  TrendingDown,
  Percent,
} from "lucide-react";
import {
  AlertNotificationSettings,
  BudgetCategoryThreshold,
  EmailNotificationLog,
} from "../types/alertSettings";
import { CompanyProfile, FinancialKPIs, JournalTransaction } from "../types";
import {
  computePredictiveCashFlow30Days,
  detectRecurringTransactions,
  getUpcomingFiscalDeadlines,
} from "../lib/accountingEngine";

interface AlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AlertNotificationSettings;
  onSaveSettings: (newSettings: AlertNotificationSettings) => void;
  company: CompanyProfile;
  kpis: FinancialKPIs;
  transactions: JournalTransaction[];
}

export const AlertSettingsModal: React.FC<AlertSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  company,
  kpis,
  transactions,
}) => {
  const [localSettings, setLocalSettings] = useState<AlertNotificationSettings>(settings);
  const [activeTab, setActiveTab] = useState<"THRESHOLDS" | "BUDGETS" | "EMAIL" | "LOGS">("THRESHOLDS");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activePreviewLog, setActivePreviewLog] = useState<EmailNotificationLog | null>(null);

  // New budget form state
  const [newBudgetCategory, setNewBudgetCategory] = useState("");
  const [newBudgetPrefix, setNewBudgetPrefix] = useState("");
  const [newBudgetAmount, setNewBudgetAmount] = useState<number>(3000);
  const [newBudgetPercent, setNewBudgetPercent] = useState<number>(85);
  const [showAddBudget, setShowAddBudget] = useState(false);

  if (!isOpen) return null;

  // Calculate actual category expenses from current transactions
  const getCategoryActualExpense = (accountPrefixStr: string): number => {
    const prefixes = accountPrefixStr.split(",").map((p) => p.trim());
    let sum = 0;
    transactions.forEach((tx) => {
      tx.lines.forEach((l) => {
        if (prefixes.some((prefix) => l.accountCode.startsWith(prefix))) {
          sum += l.debit || 0;
        }
      });
    });
    return sum;
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  const handleSendTestEmail = async (type: "TEST" | "CASH" | "BUDGET") => {
    if (!localSettings.email) {
      setTestResult({ success: false, message: "Veuillez renseigner une adresse email valide." });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    let subject = "🧪 Test de Notification ComptaAI";
    let message = "Ceci est un message de validation confirmant la bonne configuration de vos alertes automatisées.";
    let currentValue = undefined;
    let thresholdValue = undefined;

    if (type === "CASH") {
      const recurringList = detectRecurringTransactions(transactions, [], company);
      const deadlines = getUpcomingFiscalDeadlines(company, kpis);
      const cashAlert = computePredictiveCashFlow30Days(kpis.tresorerieActuelle, recurringList, deadlines);
      subject = `⚠️ Alerte Trésorerie : Point bas projeté à ${cashAlert.minProjectedBalance.toLocaleString("fr-FR")} €`;
      message = cashAlert.summary;
      currentValue = `${kpis.tresorerieActuelle.toLocaleString("fr-FR")} €`;
      thresholdValue = `Minimum d'alerte : ${localSettings.cashMinimumThreshold.toLocaleString("fr-FR")} €`;
    } else if (type === "BUDGET") {
      subject = "📊 Alerte Dépassement de Budget : Charges d'exploitation";
      message = "Un dépassement de seuil a été simulé sur vos postes de charges récurrentes.";
      currentValue = "5 280 € (88% du budget)";
      thresholdValue = "Plafond : 6 000 € (Seuil d'alerte 85%)";
    }

    try {
      const res = await fetch("/api/alerts/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: localSettings.email,
          subject,
          alertType: type === "CASH" ? "CASH_RISK" : type === "BUDGET" ? "BUDGET_EXCEEDED" : "ANOMALY",
          data: {
            message,
            currentValue,
            thresholdValue,
            severity: type === "CASH" ? "CRITICAL" : "WARNING",
          },
          isTest: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: `Notification envoyée avec succès à ${localSettings.email}`,
        });

        if (data.dispatchedLog) {
          setLocalSettings((prev) => ({
            ...prev,
            notificationHistory: [data.dispatchedLog, ...prev.notificationHistory],
          }));
        }
      } else {
        setTestResult({ success: false, message: data.error || "Erreur d'envoi" });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Erreur de connexion au serveur" });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleAddBudgetCategory = () => {
    if (!newBudgetCategory || !newBudgetPrefix || newBudgetAmount <= 0) return;

    const newEntry: BudgetCategoryThreshold = {
      id: `b-${Date.now()}`,
      category: newBudgetCategory,
      accountPrefix: newBudgetPrefix,
      monthlyBudget: newBudgetAmount,
      alertThresholdPercent: newBudgetPercent,
      enabled: true,
    };

    setLocalSettings((prev) => ({
      ...prev,
      budgetThresholds: [...prev.budgetThresholds, newEntry],
    }));

    setNewBudgetCategory("");
    setNewBudgetPrefix("");
    setNewBudgetAmount(3000);
    setNewBudgetPercent(85);
    setShowAddBudget(false);
  };

  const handleDeleteBudgetCategory = (id: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      budgetThresholds: prev.budgetThresholds.filter((b) => b.id !== id),
    }));
  };

  const handleToggleBudget = (id: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      budgetThresholds: prev.budgetThresholds.map((b) =>
        b.id === id ? { ...b, enabled: !b.enabled } : b
      ),
    }));
  };

  const handleUpdateBudgetField = (
    id: string,
    field: "monthlyBudget" | "alertThresholdPercent",
    value: number
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      budgetThresholds: prev.budgetThresholds.map((b) =>
        b.id === id ? { ...b, [field]: value } : b
      ),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <span>Configuration des Alertes & Notifications DAF</span>
                <span className="text-[10px] bg-sky-950 text-sky-400 px-2 py-0.5 rounded border border-sky-800">
                  Email & IA
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Définissez vos seuils de trésorerie, vos plafonds de budgets de charges et vos destinataires d'alertes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 bg-slate-950/60 border-b border-slate-800/80 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("THRESHOLDS")}
            className={`pb-2.5 px-2 font-semibold flex items-center gap-1.5 transition border-b-2 cursor-pointer ${
              activeTab === "THRESHOLDS"
                ? "text-sky-400 border-sky-400"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>Seuils Trésorerie</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("BUDGETS")}
            className={`pb-2.5 px-2 font-semibold flex items-center gap-1.5 transition border-b-2 cursor-pointer ${
              activeTab === "BUDGETS"
                ? "text-sky-400 border-sky-400"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>Budgets & Dépassements</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("EMAIL")}
            className={`pb-2.5 px-2 font-semibold flex items-center gap-1.5 transition border-b-2 cursor-pointer ${
              activeTab === "EMAIL"
                ? "text-sky-400 border-sky-400"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Canal Email & Destinataires</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("LOGS")}
            className={`pb-2.5 px-2 font-semibold flex items-center gap-1.5 transition border-b-2 cursor-pointer ${
              activeTab === "LOGS"
                ? "text-sky-400 border-sky-400"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Historique des Alertes ({localSettings.notificationHistory.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          {/* TAB 1: THRESHOLDS */}
          {activeTab === "THRESHOLDS" && (
            <div className="space-y-5">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white text-sm font-bold flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Matelas de Sécurité Minimum (Trésorerie Plancher)</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Déclenche une alerte immédiate si le solde bancaire disponible passe en-dessous de ce montant.
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    {localSettings.cashMinimumThreshold.toLocaleString("fr-FR")} {company.currency}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1000}
                    max={50000}
                    step={500}
                    value={localSettings.cashMinimumThreshold}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        cashMinimumThreshold: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <input
                    type="number"
                    value={localSettings.cashMinimumThreshold}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        cashMinimumThreshold: Number(e.target.value),
                      }))
                    }
                    className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-right text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white text-sm font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Seuil d'Alerte Runway / Visibilité</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Alerte si la réserve de trésorerie rapportée aux charges mensuelles offre moins de N mois de visibilité.
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold text-amber-400">
                    {localSettings.cashRunwayAlertMonths} mois
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={6}
                    step={1}
                    value={localSettings.cashRunwayAlertMonths}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        cashRunwayAlertMonths: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <span className="w-28 text-right text-xs font-mono text-slate-300">
                    &lt; {localSettings.cashRunwayAlertMonths} mois
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white text-sm font-bold flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>Horizon Prédictif IA de Découvert</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Notifie par email si la simulation prévisionnelle sur 30 jours détecte un solde négatif dans les N prochains jours.
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold text-rose-400">
                    J+{localSettings.cashProjectionDeficitDays}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={5}
                    max={30}
                    step={1}
                    value={localSettings.cashProjectionDeficitDays}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        cashProjectionDeficitDays: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                  <span className="w-28 text-right text-xs font-mono text-slate-300">
                    Sous {localSettings.cashProjectionDeficitDays} jours
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BUDGETS & EXPENDITURE THRESHOLDS */}
          {activeTab === "BUDGETS" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-bold text-sm">
                    Plafonds Mensuels par Catégorie de Charges
                  </h4>
                  <p className="text-xs text-slate-400">
                    Surveillez la consommation de chaque compte de classe 6 et recevez une notification avant le dépassement.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddBudget(!showAddBudget)}
                  className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une catégorie</span>
                </button>
              </div>

              {/* Add category form */}
              {showAddBudget && (
                <div className="bg-slate-950 p-4 rounded-xl border border-sky-800/80 space-y-3">
                  <h5 className="text-xs font-bold text-sky-400">Nouvelle Règle de Budget</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Nom de la catégorie</label>
                      <input
                        type="text"
                        placeholder="Ex: Frais Juridiques & Avocats (622)"
                        value={newBudgetCategory}
                        onChange={(e) => setNewBudgetCategory(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Préfixes de comptes (séparés par virgule)</label>
                      <input
                        type="text"
                        placeholder="Ex: 622, 628"
                        value={newBudgetPrefix}
                        onChange={(e) => setNewBudgetPrefix(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:border-sky-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Plafond mensuel ({company.currency})</label>
                      <input
                        type="number"
                        min={100}
                        step={100}
                        value={newBudgetAmount}
                        onChange={(e) => setNewBudgetAmount(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:border-sky-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Déclencher alerte à (% du budget)</label>
                      <input
                        type="number"
                        min={50}
                        max={100}
                        value={newBudgetPercent}
                        onChange={(e) => setNewBudgetPercent(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:border-sky-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddBudget(false)}
                      className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleAddBudgetCategory}
                      className="bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg"
                    >
                      Enregistrer la règle
                    </button>
                  </div>
                </div>
              )}

              {/* List of active budget thresholds */}
              <div className="space-y-3">
                {localSettings.budgetThresholds.map((budget) => {
                  const actualExpense = getCategoryActualExpense(budget.accountPrefix);
                  const consumptionRate = Math.round((actualExpense / (budget.monthlyBudget || 1)) * 100);
                  const isOverThreshold = consumptionRate >= budget.alertThresholdPercent;

                  return (
                    <div
                      key={budget.id}
                      className={`p-4 rounded-xl border transition ${
                        isOverThreshold
                          ? "bg-rose-950/20 border-rose-800/60"
                          : "bg-slate-950/60 border-slate-800"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={budget.enabled}
                            onChange={() => handleToggleBudget(budget.id)}
                            className="accent-sky-500 rounded cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-white text-xs block">
                              {budget.category}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Comptes : {budget.accountPrefix}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-white block">
                              {actualExpense.toLocaleString("fr-FR")} / {budget.monthlyBudget.toLocaleString("fr-FR")} {company.currency}
                            </span>
                            <span
                              className={`text-[10px] font-semibold ${
                                isOverThreshold ? "text-rose-400" : "text-emerald-400"
                              }`}
                            >
                              {consumptionRate}% consommé (Alerte à {budget.alertThresholdPercent}%)
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteBudgetCategory(budget.id)}
                            className="text-slate-500 hover:text-rose-400 p-1.5 rounded transition"
                            title="Supprimer cette règle de budget"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all ${
                            consumptionRate > 100
                              ? "bg-rose-500"
                              : isOverThreshold
                              ? "bg-amber-500"
                              : "bg-sky-500"
                          }`}
                          style={{ width: `${Math.min(consumptionRate, 100)}%` }}
                        />
                        {/* Threshold mark */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
                          style={{ left: `${budget.alertThresholdPercent}%` }}
                          title={`Seuil d'alerte configuré à ${budget.alertThresholdPercent}%`}
                        />
                      </div>

                      {/* Threshold adjusters */}
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-2 border-t border-slate-800/80 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Plafond :</span>
                          <input
                            type="number"
                            step={100}
                            value={budget.monthlyBudget}
                            onChange={(e) =>
                              handleUpdateBudgetField(budget.id, "monthlyBudget", Number(e.target.value))
                            }
                            className="w-24 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono text-right"
                          />
                          <span className="text-slate-500">{company.currency}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-slate-400">Seuil notification :</span>
                          <input
                            type="number"
                            min={50}
                            max={100}
                            value={budget.alertThresholdPercent}
                            onChange={(e) =>
                              handleUpdateBudgetField(
                                budget.id,
                                "alertThresholdPercent",
                                Number(e.target.value)
                              )
                            }
                            className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white font-mono text-right"
                          />
                          <span className="text-slate-500">%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: EMAIL CONFIG & TEST DISPATCH */}
          {activeTab === "EMAIL" && (
            <div className="space-y-5">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <h4 className="text-white font-bold text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-sky-400" />
                  <span>Destinataire Principal des Alertes</span>
                </h4>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">
                    Adresse e-mail professionnelle (Directeur Général / DAF / Expert)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={localSettings.email}
                      onChange={(e) =>
                        setLocalSettings((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="nom@entreprise.fr"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-sky-500 focus:outline-none"
                    />
                    <label className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.enabled}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({ ...prev, enabled: e.target.checked }))
                        }
                        className="accent-sky-500 rounded"
                      />
                      <span className="text-xs text-slate-300 font-semibold">Activé</span>
                    </label>
                  </div>
                </div>

                {/* Subscriptions */}
                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <span className="font-semibold text-slate-400 block mb-1">
                    Événements déclencheurs d'alertes par e-mail :
                  </span>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.emailOnCashRisk}
                      onChange={(e) =>
                        setLocalSettings((prev) => ({
                          ...prev,
                          emailOnCashRisk: e.target.checked,
                        }))
                      }
                      className="accent-rose-500 rounded"
                    />
                    <div>
                      <span className="text-white font-medium block">
                        Risque de Trésorerie & Découvert Prévisionnel
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Envoyé immédiatement si le runway &lt; {localSettings.cashRunwayAlertMonths} mois ou si le solde projeté passe en négatif.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.emailOnBudgetExceeded}
                      onChange={(e) =>
                        setLocalSettings((prev) => ({
                          ...prev,
                          emailOnBudgetExceeded: e.target.checked,
                        }))
                      }
                      className="accent-amber-500 rounded"
                    />
                    <div>
                      <span className="text-white font-medium block">
                        Dépassement des Budgets de Charges
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Notification dès qu'un poste de charge atteint son seuil d'alerte configuré (80-95%).
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.emailOnFiscalDeadline}
                      onChange={(e) =>
                        setLocalSettings((prev) => ({
                          ...prev,
                          emailOnFiscalDeadline: e.target.checked,
                        }))
                      }
                      className="accent-sky-500 rounded"
                    />
                    <div>
                      <span className="text-white font-medium block">
                        Rappel d'Échéances Fiscales & Sociales (TVA, URSSAF, IS)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Alerte à J-7 avant l'échéance légale pour provisionner les fonds.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Test Dispatch Panel */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-white font-bold text-xs flex items-center justify-between">
                  <span>Tester la Réception d'une Notification</span>
                  <span className="text-[10px] text-slate-500">Validation en direct</span>
                </h4>

                <p className="text-xs text-slate-400">
                  Déclenchez manuellement un e-mail de test pour vérifier la mise en forme et la réception dans votre boîte de réception.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSendingTest}
                    onClick={() => handleSendTestEmail("TEST")}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    <span>Email de validation générique</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSendingTest}
                    onClick={() => handleSendTestEmail("CASH")}
                    className="bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-200 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Simuler Alerte Trésorerie Critique</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSendingTest}
                    onClick={() => handleSendTestEmail("BUDGET")}
                    className="bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 text-amber-200 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <Percent className="w-3.5 h-3.5 text-amber-400" />
                    <span>Simuler Alerte Budget Consommé</span>
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                      testResult.success
                        ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                        : "bg-rose-950/40 border-rose-800 text-rose-300"
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: LOGS & HISTORY */}
          {activeTab === "LOGS" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-bold text-sm">
                    Journal d'Audit des Notifications Transmises
                  </h4>
                  <p className="text-xs text-slate-400">
                    Historique chronologique des alertes envoyées par le moteur autonome.
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {localSettings.notificationHistory.length} envois enregistrés
                </span>
              </div>

              <div className="space-y-2">
                {localSettings.notificationHistory.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            notif.severity === "CRITICAL"
                              ? "bg-rose-400"
                              : notif.severity === "WARNING"
                              ? "bg-amber-400"
                              : "bg-sky-400"
                          }`}
                        />
                        <span className="font-bold text-white">{notif.subject}</span>
                      </div>
                      <p className="text-slate-400 text-[11px] line-clamp-1">
                        {notif.preview}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
                      <div className="text-right font-mono text-[10px] text-slate-500">
                        <div>{new Date(notif.sentAt).toLocaleDateString("fr-FR")}</div>
                        <div>{new Date(notif.sentAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActivePreviewLog(notif)}
                        className="bg-slate-900 hover:bg-slate-800 text-sky-400 p-1.5 rounded-lg border border-slate-800 transition cursor-pointer"
                        title="Voir le corps de l'email"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Email Preview Modal Overlay */}
        {activePreviewLog && (
          <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-sky-400" />
                  <span>Aperçu de l'Email Envoyé</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setActivePreviewLog(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl text-xs space-y-1.5 font-mono">
                <div className="text-slate-400">
                  <span className="text-slate-500">À : </span>
                  <span className="text-sky-300">{activePreviewLog.toEmail}</span>
                </div>
                <div className="text-slate-400">
                  <span className="text-slate-500">Objet : </span>
                  <span className="text-white font-bold">{activePreviewLog.subject}</span>
                </div>
                <div className="text-slate-400">
                  <span className="text-slate-500">Date : </span>
                  <span>{new Date(activePreviewLog.sentAt).toLocaleString("fr-FR")}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                <p>{activePreviewLog.preview}</p>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActivePreviewLog(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-4 py-2 rounded-xl font-semibold cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
            <span>Moteur d'alerte actif et synchronisé</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-lg shadow-sky-500/20 transition cursor-pointer"
            >
              Enregistrer les Paramètres
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
