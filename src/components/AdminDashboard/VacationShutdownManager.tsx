import React, { useState } from 'react';
import { Palmtree, Calendar, Plus, Trash2, AlertCircle, ShieldCheck, UserCheck, Phone, CheckCircle2, Clock, Globe } from 'lucide-react';
import { VacationWindow } from '../../types';
import { getVacationWindows, addVacationWindow, deleteVacationWindow, isCurrentlyInVacationWindow } from '../../lib/db';

export const VacationShutdownManager: React.FC = () => {
  const [windows, setWindows] = useState<VacationWindow[]>(getVacationWindows());
  const [showAddForm, setShowAddForm] = useState(false);

  // New Form State
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverName, setCoverName] = useState('Express Courier Hessen GmbH');
  const [coverPhone, setCoverPhone] = useState('+49 69 9882200');
  const [notes, setNotes] = useState('');

  const currentVacation = isCurrentlyInVacationWindow();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !endDate) return;

    addVacationWindow({
      title,
      startDate,
      endDate,
      activeCoverPartnerName: coverName,
      activeCoverPartnerPhone: coverPhone,
      allowEmergencyDelegation: true,
      notes
    });

    setWindows([...getVacationWindows()]);
    setShowAddForm(false);
    setTitle('');
    setStartDate('');
    setEndDate('');
    setNotes('');
  };

  const handleDelete = (id: string) => {
    deleteVacationWindow(id);
    setWindows([...getVacationWindows()]);
  };

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs tracking-wider uppercase">
            <Palmtree className="w-4 h-4" />
            <span>Solo Operator Scaling & Capacity Management</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Vacation & Short Shutdown Schedule Manager</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Plan 1-week and 2-week vacation windows throughout the year. Spontaneous express orders automatically redirect to designated cover partner couriers.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-cyan-950/40 shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Vacation Window</span>
        </button>
      </div>

      {/* Active Vacation Alert Banner */}
      {currentVacation.inVacation && currentVacation.activeWindow && (
        <div className="bg-amber-950/80 border border-amber-600/80 p-4 rounded-2xl flex items-start space-x-3 text-amber-200">
          <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shrink-0 mt-0.5">
            <Palmtree className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1 text-xs">
            <span className="font-bold text-sm block text-amber-100">
              CURRENTLY ACTIVE VACATION PERIOD: {currentVacation.activeWindow.title}
            </span>
            <p className="text-amber-300/90 leading-relaxed">
              Window: {new Date(currentVacation.activeWindow.startDate).toLocaleDateString('de-DE')} to {new Date(currentVacation.activeWindow.endDate).toLocaleDateString('de-DE')}
            </p>
            <p className="text-amber-200 font-semibold flex items-center space-x-1 pt-1">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Cover Partner Active: {currentVacation.activeWindow.activeCoverPartnerName} ({currentVacation.activeWindow.activeCoverPartnerPhone})</span>
            </p>
          </div>
        </div>
      )}

      {/* Add New Vacation Form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="bg-slate-900 border border-cyan-500/40 p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-sm text-cyan-300 flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>Schedule New Short Vacation Plan (1 to 2 Weeks)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Vacation Window Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Ostermarkt Pause 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Cover Subcontractor Courier Name</label>
              <input
                type="text"
                value={coverName}
                onChange={(e) => setCoverName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Cover Partner Phone / Hotline</label>
              <input
                type="text"
                value={coverPhone}
                onChange={(e) => setCoverPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Notes / Instructions for Client Portal</label>
              <input
                type="text"
                placeholder="e.g. Emergency delegation active"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-cyan-950/50"
            >
              Save Vacation Plan
            </button>
          </div>
        </form>
      )}

      {/* Schedule Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 font-bold text-xs text-slate-200 flex items-center justify-between">
          <span>Scheduled Solo Courier Vacation Periods</span>
          <span className="text-slate-400">{windows.length} Window(s) Configured</span>
        </div>

        <div className="divide-y divide-slate-800">
          {windows.map((win) => {
            const start = new Date(win.startDate);
            const end = new Date(win.endDate);
            const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            return (
              <div key={win.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm">{win.title}</span>
                    <span className="bg-slate-800 text-cyan-300 px-2 py-0.5 rounded-md font-bold text-[10px]">
                      {diffDays} Day(s) ({Math.round(diffDays / 7)} Week(s))
                    </span>
                  </div>
                  <div className="text-slate-400 flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{start.toLocaleDateString('de-DE')} - {end.toLocaleDateString('de-DE')}</span>
                    </span>
                    <span className="flex items-center space-x-1 text-slate-300">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cover: {win.activeCoverPartnerName} ({win.activeCoverPartnerPhone})</span>
                    </span>
                  </div>
                  {win.notes && (
                    <p className="text-slate-500 italic text-[11px]">{win.notes}</p>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(win.id)}
                  className="bg-red-950/50 hover:bg-red-900 text-red-300 border border-red-800 px-3 py-1.5 rounded-lg flex items-center space-x-1 self-start md:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
