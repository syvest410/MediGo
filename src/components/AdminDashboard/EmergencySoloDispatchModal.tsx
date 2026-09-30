import React, { useState } from 'react';
import { AlertTriangle, Copy, CheckCircle2, MessageSquare, Mail, ExternalLink, ShieldAlert, X, Send } from 'lucide-react';
import { Order } from '../../types';
import { logSubcontractorEmergency } from '../../lib/db';
import { useLanguage } from '../../context/LanguageContext';

interface EmergencySoloDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  driverGpsCoords?: { lat: number; lng: number };
  onSuccessDelegated?: (updatedOrder: Order) => void;
}

export const EmergencySoloDispatchModal: React.FC<EmergencySoloDispatchModalProps> = ({
  isOpen,
  onClose,
  order,
  driverGpsCoords = { lat: 50.0826, lng: 8.2400 },
  onSuccessDelegated
}) => {
  const { language } = useLanguage();
  const isDe = language === 'de';

  const [copiedSms, setCopiedSms] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [subcontractorName, setSubcontractorName] = useState(isDe ? 'Express Kurier Hessen GmbH' : 'Express Courier Hessen GmbH');
  const [subcontractorPhone, setSubcontractorPhone] = useState('+49 69 9882 200');
  const [emergencyReason, setEmergencyReason] = useState(isDe ? 'Persönlicher Notfall / Solo-Kapazitätsgrenze erreicht' : 'Personal Emergency / Courier Fleet Capacity Exceeded');
  const [isLogged, setIsLogged] = useState(false);

  if (!isOpen || !order) return null;

  const mapsUrl = `https://maps.google.com/?q=${driverGpsCoords.lat},${driverGpsCoords.lng}`;

  // Pre-formatted SMS / Instant Messenger Dispatch Template
  const smsDispatchText = isDe
    ? `🚨 MEDIGO NOTFALL-DELEGIERUNG (UN 3373)
Auftrag: ${order.trackingNumber} (${order.sampleCategory})
Abholung: ${order.pickupClinicName}, ${order.pickupAddress} (Tel: ${order.pickupContactPhone})
Ziel: ${order.deliveryLabName}, ${order.deliveryAddress}
Temp-Vorgabe: ${order.transportType} (${order.specimenBoxCount} Boxen)
Fahrer GPS: ${driverGpsCoords.lat.toFixed(4)}, ${driverGpsCoords.lng.toFixed(4)} (${mapsUrl})
Grund: ${emergencyReason}
Zentrale Kontakt: Hans Schmidt +49 171 9882310`
    : `🚨 MEDIGO EMERGENCY DELEGATION (UN 3373)
Order: ${order.trackingNumber} (${order.sampleCategory})
Pick: ${order.pickupClinicName}, ${order.pickupAddress} (Tel: ${order.pickupContactPhone})
Destination: ${order.deliveryLabName}, ${order.deliveryAddress}
Temp Spec: ${order.transportType} (${order.specimenBoxCount} Boxes)
Driver GPS: ${driverGpsCoords.lat.toFixed(4)}, ${driverGpsCoords.lng.toFixed(4)} (${mapsUrl})
Reason: ${emergencyReason}
Dispatch Contact: Hans Schmidt +49 171 9882310`;

  // Pre-formatted Formal Email Dispatch Template
  const emailDispatchText = isDe
    ? `BETREFF: Dringende Unterauftrags-Übernahme UN 3373 Proben-Transport ${order.trackingNumber}

Sehr geehrtes Dispatching-Team von ${subcontractorName},

aufgrund einer ungeplanten Betriebsstörung / Notfall-Kapazitätspause übergeben wir Ihnen den folgenden medizinischen Eilauftrag zur unmittelbaren Übernahme:

--- AUFTRAGSDETAILS ---
• Tracking-Nummer: ${order.trackingNumber}
• Probenkategorie: ${order.sampleCategory} (UN 3373 Kategorie B)
• Anzahl Probenbehälter: ${order.specimenBoxCount} P650 Isolierbox(en)
• Temperaturanforderung: ${order.transportType}

--- ROUTE & KONTAKTE ---
• Abholort: ${order.pickupClinicName}
  Adresse: ${order.pickupAddress}
  Abteilung: ${order.pickupDepartment || 'Probenannahme'}
  Ansprechpartner Tel: ${order.pickupContactPhone}

• Zielort: ${order.deliveryLabName}
  Adresse: ${order.deliveryAddress}
  Abteilung: ${order.deliveryDepartment || 'Labor-Empfang'}
  Ansprechpartner Tel: ${order.deliveryContactPhone}

--- FAHRER STANDORT & VERFOLGUNG ---
• Aktuelle Fahrer-Koordinaten: ${driverGpsCoords.lat}, ${driverGpsCoords.lng}
• Live Google Maps Link: ${mapsUrl}
• Grund der Weiterleitung: ${emergencyReason}

Bitte bestätigen Sie die Übernahme dieses Auftrags kurzfristig per Antwort-Mail oder Telefonat an +49 171 9882310.

Mit freundlichen Grüßen,
MediGo Hessen Notfall-Disposition
Wiesbaden Zentrale`
    : `SUBJECT: Urgent Subcontractor Delegation UN 3373 Specimen Transport ${order.trackingNumber}

Dear Dispatching Team of ${subcontractorName},

Due to an unforeseen operational pause or solo capacity limit, we hereby transfer the following urgent medical transport order for immediate handover:

--- ORDER DETAILS ---
• Tracking Number: ${order.trackingNumber}
• Specimen Category: ${order.sampleCategory} (UN 3373 Category B)
• Specimen Box Count: ${order.specimenBoxCount} P650 Insulated Box(es)
• Temperature Requirement: ${order.transportType}

--- ROUTE & CONTACTS ---
• Pickup Clinic: ${order.pickupClinicName}
  Address: ${order.pickupAddress}
  Department: ${order.pickupDepartment || 'Specimen Ward'}
  Contact Phone: ${order.pickupContactPhone}

• Destination Lab: ${order.deliveryLabName}
  Address: ${order.deliveryAddress}
  Department: ${order.deliveryDepartment || 'Lab Intake'}
  Contact Phone: ${order.deliveryContactPhone}

--- DRIVER GPS & TRACKING ---
• Current Driver Coordinates: ${driverGpsCoords.lat}, ${driverGpsCoords.lng}
• Live Google Maps Link: ${mapsUrl}
• Delegation Reason: ${emergencyReason}

Please confirm acceptance of this order via return email or phone to +49 171 9882310.

Best regards,
MediGo Hessen Emergency Dispatch
Wiesbaden Hub`;

  const handleCopySms = () => {
    navigator.clipboard.writeText(smsDispatchText);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2500);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailDispatchText);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleOpenWhatsapp = () => {
    const cleanPhone = subcontractorPhone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(smsDispatchText);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
  };

  const handleOpenMailto = () => {
    const subject = encodeURIComponent(isDe ? `DRINGEND: UN 3373 Transport Delegierung - ${order.trackingNumber}` : `URGENT: UN 3373 Transport Delegation - ${order.trackingNumber}`);
    const body = encodeURIComponent(emailDispatchText);
    window.open(`mailto:dispatch@express-courier-hessen.de?subject=${subject}&body=${body}`, '_blank');
  };

  const handleConfirmDelegation = () => {
    logSubcontractorEmergency({
      orderId: order.id,
      trackingNumber: order.trackingNumber,
      driverId: order.driverId || 'USR-DRIVER-SOLO',
      driverName: order.driverName || 'Solo Operator',
      reason: emergencyReason,
      gpsLatitude: driverGpsCoords.lat,
      gpsLongitude: driverGpsCoords.lng,
      subcontractorName,
      subcontractorPhone,
      dispatchTextSms: smsDispatchText,
      dispatchTextEmail: emailDispatchText
    });

    const updatedOrder: Order = {
      ...order,
      delegatedToSubcontractor: true,
      subcontractorName,
      subcontractorPhone,
      subcontractorDelegatedAt: new Date().toISOString(),
      auditLogs: [
        ...order.auditLogs,
        {
          id: `AUD-EMG-${Date.now()}`,
          orderId: order.id,
          previousState: order.status,
          newState: order.status,
          actionDescription: isDe
            ? `🚨 SOLO NOTFALL-DELEGIERUNG: Auftrag an Subunternehmer ${subcontractorName} (${subcontractorPhone}) übergeben.`
            : `🚨 SOLO EMERGENCY DELEGATION: Order assigned to subcontractor ${subcontractorName} (${subcontractorPhone}). Incident logged.`,
          userId: 'SYS-SOLO-DISPATCH',
          userName: 'Solo Operator Emergency Engine',
          userRole: 'DISPATCHER',
          deviceId: 'SOLO-PAUSE-MODAL',
          gpsLatitude: driverGpsCoords.lat,
          gpsLongitude: driverGpsCoords.lng,
          offlineSynced: true,
          createdAt: new Date().toISOString()
        }
      ]
    };

    setIsLogged(true);
    if (onSuccessDelegated) {
      onSuccessDelegated(updatedOrder);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl text-slate-100 my-auto">
        
        {/* Header */}
        <div className="bg-amber-950/80 border-b border-amber-700/60 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold animate-pulse">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-200">
                {isDe ? 'Solo-Kurier Notfall-Disposition & Subunternehmer-Delegation' : 'Solo Operator Emergency Dispatch & Subcontractor Delegation'}
              </h3>
              <p className="text-xs text-amber-300/80">
                {isDe ? `Sofort-Übergabe UN 3373 an Partnerkurier (Auftrag #${order.trackingNumber})` : `Immediate UN 3373 Partner Handoff Template (Order #${order.trackingNumber})`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5 text-xs text-slate-300 max-h-[78vh] overflow-y-auto">

          {/* Subcontractor & Reason Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950 border border-slate-800 p-3.5 rounded-xl">
            <div>
              <label className="block text-slate-400 font-medium mb-1">{isDe ? 'Name des Partnerunternehmers' : 'Partner Subcontractor Name'}</label>
              <input
                type="text"
                value={subcontractorName}
                onChange={(e) => setSubcontractorName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">{isDe ? 'Telefon / Notfall-Hotline' : 'Subcontractor Hotline / Phone'}</label>
              <input
                type="text"
                value={subcontractorPhone}
                onChange={(e) => setSubcontractorPhone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-semibold"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-slate-400 font-medium mb-1">{isDe ? 'Grund der Notfall-Delegation' : 'Incident / Emergency Pause Reason'}</label>
              <select
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
              >
                <option value={isDe ? 'Persönlicher Notfall / Solo-Kapazitätsgrenze erreicht' : 'Personal Emergency / Courier Fleet Capacity Exceeded'}>
                  {isDe ? 'Persönlicher Notfall / Solo-Kapazitätsgrenze' : 'Personal Emergency / Solo Capacity Limit'}
                </option>
                <option value={isDe ? 'Fahrzeugpanne / Technischer Defekt auf der Autobahn' : 'Vehicle Breakdown / Mechanical Failure'}>
                  {isDe ? 'Fahrzeugpanne / Reifenschaden auf Autobahn' : 'Vehicle Breakdown / Tire Failure on Highway'}
                </option>
                <option value={isDe ? 'Klinikverzögerung / Quarantäne-Sperre vor Ort' : 'Hospital Pickup Lockdown / Severe Delay'}>
                  {isDe ? 'Klinikverzögerung / Straßensperrung' : 'Hospital Pickup Delay / Road Blockade'}
                </option>
                <option value={isDe ? 'Kühlbox-Abweichung / Sensor-Rekalibrierung nötig' : 'Thermal Container Breach / Sensor Recalibration'}>
                  {isDe ? 'Kühlbox-Rekalibrierung erforderlich' : 'Thermal Packaging Recalibration Needed'}
                </option>
              </select>
            </div>
          </div>

          {/* SMS / WhatsApp Messenger Template */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 text-xs flex items-center space-x-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>{isDe ? '1. Vorformatierte SMS / WhatsApp Kurier-Nachricht' : '1. Pre-Formatted SMS / WhatsApp Dispatch Text'}</span>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopySms}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1"
                >
                  {copiedSms ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSms ? (isDe ? 'Text kopiert!' : 'Copied Text!') : (isDe ? 'SMS Kopieren' : 'Copy SMS')}</span>
                </button>
                <button
                  onClick={handleOpenWhatsapp}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
            <pre className="bg-slate-900 p-3 rounded-lg text-[11px] font-mono text-emerald-300 whitespace-pre-wrap border border-slate-800">
              {smsDispatchText}
            </pre>
          </div>

          {/* Formal Email Dispatch Template */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 text-xs flex items-center space-x-1.5">
                <Mail className="w-4 h-4 text-cyan-400" />
                <span>{isDe ? '2. Formeller E-Mail-Übernahmeauftrag' : '2. Formal Email Subcontractor Delegation Letter'}</span>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyEmail}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1"
                >
                  {copiedEmail ? <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedEmail ? (isDe ? 'E-Mail kopiert!' : 'Copied Email!') : (isDe ? 'E-Mail Kopieren' : 'Copy Email')}</span>
                </button>
                <button
                  onClick={handleOpenMailto}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{isDe ? 'Mail Programm' : 'Mail App'}</span>
                </button>
              </div>
            </div>
            <pre className="bg-slate-900 p-3 rounded-lg text-[11px] font-mono text-cyan-200 whitespace-pre-wrap border border-slate-800 max-h-48 overflow-y-auto">
              {emailDispatchText}
            </pre>
          </div>

          {/* Log Action Button */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>
                {isDe
                  ? 'Klicken erzeugt einen GoBD-Audit-Eintrag und setzt den Status auf Unterauftrag.'
                  : 'Clicking confirm logs an immutable audit trail entry and sets order to subcontractor delegation.'}
              </span>
            </div>

            <button
              onClick={handleConfirmDelegation}
              disabled={isLogged}
              className={`px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 transition-all ${
                isLogged
                  ? 'bg-emerald-900 text-emerald-200 border border-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/50'
              }`}
            >
              {isLogged ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Send className="w-4 h-4" />}
              <span>{isLogged ? (isDe ? 'Delegation protokolliert!' : 'Delegation Logged!') : (isDe ? 'Übergabe bestätigen & protokollieren' : 'Confirm & Log Subcontractor Handover')}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
