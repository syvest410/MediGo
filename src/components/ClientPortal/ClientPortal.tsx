import React, { useState } from 'react';
import { Order, TransportType, TRANSPORT_TEMP_RANGES } from '../../types';
import { SAMPLE_CONTRACTS, generateMonthlyInvoice, calculateOrderPrice } from '../../lib/billingEngine';
import { OrderQRCodeModal } from '../AdminDashboard/OrderQRCodeModal';
import { 
  Building2, 
  PlusCircle, 
  FileText, 
  Truck, 
  Receipt, 
  Calculator, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  Thermometer, 
  Download,
  DollarSign,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';

interface ClientPortalProps {
  orders: Order[];
  onCreateOrder: (newOrder: any) => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ orders, onCreateOrder }) => {
  const [activeTab, setActiveTab] = useState<'NEW_PICKUP' | 'MY_SHIPMENTS' | 'BILLING' | 'PRICING_ADVISOR'>('NEW_PICKUP');
  const [selectedContractId, setSelectedContractId] = useState<string>(SAMPLE_CONTRACTS[0].contractId);
  const [qrModalOrder, setQrModalOrder] = useState<Order | null>(null);

  // New Pickup Form State
  const activeContract = SAMPLE_CONTRACTS.find(c => c.contractId === selectedContractId) || SAMPLE_CONTRACTS[0];
  const [pickupDepartment, setPickupDepartment] = useState('Central Pathology & Blood Bank');
  const [contactPhone, setContactPhone] = useState('+49 30 450 50');
  const [deliveryLab, setDeliveryLab] = useState('Labor Berlin - Charité Vivantes GmbH');
  const [deliveryAddress, setDeliveryAddress] = useState('Sylter Str. 2, 13353 Berlin');
  const [transportType, setTransportType] = useState<TransportType>('REFRIGERATED_2_8C');
  const [sampleCategory, setSampleCategory] = useState('UN 3373 Cat B Human Blood & Tissue');
  const [specimenBoxCount, setSpecimenBoxCount] = useState<number>(2);
  const [barcodeInput, setBarcodeInput] = useState('SPEC-CHARITE-881, SPEC-CHARITE-882');
  const [pickupWindow, setPickupWindow] = useState('14:30 - 15:00 Today');
  const [specialNotes, setSpecialNotes] = useState('Keep upright. Contains fragile EDTA blood vials.');
  const [formSubmittedMsg, setFormSubmittedMsg] = useState('');

  // Filter orders created by or belonging to this clinic
  const clinicOrders = orders.filter(
    o => o.pickupClinicName.toLowerCase().includes(activeContract.clinicName.toLowerCase().split(' ')[0])
      || o.createdByOrg.toLowerCase().includes(activeContract.clinicName.toLowerCase().split(' ')[0])
  );

  const monthlyInvoice = generateMonthlyInvoice(activeContract.clinicName, orders, 'Juli 2026');

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
    setFormSubmittedMsg(`Pickup Request Registered! Dispatcher & Courier notified under Contract ${activeContract.contractId}`);
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
                Client Portal
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
              <span>Contract ID: <strong className="text-slate-200 font-mono">{activeContract.contractId}</strong></span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Active Partner Agreement</span>
            </p>
          </div>
        </div>

        {/* Contract Switcher */}
        <div className="flex items-center space-x-2 text-xs bg-slate-950 p-2 rounded-xl border border-slate-800">
          <span className="text-slate-400 font-medium shrink-0">Logged in Clinic:</span>
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
          <span>Submit Specimen Pickup</span>
        </button>

        <button
          onClick={() => setActiveTab('MY_SHIPMENTS')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
            activeTab === 'MY_SHIPMENTS' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Active Shipments ({clinicOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('BILLING')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
            activeTab === 'BILLING' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Monthly Billing & Invoices</span>
        </button>

        <button
          onClick={() => setActiveTab('PRICING_ADVISOR')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
            activeTab === 'PRICING_ADVISOR' ? 'bg-slate-800 text-amber-300 border border-amber-500/40 hover:bg-slate-700' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4 text-amber-400" />
          <span>Contract Pricing Advisor</span>
        </button>
      </div>

      {/* TAB 1: SUBMIT PICKUP REQUEST */}
      {activeTab === 'NEW_PICKUP' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <span>Schedule Biological Specimen Pickup Request</span>
              </h3>
              <p className="text-xs text-slate-400">UN 3373 Category B P650 Packaging Pre-Registration</p>
            </div>

            <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs px-3 py-1.5 rounded-xl font-mono">
              Contract Model: {activeContract.pricingModel.replace('_', ' ')}
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
              <label className="text-slate-300 font-medium">Pickup Department / Ward</label>
              <input
                type="text"
                value={pickupDepartment}
                onChange={(e) => setPickupDepartment(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Clinic Contact Phone (Operating Hours Dispatch)</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Destination Laboratory</label>
              <input
                type="text"
                value={deliveryLab}
                onChange={(e) => setDeliveryLab(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Laboratory Address</label>
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
                <span>Dedicated Medical Service Category</span>
                <span className="text-[11px] text-emerald-400 font-normal">GDP & UN 3373 Certified</span>
              </label>
              
              {/* Service Category Quick Selection Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setSampleCategory('Stammzellen / Apheresen (Stem Cells)');
                    setTransportType('REFRIGERATED_2_8C');
                    setSpecialNotes('Stem Cell / Apheresis transport. High Priority GDP Handling (Max 4h window).');
                  }}
                  className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    sampleCategory.includes('Stammzellen')
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-[11px] text-white">🧪 Stammzellen / Apheresen</span>
                  <span className="text-[10px] text-emerald-400 font-mono mt-0.5">GDP Stem Cells</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSampleCategory('Apotheken-Eilfahrt (Urgent Pharmacy)');
                    setTransportType('AMBIENT_15_25C');
                    setSpecialNotes('Urgent Pharmacy Delivery: Emergency Medication & Cytostatics.');
                  }}
                  className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    sampleCategory.includes('Apotheken')
                      ? 'bg-blue-950 border-blue-500 text-blue-200 ring-1 ring-blue-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-[11px] text-white">💊 Apotheken-Eilfahrt</span>
                  <span className="text-[10px] text-blue-400 font-mono mt-0.5">Urgent Pharmacy</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSampleCategory('UN 3373 Cat B Human Blood & Tissue');
                    setTransportType('REFRIGERATED_2_8C');
                  }}
                  className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    sampleCategory.includes('UN 3373 Cat B')
                      ? 'bg-red-950 border-red-500 text-red-200 ring-1 ring-red-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-[11px] text-white">🩸 UN 3373 Blood & Tissue</span>
                  <span className="text-[10px] text-red-400 font-mono mt-0.5">Diagnostic Samples</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSampleCategory('Biostoff UN 3373 Kleinstmengen');
                    setTransportType('AMBIENT_15_25C');
                  }}
                  className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    sampleCategory.includes('Kleinstmengen')
                      ? 'bg-amber-950 border-amber-500 text-amber-200 ring-1 ring-amber-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-[11px] text-white">🔬 UN 3373 Kleinstmengen</span>
                  <span className="text-[10px] text-amber-400 font-mono mt-0.5">Small Volume Courier</span>
                </button>
              </div>

              <select
                value={sampleCategory}
                onChange={(e) => setSampleCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="Stammzellen / Apheresen (Stem Cells)">Stammzellen / Apheresen (Stem Cells & Cell Products - GDP Certified)</option>
                <option value="Apotheken-Eilfahrt (Urgent Pharmacy)">Apotheken-Eilfahrt (Urgent Pharmacy / Emergency Medication)</option>
                <option value="UN 3373 Cat B Human Blood & Tissue">UN 3373 Category B (Human Blood, Tissue & Biostoff)</option>
                <option value="Biostoff UN 3373 Kleinstmengen">Biostoff UN 3373 Kleinstmengen (Small Volume Express Courier)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Transport Specimen Specification</label>
              <select
                value={transportType}
                onChange={(e) => setTransportType(e.target.value as TransportType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="REFRIGERATED_2_8C">Cold Chain (2°C to 8°C) - Calibrated Pack</option>
                <option value="AMBIENT_15_25C">Ambient (15°C to 25°C) - Insulated</option>
                <option value="FROZEN_MINUS_20C">Frozen (-20°C Dry Ice / Deep Freeze)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Specimen Box Count (P650 Certified)</label>
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
              <label className="text-slate-300 font-medium">Sample Box Barcodes (Comma Separated)</label>
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="e.g. SPEC-881, SPEC-882"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-slate-300 font-medium">Special Handling Notes</label>
              <textarea
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2 pt-2 border-t border-slate-800 flex items-center justify-between">
              <div className="text-slate-400">
                <span>Estimated Contract Charge: </span>
                <strong className="text-emerald-400 font-mono text-sm">
                  €{calculateOrderPrice({ specimenBoxCount, transportType } as Order, activeContract).toFixed(2)}
                </strong>
                {activeContract.pricingModel === 'MONTHLY_RETAINER' && (
                  <span className="text-slate-500 text-[11px] ml-1">(Covered under Flat Retainer)</span>
                )}
              </div>

              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all"
              >
                Submit Pickup Request
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
              <span>Outgoing Specimen Shipments for {activeContract.clinicName}</span>
            </h3>

            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-lg font-mono">
              {clinicOrders.length} Order(s)
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
                      {ord.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Destination</span>
                      <span className="font-semibold text-slate-200 block truncate">{ord.deliveryLabName}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block">Live Thermo Sensor</span>
                      <span className={`font-mono font-bold ${isBreach ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                        {latestTel ? `${latestTel.tempCelsius}°C [OK]` : 'Sensor Armed'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">
                      {ord.barcodeList.length} Specimen Box(es) Scanned
                    </span>

                    <button
                      onClick={() => setQrModalOrder(ord)}
                      className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Print QR Label</span>
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
                <span>Monthly Transport Billing Statement & Contract Ledger</span>
              </h3>
              <p className="text-xs text-slate-400">German Medical Logistics Account Invoicing (MwSt 19%)</p>
            </div>

            <div className="bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-emerald-400">
              {monthlyInvoice.invoiceNumber}
            </div>
          </div>

          {/* Invoice Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-slate-400 text-[11px] block">Billing Period</span>
              <span className="font-bold text-white text-base block">{monthlyInvoice.billingPeriod}</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-slate-400 text-[11px] block">Completed Transports</span>
              <span className="font-bold text-white text-base block font-mono">{monthlyInvoice.totalTransports} Trips</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-slate-400 text-[11px] block">Subtotal (Net)</span>
              <span className="font-bold text-white text-base block font-mono">€{monthlyInvoice.subtotalEur.toFixed(2)}</span>
            </div>

            <div className="bg-emerald-950 border border-emerald-800 p-4 rounded-xl space-y-1">
              <span className="text-emerald-400 text-[11px] block">Total Payable (incl. 19% MwSt)</span>
              <span className="font-extrabold text-emerald-300 text-lg block font-mono">€{monthlyInvoice.totalEur.toFixed(2)}</span>
            </div>
          </div>

          {/* Itemized Transport Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white">Itemized Transports for {activeContract.clinicName}</h4>
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Tracking #</th>
                    <th className="p-3">Transport Route</th>
                    <th className="p-3">Box Count</th>
                    <th className="p-3 text-right">Cost (€)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {monthlyInvoice.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50">
                      <td className="p-3 text-slate-300">{item.date}</td>
                      <td className="p-3 text-white font-bold">{item.trackingNumber}</td>
                      <td className="p-3 text-slate-200 font-sans">{item.route}</td>
                      <td className="p-3 text-slate-300">{item.boxCount} P650 Box(es)</td>
                      <td className="p-3 text-right text-emerald-400 font-bold">
                        {item.amountEur > 0 ? `€${item.amountEur.toFixed(2)}` : 'Retainer'}
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
              <span>Business Owner Contract Pricing Advisor & Billing Options Calculator</span>
            </h3>
            <p className="text-xs text-slate-400">
              Simulate monthly revenue vs vehicle operational costs to choose the best contract structure for new clinic clients.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Option 1: Fixed Route Fee */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <span className="bg-blue-950 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-800">
                  OPTION 1
                </span>
                <h4 className="font-bold text-sm text-white mt-2">Fixed Fee per Route</h4>
                <p className="text-xs text-slate-400 mt-1">Flat €38.00 rate per transport trip regardless of box count.</p>
              </div>

              <div className="pt-3 border-t border-slate-800 font-mono text-xs">
                <span className="text-slate-400 text-[10px] block">Est. Revenue (25 trips/mo)</span>
                <span className="text-emerald-400 font-bold text-base">€950.00 / mo</span>
              </div>
            </div>

            {/* Option 2: Per Specimen Box Rate */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <span className="bg-emerald-950 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-800">
                  OPTION 2
                </span>
                <h4 className="font-bold text-sm text-white mt-2">Base + Per Box Rate</h4>
                <p className="text-xs text-slate-400 mt-1">€18.50 base pickup fee + €6.00 per P650 specimen box.</p>
              </div>

              <div className="pt-3 border-t border-slate-800 font-mono text-xs">
                <span className="text-slate-400 text-[10px] block">Est. Revenue (25 trips, 2 boxes avg)</span>
                <span className="text-emerald-400 font-bold text-base">€762.50 / mo</span>
              </div>
            </div>

            {/* Option 3: Distance-based Rate */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <span className="bg-purple-950 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-800">
                  OPTION 3
                </span>
                <h4 className="font-bold text-sm text-white mt-2">Base + Distance (€/km)</h4>
                <p className="text-xs text-slate-400 mt-1">€12.00 base + €1.75 per km driven (best for long highway routes).</p>
              </div>

              <div className="pt-3 border-t border-slate-800 font-mono text-xs">
                <span className="text-slate-400 text-[10px] block">Est. Revenue (25 trips, 18km avg)</span>
                <span className="text-emerald-400 font-bold text-base">€1,087.50 / mo</span>
              </div>
            </div>

            {/* Option 4: Flat Monthly Retainer */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <span className="bg-amber-950 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-800">
                  OPTION 4
                </span>
                <h4 className="font-bold text-sm text-white mt-2">Flat Monthly Retainer</h4>
                <p className="text-xs text-slate-400 mt-1">€850.00/mo flat for up to 30 pickups + €28.00 per overage trip.</p>
              </div>

              <div className="pt-3 border-t border-slate-800 font-mono text-xs">
                <span className="text-slate-400 text-[10px] block">Guaranteed Cashflow</span>
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
