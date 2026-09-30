import React, { useState } from 'react';
import { Order, TransportType } from '../../types';
import { SAMPLE_CONTRACTS, generateMonthlyInvoice, calculateOrderPrice } from '../../lib/billingEngine';
import { OrderQRCodeModal } from '../AdminDashboard/OrderQRCodeModal';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Building2, 
  PlusCircle, 
  Truck, 
  Receipt, 
  Calculator, 
  QrCode, 
  CheckCircle2, 
} from 'lucide-react';

interface ClientPortalProps {
  orders: Order[];
  onCreateOrder: (newOrder: any) => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ orders, onCreateOrder }) => {
  const { language, t } = useLanguage();
  const isDe = language === 'de';

  const [activeTab, setActiveTab] = useState<'NEW_PICKUP' | 'MY_SHIPMENTS' | 'BILLING' | 'PRICING_ADVISOR'>('NEW_PICKUP');
  const [selectedContractId, setSelectedContractId] = useState<string>(SAMPLE_CONTRACTS[0].contractId);
  const [qrModalOrder, setQrModalOrder] = useState<Order | null>(null);

  // New Pickup Form State
  const activeContract = SAMPLE_CONTRACTS.find(c => c.contractId === selectedContractId) || SAMPLE_CONTRACTS[0];
  const [pickupDepartment, setPickupDepartment] = useState(isDe ? 'Zentrale Pathologie & Blutbank' : 'Central Pathology & Blood Bank');
  const [contactPhone, setContactPhone] = useState('+49 30 450 50');
  const [deliveryLab, setDeliveryLab] = useState('Labor Berlin - Charité Vivantes GmbH');
  const [deliveryAddress, setDeliveryAddress] = useState('Sylter Str. 2, 13353 Berlin');
  const [transportType, setTransportType] = useState<TransportType>('REFRIGERATED_2_8C');
  const [sampleCategory, setSampleCategory] = useState(isDe ? 'UN 3373 Kat. B Blut & Gewebe' : 'UN 3373 Cat B Human Blood & Tissue');
  const [specimenBoxCount, setSpecimenBoxCount] = useState<number>(2);
  const [barcodeInput, setBarcodeInput] = useState('SPEC-CHARITE-881, SPEC-CHARITE-882');
  const [specialNotes, setSpecialNotes] = useState(isDe ? 'Aufrecht transportieren. Enthält fragile EDTA-Blutröhrchen.' : 'Keep upright. Contains fragile EDTA blood vials.');
  const [formSubmittedMsg, setFormSubmittedMsg] = useState('');

  // Filter orders created by or belonging to this clinic
  const clinicOrders = orders.filter(
    o => o.pickupClinicName.toLowerCase().includes(activeContract.clinicName.toLowerCase().split(' ')[0])
      || o.createdByOrg.toLowerCase().includes(activeContract.clinicName.toLowerCase().split(' ')[0])
  );

  const monthlyInvoice = generateMonthlyInvoice(activeContract.clinicName, orders, isDe ? 'Juli 2026' : 'July 2026');

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const barcodes = barcodeInput.split(',').map(b => b.trim()).filter(Boolean);

    const newOrderPayload = {
      trackingNumber: `DE-CLINIC-${Math.floor(10000 + Math.random() * 90000)}`,
      status: 'SCHEDULED',
      transportType,
      pickupClinicName: activeContract.clinicName,
      pickupAddress: 'Augustenburger Platz 1, 13353 Berlin',
      pickupDepartment,
      pickupContactPhone: contactPhone,
      deliveryLabName: deliveryLab,
      deliveryAddress,
      deliveryContactPhone: '+49 30 4000 80',
      scheduledPickupFrom: new Date(Date.now() + 1800000).toISOString(),
      scheduledPickupTo: new Date(Date.now() + 5400000).toISOString(),
      scheduledDeliveryBy: new Date(Date.now() + 10800000).toISOString(),
      sampleCategory,
      specimenBoxCount,
      barcodeList: barcodes.length > 0 ? barcodes : [`SPEC-${Date.now().toString().slice(-4)}`],
      specialNotes,
      p650Verified: true,
      createdById: 'USR-CLINIC-STAFF',
      createdByOrg: activeContract.clinicName,
      chainOfCustodyLogs: [],
      telemetryLogs: [],
      auditLogs: []
    };

    onCreateOrder(newOrderPayload);
    setFormSubmittedMsg(isDe 
      ? `Probenauftrag erfolgreich registriert! Kurier und Leitstand verständigt (Vertrag: ${activeContract.contractId})` 
      : `Pickup Request Registered! Dispatcher & Courier notified under Contract ${activeContract.contractId}`);
    setTimeout(() => {
      setFormSubmittedMsg('');
      setActiveTab('MY_SHIPMENTS');
    }, 2000);
  };

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* Clinic Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="bg-emerald-950 p-3 rounded-xl text-emerald-400 border border-emerald-800 shrink-0">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white">{activeContract.clinicName}</h2>
              <span className="bg-emerald-950 text-emerald-300 text-xs font-mono font-semibold px-2.5 py-0.5 rounded border border-emerald-700">
                {isDe ? 'Klinik & Labor Portal' : 'Client Portal'}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
              <span>{isDe ? 'Vertrags-ID:' : 'Contract ID:'} <strong className="text-slate-200 font-mono">{activeContract.contractId}</strong></span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">{isDe ? 'Aktiver Versorgungsvertrag' : 'Active Partner Agreement'}</span>
            </p>
          </div>
        </div>

        {/* Contract Switcher */}
        <div className="flex items-center space-x-2 text-xs bg-slate-950 p-2 rounded-xl border border-slate-800">
          <span className="text-slate-400 font-medium shrink-0">{isDe ? 'Angemeldete Klinik:' : 'Logged in Clinic:'}</span>
          <select
            value={selectedContractId}
            onChange={(e) => setSelectedContractId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white font-medium rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            {SAMPLE_CONTRACTS.map(c => (
              <option key={c.contractId} value={c.contractId}>
                {c.clinicName} ({c.pricingModel.replace('_', ' ')})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs shadow-lg">
        <button
          onClick={() => setActiveTab('NEW_PICKUP')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
            activeTab === 'NEW_PICKUP' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('clinic.tab_new')}</span>
        </button>

        <button
          onClick={() => setActiveTab('MY_SHIPMENTS')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
            activeTab === 'MY_SHIPMENTS' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{t('clinic.tab_shipments')} ({clinicOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('BILLING')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
            activeTab === 'BILLING' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{t('clinic.tab_billing')}</span>
        </button>

        <button
          onClick={() => setActiveTab('PRICING_ADVISOR')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
            activeTab === 'PRICING_ADVISOR' ? 'bg-slate-800 text-amber-300 border border-amber-500/40 hover:bg-slate-700' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4 text-amber-400" />
          <span>{t('clinic.tab_pricing')}</span>
        </button>
      </div>

      {/* TAB 1: SUBMIT PICKUP REQUEST */}
      {activeTab === 'NEW_PICKUP' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <span>{t('clinic.form_heading')}</span>
              </h3>
              <p className="text-xs text-slate-400">UN 3373 Kategorie B P650 & ApBetrO § 17 Konformität</p>
            </div>

            <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs px-3 py-1.5 rounded-xl font-mono">
              {isDe ? 'Tarifmodell:' : 'Contract Model:'} {activeContract.pricingModel.replace('_', ' ')}
            </div>
          </div>

          {formSubmittedMsg && (
            <div className="bg-emerald-950 border border-emerald-600 text-emerald-200 p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-bounce">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{formSubmittedMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitRequest} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">{t('clinic.pickup_dept')}</label>
              <input
                type="text"
                value={pickupDepartment}
                onChange={(e) => setPickupDepartment(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">{t('clinic.pickup_phone')}</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">{t('clinic.delivery_lab')}</label>
              <input
                type="text"
                value={deliveryLab}
                onChange={(e) => setDeliveryLab(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">{t('clinic.delivery_addr')}</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-slate-300 font-medium flex items-center justify-between">
                <span>{t('clinic.specimen_type')}</span>
                <span className="text-[11px] text-emerald-400 font-normal">GDP & UN 3373 P650 Zertifiziert</span>
              </label>
              
              {/* Service Category Quick Selection Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setSampleCategory(isDe ? 'Stammzellen / Apheresen' : 'Stammzellen / Apheresen (Stem Cells)');
                    setTransportType('REFRIGERATED_2_8C');
                    setSpecialNotes(isDe ? 'Stammzell- / Apheresetransport. Höchste Priorität GDP (Max 4 Std. Zeitfenster).' : 'Stem Cell / Apheresis transport. High Priority GDP Handling (Max 4h window).');
                  }}
                  className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    sampleCategory.includes('Stammzellen')
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-[11px] text-white">🧪 {isDe ? 'Stammzellen / Apheresen' : 'Stem Cells / Apheresis'}</span>
                  <span className="text-[10px] text-emerald-400 font-mono mt-0.5">GDP &lt; 4h</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSampleCategory(isDe ? 'Apotheken-Eilfahrt' : 'Apotheken-Eilfahrt (Urgent Pharmacy)');
                    setTransportType('AMBIENT_15_25C');
                    setSpecialNotes(isDe ? 'Apotheken-Eilfahrt: Notfall-Zytostatika & Kühlware direkt an Station.' : 'Urgent Pharmacy Delivery: Emergency Medication & Cytostatics.');
                  }}
                  className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    sampleCategory.includes('Apotheken')
                      ? 'bg-blue-950 border-blue-500 text-blue-200 ring-1 ring-blue-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-[11px] text-white">💊 {isDe ? 'Apotheken-Eilfahrt' : 'Urgent Pharmacy'}</span>
                  <span className="text-[10px] text-blue-400 font-mono mt-0.5">ApBetrO § 17</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSampleCategory(isDe ? 'UN 3373 Kat. B Blut & Gewebe' : 'UN 3373 Cat B Human Blood & Tissue');
                    setTransportType('REFRIGERATED_2_8C');
                  }}
                  className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    sampleCategory.includes('UN 3373') || sampleCategory.includes('Blut')
                      ? 'bg-red-950 border-red-500 text-red-200 ring-1 ring-red-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-[11px] text-white">🩸 {isDe ? 'UN 3373 Blut & Gewebe' : 'UN 3373 Blood & Tissue'}</span>
                  <span className="text-[10px] text-red-400 font-mono mt-0.5">P650 Packaging</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSampleCategory(isDe ? 'Biostoff UN 3373 Kleinstmengen' : 'Biostoff UN 3373 Kleinstmengen');
                    setTransportType('AMBIENT_15_25C');
                  }}
                  className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    sampleCategory.includes('Kleinstmengen')
                      ? 'bg-amber-950 border-amber-500 text-amber-200 ring-1 ring-amber-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-[11px] text-white">🔬 {isDe ? 'UN 3373 Kleinstmengen' : 'Small Volume Specimen'}</span>
                  <span className="text-[10px] text-amber-400 font-mono mt-0.5">Direct Ride</span>
                </button>
              </div>

              <select
                value={sampleCategory}
                onChange={(e) => setSampleCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="Stammzellen / Apheresen (Stem Cells)">{isDe ? 'Stammzellen / Apheresen (Zellprodukte - GDP zertifiziert)' : 'Stammzellen / Apheresen (Stem Cells & Cell Products - GDP Certified)'}</option>
                <option value="Apotheken-Eilfahrt (Urgent Pharmacy)">{isDe ? 'Apotheken-Eilfahrt (Eil-Medikamente, Zytostatika & Kühlware)' : 'Apotheken-Eilfahrt (Urgent Pharmacy / Emergency Medication)'}</option>
                <option value="UN 3373 Cat B Human Blood & Tissue">{isDe ? 'UN 3373 Kategorie B (Blutproben, Gewebe & Serum)' : 'UN 3373 Category B (Human Blood, Tissue & Biostoff)'}</option>
                <option value="Biostoff UN 3373 Kleinstmengen">{isDe ? 'Biostoff UN 3373 Kleinstmengen (Kosteneffiziente Direktfahrt)' : 'Biostoff UN 3373 Kleinstmengen (Small Volume Express Courier)'}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">{t('clinic.temp_range')}</label>
              <select
                value={transportType}
                onChange={(e) => setTransportType(e.target.value as TransportType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="REFRIGERATED_2_8C">{isDe ? 'Gekühlt (2°C bis 8°C) - Kalibrierte Transportbox' : 'Cold Chain (2°C to 8°C) - Calibrated Pack'}</option>
                <option value="AMBIENT_15_25C">{isDe ? 'Raumtemperatur (15°C bis 25°C) - Isoliert' : 'Ambient (15°C to 25°C) - Insulated'}</option>
                <option value="FROZEN_MINUS_20C">{isDe ? 'Tiefgekühlt (-20°C Trockeneis / Gefriergut)' : 'Frozen (-20°C Dry Ice / Deep Freeze)'}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">{t('clinic.box_count')}</label>
              <input
                type="number"
                min="1"
                max="20"
                value={specimenBoxCount}
                onChange={(e) => setSpecimenBoxCount(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-slate-300 font-medium">{t('clinic.barcodes')}</label>
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="z.B. SPEC-881, SPEC-882"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-slate-300 font-medium">{t('clinic.notes')}</label>
              <textarea
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2 pt-2 border-t border-slate-800 flex items-center justify-between">
              <div className="text-slate-400">
                <span>{isDe ? 'Voraussichtliche Abrechnung:' : 'Estimated Contract Charge:'} </span>
                <strong className="text-emerald-400 font-mono text-sm">
                  €{calculateOrderPrice({ specimenBoxCount, transportType } as Order, activeContract).toFixed(2)}
                </strong>
                {activeContract.pricingModel === 'MONTHLY_RETAINER' && (
                  <span className="text-slate-500 text-[11px] ml-1">{isDe ? '(Über Monatspauschale abgedeckt)' : '(Covered under Flat Retainer)'}</span>
                )}
              </div>

              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all"
              >
                {t('clinic.submit_booking')}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* TAB 2: ACTIVE SHIPMENTS & TRACKING */}
      {activeTab === 'MY_SHIPMENTS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Truck className="w-5 h-5 text-emerald-400" />
              <span>{isDe ? `Ausgehende Probenaufträge für ${activeContract.clinicName}` : `Outgoing Specimen Shipments for ${activeContract.clinicName}`}</span>
            </h3>

            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-lg font-mono">
              {clinicOrders.length} {isDe ? 'Aufträge' : 'Order(s)'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {clinicOrders.map((ord) => {
              const latestTel = ord.telemetryLogs[0];
              const isBreach = latestTel?.isBreach;

              return (
                <div key={ord.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <span className="font-mono font-bold text-white text-xs block">{ord.trackingNumber}</span>
                      <span className="text-[11px] text-slate-400">{ord.sampleCategory}</span>
                    </div>

                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold border ${
                      ord.status === 'DELIVERED'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-amber-950 text-amber-300 border-amber-700'
                    }`}>
                      {t(`status.${ord.status}`)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">{isDe ? 'Ziellabor' : 'Destination'}</span>
                      <span className="font-semibold text-slate-200 block truncate">{ord.deliveryLabName}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block">{isDe ? 'Kühlkette Sensor' : 'Live Thermo Sensor'}</span>
                      <span className={`font-mono font-bold ${isBreach ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                        {latestTel ? `${latestTel.tempCelsius}°C [${isDe ? 'OK' : 'OK'}]` : (isDe ? 'Sensor Aktiv' : 'Sensor Armed')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">
                      {ord.barcodeList.length} {isDe ? 'P650 Box(en) gescannt' : 'Specimen Box(es) Scanned'}
                    </span>

                    <button
                      onClick={() => setQrModalOrder(ord)}
                      className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{isDe ? 'QR-Label Drucken' : 'Print QR Label'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: MONTHLY BILLING & INVOICES */}
      {activeTab === 'BILLING' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span>{t('clinic.billing_heading')}</span>
              </h3>
              <p className="text-xs text-slate-400">{t('clinic.billing_sub')}</p>
            </div>

            <div className="bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-emerald-400">
              {monthlyInvoice.invoiceNumber}
            </div>
          </div>

          {/* Invoice Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-slate-400 text-[11px] block">{isDe ? 'Abrechnungszeitraum' : 'Billing Period'}</span>
              <span className="font-bold text-white text-base block">{monthlyInvoice.billingPeriod}</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-slate-400 text-[11px] block">{isDe ? 'Abgeschlossene Fahrten' : 'Completed Transports'}</span>
              <span className="font-bold text-white text-base block font-mono">{monthlyInvoice.totalTransports} {isDe ? 'Fahrten' : 'Trips'}</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-slate-400 text-[11px] block">{t('clinic.invoice_net')}</span>
              <span className="font-bold text-white text-base block font-mono">€{monthlyInvoice.subtotalEur.toFixed(2)}</span>
            </div>

            <div className="bg-emerald-950 border border-emerald-800 p-4 rounded-xl space-y-1">
              <span className="text-emerald-400 text-[11px] block">{t('clinic.invoice_gross')}</span>
              <span className="font-extrabold text-emerald-300 text-lg block font-mono">€{monthlyInvoice.totalEur.toFixed(2)}</span>
            </div>
          </div>

          {/* Itemized Transport Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white">{isDe ? `Einzelposten-Aufstellung für ${activeContract.clinicName}` : `Itemized Transports for ${activeContract.clinicName}`}</h4>
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="p-3">{isDe ? 'Datum' : 'Date'}</th>
                    <th className="p-3">{isDe ? 'Tracking-Nr.' : 'Tracking #'}</th>
                    <th className="p-3">{isDe ? 'Transportstrecke' : 'Transport Route'}</th>
                    <th className="p-3">{isDe ? 'Schutzboxen' : 'Box Count'}</th>
                    <th className="p-3 text-right">{isDe ? 'Betrag (€)' : 'Cost (€)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {monthlyInvoice.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50">
                      <td className="p-3 text-slate-300">{item.date}</td>
                      <td className="p-3 text-white font-bold">{item.trackingNumber}</td>
                      <td className="p-3 text-slate-200 font-sans">{item.route}</td>
                      <td className="p-3 text-slate-300">{item.boxCount} P650 {isDe ? 'Box(en)' : 'Box(es)'}</td>
                      <td className="p-3 text-right text-emerald-400 font-bold">
                        {item.amountEur > 0 ? `€${item.amountEur.toFixed(2)}` : (isDe ? 'Pauschale' : 'Retainer')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONTRACT PRICING ADVISOR & CALCULATOR TOOL */}
      {activeTab === 'PRICING_ADVISOR' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-amber-400" />
              <span>{t('clinic.pricing_heading')}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {t('clinic.pricing_sub')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Option 1: Fixed Route Fee */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <span className="bg-blue-950 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-800">
                  {isDe ? 'OPTION 1' : 'OPTION 1'}
                </span>
                <h4 className="font-bold text-sm text-white mt-2">{isDe ? 'Feste Pauschale pro Tour' : 'Fixed Fee per Route'}</h4>
                <p className="text-xs text-slate-400 mt-1">{isDe ? 'Feste Pauschale von 38,00 € pro Fahrt unabhängig von der Probenanzahl.' : 'Flat €38.00 rate per transport trip regardless of box count.'}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 font-mono text-xs">
                <span className="text-slate-400 text-[10px] block">{isDe ? 'Geschätzter Umsatz (25 Fahrten/Mo)' : 'Est. Revenue (25 trips/mo)'}</span>
                <span className="text-emerald-400 font-bold text-base">€950.00 / mo</span>
              </div>
            </div>

            {/* Option 2: Per Specimen Box Rate */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <span className="bg-emerald-950 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-800">
                  {isDe ? 'OPTION 2' : 'OPTION 2'}
                </span>
                <h4 className="font-bold text-sm text-white mt-2">{isDe ? 'Basispreis + Boxenstaffel' : 'Base + Per Box Rate'}</h4>
                <p className="text-xs text-slate-400 mt-1">{isDe ? '18,50 € Grundgebühr + 6,00 € pro P650 Probenbehälter.' : '€18.50 base pickup fee + €6.00 per P650 specimen box.'}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 font-mono text-xs">
                <span className="text-slate-400 text-[10px] block">{isDe ? 'Geschätzter Umsatz (25 Fahrten, 2 Boxen)' : 'Est. Revenue (25 trips, 2 boxes avg)'}</span>
                <span className="text-emerald-400 font-bold text-base">€762.50 / mo</span>
              </div>
            </div>

            {/* Option 3: Distance-based Rate */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <span className="bg-purple-950 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-800">
                  {isDe ? 'OPTION 3' : 'OPTION 3'}
                </span>
                <h4 className="font-bold text-sm text-white mt-2">{isDe ? 'Basis + Kilometerstaffel' : 'Base + Distance (€/km)'}</h4>
                <p className="text-xs text-slate-400 mt-1">{isDe ? '12,00 € Grundpreis + 1,75 € pro gefahrenem Kilometer.' : '€12.00 base + €1.75 per km driven (best for long highway routes).'}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 font-mono text-xs">
                <span className="text-slate-400 text-[10px] block">{isDe ? 'Geschätzter Umsatz (25 Fahrten, 18km)' : 'Est. Revenue (25 trips, 18km avg)'}</span>
                <span className="text-emerald-400 font-bold text-base">€1,087.50 / mo</span>
              </div>
            </div>

            {/* Option 4: Flat Monthly Retainer */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <span className="bg-amber-950 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-800">
                  {isDe ? 'OPTION 4' : 'OPTION 4'}
                </span>
                <h4 className="font-bold text-sm text-white mt-2">{isDe ? 'Monatliche Flatrate (Pauschale)' : 'Flat Monthly Retainer'}</h4>
                <p className="text-xs text-slate-400 mt-1">{isDe ? '850,00 €/Monat für bis zu 30 Abholungen + 28,00 € pro Mehrfahrt.' : '€850.00/mo flat for up to 30 pickups + €28.00 per overage trip.'}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 font-mono text-xs">
                <span className="text-slate-400 text-[10px] block">{isDe ? 'Garantierter Monats-Cashflow' : 'Guaranteed Cashflow'}</span>
                <span className="text-emerald-400 font-bold text-base">€850.00 / mo</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <OrderQRCodeModal
        order={qrModalOrder}
        isOpen={!!qrModalOrder}
        onClose={() => setQrModalOrder(null)}
      />

    </div>
  );
};
