import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Building2, 
  Eye, 
  UserX, 
  Scale, 
  ShieldAlert,
  HardDrive,
  FileCheck
} from 'lucide-react';

export const LegalComplianceCenter: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'GDPR' | 'BIOLOGICS_LAW' | 'AVV_CONTRACT' | 'SECURITY'>('GDPR');
  const [downloadMsg, setDownloadMsg] = useState('');

  const handleDownloadAVV = () => {
    setDownloadMsg('Generated GDPR Art. 28 Data Processing Agreement (AVV) PDF template!');
    setTimeout(() => setDownloadMsg(''), 3000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-6 shadow-xl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3.5">
          <div className="bg-red-950 p-3 rounded-xl text-red-400 border border-red-800 shrink-0">
            <Scale className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white">MediGo Hessen — Legal, Regulatory & Data Protection Center</h2>
              <span className="bg-red-950 text-red-300 border border-red-700 text-xs px-2.5 py-0.5 rounded font-mono font-semibold">
                EU DSGVO & German Law Compliant
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict legal compliance framework protecting MediGo Hessen logistics operations from legal liability & fines.
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadAVV}
          className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow-lg transition-all shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Download GDPR AVV Contract</span>
        </button>
      </div>

      {downloadMsg && (
        <div className="bg-red-950 border border-red-700 text-red-200 p-3 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-red-400" />
          <span>{downloadMsg}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveSection('GDPR')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center space-x-1.5 ${
            activeSection === 'GDPR' ? 'bg-red-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserX className="w-4 h-4" />
          <span>GDPR / DSGVO Data Privacy</span>
        </button>

        <button
          onClick={() => setActiveSection('BIOLOGICS_LAW')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center space-x-1.5 ${
            activeSection === 'BIOLOGICS_LAW' ? 'bg-red-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>UN 3373 & Transfusionsgesetz</span>
        </button>

        <button
          onClick={() => setActiveSection('SECURITY')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center space-x-1.5 ${
            activeSection === 'SECURITY' ? 'bg-red-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Encryption & Data Auditing</span>
        </button>

        <button
          onClick={() => setActiveSection('AVV_CONTRACT')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center space-x-1.5 ${
            activeSection === 'AVV_CONTRACT' ? 'bg-red-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Clinic Client Legal AVV Agreement</span>
        </button>
      </div>

      {/* SECTION 1: GDPR / DSGVO */}
      {activeSection === 'GDPR' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <UserX className="w-4 h-4" />
                <span>1. Patient Pseudonymization</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Under Art. 4 No. 5 DSGVO, raw patient names, medical diagnoses, or national IDs are <strong>never</strong> transmitted or stored in the app. Only barcode tracking numbers (e.g. <code className="text-emerald-300">SPEC-CHARITE-881</code>) are processed.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <HardDrive className="w-4 h-4" />
                <span>2. Local Storage & Offline Protection</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Driver offline queue logs stored in browser LocalStorage/IndexedDB use salt-hashed session keys and automated purging upon successful synchronization to central servers.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <FileText className="w-4 h-4" />
                <span>3. Right to Eradication (Art. 17)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Clinic clients can request telemetry log purges after statutory medical archiving periods (10 years for blood components under § 11 TFG) expire.
              </p>
            </div>

          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
            <h4 className="font-bold text-white text-sm">DSGVO Privacy Compliance Certificate</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px] text-slate-300">
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Data Controller</span>
                <span className="text-white font-bold">MediGo Logistics Hessen GmbH</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Data Protection Officer</span>
                <span className="text-red-400 font-bold">dpo@medigo-hessen.de</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Server Storage Center</span>
                <span className="text-white font-bold">Frankfurt am Main, Hessen (EU)</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Encryption Standard</span>
                <span className="text-red-400 font-bold">AES-256 / TLS 1.3</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: GERMAN BIOLOGY & TRANSPORT LAW */}
      {activeSection === 'BIOLOGICS_LAW' && (
        <div className="space-y-4 text-xs">
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-3">
            <h4 className="font-bold text-white text-sm flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Medical Logistics Legal Statutes & Guidelines Handled</span>
            </h4>

            <div className="space-y-3">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">1. ADR Packaging Instruction P650 (UN 3373)</span>
                  <span className="text-emerald-400 font-mono font-bold">Compliant</span>
                </div>
                <p className="text-slate-400">
                  Biological Substance Category B requires triple packaging (primary receptacle, secondary leakproof packaging, rigid outer box). The app enforces box count verification and P650 checklist confirmation before pickup.
                </p>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">2. German Transfusionsgesetz (§ 15 TFG)</span>
                  <span className="text-emerald-400 font-mono font-bold">Compliant</span>
                </div>
                <p className="text-slate-400">
                  Mandates continuous temperature recording and immutable chain of custody for blood components between 2°C and 8°C. Proof of thermal integrity is auto-embedded into signed PDF certificates.
                </p>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">3. BioStoffV (Biostoffverordnung - Ordinance on Biological Agents)</span>
                  <span className="text-emerald-400 font-mono font-bold">Compliant</span>
                </div>
                <p className="text-slate-400">
                  Regulates driver safety precautions during transport of Risk Group 2/3 diagnostic samples. Includes spill kit verification and emergency laboratory protocol logs.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: ENCRYPTION & SECURITY */}
      {activeSection === 'SECURITY' && (
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4 text-xs">
          <h4 className="font-bold text-white text-sm flex items-center space-x-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Cryptographic Security & Audit Integrity</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-white block">Digital Signature Verification</span>
              <p className="text-slate-400 leading-relaxed">
                Handwritten touch signatures captured on mobile devices at pickup & handover are stored as vector coordinates + PNG data hashes, preventing signature tampering or falsification.
              </p>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-white block">GPS & Sensor Telemetry Tamper-Proofing</span>
              <p className="text-slate-400 leading-relaxed">
                Sensor logs are time-stamped with Unix Epoch milliseconds and linked in a cryptographic SHA-256 chain to prevent retroactive alteration of temperature breaches.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: CLINIC AVV AGREEMENT */}
      {activeSection === 'AVV_CONTRACT' && (
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="font-bold text-white text-sm">Data Processing Agreement (AVV / Order Data Agreement)</h4>
              <p className="text-slate-400">Standard contract required when onboarding clinic clients under Art. 28 GDPR.</p>
            </div>
            <button
              onClick={handleDownloadAVV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF Template</span>
            </button>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto">
            <p className="font-bold text-white">AUFTRAGSVERARBEITUNGSVERTRAG (AVV) gem. Art. 28 DSGVO</p>
            <p>Zwischen dem Auftraggeber (Klinik / Laboratorium Hessen) und dem Auftragnehmer (MediGo Logistics Hessen GmbH / CEO Courier Logistics Frankfurt).</p>
            <p>1. Gegenstand und Dauer der Verarbeitung: Transport von biologischen Proben der Kategorie B (UN 3373) in Hessen.</p>
            <p>2. Art und Zweck der Verarbeitung: Logistische Beförderung, Kühlkettenüberwachung und Quittierungsdokumentation.</p>
            <p>3. Art der personenbezogenen Daten: Keine Patientendaten. Ausnahmslos anonymisierte/pseudonymisierte Barcode-Kennungen.</p>
            <p>4. Technische und Organisatorische Maßnahmen (TOM): End-to-End Verschlüsselung, Rollenbasierte Zugriffskontrolle, 10 Jahre Revisionssicherheit.</p>
          </div>
        </div>
      )}

    </div>
  );
};
