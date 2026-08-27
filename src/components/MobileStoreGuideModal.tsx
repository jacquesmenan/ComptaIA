import React, { useState } from "react";
import {
  Smartphone,
  Apple,
  Play,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Share2,
  Layers,
  Sparkles,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Code2,
} from "lucide-react";
import { downloadFile } from "../lib/accountingEngine";

interface MobileStoreGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleSimulator: () => void;
}

export const MobileStoreGuideModal: React.FC<MobileStoreGuideModalProps> = ({
  isOpen,
  onClose,
  onToggleSimulator,
}) => {
  const [activeTab, setActiveTab] = useState<"PWA" | "PLAYSTORE" | "APPSTORE">("PWA");
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const capacitorConfig = `{
  "appId": "com.comptaai.app",
  "appName": "ComptaAI",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "server": {
    "url": "https://comptaai.app",
    "cleartext": false
  },
  "plugins": {
    "Camera": {
      "permissions": ["camera", "photos"]
    },
    "SplashScreen": {
      "launchShowDuration": 1500,
      "backgroundColor": "#090d16"
    }
  }
}`;

  const handleDownloadCapacitor = () => {
    downloadFile(capacitorConfig, "capacitor.config.json", "application/json");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(capacitorConfig);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg">
                Déploiement Mobile • iOS (App Store) & Android (Play Store)
              </h3>
              <p className="text-xs text-slate-400">
                Installation immédiate PWA ou publication native sur les Stores officiels.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("PWA")}
            className={`flex-1 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "PWA"
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>1. Installation Instantanée PWA</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PLAYSTORE")}
            className={`flex-1 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "PLAYSTORE"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>2. Google Play Store (Android)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("APPSTORE")}
            className={`flex-1 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "APPSTORE"
                ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Apple className="w-4 h-4" />
            <span>3. Apple App Store (iOS)</span>
          </button>
        </div>

        {/* Tab 1: PWA Direct Install */}
        {activeTab === "PWA" && (
          <div className="space-y-4">
            <div className="bg-sky-950/40 border border-sky-800/40 rounded-2xl p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-sky-200 leading-relaxed">
                <span className="font-bold text-white block mb-0.5">
                  Application Web Progressive (PWA) 100% Configurée
                </span>
                ComptaAI dispose déjà du fichier <code className="bg-sky-900/60 px-1 py-0.5 rounded text-white">manifest.webmanifest</code>, des icônes Retina, du mode hors-ligne et de la prise en charge appareil photo. Vos collaborateurs peuvent l'installer en 3 secondes sans passer par les validateurs des stores.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* iOS Safari */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Apple className="w-4 h-4 text-slate-300" />
                  <span>Sur iPhone & iPad (iOS Safari)</span>
                </div>
                <ol className="space-y-2 text-slate-300 list-decimal list-inside text-[11px]">
                  <li>Ouvrez cette application dans le navigateur Safari.</li>
                  <li>
                    Touchez le bouton <strong className="text-white">Partager</strong> (icône carré avec flèche vers le haut).
                  </li>
                  <li>
                    Faites défiler vers le bas et touchez{" "}
                    <strong className="text-sky-400">« Sur l'écran d'accueil »</strong>.
                  </li>
                  <li>L'icône ComptaAI s'affiche et s'exécute en plein écran comme une app native !</li>
                </ol>
              </div>

              {/* Android Chrome */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Play className="w-4 h-4 text-emerald-400 fill-current" />
                  <span>Sur Smartphone Android (Chrome)</span>
                </div>
                <ol className="space-y-2 text-slate-300 list-decimal list-inside text-[11px]">
                  <li>Ouvrez l'application dans Google Chrome sur Android.</li>
                  <li>Une invite automatique <strong className="text-emerald-400">« Installer l'application »</strong> apparaît.</li>
                  <li>Ou touchez le menu ⋮ en haut à droite &gt; <strong className="text-white">« Installer l'application »</strong>.</li>
                  <li>L'application s'installe dans le tiroir d'applications Android avec notifications.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Google Play Store (TWA / Capacitor) */}
        {activeTab === "PLAYSTORE" && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400 fill-current" />
                  <span>Publication Google Play Store en 3 Étapes (Capacitor / TWA)</span>
                </h4>
                <button
                  type="button"
                  onClick={handleDownloadCapacitor}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger capacitor.config.json</span>
                </button>
              </div>

              <div className="space-y-2 text-slate-300">
                <p>
                  Pour publier ComptaAI sur le Google Play Store sous forme d'application native Android (<code className="text-emerald-400 font-mono">.aab</code> ou <code className="text-emerald-400 font-mono">.apk</code>) :
                </p>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-200 space-y-1">
                  <div># 1. Initialiser le wrapper Android natif</div>
                  <div className="text-emerald-400">npx cap init ComptaAI com.comptaai.app --web-dir dist</div>
                  <div># 2. Ajouter la plateforme Android</div>
                  <div className="text-emerald-400">npm install @capacitor/android @capacitor/camera</div>
                  <div className="text-emerald-400">npx cap add android</div>
                  <div># 3. Compiler le bundle Play Store</div>
                  <div className="text-emerald-400">npm run build && npx cap sync && npx cap open android</div>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Dans Android Studio, cliquez sur <strong>Build &gt; Generate Signed Bundle / APK</strong> et uploadez le fichier sur votre Google Play Console.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Apple App Store (iOS Xcode) */}
        {activeTab === "APPSTORE" && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Apple className="w-4 h-4 text-slate-200" />
                <span>Publication Apple App Store (iOS Xcode & TestFlight)</span>
              </h4>

              <div className="space-y-2 text-slate-300">
                <p>
                  Pour soumettre ComptaAI sur l'Apple App Store et distribuer via TestFlight :
                </p>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-200 space-y-1">
                  <div># 1. Ajouter la plateforme iOS native</div>
                  <div className="text-sky-400">npm install @capacitor/ios</div>
                  <div className="text-sky-400">npx cap add ios</div>
                  <div># 2. Synchroniser le build et ouvrir Xcode</div>
                  <div className="text-sky-400">npm run build && npx cap sync ios && npx cap open ios</div>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Dans Xcode, sélectionnez votre équipe Apple Developer, puis cliquez sur <strong>Product &gt; Archive &gt; Distribute App (App Store Connect)</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={() => {
              onToggleSimulator();
              onClose();
            }}
            className="bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Tester l'interface en format smartphone</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs px-5 py-2 rounded-xl transition cursor-pointer"
          >
            Fermer le guide
          </button>
        </div>
      </div>
    </div>
  );
};
