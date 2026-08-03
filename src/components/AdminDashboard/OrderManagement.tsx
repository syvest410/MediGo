import React, { useState } from 'react';
import { Order, OrderStatus, TransportType, TRANSPORT_TEMP_RANGES } from '../../types';
import { generateChainOfCustodyPDF } from '../../lib/pdfGenerator';
import { Plus, Filter, Search, Download, Eye, Thermometer, ShieldCheck, Truck, Clock, QrCode } from 'lucide-react';
import { OrderQRCodeModal } from './OrderQRCodeModal';

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
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [transportFilter, setTransportFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [qrModalOrder, setQrModalOrder] = useState<Order | null>(null);

  // Form state
  const [pickupClinic, setPickupClinic] = useState('Charité Berlin - Campus Virchow');
  const [pickupAddr, setPickupAddr] = useState('Augustenburger Platz 1, 13353 Berlin');
  const [deliveryLab, setDeliveryLab] = useState('Labor Berlin GmbH');
  const [deliveryAddr, setDeliveryAddr] = useState('Sylter Straße 2, 13353 Berlin');
  const [transportType, setTransportType] = useState<TransportType>('REFRIGERATED_2_8C');
  const [sampleCategory, setSampleCategory] = useState('UN 3373 Biological Substance Category B (Blood/Serum)');
  const [boxCount, setBoxCount] = useState(2);
  const [barcodes, setBarcodes] = useState('SPEC-BER-9902-A, SPEC-BER-9902-B');

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
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 text-slate-100 shadow-xl">
      
      {/* Top Header & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <span>UN 3373 Dispatch & Order Control</span>
          </h2>
          <p className="text-xs text-slate-400">German Medical Specimen Transport Management</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center space-x-1.5 shadow-md transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule UN 3373 Transport</span>
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
            placeholder="Search tracking, clinic or lab..."
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
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">1. Scheduled</option>
            <option value="PRE_TRIP_CHECK">2. Pre-Trip Check</option>
            <option value="PICKED_UP">3. Picked Up</option>
            <option value="IN_TRANSIT">4. In Transit</option>
            <option value="DELIVERED">5. Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div>
          <select
            value={transportFilter}
            onChange={(e) => setTransportFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-white focus:outline-none"
          >
            <option value="ALL">All Transport Types</option>
            <option value="AMBIENT_15_25C">Ambient (15-25°C)</option>
            <option value="REFRIGERATED_2_8C">Cold Chain (2-8°C)</option>
            <option value="FROZEN_MINUS_20C">Frozen (-20°C)</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="p-3">Tracking / Specimen</th>
              <th className="p-3">Origin Clinic</th>
              <th className="p-3">Destination Lab</th>
              <th className="p-3">Transport Spec</th>
              <th className="p-3">Status</th>
              <th className="p-3">Driver / Vehicle</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                  No medical transport orders found matching query.
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
                      <span className="text-[11px] text-slate-400">{ord.pickupDepartment || 'Central Ward'}</span>
                    </td>

                    <td className="p-3">
                      <span className="font-semibold text-slate-200 block">{ord.deliveryLabName}</span>
                      <span className="text-[11px] text-slate-400">{ord.deliveryDepartment || 'Pathology'}</span>
                    </td>

                    <td className="p-3">
                      <span className="flex items-center space-x-1 text-slate-300">
                        <Thermometer className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{tempRange.label}</span>
                      </span>
                    </td>

                    <td className="p-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getStatusBadgeClass(ord.status)}`}>
                        {ord.status}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className="text-slate-300 block">{ord.driverName || 'Unassigned'}</span>
                      <span className="text-[11px] text-slate-500">{ord.vehicleRegNumber || 'Van Fleet'}</span>
                    </td>

                    <td className="p-3 text-right space-x-1">
                      <button
                        onClick={() => setQrModalOrder(ord)}
                        className="bg-slate-800 hover:bg-slate-700 text-cyan-400 p-1.5 rounded border border-slate-700 transition-all"
                        title="Generate Order QR Code & Sticker"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onSelectOrder(ord)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-1.5 rounded border border-slate-700 transition-all"
                        title="View Full Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => generateChainOfCustodyPDF(ord)}
                        className="bg-slate-800 hover:bg-slate-700 text-emerald-400 p-1.5 rounded border border-slate-700 transition-all"
                        title="Download Chain of Custody PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Schedule Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-5 space-y-4 text-xs text-slate-100 shadow-2xl my-auto">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
              Schedule UN 3373 Category B Transport Order
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Origin Clinic Name</label>
                  <input
                    type="text"
                    required
                    value={pickupClinic}
                    onChange={(e) => setPickupClinic(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Pickup Address (Germany)</label>
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
                  <label className="text-slate-300 font-medium">Destination Laboratory</label>
                  <input
                    type="text"
                    required
                    value={deliveryLab}
                    onChange={(e) => setDeliveryLab(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Delivery Address</label>
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
                  <label className="text-slate-300 font-medium">Transport Temperature Specification</label>
                  <select
                    value={transportType}
                    onChange={(e) => setTransportType(e.target.value as TransportType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  >
                    <option value="REFRIGERATED_2_8C">Cold Chain (2°C to 8°C)</option>
                    <option value="AMBIENT_15_25C">Ambient (15°C to 25°C)</option>
                    <option value="FROZEN_MINUS_20C">Frozen (-20°C Dry Ice)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Box Count</label>
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
                <label className="text-slate-300 font-medium">Specimen Category</label>
                <input
                  type="text"
                  required
                  value={sampleCategory}
                  onChange={(e) => setSampleCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Barcodes (Comma Separated)</label>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Confirm Transport Order
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
