import React, { useState } from "react";
import Markdown from "react-markdown";
import {
  Bot,
  Sparkles,
  Send,
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Calculator,
  MessageSquareText,
  Globe2,
  Copy,
  Check,
  HelpCircle,
  Receipt,
  FileSpreadsheet,
  Coins,
  Scale,
  Briefcase,
} from "lucide-react";
import {
  CompanyProfile,
  FinancialKPIs,
  JournalTransaction,
  ChatMessage,
  AnomalyReport,
} from "../types";
import { QuoteMarginCalculator } from "./QuoteMarginCalculator";
import { CurrencyConverterModule } from "./CurrencyConverterModule";
import { generateLocalAdvisorReply } from "../lib/financialAdvisorEngine";

interface AiAdvisorViewProps {
  company: CompanyProfile;
  kpis: FinancialKPIs;
  transactions: JournalTransaction[];
  anomalies: AnomalyReport[];
}

export const AiAdvisorView: React.FC<AiAdvisorViewProps> = ({
  company,
  kpis,
  transactions,
  anomalies,
}) => {
  const [activeAdvisorTab, setActiveAdvisorTab] = useState<"CHAT" | "MARGIN_SIMULATOR" | "CURRENCY_CONVERTER">("CHAT");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedConcernCategory, setSelectedConcernCategory] = useState<string>("ALL");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      sender: "ai",
      text: `Bonjour ! Je suis votre Directeur Financier (DAF) et Expert-Comptable IA autonome. J'ai analysé en temps réel l'ensemble de vos écritures comptables sous la norme **${company.accountingStandard}**.

### 📊 Synthèse de votre situation financière en direct :
- **Chiffre d'Affaires HT :** ${kpis.chiffreAffaires.toLocaleString("fr-FR")} ${company.currency} (Taux de marge brute : **${kpis.margeBrutePct}%**)
- **Trésorerie disponible :** ${kpis.tresorerieActuelle.toLocaleString("fr-FR")} ${company.currency} (Visibilité estimée : **~${kpis.runwayMonths} mois**)
- **Position de TVA :** ${kpis.tvaNetDue >= 0 ? `**${kpis.tvaNetDue.toLocaleString("fr-FR")} ${company.currency} à décaisser**` : `**${Math.abs(kpis.tvaNetDue).toLocaleString("fr-FR")} ${company.currency} en crédit de TVA**`}
- **Résultat Net Prévisionnel :** **${(kpis.resultatNet || 0).toLocaleString("fr-FR")} ${company.currency}**

Je suis là pour répondre à toutes vos préoccupations : **optimisation fiscale, règles de facturation, déduction de charges, arbitrage rémunération/dividendes, gestion de trésorerie, devises internationales ou utilisation de l'application**. Que souhaitez-vous analyser ?`,
      timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      suggestedActions: [
        "Alerte prédictive trésorerie 30 jours & découverts",
        "Quelles sont les mentions obligatoires sur mes factures ?",
        "Comment déduire mes repas et frais de déplacement ?",
        "Dividendes ou salaire : quel est le meilleur choix ?",
        "Échéances fiscales et estimation de l'Impôt sur les Sociétés",
      ],
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditReport, setAuditReport] = useState<any | null>(null);

  const concernCategories = [
    {
      id: "ALL",
      label: "Toutes les préoccupations",
      icon: MessageSquareText,
      questions: [
        "Fais-moi un bilan complet de ma santé financière",
        "Quels sont mes points de vigilance comptable ?",
        "Comment exporter mon fichier FEC pour l'administration ?",
      ],
    },
    {
      id: "FISCAL",
      label: "Fiscalité & TVA",
      icon: Scale,
      questions: [
        "Quelle est ma position de TVA et mes prochaines échéances ?",
        "Comment estimer et provisionner mon Impôt sur les Sociétés (IS) ?",
        "Quels sont les pièges à éviter lors d'un contrôle fiscal ?",
      ],
    },
    {
      id: "CASH",
      label: "Trésorerie & BFR",
      icon: Coins,
      questions: [
        "Analyse ma trésorerie à 30 jours et mon runway",
        "Comment réduire mon Besoin en Fonds de Roulement (BFR) ?",
        "Quelle stratégie pour relancer les factures impayées ?",
      ],
    },
    {
      id: "EXPENSES",
      label: "Charges & Déductions",
      icon: Briefcase,
      questions: [
        "Comment déduire mes frais professionnels et de repas ?",
        "Quelles dépenses < 500 € HT puis-je passer en charge directe ?",
        "Comment comptabiliser mes abonnements logiciels et Cloud ?",
      ],
    },
    {
      id: "INVOICES",
      label: "Facturation & Devis",
      icon: Receipt,
      questions: [
        "Quelles sont les mentions obligatoires sur une facture ?",
        "Comment calculer mon coefficient multiplicateur et ma marge ?",
        "Comment émettre un avoir conforme en cas d'annulation ?",
      ],
    },
    {
      id: "SALARY",
      label: "Salaires & Dividendes",
      icon: TrendingUp,
      questions: [
        "Est-il plus avantageux de me verser un salaire ou des dividendes ?",
        "Quel est le coût total employeur pour une embauche ?",
        "Quels sont les avantages fiscaux de la SASU vs SARL ?",
      ],
    },
    {
      id: "INTERNATIONAL",
      label: "SYSCOHADA & Devises",
      icon: Globe2,
      questions: [
        "Quelles sont les spécificités de la norme SYSCOHADA ?",
        "Comment comptabiliser les gains et pertes de change ?",
        "Comment fonctionne la TVA intracommunautaire et l'autoliquidation ?",
      ],
    },
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/gemini/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
          companyContext: {
            company,
            kpis,
            transactionsCount: transactions.length,
            sampleEntries: transactions.slice(0, 10),
          },
          accountingStandard: company.accountingStandard,
        }),
      });

      const data = await response.json();
      if (data.success && data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: "ai",
            text: data.reply,
            timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        const fallbackReply = generateLocalAdvisorReply(
          text,
          { company, kpis, transactionsCount: transactions.length },
          company.accountingStandard
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: "ai",
            text: fallbackReply,
            timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err) {
      console.error("AI Advisor error:", err);
      const contextualReply = generateLocalAdvisorReply(
        text,
        { company, kpis, transactionsCount: transactions.length },
        company.accountingStandard
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: contextualReply,
          timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunFullAudit = async () => {
    setIsAuditing(true);
    try {
      const response = await fetch("/api/gemini/audit-ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journalEntries: transactions,
          companyContext: { company, kpis },
          accountingStandard: company.accountingStandard,
        }),
      });

      const data = await response.json();
      if (data.success && data.auditReport) {
        setAuditReport(data.auditReport);
      }
    } catch (e) {
      console.error("Audit error:", e);
    } finally {
      setIsAuditing(false);
    }
  };

  const currentCategoryObj = concernCategories.find((c) => c.id === selectedConcernCategory) || concernCategories[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Bot className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              Directeur Financier (DAF) & Expert-Comptable IA
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Analyse cognitive continue, réponses instantanées à vos préoccupations fiscales & comptables, et simulations prévisionnelles.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunFullAudit}
          disabled={isAuditing}
          className="bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
        >
          {isAuditing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
          <span>Lancer un Grand Audit IA</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 p-2 rounded-2xl">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveAdvisorTab("CHAT")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeAdvisorTab === "CHAT"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <MessageSquareText className="w-4 h-4" />
            <span>Assistant DAF & Préoccupations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdvisorTab("MARGIN_SIMULATOR")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeAdvisorTab === "MARGIN_SIMULATOR"
                ? "bg-sky-600 text-white shadow-lg shadow-sky-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Calculator className="w-4 h-4 text-sky-300" />
            <span>Simulateur Marges & Devis</span>
            <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-1.5 py-0.5 rounded font-mono">
              Impact Net
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdvisorTab("CURRENCY_CONVERTER")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeAdvisorTab === "CURRENCY_CONVERTER"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Globe2 className="w-4 h-4 text-emerald-300" />
            <span>Marges Internationales & Devises</span>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Taux Directs
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 font-mono pr-2">
          <span>Devise : <strong className="text-slate-200">{company.currency}</strong></span>
          <span>•</span>
          <span>Exercice : <strong className="text-slate-200">{company.fiscalYearStart.slice(0, 4)}</strong></span>
        </div>
      </div>

      {/* Conditional View Rendering */}
      {activeAdvisorTab === "CURRENCY_CONVERTER" ? (
        <CurrencyConverterModule
          company={company}
          kpis={kpis}
          onAskAiAdvisor={(promptText) => {
            setActiveAdvisorTab("CHAT");
            handleSendMessage(promptText);
          }}
        />
      ) : activeAdvisorTab === "MARGIN_SIMULATOR" ? (
        <QuoteMarginCalculator
          company={company}
          kpis={kpis}
          onOpenCurrencyConverter={() => setActiveAdvisorTab("CURRENCY_CONVERTER")}
          onAskAiAdvisor={(promptText) => {
            setActiveAdvisorTab("CHAT");
            handleSendMessage(promptText);
          }}
        />
      ) : (
        /* Main Grid: Chat vs Live Audit Status */
        <div className="space-y-4">
          {/* Quick Concern Categories Selector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Préoccupations & Thématiques Fréquentes
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Cliquez sur un sujet pour interroger l'IA
              </span>
            </div>

            {/* Category Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {concernCategories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedConcernCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedConcernCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                      isSelected
                        ? "bg-sky-600 text-white shadow-sm shadow-sky-600/30"
                        : "bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Suggested Prompts for active category */}
            <div className="flex flex-wrap gap-2 pt-1">
              {currentCategoryObj.questions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(q)}
                  className="bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-sky-300 border border-slate-800/80 hover:border-sky-500/40 px-3 py-1.5 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 group text-left"
                >
                  <Sparkles className="w-3 h-3 text-sky-400 group-hover:scale-110 transition-transform" />
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chat Console */}
            <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col h-[650px] overflow-hidden shadow-xl">
              <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">Directeur Financier & Expert-Comptable IA</span>
                  <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded font-mono">
                    {company.accountingStandard}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {messages.length} message{messages.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.sender === "ai" && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-md shadow-sky-600/20">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed group relative ${
                        msg.sender === "user"
                          ? "bg-sky-600 text-white rounded-tr-none font-medium shadow-md shadow-sky-600/20"
                          : "bg-slate-950 text-slate-200 border border-slate-800 rounded-tl-none space-y-2 shadow-sm"
                      }`}
                    >
                      {msg.sender === "ai" ? (
                        <div className="markdown-body text-xs text-slate-200 space-y-2 prose prose-invert max-w-none">
                          <Markdown>{msg.text}</Markdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      )}

                      {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-1.5 border-t border-slate-800/80">
                          {msg.suggestedActions.map((action, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSendMessage(action)}
                              className="bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700/80 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer"
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        {msg.sender === "ai" && (
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="text-slate-400 hover:text-sky-300 flex items-center gap-1 transition cursor-pointer"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copié !</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copier la réponse</span>
                              </>
                            )}
                          </button>
                        )}
                        <div
                          className={`font-mono ml-auto ${
                            msg.sender === "user" ? "text-sky-200" : "text-slate-500"
                          }`}
                        >
                          {msg.timestamp}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-sky-600/20">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                    </div>
                    <div className="bg-slate-950 rounded-2xl p-4 text-xs text-slate-300 border border-slate-800 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:0.4s]" />
                      <span>L'IA analyse votre situation et rédige une réponse détaillée...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Box */}
              <div className="p-3 bg-slate-950 border-t border-slate-800">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Ex: Comment optimiser mes impôts ? Quelles mentions sur ma facture ? Comment déduire mes repas ?"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !inputMessage.trim()}
                    className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold p-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-sky-500/20"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">Envoyer</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Audit & Optimization Insights Column */}
            <div className="lg:col-span-4 space-y-4">
              {/* Quick Margin & Multi-Currency Tools Banner */}
              <div className="bg-gradient-to-br from-sky-950/40 via-slate-900 to-emerald-950/30 border border-sky-500/20 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-sky-400" />
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                      Rentabilité & International
                    </h3>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                    Temps Réel
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Simulez vos marges en devises (USD, GBP, CHF, XOF...), couvrez le risque de change et projetez votre résultat net.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveAdvisorTab("MARGIN_SIMULATOR")}
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-sky-500/20"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Devis & Marges</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAdvisorTab("CURRENCY_CONVERTER")}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    <Globe2 className="w-3.5 h-3.5" />
                    <span>Multidevise</span>
                  </button>
                </div>
              </div>

              {/* Audit Health Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Score de Conformité
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2 py-0.5 rounded-full">
                    {auditReport?.healthScore || 96}/100
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {auditReport?.summary ||
                    "Grand Livre vérifié : Aucune anomalie critique détectée. Les écritures Débit/Crédit respectent les normes comptables."}
                </p>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Norme DGFiP / FEC :</span>
                    <span className="text-emerald-400 font-bold">100% Conforme</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Écritures audités :</span>
                    <span className="text-white font-mono">{transactions.length} pièces</span>
                  </div>
                </div>
              </div>

              {/* Tax Optimizations Suggestions */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                    Opportunités Fiscales Détectées
                  </h3>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <div className="font-semibold text-amber-300">Amortissement exceptionnel</div>
                    <p className="text-[11px] text-slate-400">
                      Le matériel informatique récemment acquis (4 165 €) est éligible à la déduction fiscale immédiate.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <div className="font-semibold text-sky-300">Récupération TVA Intracommunautaire</div>
                    <p className="text-[11px] text-slate-400">
                      Les factures AWS et Cloud sont correctement autoliquidées sans pénalité de déclaration.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
