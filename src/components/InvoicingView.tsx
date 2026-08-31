import React, { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Printer,
  Download,
  Copy,
  Trash2,
  Edit3,
  Building2,
  UserCheck,
  Send,
  Sparkles,
  Layers,
  DollarSign,
  FileSpreadsheet,
  X,
  ChevronDown,
  Calendar,
  CreditCard,
  Check,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  ClientInvoice,
  InvoiceLineItem,
  InvoiceClient,
  CompanyProfile,
  JournalTransaction,
  InvoiceStatus,
  InvoiceDocType,
} from "../types";
import {
  calculateInvoiceTotals,
  generateNextInvoiceNumber,
  convertInvoiceToJournalTransaction,
  presetInvoiceItems,
} from "../lib/invoicingEngine";
import { sampleClients } from "../data/initialData";

interface InvoicingViewProps {
  invoices: ClientInvoice[];
  onSaveInvoice: (invoice: ClientInvoice) => void;
  onDeleteInvoice: (id: string) => void;
  onBookToJournal: (invoice: ClientInvoice) => void;
  onNavigateTab?: (tab: string, searchFilter?: string) => void;
  onNavigateToJournal?: (tab: string, searchFilter?: string) => void;
  company: CompanyProfile;
  transactions?: JournalTransaction[];
}

export const InvoicingView: React.FC<InvoicingViewProps> = ({
  invoices,
  onSaveInvoice,
  onDeleteInvoice,
  onBookToJournal,
  onNavigateTab,
  onNavigateToJournal,
  company,
  transactions = [],
}) => {
  const handleNavigate = (tab: string, searchFilter?: string) => {
    if (typeof onNavigateTab === "function") {
      onNavigateTab(tab, searchFilter);
    } else if (typeof onNavigateToJournal === "function") {
      onNavigateToJournal(tab, searchFilter);
    }
  };

  const [activeSubTab, setActiveSubTab] = useState<"ALL" | "INVOICE" | "QUOTE" | "PAID" | "UNBOOKED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  
  // Modal states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<ClientInvoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<ClientInvoice | null>(null);
  const [bookingInvoice, setBookingInvoice] = useState<ClientInvoice | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for Invoice Creator / Editor
  const [formType, setFormType] = useState<InvoiceDocType>("INVOICE");
  const [formNumber, setFormNumber] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [formClient, setFormClient] = useState<InvoiceClient>(sampleClients[0]);
  const [formCurrency, setFormCurrency] = useState<string>(company.currency || "EUR");
  const [formPaymentTerms, setFormPaymentTerms] = useState("Paiement à 30 jours date d'émission");
  const [formPaymentMethod, setFormPaymentMethod] = useState<"VIREMENT" | "CARTE" | "PRELEVEMENT" | "CHEQUE" | "ESPECES">("VIREMENT");
  const [formNotes, setFormNotes] = useState("Merci pour votre confiance. En cas de question, contactez notre service comptable.");
  const [formLegalNotice, setFormLegalNotice] = useState(
    "TVA acquittée sur les débits. En cas de retard de paiement, indemnité forfaitaire pour frais de recouvrement de 40 € (Art. D. 441-5 C. com.) et pénalités de 3 fois le taux d'intérêt légal."
  );
  const [formItems, setFormItems] = useState<InvoiceLineItem[]>([
    {
      id: "item-init-1",
      description: "Prestation de conseil stratégique et audit d'architecture IA",
      quantity: 1,
      unit: "forfait",
      unitPriceHT: 8500,
      vatRate: company.accountingStandard === "SYSCOHADA" ? 18 : 20,
      discountPct: 0,
      amountHT: 8500,
      amountTVA: (8500 * (company.accountingStandard === "SYSCOHADA" ? 18 : 20)) / 100,
      amountTTC: 8500 * (1 + (company.accountingStandard === "SYSCOHADA" ? 0.18 : 0.2)),
      accountCode: "706000",
    },
  ]);

  // Live computed totals for the active form
  const formTotals = useMemo(() => {
    return calculateInvoiceTotals(formItems);
  }, [formItems]);

  // Show Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Open Invoice Creation Form
  const handleOpenCreateModal = (type: InvoiceDocType = "INVOICE") => {
    const nextNumber = generateNextInvoiceNumber(invoices, type);
    setFormType(type);
    setFormNumber(nextNumber);
    setFormDate(new Date().toISOString().split("T")[0]);
    const d = new Date();
    d.setDate(d.getDate() + (type === "QUOTE" ? 15 : 30));
    setFormDueDate(d.toISOString().split("T")[0]);
    setFormClient(sampleClients[0]);
    setFormCurrency(company.currency || "EUR");
    setFormPaymentTerms(type === "QUOTE" ? "Proposition valable 30 jours - Acompte 30%" : "Paiement à 30 jours date d'émission");
    setFormNotes(type === "QUOTE" ? "Devis soumis aux conditions générales de vente." : "Merci pour votre confiance.");
    setFormItems([
      {
        id: `item-${Date.now()}`,
        description: "Prestation d'ingénierie & Développement IA",
        quantity: 5,
        unit: "jour",
        unitPriceHT: 1200,
        vatRate: company.accountingStandard === "SYSCOHADA" ? 18 : 20,
        discountPct: 0,
        amountHT: 6000,
        amountTVA: (6000 * (company.accountingStandard === "SYSCOHADA" ? 18 : 20)) / 100,
        amountTTC: 6000 * (1 + (company.accountingStandard === "SYSCOHADA" ? 0.18 : 0.2)),
        accountCode: "706000",
      },
    ]);
    setEditingInvoice(null);
    setIsEditorOpen(true);
  };

  // Open Invoice Edit Form
  const handleOpenEditModal = (inv: ClientInvoice) => {
    setEditingInvoice(inv);
    setFormType(inv.type);
    setFormNumber(inv.number);
    setFormDate(inv.date);
    setFormDueDate(inv.dueDate);
    setFormClient(inv.client);
    setFormCurrency(inv.currency);
    setFormPaymentTerms(inv.paymentTerms);
    setFormPaymentMethod(inv.paymentMethod);
    setFormNotes(inv.notes || "");
    setFormLegalNotice(inv.legalNotice || "");
    setFormItems(inv.items);
    setIsEditorOpen(true);
  };

  // Save Invoice (Create or Update)
  const handleSaveForm = () => {
    if (!formNumber.trim() || !formClient.name.trim() || formItems.length === 0) {
      alert("Veuillez remplir le numéro, le client et au moins une ligne de facturation.");
      return;
    }

    const { totalBrutHT, totalDiscount, totalHT, totalTVA, totalTTC, taxesSummary, computedItems } =
      calculateInvoiceTotals(formItems);

    const invoiceToSave: ClientInvoice = {
      id: editingInvoice ? editingInvoice.id : `INV-${Date.now()}`,
      number: formNumber.trim(),
      type: formType,
      date: formDate,
      dueDate: formDueDate,
      client: formClient,
      items: computedItems,
      currency: formCurrency,
      exchangeRate: 1.0,
      totalBrutHT,
      totalDiscount,
      totalHT,
      totalTVA,
      totalTTC,
      taxesSummary,
      status: editingInvoice ? editingInvoice.status : formType === "QUOTE" ? "DRAFT" : "SENT",
      paymentMethod: formPaymentMethod,
      paymentTerms: formPaymentTerms,
      notes: formNotes,
      legalNotice: formLegalNotice,
      bankDetails: {
        bankName: "BNP PARIBAS BANQUE ENTREPRISES",
        iban: "FR76 3000 4001 2300 0123 4567 890",
        bic: "BNPAFRPP",
      },
      journalTransactionId: editingInvoice?.journalTransactionId,
      isBookedInJournal: editingInvoice?.isBookedInJournal || false,
      createdAt: editingInvoice ? editingInvoice.createdAt : new Date().toISOString(),
      paidAt: editingInvoice?.paidAt,
    };

    onSaveInvoice(invoiceToSave);
    setIsEditorOpen(false);
    showToast(`✅ Facture ${invoiceToSave.number} enregistrée avec succès.`);
  };

  // Convert Quote (Devis) to Invoice
  const handleConvertQuoteToInvoice = (quote: ClientInvoice) => {
    const nextInvoiceNum = generateNextInvoiceNumber(invoices, "INVOICE");
    const d = new Date();
    d.setDate(d.getDate() + 30);

    const convertedInvoice: ClientInvoice = {
      ...quote,
      id: `INV-${Date.now()}`,
      number: nextInvoiceNum,
      type: "INVOICE",
      date: new Date().toISOString().split("T")[0],
      dueDate: d.toISOString().split("T")[0],
      status: "SENT",
      paymentTerms: "Paiement à 30 jours date d'émission",
      notes: `Facture générée suite à validation du devis ${quote.number}.`,
      isBookedInJournal: false,
      journalTransactionId: undefined,
      createdAt: new Date().toISOString(),
    };

    onSaveInvoice(convertedInvoice);
    showToast(`🎉 Devis ${quote.number} converti avec succès en Facture ${nextInvoiceNum} !`);
  };

  // Duplicate Invoice
  const handleDuplicateInvoice = (inv: ClientInvoice) => {
    const nextNum = generateNextInvoiceNumber(invoices, inv.type);
    const duplicated: ClientInvoice = {
      ...inv,
      id: `INV-${Date.now()}`,
      number: nextNum,
      date: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      status: "DRAFT",
      isBookedInJournal: false,
      journalTransactionId: undefined,
      paidAt: undefined,
      createdAt: new Date().toISOString(),
    };
    onSaveInvoice(duplicated);
    showToast(`📋 Facture dupliquée sous le numéro ${nextNum}.`);
  };

  // Mark as Paid
  const handleMarkAsPaid = (inv: ClientInvoice) => {
    const updated: ClientInvoice = {
      ...inv,
      status: "PAID",
      paidAt: new Date().toISOString(),
    };
    onSaveInvoice(updated);
    showToast(`💰 Facture ${inv.number} marquée comme réglée.`);
  };

  // Book into Journal (Instant Accounting Entry)
  const handleConfirmBookToJournal = (inv: ClientInvoice) => {
    onBookToJournal(inv);
    setBookingInvoice(null);
    showToast(`⚡ Écriture comptable générée avec succès dans le Journal des Ventes (VE) !`);
  };

  // Items manipulation helpers
  const handleAddItemLine = () => {
    setFormItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: "Nouvelle prestation",
        quantity: 1,
        unit: "forfait",
        unitPriceHT: 500,
        vatRate: company.accountingStandard === "SYSCOHADA" ? 18 : 20,
        discountPct: 0,
        amountHT: 500,
        amountTVA: (500 * (company.accountingStandard === "SYSCOHADA" ? 18 : 20)) / 100,
        amountTTC: 500 * (1 + (company.accountingStandard === "SYSCOHADA" ? 0.18 : 0.2)),
        accountCode: "706000",
      },
    ]);
  };

  const handleUpdateItemLine = (index: number, field: keyof InvoiceLineItem, value: any) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveItemLine = (index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInsertPreset = (preset: typeof presetInvoiceItems[0]) => {
    setFormItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: preset.description,
        quantity: preset.quantity,
        unit: preset.unit,
        unitPriceHT: preset.unitPriceHT,
        vatRate: preset.vatRate,
        discountPct: 0,
        amountHT: preset.quantity * preset.unitPriceHT,
        amountTVA: (preset.quantity * preset.unitPriceHT * preset.vatRate) / 100,
        amountTTC: preset.quantity * preset.unitPriceHT * (1 + preset.vatRate / 100),
        accountCode: "706000",
      },
    ]);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    let totalInvoicedHT = 0;
    let totalInvoicedTTC = 0;
    let totalPaidTTC = 0;
    let totalPendingTTC = 0;
    let totalOverdueTTC = 0;
    let unbookedCount = 0;

    const todayStr = new Date().toISOString().split("T")[0];

    invoices.forEach((inv) => {
      if (inv.type === "INVOICE") {
        totalInvoicedHT += inv.totalHT;
        totalInvoicedTTC += inv.totalTTC;

        if (inv.status === "PAID") {
          totalPaidTTC += inv.totalTTC;
        } else if (inv.status !== "CANCELLED") {
          totalPendingTTC += inv.totalTTC;
          if (inv.dueDate < todayStr) {
            totalOverdueTTC += inv.totalTTC;
          }
        }

        if (!inv.isBookedInJournal) {
          unbookedCount++;
        }
      }
    });

    return {
      totalInvoicedHT,
      totalInvoicedTTC,
      totalPaidTTC,
      totalPendingTTC,
      totalOverdueTTC,
      unbookedCount,
    };
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Subtab filter
      if (activeSubTab === "INVOICE" && inv.type !== "INVOICE") return false;
      if (activeSubTab === "QUOTE" && inv.type !== "QUOTE") return false;
      if (activeSubTab === "PAID" && inv.status !== "PAID") return false;
      if (activeSubTab === "UNBOOKED" && (inv.isBookedInJournal || inv.type !== "INVOICE")) return false;

      // Status dropdown filter
      if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesClient = inv.client.name.toLowerCase().includes(q) || inv.client.city.toLowerCase().includes(q);
        const matchesNumber = inv.number.toLowerCase().includes(q);
        const matchesItem = inv.items.some((it) => it.description.toLowerCase().includes(q));
        if (!matchesClient && !matchesNumber && !matchesItem) return false;
      }

      return true;
    });
  }, [invoices, activeSubTab, statusFilter, searchQuery]);

  const formatCurrency = (amt: number, curr: string = "EUR") => {
    const symbol = curr === "EUR" ? "€" : curr === "USD" ? "$" : curr === "GBP" ? "£" : curr === "XOF" ? "FCFA" : curr;
    return `${amt.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-sky-500/50 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>Facturation & Devis Clients</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
                    Génération & Écritures 1-Clic
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Édition de factures conformes Factur-X & intégration automatique instantanée au Journal des Ventes ({company.accountingStandard || "PCG"}).
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleOpenCreateModal("QUOTE")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Devis</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenCreateModal("INVOICE")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-lg shadow-sky-600/25 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Créer une Facture</span>
            </button>
          </div>
        </div>

        {/* Informative quick link */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Émetteur : <strong className="text-white">{company.name}</strong> ({company.siren})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Norme : <strong className="text-amber-300">{company.accountingStandard || "PCG"}</strong></span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleNavigate("journal", "VE")}
            className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
          >
            <span>Accéder directement au Journal des Ventes (VE)</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Facturé */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Total Facturé (TTC)
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {formatCurrency(stats.totalInvoicedTTC)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Montant HT : {formatCurrency(stats.totalInvoicedHT)}</span>
            <span className="text-emerald-400 font-medium">{invoices.filter((i) => i.type === "INVOICE").length} factures</span>
          </div>
        </div>

        {/* Total Encaissé */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Encaissé / Réglé
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {formatCurrency(stats.totalPaidTTC)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Taux de recouvrement</span>
            <span className="text-emerald-400 font-bold">
              {stats.totalInvoicedTTC > 0 ? Math.round((stats.totalPaidTTC / stats.totalInvoicedTTC) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Créances en Attente */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Créances Clients (411)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300 font-mono">
              {formatCurrency(stats.totalPendingTTC)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>En attente d'échéance</span>
            <span className="text-amber-400 font-semibold">{invoices.filter((i) => i.status === "SENT").length} factures</span>
          </div>
        </div>

        {/* Factures à Comptabiliser */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Comptabilité Journal
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-300 font-mono">
              {invoices.filter((i) => i.type === "INVOICE" && i.isBookedInJournal).length} / {invoices.filter((i) => i.type === "INVOICE").length}
            </span>
            <span className="text-xs text-indigo-400 font-medium">Comptabilisées</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>À transférer au Journal :</span>
            <span className={`font-bold ${stats.unbookedCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {stats.unbookedCount} en attente
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Search Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Sub-tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveSubTab("ALL")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeSubTab === "ALL"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Toutes ({invoices.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("INVOICE")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeSubTab === "INVOICE"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Factures ({invoices.filter((i) => i.type === "INVOICE").length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("QUOTE")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeSubTab === "QUOTE"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Devis ({invoices.filter((i) => i.type === "QUOTE").length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("UNBOOKED")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeSubTab === "UNBOOKED"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Non Comptabilisées ({stats.unbookedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("PAID")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                activeSubTab === "PAID"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Payées ({invoices.filter((i) => i.status === "PAID").length})
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher client, N° pièce, item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="DRAFT">Brouillon</option>
              <option value="SENT">Envoyée (En attente)</option>
              <option value="PAID">Payée</option>
              <option value="OVERDUE">En retard</option>
              <option value="CANCELLED">Annulée</option>
            </select>
          </div>
        </div>

        {/* Invoices List Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-3 font-semibold">Numéro / Type</th>
                <th className="py-3 px-3 font-semibold">Date & Échéance</th>
                <th className="py-3 px-3 font-semibold">Client</th>
                <th className="py-3 px-3 font-semibold">Montant HT</th>
                <th className="py-3 px-3 font-semibold">TVA (Taux)</th>
                <th className="py-3 px-3 font-semibold">Net à Payer (TTC)</th>
                <th className="py-3 px-3 font-semibold">Statut</th>
                <th className="py-3 px-3 font-semibold">Liaison Journal</th>
                <th className="py-3 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-300">Aucune facture ou devis trouvé.</p>
                    <p className="text-[11px] text-slate-500 mt-1">Créez votre première facture avec le bouton ci-dessus.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                    {/* Numéro / Type */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inv.type === "QUOTE"
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : inv.type === "CREDIT_NOTE"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          }`}
                        >
                          {inv.type === "QUOTE" ? "DEVIS" : inv.type === "CREDIT_NOTE" ? "AVOIR" : "FACTURE"}
                        </span>
                        <span className="font-mono font-bold text-white text-xs">{inv.number}</span>
                      </div>
                    </td>

                    {/* Date & DueDate */}
                    <td className="py-3 px-3">
                      <div className="font-mono text-slate-300 text-[11px]">{inv.date}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Échéance: {inv.dueDate}</span>
                      </div>
                    </td>

                    {/* Client */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-200 truncate max-w-[200px]" title={inv.client.name}>
                        {inv.client.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                        {inv.client.city} {inv.client.country ? `(${inv.client.country})` : ""}
                      </div>
                    </td>

                    {/* Montant HT */}
                    <td className="py-3 px-3 font-mono font-medium text-slate-300">
                      {formatCurrency(inv.totalHT, inv.currency)}
                    </td>

                    {/* TVA */}
                    <td className="py-3 px-3">
                      <div className="font-mono text-slate-300">{formatCurrency(inv.totalTVA, inv.currency)}</div>
                      <div className="text-[10px] text-slate-500">
                        {inv.taxesSummary.map((t) => `${t.vatRate}%`).join(", ") || "0%"}
                      </div>
                    </td>

                    {/* Net à Payer (TTC) */}
                    <td className="py-3 px-3 font-mono font-black text-white text-sm">
                      {formatCurrency(inv.totalTTC, inv.currency)}
                    </td>

                    {/* Statut */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : inv.status === "SENT"
                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            : inv.status === "OVERDUE"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-slate-700/50 text-slate-300 border border-slate-600"
                        }`}
                      >
                        {inv.status === "PAID" && <CheckCircle2 className="w-3 h-3" />}
                        {inv.status === "SENT" && <Clock className="w-3 h-3" />}
                        {inv.status === "OVERDUE" && <AlertTriangle className="w-3 h-3" />}
                        {inv.status === "PAID" ? "Payée" : inv.status === "SENT" ? "Envoyée" : inv.status === "DRAFT" ? "Brouillon" : "Échue"}
                      </span>
                    </td>

                    {/* Liaison Journal */}
                    <td className="py-3 px-3">
                      {inv.isBookedInJournal ? (
                        <button
                          type="button"
                          onClick={() => handleNavigate("journal", inv.number)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition cursor-pointer"
                          title="Cliquer pour voir l'écriture dans le Journal des Ventes"
                        >
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Comptabilisée (VE)</span>
                          <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                        </button>
                      ) : inv.type === "INVOICE" ? (
                        <button
                          type="button"
                          onClick={() => setBookingInvoice(inv)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition cursor-pointer shadow-sm"
                          title="Générer l'écriture comptable automatique au débit du 411 et crédit du 706/44571"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                          <span>Comptabiliser</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Devis (Hors bilan)</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Preview / Print */}
                        <button
                          type="button"
                          onClick={() => setPreviewInvoice(inv)}
                          className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition"
                          title="Visualiser et Imprimer / Exporter PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Convert Quote to Invoice */}
                        {inv.type === "QUOTE" && (
                          <button
                            type="button"
                            onClick={() => handleConvertQuoteToInvoice(inv)}
                            className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition"
                            title="Convertir le devis en Facture"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Mark as Paid */}
                        {inv.status !== "PAID" && inv.type === "INVOICE" && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsPaid(inv)}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded-lg transition"
                            title="Marquer comme payée"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={() => handleDuplicateInvoice(inv)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                          title="Dupliquer la facture"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(inv)}
                          className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition"
                          title="Modifier"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Supprimer la facture ${inv.number} ?`)) {
                              onDeleteInvoice(inv.id);
                              showToast(`🗑️ Facture ${inv.number} supprimée.`);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Full Invoice Editor / Creator */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-base">
                    {editingInvoice ? `Modifier ${editingInvoice.number}` : formType === "QUOTE" ? "Nouveau Devis Commercial" : "Créer une Nouvelle Facture Client"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Calcul automatique de la TVA ({company.accountingStandard || "PCG"}) et génération de l'écriture de vente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs">
              {/* Document Type & Reference Details */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-950/70 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Type de Document</label>
                  <select
                    value={formType}
                    onChange={(e) => {
                      const newType = e.target.value as InvoiceDocType;
                      setFormType(newType);
                      if (!editingInvoice) {
                        setFormNumber(generateNextInvoiceNumber(invoices, newType));
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-semibold focus:outline-none focus:border-sky-500"
                  >
                    <option value="INVOICE">Facture de Vente</option>
                    <option value="QUOTE">Devis Commercial</option>
                    <option value="CREDIT_NOTE">Avoir / Note de Crédit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Numéro de Pièce</label>
                  <input
                    type="text"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Date d'Émission</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Date d'Échéance</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Client Selector & Details */}
              <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-sky-400" />
                    <span>Informations Client (Débiteur)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Sélection rapide :</span>
                    <select
                      onChange={(e) => {
                        const cl = sampleClients.find((c) => c.name === e.target.value);
                        if (cl) setFormClient(cl);
                      }}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-300 font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      {sampleClients.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name} ({c.city})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Nom du Client / Raison Sociale</label>
                    <input
                      type="text"
                      value={formClient.name}
                      onChange={(e) => setFormClient({ ...formClient, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-medium focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Email de Facturation</label>
                    <input
                      type="email"
                      value={formClient.email}
                      onChange={(e) => setFormClient({ ...formClient, email: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">N° TVA Intracommunautaire / SIREN</label>
                    <input
                      type="text"
                      value={formClient.vatNumber || formClient.siren || ""}
                      onChange={(e) => setFormClient({ ...formClient, vatNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 text-[11px] mb-1">Adresse de facturation</label>
                    <input
                      type="text"
                      value={formClient.address}
                      onChange={(e) => setFormClient({ ...formClient, address: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Ville</label>
                      <input
                        type="text"
                        value={formClient.city}
                        onChange={(e) => setFormClient({ ...formClient, city: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Pays</label>
                      <input
                        type="text"
                        value={formClient.country}
                        onChange={(e) => setFormClient({ ...formClient, country: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items & Auto Tax Engine */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <span>Lignes de Prestations & Calcul Automatique de TVA</span>
                    </h3>
                    <p className="text-slate-400 text-[11px]">
                      TVA et totaux recalculés en direct selon les règles fiscales ({company.accountingStandard || "PCG"}).
                    </p>
                  </div>

                  {/* Preset Catalogue Insert */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Catalogue type :</span>
                    <select
                      onChange={(e) => {
                        const p = presetInvoiceItems.find((item) => item.title === e.target.value);
                        if (p) {
                          handleInsertPreset(p);
                          e.target.value = "";
                        }
                      }}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-sky-400 font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="">+ Insérer modèle rapide...</option>
                      {presetInvoiceItems.map((p) => (
                        <option key={p.title} value={p.title}>
                          {p.title} ({p.unitPriceHT} €)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <th className="py-2.5 px-3 font-semibold min-w-[200px]">Description</th>
                        <th className="py-2.5 px-2 font-semibold w-20">Qté</th>
                        <th className="py-2.5 px-2 font-semibold w-20">Unité</th>
                        <th className="py-2.5 px-3 font-semibold w-28">Prix Unit. HT</th>
                        <th className="py-2.5 px-2 font-semibold w-24">TVA (%)</th>
                        <th className="py-2.5 px-2 font-semibold w-20">Remise (%)</th>
                        <th className="py-2.5 px-3 font-semibold w-28 text-right">Total HT</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/80">
                      {formItems.map((item, idx) => {
                        const lineHT = (Number(item.quantity) || 0) * (Number(item.unitPriceHT) || 0) * (1 - (Number(item.discountPct) || 0) / 100);
                        return (
                          <tr key={item.id} className="hover:bg-slate-800/30">
                            {/* Description */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleUpdateItemLine(idx, "description", e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white focus:outline-none focus:border-sky-500"
                                placeholder="Description de la prestation..."
                              />
                            </td>

                            {/* Qty */}
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="0.1"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItemLine(idx, "quantity", parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono text-center focus:outline-none focus:border-sky-500"
                              />
                            </td>

                            {/* Unit */}
                            <td className="py-2 px-2">
                              <select
                                value={item.unit || "jour"}
                                onChange={(e) => handleUpdateItemLine(idx, "unit", e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-300 text-center focus:outline-none focus:border-sky-500"
                              >
                                <option value="jour">jour</option>
                                <option value="heure">heure</option>
                                <option value="forfait">forfait</option>
                                <option value="mois">mois</option>
                                <option value="unité">unité</option>
                              </select>
                            </td>

                            {/* Unit Price HT */}
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.unitPriceHT}
                                onChange={(e) => handleUpdateItemLine(idx, "unitPriceHT", parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono text-right focus:outline-none focus:border-sky-500"
                              />
                            </td>

                            {/* TVA Rate */}
                            <td className="py-2 px-2">
                              <select
                                value={item.vatRate}
                                onChange={(e) => handleUpdateItemLine(idx, "vatRate", parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-white font-mono text-center focus:outline-none focus:border-sky-500"
                              >
                                <option value="20">20% (Normal)</option>
                                <option value="18">18% (SYSCOHADA)</option>
                                <option value="10">10% (Intermédiaire)</option>
                                <option value="5.5">5.5% (Réduit)</option>
                                <option value="0">0% (Exonéré / Export)</option>
                              </select>
                            </td>

                            {/* Discount */}
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discountPct || 0}
                                onChange={(e) => handleUpdateItemLine(idx, "discountPct", parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono text-center focus:outline-none focus:border-sky-500"
                              />
                            </td>

                            {/* Line Total HT */}
                            <td className="py-2 px-3 text-right font-mono font-bold text-white">
                              {lineHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                            </td>

                            {/* Remove button */}
                            <td className="py-2 px-2 text-center">
                              {formItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemLine(idx)}
                                  className="text-slate-500 hover:text-rose-400 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={handleAddItemLine}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une ligne de prestation</span>
                </button>
              </div>

              {/* Totals & Tax Summary Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Notes and Payment Terms */}
                <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2.5">
                  <span className="font-bold text-slate-300 block">Modalités & Mentions Légales</span>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Conditions de Paiement</label>
                    <input
                      type="text"
                      value={formPaymentTerms}
                      onChange={(e) => setFormPaymentTerms(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Notes / Instructions client</label>
                    <textarea
                      rows={2}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200"
                    />
                  </div>
                </div>

                {/* Live Totals Card */}
                <div className="p-4 bg-gradient-to-br from-slate-950 to-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Total Brut HT :</span>
                    <span className="font-mono">{formatCurrency(formTotals.totalBrutHT)}</span>
                  </div>
                  {formTotals.totalDiscount > 0 && (
                    <div className="flex items-center justify-between text-rose-400">
                      <span>Remise accordée :</span>
                      <span className="font-mono">-{formatCurrency(formTotals.totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-white font-semibold pt-1 border-t border-slate-800">
                    <span>Total Net HT :</span>
                    <span className="font-mono">{formatCurrency(formTotals.totalHT)}</span>
                  </div>

                  {/* Taxes details */}
                  {formTotals.taxesSummary.map((tax) => (
                    <div key={tax.vatRate} className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>TVA collectée ({tax.vatRate}% sur {formatCurrency(tax.baseAmountHT)}) :</span>
                      <span className="font-mono">{formatCurrency(tax.taxAmount)}</span>
                    </div>
                  ))}

                  <div className="flex items-center justify-between text-base font-black text-emerald-400 pt-2 border-t border-slate-700">
                    <span>Net à Payer (TTC) :</span>
                    <span className="font-mono text-lg">{formatCurrency(formTotals.totalTTC)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition cursor-pointer"
              >
                Annuler
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveForm}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-lg shadow-sky-600/25 transition cursor-pointer"
                >
                  Enregistrer {formType === "QUOTE" ? "le devis" : "la facture"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Full WYSIWYG Print & PDF Preview */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header Toolbar */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-sky-400" />
                <span className="font-bold text-white text-sm">
                  Aperçu Document Officiel : {previewInvoice.number}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition cursor-pointer shadow-md"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewInvoice(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body (Clean High-Contrast White Sheet) */}
            <div className="p-8 overflow-y-auto bg-white text-slate-900 font-sans space-y-6">
              {/* Top Row: Company & Invoice Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{company.name}</h2>
                  <p className="text-xs text-slate-600 mt-1">{company.legalForm}</p>
                  <p className="text-xs text-slate-600">SIREN : {company.siren} | TVA : {company.vatNumber}</p>
                  <p className="text-xs text-slate-600">Norme Comptable : {company.accountingStandard || "PCG"}</p>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 rounded bg-slate-100 text-slate-800 font-bold text-sm tracking-wider uppercase mb-1">
                    {previewInvoice.type === "QUOTE" ? "DEVIS COMMERCIAL" : "FACTURE CLIENT"}
                  </div>
                  <p className="text-sm font-mono font-black text-sky-800">N° {previewInvoice.number}</p>
                  <p className="text-xs text-slate-500 mt-1">Date : {previewInvoice.date}</p>
                  <p className="text-xs text-slate-500">Échéance : <strong>{previewInvoice.dueDate}</strong></p>
                </div>
              </div>

              {/* Client Billing Address Box */}
              <div className="grid grid-cols-2 gap-6">
                <div></div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Facturer à (Client) :
                  </span>
                  <p className="text-sm font-bold text-slate-900">{previewInvoice.client.name}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{previewInvoice.client.address}</p>
                  <p className="text-xs text-slate-600">{previewInvoice.client.zipCode} {previewInvoice.client.city}, {previewInvoice.client.country}</p>
                  {previewInvoice.client.vatNumber && (
                    <p className="text-xs text-slate-500 font-mono mt-1">N° TVA : {previewInvoice.client.vatNumber}</p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                    <th className="py-2.5 px-3 font-bold">Désignation</th>
                    <th className="py-2.5 px-2 font-bold text-center">Qté</th>
                    <th className="py-2.5 px-3 font-bold text-right">Prix Unit. HT</th>
                    <th className="py-2.5 px-2 font-bold text-center">TVA</th>
                    <th className="py-2.5 px-3 font-bold text-right">Total HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {previewInvoice.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-3 px-3 font-medium text-slate-800">{it.description}</td>
                      <td className="py-3 px-2 text-center text-slate-600">{it.quantity} {it.unit || ""}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">{it.unitPriceHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                      <td className="py-3 px-2 text-center font-mono text-slate-600">{it.vatRate}%</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{it.amountHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals & Tax Recap */}
              <div className="flex justify-end pt-2">
                <div className="w-72 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Brut HT :</span>
                    <span className="font-mono">{formatCurrency(previewInvoice.totalBrutHT)}</span>
                  </div>
                  {previewInvoice.totalDiscount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Remise :</span>
                      <span className="font-mono">-{formatCurrency(previewInvoice.totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                    <span>Total Net HT :</span>
                    <span className="font-mono">{formatCurrency(previewInvoice.totalHT)}</span>
                  </div>
                  {previewInvoice.taxesSummary.map((t) => (
                    <div key={t.vatRate} className="flex justify-between text-slate-600 text-[11px]">
                      <span>TVA {t.vatRate}% :</span>
                      <span className="font-mono">{formatCurrency(t.taxAmount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-base font-black text-sky-900 bg-sky-50 p-2 rounded border border-sky-200 mt-2">
                    <span>NET À PAYER (TTC) :</span>
                    <span className="font-mono">{formatCurrency(previewInvoice.totalTTC)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Details & Legal Footer */}
              <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-600 space-y-2">
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <p className="font-bold text-slate-800">Règlement par Virement Bancaire :</p>
                  <p className="font-mono text-[10px] text-slate-700 mt-0.5">
                    Banque : {previewInvoice.bankDetails?.bankName || "BNP PARIBAS"} | IBAN : {previewInvoice.bankDetails?.iban || "FR76 3000 4001 2300 0123 4567 890"} | BIC : {previewInvoice.bankDetails?.bic || "BNPAFRPP"}
                  </p>
                </div>
                <p className="text-slate-500 italic text-[10px] leading-relaxed">{previewInvoice.legalNotice}</p>
                <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                  Facture conforme aux normes fiscales européennes Factur-X & Article 289 du Code Général des Impôts.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Instant Journal Booking Confirmation */}
      {bookingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Génération d'Écriture Comptable Immédiate
                </h3>
                <p className="text-xs text-slate-400">
                  Transfert de la facture <strong className="text-white">{bookingInvoice.number}</strong> vers le Journal des Ventes (VE).
                </p>
              </div>
            </div>

            {/* Generated Entry Preview */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                <span>Journal : <strong className="text-sky-400 font-mono">VE (Ventes)</strong></span>
                <span>Date : <strong className="text-white font-mono">{bookingInvoice.date}</strong></span>
                <span>Pièce : <strong className="text-white font-mono">{bookingInvoice.number}</strong></span>
              </div>

              <table className="w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800/80">
                    <th className="pb-1">Compte</th>
                    <th className="pb-1">Intitulé</th>
                    <th className="pb-1 text-right">Débit</th>
                    <th className="pb-1 text-right">Crédit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  <tr>
                    <td className="py-1.5 text-sky-400 font-bold">
                      {company.accountingStandard === "SYSCOHADA" ? "411100" : company.accountingStandard === "IFRS" ? "110000" : "411000"}
                    </td>
                    <td className="py-1.5">Clients - Créance {bookingInvoice.client.name}</td>
                    <td className="py-1.5 text-right font-bold text-white">{formatCurrency(bookingInvoice.totalTTC)}</td>
                    <td className="py-1.5 text-right text-slate-600">-</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-emerald-400 font-bold">
                      {company.accountingStandard === "SYSCOHADA" ? "706000" : company.accountingStandard === "IFRS" ? "400000" : "706000"}
                    </td>
                    <td className="py-1.5">Prestations de services / Ventes (CA HT)</td>
                    <td className="py-1.5 text-right text-slate-600">-</td>
                    <td className="py-1.5 text-right font-bold text-emerald-400">{formatCurrency(bookingInvoice.totalHT)}</td>
                  </tr>
                  {bookingInvoice.totalTVA > 0 && (
                    <tr>
                      <td className="py-1.5 text-amber-400 font-bold">
                        {company.accountingStandard === "SYSCOHADA" ? "443100" : company.accountingStandard === "IFRS" ? "215000" : "445710"}
                      </td>
                      <td className="py-1.5">TVA Collectée sur ventes ({bookingInvoice.taxesSummary[0]?.vatRate || 20}%)</td>
                      <td className="py-1.5 text-right text-slate-600">-</td>
                      <td className="py-1.5 text-right font-bold text-amber-300">{formatCurrency(bookingInvoice.totalTVA)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-xs text-emerald-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Écriture Parfaitement Équilibrée (Débit = Crédit)</span>
                </span>
                <span className="font-mono">{formatCurrency(bookingInvoice.totalTTC)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBookingInvoice(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleConfirmBookToJournal(bookingInvoice)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Confirmer & Intégrer au Journal des Ventes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
