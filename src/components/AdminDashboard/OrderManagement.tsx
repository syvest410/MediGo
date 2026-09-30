import React, { useState } from 'react';
import { Order, OrderStatus, TransportType, TRANSPORT_TEMP_RANGES } from '../../types';
import { generateChainOfCustodyPDF } from '../../lib/pdfGenerator';
import { Plus, Filter, Search, Download, Eye, Thermometer, ShieldCheck, Truck, Clock, QrCode } from 'lucide-react';
import { OrderQRCodeModal } from './OrderQRCodeModal';
import { useLanguage } from '../../context/LanguageContext';

interface OrderManagementProps {
  orders: Order[];
  onCreateOrder: (newOrderData: any) => void;
  onSelectOrder: (order: Order) => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({
  orders,
  onCreateOrder,
  onSelectOrder,
}) => {
  const { language, t } = useLanguage();
  const isDe = language === 'de';

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [transportFilter, setTransportFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [qrModalOrder, setQrModalOrder] = useState<Order | null>(null);

  // Form state
  const [pickupClinic, setPickupClinic] = useState(isDe ? 'Universitätsklinikum Frankfurt' : 'Universitätsklinikum Frankfurt');
  const [pickupAddr, setPickupAddr] = useState('Theodor-Stern-Kai 7, 60590 Frankfurt am Main');
  const [deliveryLab, setDeliveryLab] = useState(isDe ? 'Bios Laborzentrum Wiesbaden' : 'Bios Laborzentrum Wiesbaden');
  const [deliveryAddr, setDeliveryAddr] = useState('Hagenauer Str. 47, 65203 Wiesbaden');
  const [transportType, setTransportType] = useState<TransportType>('REFRIGERATED_2_8C');
  const [sampleCategory, setSampleCategory] = useState(isDe ? 'UN 3373 Biologischer Stoff Kategorie B (Blut/Serum)' : 'UN 3373 Biological Substance Category B (Blood/Serum)');
  const [boxCount, setBoxCount] = useState(2);
  const [barcodes, setBarcodes] = useState('SPEC-WI-9902-A, SPEC-WI-9902-B');

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (transportFilter !== 'ALL' && o.transportType !== transportFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        o.trackingNumber.toLowerCase().includes(q) ||
        o.pickupClinicName.toLowerCase().includes(q) ||
        o.deliveryLabName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateOrder({
      pickupClinicName: pickupClinic,
      pickupAddress: pickupAddr,
      deliveryLabName: deliveryLab,
      deliveryAddress: deliveryAddr,
      transportType,
      sampleCategory,
      specimenBoxCount: boxCount,
      barcodeList: barcodes.split(',').map((s) => s.trim()).filter(Boolean),
      p650Verified: true
    });
    setIsModalOpen(false);
  };

  const getStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-amber-950/80 text-amber-300 border-amber-700';
      case 'PRE_TRIP_CHECK':
        return 'bg-blue-950/80 text-blue-300 border-blue-700';
      case 'PICKED_UP':
        return 'bg-purple-950/80 text-purple-300 border-purple-700';
      case 'IN_TRANSIT':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-700 animate-pulse';
      case 'DELIVERED':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
      case 'CANCELLED':
        return 'bg-rose-950/80 text-rose-300 border-rose-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 text-slate-100 shadow-xl">
      
      {/* Top Header & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <span>{isDe ? 'UN 3373 Leitstand & Auftragssteuerung' : 'UN 3373 Dispatch & Order Control'}</span>
          </h2>
          <p className="text-xs text-slate-400">{isDe ? 'Medizinisches Probentransport-Management für Hessen & Deutschland' : 'German Medical Specimen Transport Management'}</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center space-x-1.5 shadow-md transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isDe ? 'Neuen Probenauftrag erfassen' : 'Schedule UN 3373 Transport'}</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isDe ? 'Tracking-Nr., Klinik oder Labor suchen...' : 'Search tracking, clinic or lab...'}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-white focus:outline-none"
          >
            <option value="ALL">{isDe ? 'Alle Status' : 'All Statuses'}</option>
            <option value="SCHEDULED">{t('status.SCHEDULED')}</option>
            <option value="PRE_TRIP_CHECK">{t('status.PRE_TRIP_CHECK')}</option>
            <option value="PICKED_UP">{t('status.PICKED_UP')}</option>
            <option value="IN_TRANSIT">{t('status.IN_TRANSIT')}</option>
            <option value="DELIVERED">{t('status.DELIVERED')}</option>
            <option value="CANCELLED">{t('status.CANCELLED')}</option>
          </select>
        </div>

        <div>
          <select
            value={transportFilter}
            onChange={(e) => setTransportFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-white focus:outline-none"
          >
            <option value="ALL">{isDe ? 'Alle Transportarten' : 'All Transport Types'}</option>
            <option value="AMBIENT_15_25C">{t('transport.AMBIENT_15_25C')}</option>
            <option value="REFRIGERATED_2_8C">{t('transport.REFRIGERATED_2_8C')}</option>
            <option value="FROZEN_MINUS_20C">{t('transport.FROZEN_DRY_ICE')}</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="p-3">{isDe ? 'Tracking / Probe' : 'Tracking / Specimen'}</th>
              <th className="p-3">{isDe ? 'Abhol-Klinik' : 'Origin Clinic'}</th>
              <th className="p-3">{isDe ? 'Ziel-Labor' : 'Destination Lab'}</th>
              <th className="p-3">{isDe ? 'Kühlkette' : 'Transport Spec'}</th>
              <th className="p-3">{isDe ? 'Status' : 'Status'}</th>
              <th className="p-3">{isDe ? 'Kurier / Fahrzeug' : 'Driver / Vehicle'}</th>
              <th className="p-3 text-right">{isDe ? 'Aktionen' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                  {isDe ? 'Keine Probenaufträge für diesen Filter gefunden.' : 'No medical transport orders found matching query.'}
                </td>
              </tr>
            ) : (
              filteredOrders.map((ord) => {
                const tempRange = TRANSPORT_TEMP_RANGES[ord.transportType];
                return (
                  <tr key={ord.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-3">
                      <span className="font-bold text-white font-mono block">{ord.trackingNumber}</span>
                      <span className="text-[11px] text-slate-400">{ord.sampleCategory}</span>
                    </td>

                    <td className="p-3">
                      <span className="font-semibold text-slate-200 block">{ord.pickupClinicName}</span>
                      <span className="text-[11px] text-slate-400">{ord.pickupDepartment || (isDe ? 'Zentralstation' : 'Central Ward')}</span>
                    </td>

                    <td className="p-3">
                      <span className="font-semibold text-slate-200 block">{ord.deliveryLabName}</span>
                      <span className="text-[11px] text-slate-400">{ord.deliveryAddress}</span>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center space-x-1.5">
                        <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-mono">{tempRange ? tempRange.label : ord.transportType}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        {ord.specimenBoxCount} {isDe ? 'P650 Box(en)' : 'P650 Box(es)'}
                      </span>
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClass(
                          ord.status
                        )}`}
                      >
                        {t(`status.${ord.status}`)}
                      </span>
                    </td>

                    <td className="p-3 font-mono text-[11px]">
                      <span className="text-slate-200 block font-semibold">{ord.driverName || (isDe ? 'Nicht zugewiesen' : 'Unassigned')}</span>
                      <span className="text-slate-400">{ord.vehicleReg || 'WI-MG 7741'}</span>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onSelectOrder(ord)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-1.5 rounded border border-slate-700 transition-colors"
                          title={isDe ? 'Auf Live-Karte verfolgen' : 'Track on Live Map'}
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        </button>
                        
                        <button
                          onClick={() => setQrModalOrder(ord)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-1.5 rounded border border-slate-700 transition-colors"
                          title={isDe ? 'QR-Code anzeigen' : 'Show QR Code'}
                        >
                          <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                        </button>

                        <button
                          onClick={() => generateChainOfCustodyPDF(ord)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-1.5 rounded border border-slate-700 transition-colors"
                          title={isDe ? 'PDF Kettennachweis exportieren' : 'Download Chain of Custody PDF'}
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* New Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>{isDe ? 'Neuen Probenauftrag erfassen (UN 3373)' : 'Schedule New Medical Transport Order'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">{isDe ? 'Abhol-Klinik' : 'Pickup Clinic'}</label>
                  <input
                    type="text"
                    required
                    value={pickupClinic}
                    onChange={(e) => setPickupClinic(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">{isDe ? 'Abhol-Adresse' : 'Pickup Address'}</label>
                  <input
                    type="text"
                    required
                    value={pickupAddr}
                    onChange={(e) => setPickupAddr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">{isDe ? 'Ziel-Labor' : 'Delivery Lab'}</label>
                  <input
                    type="text"
                    required
                    value={deliveryLab}
                    onChange={(e) => setDeliveryLab(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">{isDe ? 'Ziel-Adresse' : 'Delivery Address'}</label>
                  <input
                    type="text"
                    required
                    value={deliveryAddr}
                    onChange={(e) => setDeliveryAddr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">{isDe ? 'Temperaturvorgabe' : 'Transport Temperature Specification'}</label>
                  <select
                    value={transportType}
                    onChange={(e) => setTransportType(e.target.value as TransportType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  >
                    <option value="REFRIGERATED_2_8C">{isDe ? 'Gekühlt (2°C bis 8°C)' : 'Cold Chain (2°C to 8°C)'}</option>
                    <option value="AMBIENT_15_25C">{isDe ? 'Raumtemperatur (15°C bis 25°C)' : 'Ambient (15°C to 25°C)'}</option>
                    <option value="FROZEN_MINUS_20C">{isDe ? 'Gefroren (-20°C Trockeneis)' : 'Frozen (-20°C Dry Ice)'}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">{isDe ? 'Anzahl Boxen' : 'Box Count'}</label>
                  <input
                    type="number"
                    min={1}
                    value={boxCount}
                    onChange={(e) => setBoxCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">{isDe ? 'Probenkategorie' : 'Specimen Category'}</label>
                <input
                  type="text"
                  required
                  value={sampleCategory}
                  onChange={(e) => setSampleCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">{isDe ? 'Barcodes (kommagetrennt)' : 'Barcodes (Comma Separated)'}</label>
                <input
                  type="text"
                  value={barcodes}
                  onChange={(e) => setBarcodes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  {isDe ? 'Abbrechen' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  {isDe ? 'Auftrag verbindlich anlegen' : 'Confirm Transport Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Generator Modal */}
      <OrderQRCodeModal
        order={qrModalOrder}
        isOpen={!!qrModalOrder}
        onClose={() => setQrModalOrder(null)}
      />

    </div>
  );
};
