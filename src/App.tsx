import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { DashboardView } from "./components/DashboardView";
import { AutoScanView } from "./components/AutoScanView";
import { JournalView } from "./components/JournalView";
import { InvoicingView } from "./components/InvoicingView";
import { FinancialStatementsView } from "./components/FinancialStatementsView";
import { TaxComplianceView } from "./components/TaxComplianceView";
import { BankReconcileView } from "./components/BankReconcileView";
import { AiAdvisorView } from "./components/AiAdvisorView";
import { MobileStoreGuideModal } from "./components/MobileStoreGuideModal";
import { AlertSettingsModal } from "./components/AlertSettingsModal";
import { AlertNotificationSettings, defaultAlertSettings } from "./types/alertSettings";
import {
  sampleTransactions,
  sampleCompany,
  sampleBankFeed,
  sampleInvoices,
} from "./data/initialData";
import {
  CompanyProfile,
  JournalTransaction,
  BankTransaction,
  AccountingStandard,
  ClientInvoice,
} from "./types";
import {
  calculateFinancialKPIs,
  detectAccountingAnomalies,
} from "./lib/accountingEngine";
import { convertInvoiceToJournalTransaction } from "./lib/invoicingEngine";
import { Smartphone, Monitor } from "lucide-react";

export default function App() {
  // State initialization
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [journalSearchFilter, setJournalSearchFilter] = useState<string>("");
  const [journalCodeFilter, setJournalCodeFilter] = useState<string>("ALL");

  const [company, setCompany] = useState<CompanyProfile>(() => {
    const saved = localStorage.getItem("compta_company");
    return saved ? JSON.parse(saved) : sampleCompany;
  });

  const [transactions, setTransactions] = useState<JournalTransaction[]>(() => {
    const saved = localStorage.getItem("compta_transactions");
    return saved ? JSON.parse(saved) : sampleTransactions;
  });

  const [invoices, setInvoices] = useState<ClientInvoice[]>(() => {
    const saved = localStorage.getItem("compta_invoices");
    return saved ? JSON.parse(saved) : sampleInvoices;
  });

  const [bankFeed, setBankFeed] = useState<BankTransaction[]>(() => {
    const saved = localStorage.getItem("compta_bankfeed");
    return saved ? JSON.parse(saved) : sampleBankFeed;
  });

  const [alertSettings, setAlertSettings] = useState<AlertNotificationSettings>(() => {
    const saved = localStorage.getItem("compta_alert_settings");
    return saved ? JSON.parse(saved) : defaultAlertSettings;
  });

  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [isMobileSimulator, setIsMobileSimulator] = useState(false);

  // Save changes to LocalStorage
  useEffect(() => {
    localStorage.setItem("compta_company", JSON.stringify(company));
  }, [company]);

  useEffect(() => {
    localStorage.setItem("compta_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("compta_invoices", JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem("compta_bankfeed", JSON.stringify(bankFeed));
  }, [bankFeed]);

  useEffect(() => {
    localStorage.setItem("compta_alert_settings", JSON.stringify(alertSettings));
  }, [alertSettings]);

  // Dynamic calculations
  const kpis = calculateFinancialKPIs(transactions, company.initialCash);
  const anomalies = detectAccountingAnomalies(transactions);
  const isBalanced = transactions.length > 0 && transactions.every((tx) => {
    const totalDebit = tx.lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = tx.lines.reduce((s, l) => s + (l.credit || 0), 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
  });

  // Handlers
  const handleAddTransaction = (newTx: JournalTransaction) => {
    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveInvoice = (savedInvoice: ClientInvoice) => {
    setInvoices((prev) => {
      const idx = prev.findIndex((inv) => inv.id === savedInvoice.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedInvoice;
        return next;
      }
      return [savedInvoice, ...prev];
    });
  };

  const handleDeleteInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  };

  const handleBookInvoiceToJournal = (invoice: ClientInvoice) => {
    const newTx = convertInvoiceToJournalTransaction(invoice, company);
    // Add transaction to journal
    setTransactions((prev) => [newTx, ...prev]);
    // Mark invoice as booked
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoice.id
          ? {
              ...inv,
              isBookedInJournal: true,
              journalTransactionId: newTx.id,
            }
          : inv
      )
    );
  };

  const handleNavigateToJournalWithSearch = (search: string, journalCode = "VE") => {
    setJournalSearchFilter(search);
    setJournalCodeFilter(journalCode);
    setActiveTab("journal");
  };

  const handleStandardChange = (standard: AccountingStandard) => {
    setCompany((prev) => ({
      ...prev,
      accountingStandard: standard,
      currency: standard === "SYSCOHADA" ? "FCFA" : "€",
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSelectTab={setActiveTab}
        company={company}
        setCompany={setCompany}
        isBalanced={isBalanced}
        isMobileSimulator={isMobileSimulator}
        setIsMobileSimulator={setIsMobileSimulator}
        onOpenMobileGuide={() => setIsMobileModalOpen(true)}
        onOpenStoreGuide={() => setIsMobileModalOpen(true)}
        onOpenAlertSettings={() => setIsAlertModalOpen(true)}
      />

      {/* Simulator Switcher Banner (Desktop helper) */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">Moteur Comptable IA en temps réel :</span>
          <span className="text-white font-mono">{transactions.length} écritures chargées</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-[11px]">
            <span className="text-slate-500">Plan Comptable :</span>
            <select
              value={company.accountingStandard}
              onChange={(e) => handleStandardChange(e.target.value as AccountingStandard)}
              className="bg-transparent text-sky-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value="PCG_FR">France (PCG)</option>
              <option value="SYSCOHADA">Afrique OHADA (SYSCOHADA)</option>
              <option value="IFRS">International (IFRS)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileSimulator(!isMobileSimulator)}
            className="text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 transition cursor-pointer text-[11px]"
            title="Basculer l'affichage Simulateur Mobile Smartphone"
          >
            {isMobileSimulator ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">
              {isMobileSimulator ? "Vue Ordinateur" : "Simulateur Mobile"}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {isMobileSimulator ? (
          /* Mobile Device Frame Container */
          <div className="flex justify-center items-center py-4">
            <div className="w-[390px] h-[844px] bg-slate-900 border-[10px] border-slate-800 rounded-[50px] overflow-hidden shadow-2xl flex flex-col relative">
              {/* Smartphone Notch / Dynamic Island */}
              <div className="w-32 h-5 bg-black rounded-b-xl mx-auto z-20 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-slate-900 mr-2" />
                <div className="w-10 h-1 bg-slate-800 rounded-full" />
              </div>

              {/* In-Frame Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {(activeTab === "dashboard" || !activeTab) && (
                  <DashboardView
                    company={company}
                    kpis={kpis}
                    transactions={transactions}
                    anomalies={anomalies}
                    onNavigateTab={setActiveTab}
                    onOpenStoreGuide={() => setIsMobileModalOpen(true)}
                    alertSettings={alertSettings}
                    onSaveAlertSettings={setAlertSettings}
                  />
                )}
                {(activeTab === "autoscan" || activeTab === "scan") && (
                  <AutoScanView
                    company={company}
                    onAddTransaction={handleAddTransaction}
                    onNavigateTab={setActiveTab}
                  />
                )}
                {(activeTab === "invoicing" || activeTab === "invoices" || activeTab === "facturation") && (
                  <InvoicingView
                    invoices={invoices}
                    company={company}
                    transactions={transactions}
                    onSaveInvoice={handleSaveInvoice}
                    onDeleteInvoice={handleDeleteInvoice}
                    onBookToJournal={handleBookInvoiceToJournal}
                    onNavigateTab={handleNavigateToJournalWithSearch}
                    onNavigateToJournal={handleNavigateToJournalWithSearch}
                  />
                )}
                {activeTab === "journal" && (
                  <JournalView
                    transactions={transactions}
                    company={company}
                    onAddTransaction={handleAddTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                    initialSearchQuery={journalSearchFilter}
                    initialJournalFilter={journalCodeFilter}
                    onNavigateTab={setActiveTab}
                  />
                )}
                {activeTab === "statements" && (
                  <FinancialStatementsView
                    company={company}
                    kpis={kpis}
                    transactions={transactions}
                  />
                )}
                {(activeTab === "compliance" || activeTab === "tax") && (
                  <TaxComplianceView
                    company={company}
                    kpis={kpis}
                    transactions={transactions}
                  />
                )}
                {(activeTab === "reconcile" || activeTab === "bank") && (
                  <BankReconcileView
                    bankFeed={bankFeed}
                    setBankFeed={setBankFeed}
                    transactions={transactions}
                    setTransactions={setTransactions}
                    company={company}
                  />
                )}
                {activeTab === "advisor" && (
                  <AiAdvisorView
                    company={company}
                    kpis={kpis}
                    transactions={transactions}
                    anomalies={anomalies}
                  />
                )}
              </div>

              {/* Bottom Home Indicator */}
              <div className="w-32 h-1 bg-slate-700 rounded-full mx-auto my-2" />
            </div>
          </div>
        ) : (
          /* Normal Responsive View */
          <div>
            {(activeTab === "dashboard" || !activeTab) && (
              <DashboardView
                company={company}
                kpis={kpis}
                transactions={transactions}
                anomalies={anomalies}
                onNavigateTab={setActiveTab}
                onOpenStoreGuide={() => setIsMobileModalOpen(true)}
                alertSettings={alertSettings}
                onSaveAlertSettings={setAlertSettings}
              />
            )}
            {(activeTab === "autoscan" || activeTab === "scan") && (
              <AutoScanView
                company={company}
                onAddTransaction={handleAddTransaction}
                onNavigateTab={setActiveTab}
              />
            )}
            {(activeTab === "invoicing" || activeTab === "invoices" || activeTab === "facturation") && (
              <InvoicingView
                invoices={invoices}
                company={company}
                transactions={transactions}
                onSaveInvoice={handleSaveInvoice}
                onDeleteInvoice={handleDeleteInvoice}
                onBookToJournal={handleBookInvoiceToJournal}
                onNavigateTab={handleNavigateToJournalWithSearch}
                onNavigateToJournal={handleNavigateToJournalWithSearch}
              />
            )}
            {activeTab === "journal" && (
              <JournalView
                transactions={transactions}
                company={company}
                onAddTransaction={handleAddTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                initialSearchQuery={journalSearchFilter}
                initialJournalFilter={journalCodeFilter}
                onNavigateTab={setActiveTab}
              />
            )}
            {activeTab === "statements" && (
              <FinancialStatementsView
                company={company}
                kpis={kpis}
                transactions={transactions}
              />
            )}
            {(activeTab === "compliance" || activeTab === "tax") && (
              <TaxComplianceView
                company={company}
                kpis={kpis}
                transactions={transactions}
              />
            )}
            {(activeTab === "reconcile" || activeTab === "bank") && (
              <BankReconcileView
                bankFeed={bankFeed}
                setBankFeed={setBankFeed}
                transactions={transactions}
                setTransactions={setTransactions}
                company={company}
              />
            )}
            {activeTab === "advisor" && (
              <AiAdvisorView
                company={company}
                kpis={kpis}
                transactions={transactions}
                anomalies={anomalies}
              />
            )}
          </div>
        )}
      </main>

      {/* Alert & Thresholds Settings Modal */}
      <AlertSettingsModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        settings={alertSettings}
        onSaveSettings={setAlertSettings}
        company={company}
        kpis={kpis}
        transactions={transactions}
      />

      {/* Mobile App Store & Play Store Guide Modal */}
      <MobileStoreGuideModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        onToggleSimulator={() => setIsMobileSimulator(true)}
      />
    </div>
  );
}
