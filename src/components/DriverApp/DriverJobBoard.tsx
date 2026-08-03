import React from 'react';
import { Order, TRANSPORT_TEMP_RANGES } from '../../types';
import { Truck, MapPin, Clock, Thermometer, ShieldCheck, CheckCircle2, UserCheck, ArrowRight } from 'lucide-react';

interface DriverJobBoardProps {
  orders: Order[];
  onClaimOrder: (orderId: string) => void;
}

export const DriverJobBoard: React.FC<DriverJobBoardProps> = ({ orders, onClaimOrder }) => {
  // Unassigned scheduled orders or open requests
  const availableJobs = orders.filter(
    o => o.status === 'SCHEDULED' && (!o.driverId || o.driverId === 'UNASSIGNED')
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 space-y-4 shadow-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-950 p-2.5 rounded-xl text-emerald-400 border border-emerald-800">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Open Driver Dispatch Marketplace</h3>
            <p className="text-xs text-slate-400">Available Medical Transport Orders Ready for Driver Claiming</p>
          </div>
        </div>

        <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs px-3 py-1 rounded-full font-mono font-bold">
          {availableJobs.length} Available Job(s)
        </span>
      </div>

      {availableJobs.length === 0 ? (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
          <p className="font-semibold text-slate-300">All scheduled transport orders are assigned to active drivers.</p>
          <p>New orders submitted by clinic partners will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableJobs.map((job) => {
            const tempRange = TRANSPORT_TEMP_RANGES[job.transportType];

            return (
              <div
                key={job.id}
                className="bg-slate-950 border border-slate-800 hover:border-emerald-600/60 transition-all rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-lg"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-mono font-bold text-white text-xs">{job.trackingNumber}</span>
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">
                      OPEN JOB
                    </span>
                  </div>

                  {/* Origin to Destination Route */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-amber-400 font-bold uppercase block">Pickup Clinic</span>
                        <span className="font-semibold text-white block">{job.pickupClinicName}</span>
                        <span className="text-slate-400 text-[11px] block">{job.pickupAddress}</span>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2 pt-1">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase block">Delivery Lab</span>
                        <span className="font-semibold text-white block">{job.deliveryLabName}</span>
                        <span className="text-slate-400 text-[11px] block">{job.deliveryAddress}</span>
                      </div>
                    </div>
                  </div>

                  {/* Specimen and Temp Specs */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg font-mono">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Transport Temp</span>
                      <span className="text-emerald-400 font-semibold block">{tempRange.label}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block">Specimen Box Count</span>
                      <span className="text-slate-200 font-semibold block">{job.specimenBoxCount} Box(es) P650</span>
                    </div>
                  </div>
                </div>

                {/* Claim Button */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-500 text-[11px] flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Pickup Window: 14:30 - 15:30</span>
                  </span>

                  <button
                    onClick={() => onClaimOrder(job.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow-md transition-all"
                  >
                    <span>Claim / Take Order</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
