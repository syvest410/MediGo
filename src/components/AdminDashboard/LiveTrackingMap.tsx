import React from 'react';
import { Order, TRANSPORT_TEMP_RANGES } from '../../types';
import { MapPin, Truck, Navigation, Thermometer, Battery, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface LiveTrackingMapProps {
  orders: Order[];
  selectedOrder: Order | null;
  onSelectOrder: (order: Order) => void;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  orders,
  selectedOrder,
  onSelectOrder,
}) => {
  const activeOrders = orders.filter(o => o.status === 'IN_TRANSIT' || o.status === 'PICKED_UP' || o.status === 'PRE_TRIP_CHECK');
  const currentOrder = selectedOrder || activeOrders[0] || orders[0];

  if (!currentOrder) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
        No active medical transport route selected.
      </div>
    );
  }

  const latestTelemetry = currentOrder.telemetryLogs[0] || null;
  const tempRange = TRANSPORT_TEMP_RANGES[currentOrder.transportType];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 text-slate-100 shadow-xl">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Navigation className="w-5 h-5 text-emerald-400" />
            <span>Live GPS Courier Dispatch Route Map</span>
          </h3>
          <p className="text-xs text-slate-400">German Highway & Urban Medical Logistics Tracking</p>
        </div>

        {/* Order Selector */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Tracking:</span>
          <select
            value={currentOrder.id}
            onChange={(e) => {
              const found = orders.find(o => o.id === e.target.value);
              if (found) onSelectOrder(found);
            }}
            className="bg-slate-950 border border-slate-800 text-white rounded px-2.5 py-1 focus:outline-none"
          >
            {orders.map(o => (
              <option key={o.id} value={o.id}>
                {o.trackingNumber} ({o.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Map Canvas / Grid Representation */}
      <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-6 min-h-[320px] flex flex-col justify-between overflow-hidden shadow-inner">
        
        {/* Map Grid Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-30 pointer-events-none" />

        {/* Top Info Overlay */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 p-3 rounded-xl backdrop-blur">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-950 p-2 rounded-lg text-emerald-400 border border-emerald-800">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-white block">{currentOrder.trackingNumber}</span>
              <span className="text-xs text-slate-400">{currentOrder.vehicleRegNumber || 'Van Fleet B-BD 7741'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 text-[10px] block">Transport Spec</span>
              <span className="text-emerald-400 font-semibold">{tempRange.label}</span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] block">Live Thermo Sensor</span>
              <span className={`font-bold ${latestTelemetry?.isBreach ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                {latestTelemetry ? `${latestTelemetry.tempCelsius}°C` : '5.2°C [OK]'}
              </span>
            </div>
          </div>
        </div>

        {/* Route Line Graphics */}
        <div className="relative z-10 my-8 px-4 sm:px-12">
          <div className="flex items-center justify-between relative">
            
            {/* Dashed Connecting Highway Route */}
            <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 border-t-2 border-dashed border-emerald-500/60 z-0" />

            {/* Origin Clinic Node */}
            <div className="relative z-10 bg-slate-900 border-2 border-amber-500 p-3 rounded-xl shadow-lg flex items-center space-x-2 max-w-[180px]">
              <MapPin className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-amber-400 font-bold uppercase block">ORIGIN CLINIC</span>
                <span className="font-semibold text-xs text-white truncate block">{currentOrder.pickupClinicName}</span>
              </div>
            </div>

            {/* In-Transit Vehicle Moving Marker */}
            <div className="relative z-10 bg-emerald-600 border-2 border-white p-3 rounded-xl shadow-xl flex items-center space-x-2 animate-bounce">
              <Truck className="w-6 h-6 text-white" />
              <div className="hidden sm:block">
                <span className="text-[10px] text-emerald-100 font-bold block uppercase">IN TRANSIT</span>
                <span className="font-mono text-xs font-bold text-white">
                  {latestTelemetry ? `${latestTelemetry.gpsLatitude.toFixed(3)}, ${latestTelemetry.gpsLongitude.toFixed(3)}` : '52.520, 13.405'}
                </span>
              </div>
            </div>

            {/* Destination Laboratory Node */}
            <div className="relative z-10 bg-slate-900 border-2 border-emerald-500 p-3 rounded-xl shadow-lg flex items-center space-x-2 max-w-[180px]">
              <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-emerald-400 font-bold uppercase block">DESTINATION LAB</span>
                <span className="font-semibold text-xs text-white truncate block">{currentOrder.deliveryLabName}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Telemetry Details */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
            <span className="text-slate-400 text-[10px] block">Specimen Category</span>
            <span className="text-slate-200 font-semibold truncate block">{currentOrder.sampleCategory}</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
            <span className="text-slate-400 text-[10px] block">P650 Packaging</span>
            <span className="text-emerald-400 font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Triple Container Certified</span>
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
            <span className="text-slate-400 text-[10px] block">Sensor Battery</span>
            <span className="text-slate-200 font-semibold flex items-center space-x-1">
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
              <span>{latestTelemetry?.batteryLevelPercent || 98}% Active</span>
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
            <span className="text-slate-400 text-[10px] block">Barcodes Registered</span>
            <span className="text-slate-200 font-mono font-semibold">{currentOrder.barcodeList.length} Item(s) Scanned</span>
          </div>
        </div>

      </div>

    </div>
  );
};
