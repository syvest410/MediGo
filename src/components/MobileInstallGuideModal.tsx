import React, { useState } from 'react';
import { Smartphone, Monitor, Download, Apple, Chrome, CheckCircle2, Copy, Share2, Globe, Sparkles, X, ShieldCheck, Server } from 'lucide-react';

interface MobileInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileInstallGuideModal: React.FC<MobileInstallGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activePlatformTab, setActivePlatformTab] = useState<'ANDROID' | 'IOS' | 'CAPACITOR_EXPORT' | 'HOSTING'>('HOSTING');

  if (!isOpen) return null;

  const currentUrl = window.location.href;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl text-slate-100 my-auto space-y-0">
        
        {/* Modal Header */}
        <div className="bg-slate-800/90 border-b border-slate-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-red-950 p-2.5 rounded-xl text-red-400 border border-red-800">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">MediGo Hessen — Hosting, Mobile & Store Packaging</h3>
              <p className="text-xs text-slate-400">Hosting steps, PWA installation & publishing to Play Store / App Store</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs text-slate-300 max-h-[75vh] overflow-y-auto">
          
          {/* Web App Share Bar */}
          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2">
            <span className="text-xs font-bold text-white block">Current MediGo App URL</span>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 font-mono text-xs focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition-all shrink-0 min-h-[40px]"
              >
                {copiedUrl ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedUrl ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Platform Switcher */}
          <div className="flex overflow-x-auto border-b border-slate-800 no-scrollbar">
            <button
              onClick={() => setActivePlatformTab('HOSTING')}
              className={`py-2.5 px-4 font-bold text-center border-b-2 transition-all flex items-center justify-center space-x-1.5 shrink-0 ${
                activePlatformTab === 'HOSTING'
                  ? 'border-red-500 text-red-400 bg-red-950/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>1. Cloud Hosting</span>
            </button>

            <button
              onClick={() => setActivePlatformTab('ANDROID')}
              className={`py-2.5 px-4 font-bold text-center border-b-2 transition-all flex items-center justify-center space-x-1.5 shrink-0 ${
                activePlatformTab === 'ANDROID'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-950/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Chrome className="w-4 h-4" />
              <span>2. Android PWA</span>
            </button>

            <button
              onClick={() => setActivePlatformTab('IOS')}
              className={`py-2.5 px-4 font-bold text-center border-b-2 transition-all flex items-center justify-center space-x-1.5 shrink-0 ${
                activePlatformTab === 'IOS'
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Apple className="w-4 h-4" />
              <span>3. iOS PWA</span>
            </button>

            <button
              onClick={() => setActivePlatformTab('CAPACITOR_EXPORT')}
              className={`py-2.5 px-4 font-bold text-center border-b-2 transition-all flex items-center justify-center space-x-1.5 shrink-0 ${
                activePlatformTab === 'CAPACITOR_EXPORT'
                  ? 'border-amber-500 text-amber-300 bg-amber-950/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>4. Play Store & App Store</span>
            </button>
          </div>

          {/* TAB 0: HOSTING GUIDE */}
          {activePlatformTab === 'HOSTING' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-red-400" />
                  <span>How to Host MediGo Web Application</span>
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  MediGo Hessen is a full-stack React + Express Node.js application. You can deploy it to production using the following methods:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-1.5">
                    <span className="font-bold text-white text-xs flex items-center space-x-1.5">
                      <Server className="w-3.5 h-3.5 text-blue-400" />
                      <span>Google Cloud Run (Built-in)</span>
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Click the <strong>Deploy</strong> icon in AI Studio settings or run Docker container on GCP Cloud Run.
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-1.5">
                    <span className="font-bold text-white text-xs flex items-center space-x-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Vercel / Netlify / Render</span>
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Export project to GitHub via top menu settings, then connect repo to Vercel or Render for automatic deployment.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg font-mono text-[11px] text-emerald-300 space-y-1">
                  <div># Command to run on any VPS (Linux, AWS, DigitalOcean):</div>
                  <div className="text-white">npm run build</div>
                  <div className="text-white">npm start</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: ANDROID PWA */}
          {activePlatformTab === 'ANDROID' && (
            <div className="space-y-3">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                  <Chrome className="w-4 h-4 text-emerald-400" />
                  <span>How Drivers & Clinics Install on Android Phones</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400 leading-relaxed">
                  <li>Open Chrome on your Android smartphone and visit your hosted app URL.</li>
                  <li>Tap the <strong>three dots (⋮)</strong> menu in the top right corner of Chrome.</li>
                  <li>Tap <strong>"Add to Home Screen"</strong> or <strong>"Install app"</strong>.</li>
                  <li>The app will launch full-screen like a native APK without browser address bars!</li>
                </ol>
              </div>

              <div className="bg-emerald-950/60 border border-emerald-800 p-3 rounded-xl text-emerald-200 text-xs flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Supports offline basement mode, camera barcode scanning & GPS location tracking automatically.</span>
              </div>
            </div>
          )}

          {/* TAB 2: IOS PWA */}
          {activePlatformTab === 'IOS' && (
            <div className="space-y-3">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                  <Apple className="w-4 h-4 text-slate-200" />
                  <span>How Drivers & Clinics Install on iPhones & iPads</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400 leading-relaxed">
                  <li>Open <strong>Safari</strong> on your iPhone or iPad and open your app link.</li>
                  <li>Tap the <strong>Share button</strong> (square icon with arrow pointing up at the bottom).</li>
                  <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                  <li>Tap <strong>"Add"</strong> in the top right corner.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: CAPACITOR NATIVE BUILD INSTRUCTIONS */}
          {activePlatformTab === 'CAPACITOR_EXPORT' && (
            <div className="space-y-3">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <h4 className="font-bold text-sm text-amber-300 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Publishing to Google Play Store & Apple App Store</span>
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  Because MediGo is built with Vite, React, and Tailwind, it is 100% compatible with <strong>Capacitor</strong> and <strong>PWABuilder</strong> to build native APK/AAB and Xcode projects:
                </p>

                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg font-mono text-[11px] text-emerald-300 space-y-1">
                  <div># Step 1: Install Capacitor in project directory</div>
                  <div className="text-white">npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios</div>
                  <div className="pt-2"># Step 2: Build bundle & add mobile projects</div>
                  <div className="text-white">npm run build</div>
                  <div className="text-white">npx cap init "MediGo Hessen" "de.medigo.hessen.app"</div>
                  <div className="text-white">npx cap add android</div>
                  <div className="text-white">npx cap add ios</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-1">
                    <span className="font-bold text-emerald-400 text-xs">Google Play Store Submission</span>
                    <p className="text-[11px] text-slate-400">
                      Run <code className="text-emerald-300">npx cap open android</code> in Android Studio. Go to <strong>Build &gt; Generate Signed Bundle (.aab)</strong> and upload to Google Play Console.
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-1">
                    <span className="font-bold text-cyan-400 text-xs">Apple App Store Submission</span>
                    <p className="text-[11px] text-slate-400">
                      Run <code className="text-cyan-300">npx cap open ios</code> in Xcode on macOS. Go to <strong>Product &gt; Archive</strong> and distribute to App Store Connect.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="bg-slate-800/80 border-t border-slate-700 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2 rounded-xl transition-all"
          >
            Close Guide
          </button>
        </div>

      </div>
    </div>
  );
};
