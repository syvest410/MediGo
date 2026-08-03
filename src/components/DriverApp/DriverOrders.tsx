import React, { useState } from 'react';
import { Order, OrderStatus, TRANSPORT_TEMP_RANGES, CancelReasonCode } from '../../types';
import { PreTripChecklistModal } from './PreTripChecklistModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { SignaturePadModal } from './SignaturePadModal';
import { CancellationModal } from './CancellationModal';
import { EmergencySoloDispatchModal } from '../AdminDashboard/EmergencySoloDispatchModal';
import { OrderQRCodeModal } from '../AdminDashboard/OrderQRCodeModal';
import { DriverJobBoard } from './DriverJobBoard';
import { generateChainOfCustodyPDF } from '../../lib/pdfGenerator';
import { tempSimulator } from '../../lib/temperatureSimulator';
import {
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  Thermometer,
  QrCode,
  FileCheck,
  Download,
  AlertTriangle,
  ChevronRight,
  Flame,
  XCircle,
  ShieldAlert,
  ArrowRight,
  UserCheck
} from 'lucide-react';

interface DriverOrdersProps {
  orders: Order[];
  onTransitionOrder: (
    orderId: string,
    targetStatus: OrderStatus,
    context?: any
  ) => void;
  onClaimOrder?: (orderId: string) => void;
  isOffline: boolean;
}

export const DriverOrders: React.FC<DriverOrdersProps> = ({
  orders,
  onTransitionOrder,
  onClaimOrder,
  isOffline,
}) => {
  const [driverTab, setDriverTab] = useState<'MY_DELIVERIES' | 'JOB_MARKETPLACE'>('MY_DELIVERIES');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0] || null);
  
  // Modals state
  const [activeModal, setActiveModal] = useState<
    'PRE_TRIP' | 'BARCODE_PICKUP' | 'BARCODE_DELIVERY' | 'SIGNATURE_PICKUP' | 'SIGNATURE_DELIVERY' | 'CANCEL' | null
  >(null);

  const [tempScannedBarcodes, setTempScannedBarcodes] = useState<string[]>([]);
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);

  // Filter orders assigned to driver
  const driverOrders = orders;

  const currentOrder = selectedOrder ? (orders.find(o => o.id === selectedOrder.id) || selectedOrder) : orders[0];

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'SCHEDULED':
        return <span className="bg-amber-950/80 text-amber-300 border border-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold">1. Scheduled</span>;
      case 'PRE_TRIP_CHECK':
        return <span className="bg-blue-950/80 text-blue-300 border border-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold">2. Pre-Trip Check</span>;
      case 'PICKED_UP':
        return <span className="bg-purple-950/80 text-purple-300 border border-purple-700 px-2.5 py-1 rounded-full text-xs font-semibold">3. Picked Up</span>;
      case 'IN_TRANSIT':
        return <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-700 px-2.5 py-1 rounded-full text-xs font-semibold animate-pulse">4. In Transit</span>;
      case 'DELIVERED':
        return <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold">5. Delivered</span>;
      case 'CANCELLED':
        return <span className="bg-rose-950/80 text-rose-300 border border-rose-700 px-2.5 py-1 rounded-full text-xs font-semibold">Cancelled</span>;
    }
  };

  const handleSimulateSpike = (order: Order) => {
    const spikeTemp = order.transportType === 'REFRIGERATED_2_8C' ? 14.5 : 32.0;
    tempSimulator.triggerManualTempSpike(order, spikeTemp);
  };

  return (
    <div className="max-w-md mx-auto my-4 bg-slate-950 border-4 border-slate-800 rounded-3xl overflow-hidden shadow-2xl text-slate-100 flex flex-col min-h-[720px] font-sans">
      
      {/* Mobile Top Status Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-1.5 font-bold text-slate-200">
          <Truck className="w-4 h-4 text-emerald-400" />
          <span>Kurier 104 • B-BD 7741</span>
        </div>
        <div className="flex items-center space-x-2">
          {isOffline && <span className="text-amber-400 font-semibold bg-amber-950 px-1.5 py-0.5 rounded text-[10px]">Basement</span>}
          <span>{new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Driver Sub-Tab Mode */}
      <div className="bg-slate-900/90 border-b border-slate-800 p-1.5 flex gap-1">
        <button
          onClick={() => setDriverTab('MY_DELIVERIES')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all text-center ${
            driverTab === 'MY_DELIVERIES' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          My Active Deliveries
        </button>
        <button
          onClick={() => setDriverTab('JOB_MARKETPLACE')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all text-center ${
            driverTab === 'JOB_MARKETPLACE' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Available Jobs
        </button>
      </div>

      {driverTab === 'JOB_MARKETPLACE' ? (
        <div className="p-3 flex-1 overflow-y-auto">
          <DriverJobBoard
            orders={orders}
            onClaimOrder={(orderId) => {
              if (onClaimOrder) onClaimOrder(orderId);
              setDriverTab('MY_DELIVERIES');
            }}
          />
        </div>
      ) : (
        <>
          {/* Order Selector Tab Bar */}
          <div className="bg-slate-900/60 p-2 border-b border-slate-800 flex space-x-1 overflow-x-auto no-scrollbar">
            {driverOrders.map((ord) => (
              <button
                key={ord.id}
                onClick={() => setSelectedOrder(ord)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  currentOrder?.id === ord.id
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {ord.trackingNumber}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Main Screen Content */}
      {currentOrder && (
        <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
          
          {/* Status & Transport Type Banner */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">UN 3373 Specimen Transport</span>
                <h2 className="text-base font-bold text-white">{currentOrder.trackingNumber}</h2>
              </div>
              {getStatusBadge(currentOrder.status)}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-slate-300 font-medium">
              <div className="flex items-center space-x-2">
                <Thermometer className="w-4 h-4 text-emerald-400" />
                <span>Transport Spec: {TRANSPORT_TEMP_RANGES[currentOrder.transportType]?.label}</span>
              </div>

              <button
                onClick={() => setIsQRModalOpen(true)}
                className="bg-slate-800 hover:bg-slate-700 text-emerald-400 px-2 py-1 rounded-lg border border-slate-700 text-[11px] font-semibold flex items-center space-x-1 transition-all"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Show QR Label</span>
              </button>
            </div>
          </div>

          {/* Sequential Driver State Machine Progress Bar */}
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-2">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Strict ADR Workflow Sequence</span>
            
            <div className="grid grid-cols-5 gap-1 text-[9px] font-bold text-center">
              <div className={`p-1 rounded ${currentOrder.status === 'SCHEDULED' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}>1. Sched</div>
              <div className={`p-1 rounded ${currentOrder.status === 'PRE_TRIP_CHECK' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>2. P650</div>
              <div className={`p-1 rounded ${currentOrder.status === 'PICKED_UP' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}>3. Picked</div>
              <div className={`p-1 rounded ${currentOrder.status === 'IN_TRANSIT' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}>4. Transit</div>
              <div className={`p-1 rounded ${currentOrder.status === 'DELIVERED' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>5. Delivered</div>
            </div>
          </div>

          {/* Route Card (Pickup & Delivery) */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-3">
            
            {/* Pickup */}
            <div className="flex items-start space-x-3">
              <div className="bg-amber-950 p-2 rounded-lg text-amber-400 shrink-0 mt-0.5 border border-amber-800">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider block">PICKUP CLINIC</span>
                <h4 className="font-bold text-white text-xs">{currentOrder.pickupClinicName}</h4>
                <p className="text-slate-400 text-[11px]">{currentOrder.pickupAddress}</p>
                {currentOrder.pickupDepartment && <p className="text-slate-300 font-medium text-[11px]">Dept: {currentOrder.pickupDepartment}</p>}
              </div>
            </div>

            <div className="border-l-2 border-dashed border-slate-800 ml-4 h-3" />

            {/* Delivery */}
            <div className="flex items-start space-x-3">
              <div className="bg-emerald-950 p-2 rounded-lg text-emerald-400 shrink-0 mt-0.5 border border-emerald-800">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">DELIVERY LABORATORY</span>
                <h4 className="font-bold text-white text-xs">{currentOrder.deliveryLabName}</h4>
                <p className="text-slate-400 text-[11px]">{currentOrder.deliveryAddress}</p>
                {currentOrder.deliveryDepartment && <p className="text-slate-300 font-medium text-[11px]">Dept: {currentOrder.deliveryDepartment}</p>}
              </div>
            </div>

          </div>

          {/* Live Telemetry Monitor Widget (If In Transit or Delivered) */}
          {(currentOrder.status === 'IN_TRANSIT' || currentOrder.status === 'DELIVERED') && (
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                  <Thermometer className="w-4 h-4 text-cyan-400" />
                  <span>Live Thermo-Sensor Telemetry</span>
                </span>
                {currentOrder.status === 'IN_TRANSIT' && (
                  <button
                    onClick={() => handleSimulateSpike(currentOrder)}
                    className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center space-x-1"
                  >
                    <Flame className="w-3 h-3 text-rose-400" />
                    <span>Test Temp Spike</span>
                  </button>
                )}
              </div>

              {currentOrder.telemetryLogs.length > 0 ? (
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Current Temperature</span>
                    <span className={`text-base font-bold ${
                      currentOrder.telemetryLogs[0]?.isBreach ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                    }`}>
                      {currentOrder.telemetryLogs[0]?.tempCelsius}°C
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">Battery / Humidity</span>
                    <span className="text-slate-300 text-xs">
                      {currentOrder.telemetryLogs[0]?.batteryLevelPercent}% • {currentOrder.telemetryLogs[0]?.humidityPercent}%
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 italic text-[11px]">Sensor initializing live Bluetooth stream...</p>
              )}
            </div>
          )}

          {/* Core Sequential State Machine Actions */}
          <div className="space-y-2 pt-2">
            
            {/* State 1 -> State 2 Transition */}
            {currentOrder.status === 'SCHEDULED' && (
              <button
                onClick={() => {
                  onTransitionOrder(currentOrder.id, 'PRE_TRIP_CHECK');
                  setActiveModal('PRE_TRIP');
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-sm transition-all"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Accept Order & Start Pre-Trip Check</span>
              </button>
            )}

            {/* State 2 -> State 3 Transition */}
            {currentOrder.status === 'PRE_TRIP_CHECK' && (
              <div className="space-y-2">
                <button
                  onClick={() => setActiveModal('PRE_TRIP')}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-sm transition-all"
                >
                  <FileCheck className="w-5 h-5" />
                  <span>Complete Mandatory P650 Inspection</span>
                </button>

                {currentOrder.preTripCheck && (
                  <button
                    onClick={() => setActiveModal('BARCODE_PICKUP')}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-sm transition-all"
                  >
                    <QrCode className="w-5 h-5" />
                    <span>Proceed to Pickup Barcode Scan</span>
                  </button>
                )}
              </div>
            )}

            {/* State 3 -> State 4 Transition */}
            {currentOrder.status === 'PICKED_UP' && (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    onTransitionOrder(currentOrder.id, 'IN_TRANSIT', {
                      userId: 'USR-DRIVER-01',
                      userName: 'Hans Schmidt',
                      userRole: 'DRIVER',
                      deviceId: 'MOB-DRIVER-104',
                      coords: { lat: 52.5200, lng: 13.4050 }
                    });
                  }}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-sm transition-all"
                >
                  <Truck className="w-5 h-5" />
                  <span>Start In Transit Drive to Laboratory</span>
                </button>
              </div>
            )}

            {/* State 4 -> State 5 Transition */}
            {currentOrder.status === 'IN_TRANSIT' && (
              <button
                onClick={() => setActiveModal('BARCODE_DELIVERY')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-sm transition-all"
              >
                <QrCode className="w-5 h-5" />
                <span>Lab Arrival: Scan Barcodes & Capture Sign-Off</span>
              </button>
            )}

            {/* State 5: Delivered View */}
            {currentOrder.status === 'DELIVERED' && (
              <div className="space-y-2">
                <div className="bg-emerald-950/80 border border-emerald-700 p-3 rounded-xl text-center text-emerald-200">
                  <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                  <span className="font-bold block text-sm">Specimen Delivered Successfully</span>
                  <span className="text-[11px] text-emerald-300">Handover verified at laboratory</span>
                </div>

                <button
                  onClick={() => generateChainOfCustodyPDF(currentOrder)}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download Chain of Custody PDF</span>
                </button>
              </div>
            )}

            {/* Cancel Protocol & Solo Emergency Buttons */}
            {currentOrder.status !== 'DELIVERED' && currentOrder.status !== 'CANCELLED' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => setIsEmergencyModalOpen(true)}
                  className="w-full bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700/80 font-bold py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 text-xs transition-all"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Solo Emergency Pause / Subcontractor</span>
                </button>

                <button
                  onClick={() => setActiveModal('CANCEL')}
                  className="w-full bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-200 border border-slate-800 hover:border-rose-800 font-semibold py-2 px-3 rounded-xl flex items-center justify-center space-x-1 text-xs transition-all"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Protocol Abort / Reject</span>
                </button>
              </div>
            )}

          </div>

        </div>
      )}

      {/* Driver Mobile Footer */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 text-center text-[10px] text-slate-500">
        ADR P650 Biological Substance Category B Transport System • Germany
      </div>

      {/* Modals */}
      {currentOrder && (
        <>
          <PreTripChecklistModal
            order={currentOrder}
            isOpen={activeModal === 'PRE_TRIP'}
            onClose={() => setActiveModal(null)}
            onSubmit={(ptData) => {
              onTransitionOrder(currentOrder.id, 'PRE_TRIP_CHECK', { preTripCheck: ptData });
              setActiveModal(null);
            }}
          />

          <BarcodeScannerModal
            isOpen={activeModal === 'BARCODE_PICKUP'}
            expectedBarcodes={currentOrder.barcodeList}
            onClose={() => setActiveModal(null)}
            onConfirm={(scannedList) => {
              setTempScannedBarcodes(scannedList);
              setActiveModal('SIGNATURE_PICKUP');
            }}
          />

          <SignaturePadModal
            isOpen={activeModal === 'SIGNATURE_PICKUP'}
            title="Clinic Pickup Handover"
            subtitle="Capture Hospital / Clinic Staff Sign-off"
            defaultStaffName="Schwester Elena Meyer"
            defaultStaffTitle="Stationsleitung Infektiologie"
            scannedBarcodes={tempScannedBarcodes}
            onClose={() => setActiveModal(null)}
            onSubmit={(cocData) => {
              onTransitionOrder(currentOrder.id, 'PICKED_UP', {
                chainOfCustody: { ...cocData, eventType: 'PICKUP_SIGNATURE' }
              });
              setActiveModal(null);
            }}
          />

          <BarcodeScannerModal
            isOpen={activeModal === 'BARCODE_DELIVERY'}
            expectedBarcodes={currentOrder.barcodeList}
            onClose={() => setActiveModal(null)}
            onConfirm={(scannedList) => {
              setTempScannedBarcodes(scannedList);
              setActiveModal('SIGNATURE_DELIVERY');
            }}
          />

          <SignaturePadModal
            isOpen={activeModal === 'SIGNATURE_DELIVERY'}
            title="Laboratory Handover Acceptance"
            subtitle="Capture Recipient Lab Staff Sign-off"
            defaultStaffName="Sabine Neumann"
            defaultStaffTitle="Laborleitung Empfang"
            scannedBarcodes={tempScannedBarcodes}
            onClose={() => setActiveModal(null)}
            onSubmit={(cocData) => {
              onTransitionOrder(currentOrder.id, 'DELIVERED', {
                chainOfCustody: { ...cocData, eventType: 'DELIVERY_SIGNATURE' }
              });
              setActiveModal(null);
            }}
          />

          <CancellationModal
            isOpen={activeModal === 'CANCEL'}
            onClose={() => setActiveModal(null)}
            onSubmit={(reason, notes) => {
              onTransitionOrder(currentOrder.id, 'CANCELLED', {
                cancellationReason: reason,
                cancellationNotes: notes
              });
              setActiveModal(null);
            }}
          />

          <OrderQRCodeModal
            order={currentOrder}
            isOpen={isQRModalOpen}
            onClose={() => setIsQRModalOpen(false)}
          />

          <EmergencySoloDispatchModal
            isOpen={isEmergencyModalOpen}
            onClose={() => setIsEmergencyModalOpen(false)}
            order={currentOrder}
            driverGpsCoords={{ lat: 50.8021, lng: 8.7712 }}
          />
        </>
      )}

    </div>
  );
};
