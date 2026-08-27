import React, { useState } from "react";
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Link,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import confetti from "canvas-confetti";
import { BankTransaction, JournalTransaction, CompanyProfile } from "../types";

interface BankReconcileViewProps {
  bankFeed: BankTransaction[];
  setBankFeed: React.Dispatch<React.SetStateAction<BankTransaction[]>>;
  transactions: JournalTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<JournalTransaction[]>>;
  company: CompanyProfile;
}

export const BankReconcileView: React.FC<BankReconcileViewProps> = ({
  bankFeed,
  setBankFeed,
  transactions,
  setTransactions,
  company,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: company.currency === "€" ? "EUR" : "XOF",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Find candidate journal transaction for an unmatched bank transaction
  const findMatchCandidate = (bTx: BankTransaction) => {
    if (bTx.matchedJournalId) {
      return transactions.find((t) => t.id === bTx.matchedJournalId);
    }
    const targetAmount = Math.abs(bTx.amount);
    return transactions.find(
      (t) =>
        Math.abs(t.amountTTC - targetAmount) < 0.05 &&
        (t.status === "VALIDATED" || t.status === "RECONCILED")
    );
  };

  // Match 1 transaction
  const handleReconcile = (bankId: string, journalId: string) => {
    setBankFeed((prev) =>
      prev.map((b) =>
        b.id === bankId ? { ...b, matchedJournalId: journalId, status: "MATCHED" } : b
      )
    );

    setTransactions((prev) =>
      prev.map((t) =>
        t.id === journalId
          ? {
              ...t,
              status: "RECONCILED",
              lines: t.lines.map((l) => ({
                ...l,
                lettrage: l.lettrage || `R${Date.now().toString().slice(-2)}`,
              })),
            }
          : t
      )
    );

    try {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.8 },
      });
    } catch {}
  };

  // 1-Click Match All Candidate Transactions
  const handleReconcileAll = () => {
    bankFeed.forEach((b) => {
      if (b.status === "UNMATCHED") {
        const match = findMatchCandidate(b);
        if (match) {
          handleReconcile(b.id, match.id);
        }
      }
    });
  };

  const matchedCount = bankFeed.filter((b) => b.status === "MATCHED").length;
  const totalCount = bankFeed.length;
  const reconcileRate = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              Rapprochement Bancaire Automatisé (Banque & Factures)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Liaison automatique entre les flux bancaires réels et les écritures du journal général avec lettrage comptable instantané.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono flex items-center gap-2">
            <span className="text-slate-400">Taux de pointage :</span>
            <span className="text-emerald-400 font-bold">{reconcileRate}%</span>
            <span className="text-slate-500">
              ({matchedCount}/{totalCount})
            </span>
          </div>

          <button
            type="button"
            onClick={handleReconcileAll}
            className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-teal-500/20 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Rapprocher tout en 1-clic</span>
          </button>
        </div>
      </div>

      {/* Feed List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">
            Flux Bancaires Professionnels & Écritures Associées
          </h3>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Filtrer les mouvements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500 w-52"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-800/60">
          {bankFeed
            .filter((b) =>
              b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
              b.category.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((b) => {
              const matchCandidate = findMatchCandidate(b);
              const isMatched = b.status === "MATCHED";

              return (
                <div
                  key={b.id}
                  className="p-4 hover:bg-slate-800/30 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Bank Transaction Details */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        b.amount > 0
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {b.amount > 0 ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs">{b.description}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                          {b.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Date opération : {b.date} • Compte 512000
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Matching Action */}
                  <div className="flex items-center gap-6 justify-between md:justify-end">
                    <div className="text-right">
                      <div
                        className={`text-sm font-bold font-mono ${
                          b.amount > 0 ? "text-emerald-400" : "text-slate-200"
                        }`}
                      >
                        {b.amount > 0 ? `+${formatMoney(b.amount)}` : formatMoney(b.amount)}
                      </div>
                    </div>

                    {isMatched ? (
                      <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs px-3 py-1.5 rounded-xl font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Rapproché ({matchCandidate?.pieceNumber || "Lettré"})</span>
                      </div>
                    ) : matchCandidate ? (
                      <div className="flex items-center gap-2">
                        <div className="text-right hidden sm:block">
                          <span className="text-[10px] text-sky-400 font-semibold block">
                            Correspondance IA Détectée
                          </span>
                          <span className="text-xs text-slate-300 font-mono">
                            {matchCandidate.pieceNumber} ({matchCandidate.partnerName})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleReconcile(b.id, matchCandidate.id)}
                          className="bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-sky-500/20 cursor-pointer"
                        >
                          <Link className="w-3.5 h-3.5" />
                          <span>Pointer</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                        En attente de justificatif
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
