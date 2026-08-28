import React, { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Calendar,
  Layers,
  ArrowUpDown,
  FileJson,
} from "lucide-react";
import {
  JournalTransaction,
  JournalCode,
  CompanyProfile,
  JournalEntryLine,
} from "../types";
import {
  generateFEC,
  generateGrandLivre,
  downloadFile,
} from "../lib/accountingEngine";

interface JournalViewProps {
  transactions: JournalTransaction[];
  company: CompanyProfile;
  onAddTransaction: (tx: JournalTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  initialSearchQuery?: string;
  initialJournalFilter?: string;
  onNavigateTab?: (tab: string) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  transactions,
  company,
  onAddTransaction,
  onDeleteTransaction,
  initialSearchQuery = "",
  initialJournalFilter = "ALL",
  onNavigateTab,
}) => {
  const [selectedJournal, setSelectedJournal] = useState<string>(initialJournalFilter);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [viewMode, setViewMode] = useState<"JOURNAL" | "GRAND_LIVRE">("JOURNAL");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [exportToast, setExportToast] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
    if (initialJournalFilter) {
      setSelectedJournal(initialJournalFilter);
    }
  }, [initialSearchQuery, initialJournalFilter]);

  // Manual Entry Form State
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualJournal, setManualJournal] = useState<JournalCode>("OD");
  const [manualPiece, setManualPiece] = useState(`OD-${Date.now().toString().slice(-4)}`);
  const [manualPartner, setManualPartner] = useState("");
  const [manualLines, setManualLines] = useState<JournalEntryLine[]>([
    { id: "1", accountCode: "606300", accountName: "Achats / Charges", debit: 100, credit: 0, description: "Charge constatée" },
    { id: "2", accountCode: "401000", accountName: "Fournisseurs", debit: 0, credit: 100, description: "Dette Fournisseur" },
  ]);

  // Filtering
  const filteredTransactions = transactions.filter((tx) => {
    const matchesJournal = selectedJournal === "ALL" || tx.journalCode === selectedJournal;
    const matchesSearch =
      tx.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.pieceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.lines.some((l) => l.description.toLowerCase().includes(searchQuery.toLowerCase()) || l.accountCode.includes(searchQuery));
    return matchesJournal && matchesSearch;
  });

  // Calculate totals
  let totalDebitAll = 0;
  let totalCreditAll = 0;
  transactions.forEach((tx) => {
    tx.lines.forEach((l) => {
      totalDebitAll += l.debit;
      totalCreditAll += l.credit;
    });
  });

  const grandLivreData = generateGrandLivre(transactions);

  // Handlers for export
  const handleExportFEC = () => {
    const fecContent = generateFEC(transactions, company);
    const filename = `${company.siren.replace(/\s/g, "")}FEC${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.txt`;
    downloadFile(fecContent, filename, "text/plain;charset=utf-8");
  };

  const handleExportCSV = () => {
    let totalLinesCount = 0;
    const isGrandLivre = viewMode === "GRAND_LIVRE";

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let rows: string[] = [];

    if (isGrandLivre) {
      // Export Grand Livre structure
      const headers = [
        "Numero Compte",
        "Intitule Compte",
        "Total Debit",
        "Total Credit",
        "Solde Debiteur",
        "Solde Crediteur",
        "Date Ecriture",
        "Numero Piece",
        "Journal",
        "Libelle Ecriture",
        "Debit Ligne",
        "Credit Ligne",
        "Lettrage",
      ];
      rows.push(headers.join(";"));

      grandLivreData.forEach((acc) => {
        if (acc.entries.length === 0) {
          rows.push(
            [
              escapeCsv(acc.code),
              escapeCsv(acc.name),
              acc.totalDebit.toFixed(2).replace(".", ","),
              acc.totalCredit.toFixed(2).replace(".", ","),
              acc.soldeDebiteur.toFixed(2).replace(".", ","),
              acc.soldeCrediteur.toFixed(2).replace(".", ","),
              '""',
              '""',
              '""',
              escapeCsv("Solde initial"),
              "0,00",
              "0,00",
              '""',
            ].join(";")
          );
        } else {
          acc.entries.forEach((entry) => {
            totalLinesCount++;
            rows.push(
              [
                escapeCsv(acc.code),
                escapeCsv(acc.name),
                acc.totalDebit.toFixed(2).replace(".", ","),
                acc.totalCredit.toFixed(2).replace(".", ","),
                acc.soldeDebiteur.toFixed(2).replace(".", ","),
                acc.soldeCrediteur.toFixed(2).replace(".", ","),
                escapeCsv(entry.date),
                escapeCsv(entry.piece),
                escapeCsv(entry.journal),
                escapeCsv(entry.description),
                entry.debit > 0 ? entry.debit.toFixed(2).replace(".", ",") : "0,00",
                entry.credit > 0 ? entry.credit.toFixed(2).replace(".", ",") : "0,00",
                escapeCsv(entry.lettrage || ""),
              ].join(";")
            );
          });
        }
      });
    } else {
      // Export General Journal entries
      const headers = [
        "Date",
        "Code Journal",
        "Libelle Journal",
        "Numero Piece",
        "Tiers / Partenaire",
        "Compte General",
        "Intitule Compte",
        "Libelle Ecriture",
        "Debit",
        "Credit",
        "Devise",
        "Montant Devise",
        "Lettrage",
        "Statut",
      ];
      rows.push(headers.join(";"));

      transactions.forEach((tx) => {
        const journalName =
          tx.journalCode === "AC"
            ? "Journal des Achats"
            : tx.journalCode === "VE"
            ? "Journal des Ventes"
            : tx.journalCode === "BQ"
            ? "Journal de Banque"
            : "Opérations Diverses (OD)";

        tx.lines.forEach((l) => {
          totalLinesCount++;
          const foreignAmount =
            l.originalAmountDebit || l.originalAmountCredit
              ? (l.originalAmountDebit || l.originalAmountCredit)?.toFixed(2).replace(".", ",")
              : "";

          rows.push(
            [
              escapeCsv(tx.date),
              escapeCsv(tx.journalCode),
              escapeCsv(journalName),
              escapeCsv(tx.pieceNumber),
              escapeCsv(tx.partnerName),
              escapeCsv(l.accountCode),
              escapeCsv(l.accountName),
              escapeCsv(l.description),
              l.debit > 0 ? l.debit.toFixed(2).replace(".", ",") : "0,00",
              l.credit > 0 ? l.credit.toFixed(2).replace(".", ",") : "0,00",
              escapeCsv(tx.currency || company.currency),
              foreignAmount ? escapeCsv(foreignAmount) : '""',
              escapeCsv(l.lettrage || ""),
              escapeCsv(tx.status === "VALIDATED" ? "Validé" : "Brouillon"),
            ].join(";")
          );
        });
      });
    }

    // Prepend UTF-8 BOM (\uFEFF) for immediate automatic Excel / Google Sheets encoding recognition
    const csvContentWithBOM = "\uFEFF" + rows.join("\r\n");
    const cleanName = company.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${isGrandLivre ? "Grand_Livre" : "Journal_Comptable"}_${cleanName}_${dateStr}.csv`;

    downloadFile(csvContentWithBOM, filename, "text/csv;charset=utf-8;");
    setExportToast(`Export CSV réussi (${isGrandLivre ? "Grand Livre" : "Journal"}) : ${totalLinesCount} lignes d'écritures exportées pour Excel et Google Sheets.`);
    setTimeout(() => setExportToast(null), 4500);
  };

  const handleExportJSON = () => {
    const backupPayload = {
      exportVersion: "1.0",
      exportType: "COMPTA_AI_BACKUP_TRANSACTIONS",
      exportDate: new Date().toISOString(),
      company: {
        name: company.name,
        siren: company.siren,
        legalForm: company.legalForm,
        nafCode: company.nafCode,
        activity: company.activity,
        address: company.address,
        accountingStandard: company.accountingStandard,
        fiscalYearStart: company.fiscalYearStart,
        fiscalYearEnd: company.fiscalYearEnd,
        currency: company.currency,
      },
      summary: {
        totalTransactions: transactions.length,
        totalDebit: totalDebitAll,
        totalCredit: totalCreditAll,
        isBalanced: Math.abs(totalDebitAll - totalCreditAll) < 0.01,
      },
      transactions: transactions,
    };

    const jsonContent = JSON.stringify(backupPayload, null, 2);
    const cleanCompanyName = company.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Sauvegarde_Comptable_${cleanCompanyName}_${dateStr}.json`;

    downloadFile(jsonContent, filename, "application/json;charset=utf-8");
    setExportToast(`Sauvegarde JSON réussie : ${transactions.length} écritures exportées.`);
    setTimeout(() => setExportToast(null), 4000);
  };

  // Add line to manual entry
  const handleAddManualLine = () => {
    setManualLines((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        accountCode: "401000",
        accountName: "Compte Général",
        debit: 0,
        credit: 0,
        description: "",
      },
    ]);
  };

  const handleManualLineChange = (id: string, field: keyof JournalEntryLine, val: any) => {
    setManualLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: val } : l))
    );
  };

  const manualDebitSum = manualLines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
  const manualCreditSum = manualLines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
  const isManualBalanced = Math.abs(manualDebitSum - manualCreditSum) < 0.01 && manualDebitSum > 0;

  const handleSaveManualEntry = () => {
    if (!isManualBalanced) return;

    const newTx: JournalTransaction = {
      id: `TX-MAN-${Date.now()}`,
      pieceNumber: manualPiece,
      date: manualDate,
      journalCode: manualJournal,
      partnerName: manualPartner || "Opération Diverses",
      documentType: manualJournal === "AC" ? "FACTURE_ACHAT" : manualJournal === "VE" ? "FACTURE_VENTE" : "AUTRE",
      amountHT: manualDebitSum,
      amountTVA: 0,
      amountTTC: manualDebitSum,
      vatRate: 0,
      status: "VALIDATED",
      lines: manualLines.map((l) => ({
        ...l,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      })),
      createdAt: new Date().toISOString(),
    };

    onAddTransaction(newTx);
    setIsManualModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header with Tools */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              Grand Livre & Journal des Écritures
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Traçabilité complète en partie double, lettrage automatique et génération du Fichier des Écritures Comptables (FEC).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportJSON}
            className="bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            title="Exporter l'ensemble des transactions comptables au format JSON pour sauvegarde locale"
          >
            <FileJson className="w-4 h-4 text-emerald-400" />
            <span>Sauvegarde JSON</span>
          </button>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab("invoicing")}
              className="bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="Accéder au module Facturation & Devis Clients"
            >
              <FileText className="w-4 h-4" />
              <span>Facturation Clients</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportFEC}
            className="bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            title="Générer le Fichier des Écritures Comptables normalisé DGFiP"
          >
            <Download className="w-4 h-4" />
            <span>Export FEC (.txt)</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            title="Exporter les écritures au format CSV pour Excel et Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exporter en CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-md shadow-sky-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Saisie Manuelle OD</span>
          </button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {exportToast && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{exportToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportToast(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-semibold px-2 py-0.5 rounded cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Balance Summary & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
        {/* Toggle View */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center text-xs">
            <button
              type="button"
              onClick={() => setViewMode("JOURNAL")}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                viewMode === "JOURNAL" ? "bg-sky-500 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Journal Général
            </button>
            <button
              type="button"
              onClick={() => setViewMode("GRAND_LIVRE")}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                viewMode === "GRAND_LIVRE" ? "bg-sky-500 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Grand Livre par Compte
            </button>
          </div>

          {/* Journal Code Filter */}
          {viewMode === "JOURNAL" && (
            <div className="flex items-center gap-1">
              {["ALL", "AC", "VE", "BQ", "OD"].map((j) => (
                <button
                  key={j}
                  type="button"
                  onClick={() => setSelectedJournal(j)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-mono font-semibold transition ${
                    selectedJournal === j
                      ? "bg-slate-800 text-sky-400 border border-slate-700"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {j === "ALL" ? "Tous" : j}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Input & Total Balances */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher tiers, compte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500 w-48"
            />
          </div>

          <div className="hidden lg:flex items-center gap-2 font-mono text-xs bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400">Total D :</span>
            <span className="text-emerald-400 font-bold">{totalDebitAll.toFixed(2)} €</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Total C :</span>
            <span className="text-emerald-400 font-bold">{totalCreditAll.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* Main Table View */}
      {viewMode === "JOURNAL" ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3 font-medium">Date & Réf</th>
                  <th className="p-3 font-medium">Journal</th>
                  <th className="p-3 font-medium">Compte</th>
                  <th className="p-3 font-medium">Libellé de l'Écriture</th>
                  <th className="p-3 font-medium text-right">Débit (€)</th>
                  <th className="p-3 font-medium text-right">Crédit (€)</th>
                  <th className="p-3 font-medium text-center">Lettrage</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTransactions.map((tx) => (
                  <React.Fragment key={tx.id}>
                    {tx.lines.map((line, idx) => (
                      <tr key={line.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3 font-mono">
                          {idx === 0 ? (
                            <div>
                              <div className="text-slate-200 font-bold">{tx.date}</div>
                              <div className="text-[10px] text-slate-500">{tx.pieceNumber}</div>
                            </div>
                          ) : (
                            <span className="text-slate-700">↳</span>
                          )}
                        </td>
                        <td className="p-3">
                          {idx === 0 && (
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
                          )}
                        </td>
                        <td className="p-3 font-bold text-sky-400">
                          {line.accountCode}
                        </td>
                        <td className="p-3 text-slate-300 font-sans">
                          <div>{line.description}</div>
                          {idx === 0 && (
                            <div className="text-[10px] text-slate-500">
                              Tiers : {tx.partnerName}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right font-bold text-white">
                          {line.debit > 0 ? line.debit.toFixed(2) : "-"}
                        </td>
                        <td className="p-3 text-right font-bold text-white">
                          {line.credit > 0 ? line.credit.toFixed(2) : "-"}
                        </td>
                        <td className="p-3 text-center">
                          {line.lettrage ? (
                            <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              {line.lettrage}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {idx === 0 && (
                            <button
                              type="button"
                              onClick={() => onDeleteTransaction(tx.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 transition"
                              title="Supprimer cette écriture"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grand Livre Grouped by Account */
        <div className="space-y-4">
          {grandLivreData.map((acc) => (
            <div
              key={acc.code}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden"
            >
              <div className="bg-slate-950 p-3.5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-sm text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60">
                    {acc.code}
                  </span>
                  <h4 className="font-bold text-white text-sm">{acc.name}</h4>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs">
                  <div>
                    <span className="text-slate-500">Mvts Débit : </span>
                    <span className="text-white font-bold">{acc.totalDebit.toFixed(2)} €</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Mvts Crédit : </span>
                    <span className="text-white font-bold">{acc.totalCredit.toFixed(2)} €</span>
                  </div>
                  <div className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    <span className="text-slate-400">Solde : </span>
                    <span
                      className={`font-bold ${
                        acc.soldeDebiteur > 0 ? "text-emerald-400" : "text-indigo-400"
                      }`}
                    >
                      {acc.soldeDebiteur > 0
                        ? `${acc.soldeDebiteur.toFixed(2)} € (D)`
                        : `${acc.soldeCrediteur.toFixed(2)} € (C)`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-500 text-[11px]">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Journal</th>
                      <th className="p-2">Pièce</th>
                      <th className="p-2">Libellé</th>
                      <th className="p-2 text-right">Débit (€)</th>
                      <th className="p-2 text-right">Crédit (€)</th>
                      <th className="p-2 text-center">Let.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 font-mono">
                    {acc.entries.map((e, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-2 text-slate-300">{e.date}</td>
                        <td className="p-2 text-slate-400">{e.journal}</td>
                        <td className="p-2 text-slate-400">{e.piece}</td>
                        <td className="p-2 text-slate-200 font-sans">{e.description}</td>
                        <td className="p-2 text-right font-bold text-white">
                          {e.debit > 0 ? e.debit.toFixed(2) : "-"}
                        </td>
                        <td className="p-2 text-right font-bold text-white">
                          {e.credit > 0 ? e.credit.toFixed(2) : "-"}
                        </td>
                        <td className="p-2 text-center text-purple-300">{e.lettrage || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                Nouvelle Écriture Comptable Manuelle
              </h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Date</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Journal</label>
                <select
                  value={manualJournal}
                  onChange={(e) => setManualJournal(e.target.value as JournalCode)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                >
                  <option value="OD">OD - Opérations Diverses</option>
                  <option value="AC">AC - Achats</option>
                  <option value="VE">VE - Ventes</option>
                  <option value="BQ">BQ - Banque</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">N° Pièce</label>
                <input
                  type="text"
                  value={manualPiece}
                  onChange={(e) => setManualPiece(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Tiers ou Libellé Général</label>
              <input
                type="text"
                placeholder="Ex: Régularisation de fin d'exercice"
                value={manualPartner}
                onChange={(e) => setManualPartner(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>

            {/* Lines list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Lignes Débit / Crédit</span>
                <button
                  type="button"
                  onClick={handleAddManualLine}
                  className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une ligne</span>
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {manualLines.map((l) => (
                  <div
                    key={l.id}
                    className="grid grid-cols-12 gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 items-center text-xs"
                  >
                    <input
                      type="text"
                      placeholder="Compte (ex: 606300)"
                      value={l.accountCode}
                      onChange={(e) => handleManualLineChange(l.id, "accountCode", e.target.value)}
                      className="col-span-3 bg-slate-900 border border-slate-800 rounded p-1.5 text-sky-400 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Libellé"
                      value={l.description}
                      onChange={(e) => handleManualLineChange(l.id, "description", e.target.value)}
                      className="col-span-4 bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                    />
                    <input
                      type="number"
                      placeholder="Débit"
                      value={l.debit || ""}
                      onChange={(e) =>
                        handleManualLineChange(l.id, "debit", parseFloat(e.target.value) || 0)
                      }
                      className="col-span-2 bg-slate-900 border border-slate-800 rounded p-1.5 text-right font-mono text-white"
                    />
                    <input
                      type="number"
                      placeholder="Crédit"
                      value={l.credit || ""}
                      onChange={(e) =>
                        handleManualLineChange(l.id, "credit", parseFloat(e.target.value) || 0)
                      }
                      className="col-span-2 bg-slate-900 border border-slate-800 rounded p-1.5 text-right font-mono text-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setManualLines((prev) => prev.filter((item) => item.id !== l.id))
                      }
                      className="col-span-1 text-slate-500 hover:text-rose-400 flex justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Total check */}
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono">
              <div>
                Total Débit : <span className="text-emerald-400 font-bold">{manualDebitSum.toFixed(2)} €</span>
              </div>
              <div>
                Total Crédit : <span className="text-emerald-400 font-bold">{manualCreditSum.toFixed(2)} €</span>
              </div>
              <div>
                {isManualBalanced ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Équilibré
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Déséquilibre
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveManualEntry}
                disabled={!isManualBalanced}
                className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
              >
                Enregistrer l'écriture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
