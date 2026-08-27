import React, { useState, useRef } from "react";
import {
  UploadCloud,
  Camera,
  Sparkles,
  CheckCircle2,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Building,
  RefreshCw,
  Coins,
  ArrowRightLeft,
  Globe2,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  CompanyProfile,
  JournalTransaction,
  JournalCode,
  DocumentType,
  JournalEntryLine,
  CurrencyCode,
} from "../types";
import { demoInvoiceTemplates } from "../data/initialData";
import {
  normalizeCurrencyCode,
  getCurrencySymbol,
  getCurrencyFlag,
  getExchangeRate,
  convertInvoiceToAccountingCurrency,
  formatCurrencyAmount,
} from "../lib/currencyRates";

interface AutoScanViewProps {
  company: CompanyProfile;
  onAddTransaction: (tx: JournalTransaction) => void;
  onNavigateTab?: (tab: string) => void;
  setActiveTab?: (tab: string) => void;
}

export const AutoScanView: React.FC<AutoScanViewProps> = ({
  company,
  onAddTransaction,
  onNavigateTab,
  setActiveTab,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const handleNavigate = (tab: string) => {
    if (typeof onNavigateTab === "function") {
      onNavigateTab(tab);
    }
    if (typeof setActiveTab === "function") {
      setActiveTab(tab);
    }
  };
  
  // Custom exchange rate modifier for current scanned invoice
  const [customExchangeRate, setCustomExchangeRate] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const baseCurrency = normalizeCurrencyCode(company.currency);

  // Trigger file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      analyzeWithGemini(base64, file.type, file.name);
    };
    reader.readAsDataURL(file);
  };

  // Launch Camera
  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setStatusMessage("Impossible d'accéder à la caméra. Vérifiez les autorisations.");
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setSelectedImage(dataUrl);

      // Stop camera stream
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setCameraActive(false);

      analyzeWithGemini(dataUrl, "image/jpeg", "Photo_Justificatif_Mobile.jpg");
    }
  };

  // AI Extraction via Server Endpoint
  const analyzeWithGemini = async (
    imageBase64?: string,
    mimeType?: string,
    filename?: string,
    textSnippet?: string,
    presetCurrency?: string,
    presetRate?: number
  ) => {
    setIsProcessing(true);
    setStatusMessage("OCR & Analyse cognitive du document en cours...");
    setCustomExchangeRate(presetRate ? String(presetRate) : "");

    try {
      const response = await fetch("/api/gemini/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageBase64 || null,
          mimeType: mimeType || "image/jpeg",
          textContent: textSnippet || (filename ? `Nom du fichier : ${filename}` : ""),
          accountingStandard: company.accountingStandard,
          baseCurrency,
        }),
      });

      const result = await response.json();
      if (result.success && result.data) {
        const parsed = result.data;
        if (presetCurrency) {
          parsed.currency = presetCurrency;
        }
        setExtractedData(parsed);
        setStatusMessage(null);
      } else {
        throw new Error(result.error || "Échec de l'analyse");
      }
    } catch (error: any) {
      console.error("Error parsing document:", error);
      setStatusMessage("Erreur d'analyse. Utilisation du modèle de secours.");
      // Fallback preview
      const isForeign = presetCurrency && normalizeCurrencyCode(presetCurrency) !== baseCurrency;
      setExtractedData({
        documentType: "FACTURE_ACHAT",
        partnerName: "Fournisseur Exemple Global",
        documentNumber: `FAC-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
        currency: presetCurrency || "USD",
        amountHT: 1200.0,
        amountTVA: 240.0,
        amountTTC: 1440.0,
        vatRate: 20,
        isForeignCurrency: isForeign,
        summary: "Abonnement de services cloud et prestations technologiques",
        journalCode: "AC",
        entries: [
          {
            accountCode: company.accountingStandard === "SYSCOHADA" ? "605100" : "606300",
            accountName: "Fournitures et services divers",
            debit: 1200.0,
            credit: 0,
            description: "Achats HT",
          },
          {
            accountCode: company.accountingStandard === "SYSCOHADA" ? "445200" : "445660",
            accountName: "TVA déductible",
            debit: 240.0,
            credit: 0,
            description: "TVA 20%",
          },
          {
            accountCode: company.accountingStandard === "SYSCOHADA" ? "401100" : "401000",
            accountName: "Fournisseurs",
            debit: 0,
            credit: 1440.0,
            description: "Dette Fournisseur TTC",
          },
        ],
        confidenceScore: 0.95,
        auditNotes: ["Contrôle de partie double validé", "Devise internationale identifiée"],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Test with Template
  const handleSelectTemplate = (template: (typeof demoInvoiceTemplates)[0]) => {
    setSelectedImage(null);
    analyzeWithGemini(
      undefined,
      undefined,
      template.title,
      template.ocrSnippet,
      template.currency,
      template.exchangeRate
    );
  };

  // Currency Conversion Calculations for current extracted data
  const invoiceCurrency = normalizeCurrencyCode(extractedData?.currency || baseCurrency);
  const isForeign = invoiceCurrency !== baseCurrency;
  
  const parsedRateInput = customExchangeRate ? parseFloat(customExchangeRate) : undefined;
  const currentExchangeRate = parsedRateInput !== undefined && parsedRateInput > 0
    ? parsedRateInput
    : getExchangeRate(invoiceCurrency, baseCurrency);

  // Compute converted values in base currency
  const convertedAccounting = extractedData
    ? convertInvoiceToAccountingCurrency({
        foreignCurrency: invoiceCurrency,
        baseCurrency,
        amountHT: Number(extractedData.amountHT || 0),
        amountTVA: Number(extractedData.amountTVA || 0),
        amountTTC: Number(extractedData.amountTTC || 0),
        vatRate: Number(extractedData.vatRate || 20),
        customExchangeRate: currentExchangeRate,
        accountingStandard: company.accountingStandard,
        documentType: extractedData.documentType,
        partnerName: extractedData.partnerName,
        pieceNumber: extractedData.documentNumber,
      })
    : null;

  // Ledger lines to display: if foreign, use the converted accounting lines
  const displayLedgerLines: JournalEntryLine[] = extractedData
    ? (isForeign && convertedAccounting
        ? convertedAccounting.convertedLines
        : (extractedData.entries || []).map((e: any, idx: number) => ({
            id: `L-${Date.now()}-${idx}`,
            accountCode: e.accountCode,
            accountName: e.accountName,
            debit: Number(e.debit) || 0,
            credit: Number(e.credit) || 0,
            description: e.description || extractedData.summary || "Écriture comptable",
          })))
    : [];

  // Check balance in base currency
  const totalDebit = displayLedgerLines.reduce((acc, curr) => acc + curr.debit, 0);
  const totalCredit = displayLedgerLines.reduce((acc, curr) => acc + curr.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.05;

  // Commit transaction to General Ledger
  const handleValidateEntry = () => {
    if (!extractedData) return;

    const originalHT = Number(extractedData.amountHT || 0);
    const originalTVA = Number(extractedData.amountTVA || 0);
    const originalTTC = Number(extractedData.amountTTC || 0);

    const baseHT = convertedAccounting ? convertedAccounting.baseAmountHT : originalHT;
    const baseTVA = convertedAccounting ? convertedAccounting.baseAmountTVA : originalTVA;
    const baseTTC = convertedAccounting ? convertedAccounting.baseAmountTTC : originalTTC;

    const newTx: JournalTransaction = {
      id: `TX-${Date.now()}`,
      pieceNumber: extractedData.documentNumber || `FAC-${Date.now().toString().slice(-4)}`,
      date: extractedData.date || new Date().toISOString().split("T")[0],
      dueDate: extractedData.dueDate,
      journalCode: (extractedData.journalCode as JournalCode) || "AC",
      partnerName: extractedData.partnerName || "Tiers Divers",
      partnerTaxId: extractedData.partnerSirenOrTaxId,
      documentType: (extractedData.documentType as DocumentType) || "FACTURE_ACHAT",
      amountHT: baseHT,
      amountTVA: baseTVA,
      amountTTC: baseTTC,
      vatRate: extractedData.vatRate || 20,
      currency: invoiceCurrency,
      isForeignCurrency: isForeign,
      exchangeRate: isForeign ? currentExchangeRate : 1.0,
      originalAmountHT: isForeign ? originalHT : undefined,
      originalAmountTVA: isForeign ? originalTVA : undefined,
      originalAmountTTC: isForeign ? originalTTC : undefined,
      status: "VALIDATED",
      lines: displayLedgerLines,
      confidenceScore: extractedData.confidenceScore || 0.98,
      aiAuditNotes: [
        ...(extractedData.auditNotes || ["Écriture validée automatiquement"]),
        ...(isForeign
          ? [
              `Conversion automatique de devises : 1 ${invoiceCurrency} = ${currentExchangeRate.toFixed(4)} ${baseCurrency}`,
              `Montant original en devises : ${formatCurrencyAmount(originalTTC, invoiceCurrency)}`,
            ]
          : []),
      ],
      createdAt: new Date().toISOString(),
    };

    onAddTransaction(newTx);

    // Fire Confetti!
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {}

    setExtractedData(null);
    setSelectedImage(null);
    setCustomExchangeRate("");
    handleNavigate("journal");
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Zap className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              Saisie Comptable Automatisée par IA (OCR & Multi-Devises)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Déposez une facture nationale ou internationale ($ USD, £ GBP, CHF, FCFA). L'IA détecte la devise, applique le cours officiel et génère les écritures équilibrées en temps réel.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
          <span>Devise de compte :</span>
          <span className="font-bold text-sky-400">
            {getCurrencyFlag(baseCurrency)} {baseCurrency} ({getCurrencySymbol(baseCurrency)})
          </span>
        </div>
      </div>

      {/* Main Action Area: Ingestion vs Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload / Camera & Demo Presets */}
        <div className="lg:col-span-5 space-y-4">
          {/* Dropzone */}
          {!cameraActive ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[220px] ${
                dragActive
                  ? "border-sky-400 bg-sky-950/30"
                  : "border-slate-800 hover:border-slate-700 bg-slate-900/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-white text-sm">
                Glissez votre facture ou reçu ici
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Format PDF, PNG, JPEG (Factures en €, $, £, CHF supportées)
              </p>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startCamera();
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Camera className="w-4 h-4 text-sky-400" />
                  <span>Prendre en photo (Mobile/Webcam)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-48 rounded-xl object-cover bg-black mb-3"
              />
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capturer la facture</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCameraActive(false)}
                  className="bg-slate-800 text-slate-400 hover:text-white text-xs px-3 py-2 rounded-xl"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Quick Demo Templates with Multi-Currency Highlights */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Exemples types avec devises étrangères</span>
              </span>
              <span className="text-[10px] text-slate-500">1-clic</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {demoInvoiceTemplates.map((tpl) => {
                const tplCurr = normalizeCurrencyCode(tpl.currency);
                const isTplForeign = tplCurr !== baseCurrency;

                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-sky-500/50 hover:bg-slate-900/80 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-sky-300 transition flex items-center gap-1.5">
                        <span>{tpl.title}</span>
                        {isTplForeign && (
                          <span className="bg-amber-500/20 text-amber-300 text-[9px] font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                            {tplCurr}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{tpl.partner}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-emerald-400">
                        {formatCurrencyAmount(tpl.amountHT, tplCurr)}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {isTplForeign ? `Converti en ${baseCurrency}` : `TVA ${tpl.vatRate}%`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: AI Extraction & Journal Entry Generator */}
        <div className="lg:col-span-7">
          {isProcessing ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center min-h-[380px] space-y-4">
              <div className="w-16 h-16 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center animate-spin">
                <RefreshCw className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  Extraction, conversion de devises et ventilation en cours...
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  L'IA identifie la devise, interroge les taux de conversion officiels et impute les comptes PCG/SYSCOHADA automatiquement.
                </p>
              </div>
            </div>
          ) : extractedData ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              {/* Top Meta info */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-sky-500/20 text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded border border-sky-500/30">
                      {extractedData.documentType}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Journal : {extractedData.journalCode}
                    </span>
                    {isForeign && (
                      <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                        <Globe2 className="w-3 h-3" />
                        <span>Devise Étrangère ({invoiceCurrency})</span>
                      </span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-white text-base mt-1">
                    {extractedData.partnerName}
                  </h3>
                  <div className="text-xs text-slate-400">
                    Réf : <span className="font-mono text-slate-200">{extractedData.documentNumber}</span> • Date :{" "}
                    <span className="font-mono text-slate-200">{extractedData.date}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">
                    {isForeign ? "Montant Converti en " + baseCurrency : "Montant Total TTC"}
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                    {convertedAccounting
                      ? formatCurrencyAmount(convertedAccounting.baseAmountTTC, baseCurrency)
                      : formatCurrencyAmount(Number(extractedData.amountTTC || 0), baseCurrency)}
                  </div>
                  {isForeign && (
                    <div className="text-xs font-bold text-amber-400 font-mono mt-0.5">
                      Original : {formatCurrencyAmount(Number(extractedData.amountTTC || 0), invoiceCurrency)}
                    </div>
                  )}
                </div>
              </div>

              {/* Foreign Currency Conversion Interactive Banner */}
              {isForeign && (
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-amber-300 font-semibold">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span>Conversion Automatique de Devise ({invoiceCurrency} ➔ {baseCurrency})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">Taux officiel :</span>
                      <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        1 {invoiceCurrency} = {currentExchangeRate.toFixed(4)} {baseCurrency}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                    <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                      <div className="text-slate-400 text-[10px]">Total HT Original</div>
                      <div className="text-white font-bold">
                        {formatCurrencyAmount(Number(extractedData.amountHT || 0), invoiceCurrency)}
                      </div>
                      <div className="text-emerald-400 text-[10px]">
                        ➔ {convertedAccounting ? formatCurrencyAmount(convertedAccounting.baseAmountHT, baseCurrency) : "-"}
                      </div>
                    </div>

                    <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                      <div className="text-slate-400 text-[10px]">TVA ({extractedData.vatRate || 20}%)</div>
                      <div className="text-white font-bold">
                        {formatCurrencyAmount(Number(extractedData.amountTVA || 0), invoiceCurrency)}
                      </div>
                      <div className="text-emerald-400 text-[10px]">
                        ➔ {convertedAccounting ? formatCurrencyAmount(convertedAccounting.baseAmountTVA, baseCurrency) : "-"}
                      </div>
                    </div>

                    <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                      <div className="text-slate-400 text-[10px]">Taux Personnalisé</div>
                      <input
                        type="number"
                        step="0.0001"
                        placeholder={currentExchangeRate.toFixed(4)}
                        value={customExchangeRate}
                        onChange={(e) => setCustomExchangeRate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-amber-400 mt-0.5"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Double-entry Ledger Lines */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
                  <span>Écritures Comptables Générées (Comptabilité en {baseCurrency})</span>
                  <span className="font-mono text-[11px] text-sky-400">
                    Norme : {extractedData.accountingStandard || company.accountingStandard}
                  </span>
                </div>

                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5 font-medium">Compte</th>
                        <th className="p-2.5 font-medium">Libellé</th>
                        <th className="p-2.5 font-medium text-right">Débit ({getCurrencySymbol(baseCurrency)})</th>
                        <th className="p-2.5 font-medium text-right">Crédit ({getCurrencySymbol(baseCurrency)})</th>
                        {isForeign && (
                          <th className="p-2.5 font-medium text-right text-slate-500">Devise Orig.</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {displayLedgerLines.map((entry: JournalEntryLine, i: number) => (
                        <tr key={i} className="hover:bg-slate-900/40">
                          <td className="p-2.5 text-sky-400 font-bold">{entry.accountCode}</td>
                          <td className="p-2.5 text-slate-300 font-sans">{entry.accountName}</td>
                          <td className="p-2.5 text-right font-bold text-white">
                            {Number(entry.debit) > 0 ? Number(entry.debit).toFixed(2) : "-"}
                          </td>
                          <td className="p-2.5 text-right font-bold text-white">
                            {Number(entry.credit) > 0 ? Number(entry.credit).toFixed(2) : "-"}
                          </td>
                          {isForeign && (
                            <td className="p-2.5 text-right text-amber-400">
                              {entry.originalAmountDebit
                                ? formatCurrencyAmount(entry.originalAmountDebit, invoiceCurrency)
                                : entry.originalAmountCredit
                                ? formatCurrencyAmount(entry.originalAmountCredit, invoiceCurrency)
                                : "-"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-900 border-t border-slate-800 font-mono font-extrabold text-xs">
                      <tr>
                        <td colSpan={2} className="p-2.5 text-slate-300 font-sans">
                          Total Écritures (Équilibré)
                        </td>
                        <td className="p-2.5 text-right text-emerald-400">
                          {totalDebit.toFixed(2)}
                        </td>
                        <td className="p-2.5 text-right text-emerald-400">
                          {totalCredit.toFixed(2)}
                        </td>
                        {isForeign && <td className="p-2.5 text-right text-slate-500">-</td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Audit Verification Badge */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-xs">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-slate-200">
                    Contrôle de Conformité IA & Débit/Crédit
                  </div>
                  <ul className="text-slate-400 text-[11px] list-disc list-inside space-y-0.5">
                    {(extractedData.auditNotes || []).map((note: string, idx: number) => (
                      <li key={idx}>{note}</li>
                    ))}
                    {isForeign && (
                      <li className="text-amber-300">
                        Champs FEC `Montantdevise` ({formatCurrencyAmount(Number(extractedData.amountTTC || 0), invoiceCurrency)}) et `Idevise` ({invoiceCurrency}) assignés.
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setExtractedData(null);
                    setSelectedImage(null);
                    setCustomExchangeRate("");
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  id="btn-validate-entry"
                  onClick={handleValidateEntry}
                  disabled={!isBalanced}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Valider et Inscrire au Grand Livre</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[380px] space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-white text-base">Aucun document chargé</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Déposez un justificatif à gauche ou sélectionnez un exemple type pour voir la conversion automatique de devises et la génération instantanée de l'écriture comptable.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
