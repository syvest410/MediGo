import React, { useState } from 'react';
import { Calculator, Calendar, Euro, Percent, MapPin, CheckCircle2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { BaseTariffSettings, GermanFederalState } from '../../types';
import { getTariffSettings, updateTariffSettings } from '../../lib/db';
import { checkGermanPublicHoliday, calculateDynamicOrderTariff } from '../../lib/billingEngine';

export const TariffHolidayManager: React.FC = () => {
  const [settings, setSettings] = useState<BaseTariffSettings>(getTariffSettings());
  const [isSaved, setIsSaved] = useState(false);

  // Simulator State
  const [simDate, setSimDate] = useState('2026-10-03'); // Default 03.10 Tag der Deutschen Einheit
  const [simKm, setSimKm] = useState(25);
  const [simBoxes, setSimBoxes] = useState(2);
  const [simExpress, setSimExpress] = useState(true);

  const handleSave = () => {
    updateTariffSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const holRes = checkGermanPublicHoliday(simDate, settings.selectedState);
  const tariffCalc = calculateDynamicOrderTariff(
    {
      distanceKm: simKm,
      specimenBoxCount: simBoxes,
      isExpressEmergency: simExpress,
      pickupDate: simDate
    },
    settings
  );

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-red-400 font-semibold text-xs tracking-wider uppercase">
            <Calculator className="w-4 h-4" />
            <span>German Feiertag & Dynamic Tariff Engine</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Tariff Structure & German Public Holidays (*Feiertage*)</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatic Feiertag detection (Hessen & nationwide) with dynamic percentage markups on weekends & public holidays.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-red-950/40 shrink-0 self-start md:self-auto"
        >
          {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
          <span>{isSaved ? 'Tariffs Saved!' : 'Save Tariff Config'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Panel 1: Tariff Configuration Controls */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Euro className="w-4 h-4 text-emerald-400" />
            <span>Base Fare & Dynamic Markup Settings</span>
          </h3>

          <div className="space-y-3 text-xs">
            {/* Federal State Scope */}
            <div>
              <label className="block text-slate-300 font-medium mb-1 flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>Federal State (*Bundesland*) Scope</span>
              </label>
              <select
                value={settings.selectedState}
                onChange={(e) => setSettings({ ...settings, selectedState: e.target.value as GermanFederalState })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
              >
                <option value="ALL_MIX">All States Mixed (Hessen, Bayern, NW, BW)</option>
                <option value="HE">Hessen (HE)</option>
                <option value="BY">Bayern (BY)</option>
                <option value="NW">Nordrhein-Westfalen (NW)</option>
                <option value="BW">Baden-Württemberg (BW)</option>
              </select>
            </div>

            {/* Base Pickup Fee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Base Pickup Fee (€)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.50"
                    value={settings.basePickupFeeEur}
                    onChange={(e) => setSettings({ ...settings, basePickupFeeEur: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold pl-7"
                  />
                  <span className="absolute left-2.5 top-2.5 text-slate-500 font-bold">€</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Distance Rate (€ / km)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    value={settings.ratePerKmEur}
                    onChange={(e) => setSettings({ ...settings, ratePerKmEur: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold pl-7"
                  />
                  <span className="absolute left-2.5 top-2.5 text-slate-500 font-bold">€</span>
                </div>
              </div>
            </div>

            {/* Express Surcharge & Weekend Markup */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Express Emergency Surcharge (€)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="1.00"
                    value={settings.expressEmergencySurchargeEur}
                    onChange={(e) => setSettings({ ...settings, expressEmergencySurchargeEur: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-bold pl-7"
                  />
                  <span className="absolute left-2.5 top-2.5 text-slate-500 font-bold">€</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Weekend Markup (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="5"
                    value={settings.weekendMarkupPercent}
                    onChange={(e) => setSettings({ ...settings, weekendMarkupPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-bold pr-7"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-500 font-bold">%</span>
                </div>
              </div>
            </div>

            {/* Holiday Markup */}
            <div>
              <label className="block text-slate-400 mb-1">Public Holiday (*Feiertag*) Surcharge Markup (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="5"
                  value={settings.holidayMarkupPercent}
                  onChange={(e) => setSettings({ ...settings, holidayMarkupPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-red-400 font-bold pr-7 text-sm"
                />
                <span className="absolute right-3 top-2.5 text-slate-500 font-bold">%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                German labor regulation standard: Public holidays (Feiertage) carry +100% or +50% tax-free courier markup.
              </p>
            </div>

          </div>
        </div>

        {/* Panel 2: Interactive Feiertag Simulator */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-red-400" />
              <span>Interactive Feiertag & Dynamic Price Simulator</span>
            </span>
            <span className="bg-red-950/80 text-red-300 border border-red-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              Live Preview
            </span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Transport Date</label>
                <input
                  type="date"
                  value={simDate}
                  onChange={(e) => setSimDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Distance (km)</label>
                <input
                  type="number"
                  value={simKm}
                  onChange={(e) => setSimKm(parseFloat(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-3">
                <label className="text-slate-400">Specimen Boxes:</label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 5].map((count) => (
                    <button
                      key={count}
                      onClick={() => setSimBoxes(count)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                        simBoxes === count ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simExpress}
                  onChange={(e) => setSimExpress(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-red-600 focus:ring-0"
                />
                <span className="font-semibold text-slate-300">Express Emergency</span>
              </label>
            </div>

            {/* Feiertag Detection Banner */}
            <div className={`p-3.5 rounded-xl border space-y-1 ${
              holRes.isHoliday
                ? 'bg-red-950/40 border-red-800/80 text-red-200'
                : holRes.isWeekend
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center space-x-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {holRes.isHoliday
                      ? `FEIERTAG DETECTED: ${holRes.name}`
                      : holRes.isWeekend
                      ? `WEEKEND TARIFF: ${holRes.dayOfWeekName}`
                      : `Standard Weekday: ${holRes.dayOfWeekName}`}
                  </span>
                </span>
                <span className="font-extrabold text-xs">
                  {holRes.isHoliday
                    ? `+${settings.holidayMarkupPercent}% Surcharge`
                    : holRes.isWeekend
                    ? `+${settings.weekendMarkupPercent}% Surcharge`
                    : 'Standard Rate'}
                </span>
              </div>
            </div>

            {/* Calculated Price Line-Item Breakdown */}
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2 text-[11px]">
              <div className="font-bold text-white border-b border-slate-800 pb-1 flex justify-between">
                <span>Calculated Tariff Breakdown</span>
                <span>Net Subtotal & MwSt</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Base Pickup Fee:</span>
                <span>€{tariffCalc.priceBreakdown.basePickupFeeEur.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Distance ({simKm} km @ €{settings.ratePerKmEur}/km):</span>
                <span>€{tariffCalc.priceBreakdown.distanceFeeEur.toFixed(2)}</span>
              </div>

              {simExpress && (
                <div className="flex justify-between text-amber-400 font-semibold">
                  <span>Express Emergency Surcharge:</span>
                  <span>+€{settings.expressEmergencySurchargeEur.toFixed(2)}</span>
                </div>
              )}

              {tariffCalc.priceBreakdown.holidaySurchargeEur > 0 && (
                <div className="flex justify-between text-red-400 font-bold">
                  <span>Holiday Feiertag Surcharge (+{settings.holidayMarkupPercent}%):</span>
                  <span>+€{tariffCalc.priceBreakdown.holidaySurchargeEur.toFixed(2)}</span>
                </div>
              )}

              {tariffCalc.priceBreakdown.weekendSurchargeEur > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Weekend Surcharge (+{settings.weekendMarkupPercent}%):</span>
                  <span>+€{tariffCalc.priceBreakdown.weekendSurchargeEur.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-slate-800 pt-2 flex items-center justify-between font-bold text-sm text-white">
                <span>Total Client Fare (incl. 19% MwSt):</span>
                <span className="text-emerald-400 text-base">€{tariffCalc.calculatedPriceEur.toFixed(2)}</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
