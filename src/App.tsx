/**
 * @license
 * BioDispatch DE - UN 3373 Category B Medical Courier Dispatch & Tracking Application
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OfflineBanner } from './components/OfflineBanner';
import { DriverOrders } from './components/DriverApp/DriverOrders';
import { OrderManagement } from './components/AdminDashboard/OrderManagement';
import { LiveTrackingMap } from './components/AdminDashboard/LiveTrackingMap';
import { TemperatureAlertsPanel } from './components/AdminDashboard/TemperatureAlertsPanel';
import { AuditTrailViewer } from './components/AdminDashboard/AuditTrailViewer';
import { CertificateExporter } from './components/AdminDashboard/CertificateExporter';
import { TariffHolidayManager } from './components/AdminDashboard/TariffHolidayManager';
import { OperationalModeSelector } from './components/AdminDashboard/OperationalModeSelector';
import { VacationShutdownManager } from './components/AdminDashboard/VacationShutdownManager';
import { EmailForwardingManager } from './components/AdminDashboard/EmailForwardingManager';
import { PrismaSchemaViewer } from './components/PrismaSchemaViewer';
import { ClientPortal } from './components/ClientPortal/ClientPortal';
import { LegalComplianceCenter } from './components/Compliance/LegalComplianceCenter';
import { TemperatureSensorGuideModal } from './components/TemperatureSensorGuideModal';
import { MobileInstallGuideModal } from './components/MobileInstallGuideModal';
import { LoginPortalModal } from './components/Auth/LoginPortalModal';
import { HomePageLanding } from './components/Auth/HomePageLanding';
import { UnauthorizedShield } from './components/Security/UnauthorizedShield';
import { SecurityAuditModal } from './components/Security/SecurityAuditModal';

import { Order, Role, OrderStatus, TemperatureTelemetry, User } from './types';
import { INITIAL_ORDERS, INITIAL_USERS } from './lib/db';
import { offlineQueue } from './lib/offlineQueue';
import { tempSimulator } from './lib/temperatureSimulator';
import { emailForwardingStore } from './lib/emailForwardingStore';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [activeRole, setActiveRole] = useState<Role>('DRIVER');
  const [currentUser, setCurrentUser] = useState<User | null>(INITIAL_USERS[1]); // Default to Driver Hans Schmidt
  const [viewMode, setViewMode] = useState<'DRIVER_MOBILE' | 'DISPATCH_DASHBOARD' | 'CLIENT_PORTAL' | 'LEGAL_COMPLIANCE' | 'PRISMA_SCHEMA' | 'SECURITY_AUDIT'>('DRIVER_MOBILE');
  const [dashboardTab, setDashboardTab] = useState<'ORDERS' | 'MAP' | 'TARIFF_HOLIDAYS' | 'OPERATIONAL_MODES' | 'VACATION' | 'TELEMETRY' | 'AUDIT' | 'EXPORTS' | 'EMAIL_FORWARDING'>('ORDERS');
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0] || null);
  const [isOffline, setIsOffline] = useState<boolean>(offlineQueue.isForceOffline());
  const [pendingCount, setPendingCount] = useState<number>(offlineQueue.getPendingCount());
  const [activeBreachesCount, setActiveBreachesCount] = useState<number>(0);
  const [isTempGuideOpen, setIsTempGuideOpen] = useState<boolean>(false);
  const [isMobileInstallOpen, setIsMobileInstallOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);

  // Visual Theme State (Defaults to Daylight Ops Mode "Feels Alive")
  const [isNightShift, setIsNightShift] = useState<boolean>(false);

  const handleToggleNightShift = () => {
    setIsNightShift(prev => !prev);
  };

  // Sync offline queue listener
  useEffect(() => {
    const unsubscribe = offlineQueue.subscribe(() => {
      setPendingCount(offlineQueue.getPendingCount());
      setIsOffline(offlineQueue.isForceOffline());
    });
    return () => unsubscribe();
  }, []);

  // Temperature Simulation Listener
  useEffect(() => {
    tempSimulator.startSimulation(orders, (newTelemetry: TemperatureTelemetry) => {
      setOrders(prevOrders => {
        return prevOrders.map(ord => {
          if (ord.id === newTelemetry.orderId) {
            const updatedLogs = [newTelemetry, ...ord.telemetryLogs.slice(0, 49)];
            return { ...ord, telemetryLogs: updatedLogs };
          }
          return ord;
        });
      });
    });

    return () => tempSimulator.stopSimulation();
  }, [orders]);

  // Recalculate active breaches count
  useEffect(() => {
    let breaches = 0;
    orders.forEach(o => {
      const latest = o.telemetryLogs[0];
      if (latest && latest.isBreach) breaches++;
    });
    setActiveBreachesCount(breaches);
  }, [orders]);

  // Fetch initial orders from server API
  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setOrders(data);
          setSelectedOrder(data[0]);
        }
      })
      .catch(err => console.log('Using local client database:', err));
  }, []);

  // Handle State Machine Transition
  const handleTransitionOrder = async (
    orderId: string,
    targetStatus: OrderStatus,
    context?: any
  ) => {
    const coords = { lat: 52.5200, lng: 13.4050 };

    // If device is offline (e.g. basement level -2), queue offline
    if (isOffline || !navigator.onLine) {
      offlineQueue.enqueueAction(orderId, targetStatus as any, { targetStatus, ...context }, coords);
      
      // Update local React UI state optimistically
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          const updated = { ...o, status: targetStatus, updatedAt: new Date().toISOString() };
          if (context?.preTripCheck) updated.preTripCheck = context.preTripCheck;
          if (context?.chainOfCustody) updated.chainOfCustodyLogs.push(context.chainOfCustody);
          return updated;
        }
        return o;
      }));
      return;
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStatus,
          context,
          userId: 'USR-DRIVER-01',
          userName: 'Hans Schmidt',
          userRole: activeRole,
          deviceId: 'MOB-DRIVER-104',
          coords
        })
      });

      if (res.ok) {
        const data = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
        if (targetStatus === 'DELIVERED' && data.order) {
          emailForwardingStore.triggerOrderCompletedForwarding(data.order);
        }
      } else {
        const errData = await res.json();
        alert(`Transition rejected under UN 3373 rules:\n${errData.errors?.join('\n') || errData.message}`);
      }
    } catch (e) {
      // Fallback offline queue on network drop
      offlineQueue.enqueueAction(orderId, targetStatus as any, { targetStatus, ...context }, coords);
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          const updated = { ...o, status: targetStatus };
          if (targetStatus === 'DELIVERED') {
            emailForwardingStore.triggerOrderCompletedForwarding(updated);
          }
          return updated;
        }
        return o;
      }));
    }
  };

  // Handle Order Creation
  const handleCreateOrder = async (newOrderData: any) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrderData)
      });
      if (res.ok) {
        const newOrd = await res.json();
        setOrders(prev => [newOrd, ...prev]);
        setSelectedOrder(newOrd);
      }
    } catch (e) {
      console.error('Error creating order:', e);
    }
  };

  // Manual Sync
  const handleManualSync = async () => {
    await offlineQueue.syncQueue();
    // Refresh orders
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setOrders(data);
      });
  };

  // Handle Driver Claiming an Open Order
  const handleClaimOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          driverId: 'USR-DRIVER-01',
          driverName: 'Hans Schmidt (CEO/Driver)',
          vehicleRegNumber: 'B-BD 7741',
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    }));
  };

  const handleSimulateSpike = (order: Order) => {
    const spikeTemp = order.transportType === 'REFRIGERATED_2_8C' ? 14.2 : 31.0;
    tempSimulator.triggerManualTempSpike(order, spikeTemp);
  };

  if (!isAuthenticated) {
    return (
      <>
        <HomePageLanding
          onLogin={(user, initialViewMode) => {
            setCurrentUser(user);
            setActiveRole(user.role);
            if (initialViewMode) setViewMode(initialViewMode);
            setIsAuthenticated(true);
          }}
          onOpenMobileInstall={() => setIsMobileInstallOpen(true)}
          isNightShift={isNightShift}
          onToggleNightShift={handleToggleNightShift}
        />
        <MobileInstallGuideModal
          isOpen={isMobileInstallOpen}
          onClose={() => setIsMobileInstallOpen(false)}
        />
      </>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-500 ${
      isNightShift ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      
      {/* Top Navigation & Status Bar */}
      <Header
        activeRole={activeRole}
        setActiveRole={(role) => {
          setActiveRole(role);
          const matchedUser = INITIAL_USERS.find(u => u.role === role) || currentUser;
          if (matchedUser) setCurrentUser(matchedUser);
        }}
        currentUser={currentUser}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isOffline={isOffline}
        setIsOffline={setIsOffline}
        pendingCount={pendingCount}
        activeBreachesCount={activeBreachesCount}
        onManualSync={handleManualSync}
        onOpenTempGuide={() => setIsTempGuideOpen(true)}
        onOpenMobileInstall={() => setIsMobileInstallOpen(true)}
        onOpenLoginPortal={() => setIsLoginModalOpen(true)}
        onLogout={() => setIsAuthenticated(false)}
        isNightShift={isNightShift}
        onToggleNightShift={handleToggleNightShift}
      />

      {/* Offline Alert Banner */}
      <OfflineBanner
        isOffline={isOffline}
        pendingCount={pendingCount}
        onSyncNow={handleManualSync}
      />

      {/* Main Body Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
        
        {/* ROLE GUARD: CLIENT CLINIC ACCESS RESTRICTION */}
        {currentUser?.role === 'CLIENT_CLINIC' && (viewMode === 'DISPATCH_DASHBOARD' || viewMode === 'DRIVER_MOBILE' || viewMode === 'LEGAL_COMPLIANCE' || viewMode === 'PRISMA_SCHEMA') && (
          <UnauthorizedShield
            requiredRole="CEO / DISPATCHER"
            currentRole={currentUser.role}
            currentUser={currentUser}
            onSwitchRole={() => setIsLoginModalOpen(true)}
            isNightShift={isNightShift}
          />
        )}

        {/* ROLE GUARD: DRIVER ACCESS RESTRICTION */}
        {currentUser?.role === 'DRIVER' && (viewMode === 'DISPATCH_DASHBOARD' || viewMode === 'CLIENT_PORTAL' || viewMode === 'LEGAL_COMPLIANCE' || viewMode === 'PRISMA_SCHEMA') && (
          <UnauthorizedShield
            requiredRole="CEO / DISPATCHER"
            currentRole={currentUser.role}
            currentUser={currentUser}
            onSwitchRole={() => setIsLoginModalOpen(true)}
            isNightShift={isNightShift}
          />
        )}

        {/* VIEW MODE 1: CLIENT CLINIC PORTAL */}
        {viewMode === 'CLIENT_PORTAL' && (currentUser?.role === 'CLIENT_CLINIC' || currentUser?.role === 'DISPATCHER' || currentUser?.role === 'ADMIN') && (
          <ClientPortal
            orders={orders}
            onCreateOrder={handleCreateOrder}
          />
        )}

        {/* VIEW MODE 2: DRIVER MOBILE WORKFLOW APP & JOB BOARD */}
        {viewMode === 'DRIVER_MOBILE' && (currentUser?.role === 'DRIVER' || currentUser?.role === 'DISPATCHER' || currentUser?.role === 'ADMIN') && (
          <div className="space-y-4">
            <div className={`p-3 rounded-xl text-xs flex items-center justify-between border transition-colors ${
              isNightShift ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`}>
              <div>
                <strong className={`block text-sm ${isNightShift ? 'text-white' : 'text-slate-900'}`}>Medical Courier Driver App & Job Board</strong>
                <span className={isNightShift ? 'text-slate-400' : 'text-slate-600'}>Sequential state machine execution with offline queueing + Job Marketplace for claiming open pickups.</span>
              </div>
              <button
                onClick={() => setViewMode('SECURITY_AUDIT')}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all shrink-0 shadow-sm"
              >
                Security Matrix
              </button>
            </div>

            <DriverOrders
              orders={orders}
              onTransitionOrder={handleTransitionOrder}
              onClaimOrder={handleClaimOrder}
              isOffline={isOffline}
            />
          </div>
        )}

        {/* VIEW MODE 3: ADMIN / DISPATCHER WEB DASHBOARD */}
        {viewMode === 'DISPATCH_DASHBOARD' && (currentUser?.role === 'DISPATCHER' || currentUser?.role === 'ADMIN') && (
          <div className="space-y-4">
            
            {/* Dashboard Sub-Tabs */}
            <div className={`flex flex-wrap gap-1 p-1.5 rounded-xl border text-xs transition-colors ${
              isNightShift ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <button
                onClick={() => setDashboardTab('ORDERS')}
                className={`px-3.5 py-2 rounded-lg font-semibold transition-all ${
                  dashboardTab === 'ORDERS' 
                    ? 'bg-emerald-600 text-white shadow' 
                    : isNightShift ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Orders & Scheduling
              </button>

              <button
                onClick={() => setDashboardTab('MAP')}
                className={`px-3.5 py-2 rounded-lg font-semibold transition-all ${
                  dashboardTab === 'MAP' 
                    ? 'bg-emerald-600 text-white shadow' 
                    : isNightShift ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Live GPS Dispatch Map
              </button>

              <button
                onClick={() => setDashboardTab('TARIFF_HOLIDAYS')}
                className={`px-3.5 py-2 rounded-lg font-semibold transition-all ${
                  dashboardTab === 'TARIFF_HOLIDAYS' 
                    ? 'bg-red-600 text-white shadow' 
                    : isNightShift ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Tariffs & Feiertage
              </button>

              <button
                onClick={() => setDashboardTab('OPERATIONAL_MODES')}
                className={`px-3.5 py-2 rounded-lg font-semibold transition-all ${
                  dashboardTab === 'OPERATIONAL_MODES' 
                    ? 'bg-amber-600 text-white shadow' 
                    : isNightShift ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Solo / Fleet Scaling
              </button>

              <button
                onClick={() => setDashboardTab('VACATION')}
                className={`px-3.5 py-2 rounded-lg font-semibold transition-all ${
                  dashboardTab === 'VACATION' 
                    ? 'bg-cyan-600 text-white shadow' 
                    : isNightShift ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Vacation Shutdown
              </button>

              <button
                onClick={() => setDashboardTab('TELEMETRY')}
                className={`px-3.5 py-2 rounded-lg font-semibold transition-all relative ${
                  dashboardTab === 'TELEMETRY' 
                    ? 'bg-emerald-600 text-white shadow' 
                    : isNightShift ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Temperature Telemetry</span>
                {activeBreachesCount > 0 && (
                  <span className="ml-1.5 bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {activeBreachesCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setDashboardTab('AUDIT')}
                className={`px-3.5 py-2 rounded-lg font-semibold transition-all ${
                  dashboardTab === 'AUDIT' 
                    ? 'bg-emerald-600 text-white shadow' 
                    : isNightShift ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Immutable Audit Trail
              </button>

              <button
                onClick={() => setDashboardTab('EXPORTS')}
                className={`px-3.5 py-2 rounded-lg font-semibold transition-all ${
                  dashboardTab === 'EXPORTS' 
                    ? 'bg-emerald-600 text-white shadow' 
                    : isNightShift ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Certificates & Exports
              </button>

              <button
                onClick={() => setDashboardTab('EMAIL_FORWARDING')}
                className={`px-3.5 py-2 rounded-lg font-semibold transition-all flex items-center space-x-1.5 ${
                  dashboardTab === 'EMAIL_FORWARDING' 
                    ? 'bg-red-600 text-white shadow font-bold' 
                    : isNightShift ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>📧 Email & Invoice Forwarding</span>
              </button>
            </div>

            {/* Dashboard View Switcher */}
            {dashboardTab === 'ORDERS' && (
              <OrderManagement
                orders={orders}
                onCreateOrder={handleCreateOrder}
                onSelectOrder={(ord) => {
                  setSelectedOrder(ord);
                  setDashboardTab('MAP');
                }}
              />
            )}

            {dashboardTab === 'MAP' && (
              <LiveTrackingMap
                orders={orders}
                selectedOrder={selectedOrder}
                onSelectOrder={setSelectedOrder}
              />
            )}

            {dashboardTab === 'TARIFF_HOLIDAYS' && (
              <TariffHolidayManager />
            )}

            {dashboardTab === 'OPERATIONAL_MODES' && (
              <OperationalModeSelector />
            )}

            {dashboardTab === 'VACATION' && (
              <VacationShutdownManager />
            )}

            {dashboardTab === 'TELEMETRY' && (
              <TemperatureAlertsPanel
                orders={orders}
                onSimulateSpike={handleSimulateSpike}
              />
            )}

            {dashboardTab === 'AUDIT' && (
              <AuditTrailViewer
                orders={orders}
                selectedOrder={selectedOrder}
              />
            )}

            {dashboardTab === 'EXPORTS' && (
              <CertificateExporter orders={orders} />
            )}

            {dashboardTab === 'EMAIL_FORWARDING' && (
              <EmailForwardingManager isNightShift={isNightShift} />
            )}

          </div>
        )}

        {/* VIEW MODE 4: LEGAL, REGULATORY & DSGVO COMPLIANCE */}
        {viewMode === 'LEGAL_COMPLIANCE' && (currentUser?.role === 'DISPATCHER' || currentUser?.role === 'ADMIN') && (
          <LegalComplianceCenter />
        )}

        {/* VIEW MODE 5: SECURITY AUDIT & RBAC MATRIX */}
        {viewMode === 'SECURITY_AUDIT' && (
          <SecurityAuditModal
            isOpen={true}
            onClose={() => setViewMode(currentUser?.role === 'CLIENT_CLINIC' ? 'CLIENT_PORTAL' : currentUser?.role === 'DRIVER' ? 'DRIVER_MOBILE' : 'DISPATCH_DASHBOARD')}
            currentUser={currentUser}
            onSwitchRole={() => setIsLoginModalOpen(true)}
            isNightShift={isNightShift}
          />
        )}

        {/* VIEW MODE 6: PRISMA SCHEMA & ARCHITECTURE VIEWER */}
        {viewMode === 'PRISMA_SCHEMA' && (currentUser?.role === 'DISPATCHER' || currentUser?.role === 'ADMIN') && (
          <PrismaSchemaViewer />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MediGo Hessen • UN 3373 Biological Substance Category B Medical Courier System</span>
          <span>Compliance: ADR Packaging Instruction P650 & Transfusionsgesetz (Germany)</span>
        </div>
      </footer>

      {/* Sensor Guide Modal */}
      <TemperatureSensorGuideModal
        isOpen={isTempGuideOpen}
        onClose={() => setIsTempGuideOpen(false)}
        onTriggerDemoSpike={() => {
          if (orders[0]) handleSimulateSpike(orders[0]);
        }}
      />

      {/* Mobile App PWA & Native APK/iOS Download Guide Modal */}
      <MobileInstallGuideModal
        isOpen={isMobileInstallOpen}
        onClose={() => setIsMobileInstallOpen(false)}
      />

      {/* Login Portal & Credentials Sharing Modal */}
      <LoginPortalModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        onRegisterUser={(newUser) => {
          setUsers(prev => [newUser, ...prev]);
        }}
        onSelectUser={(user, mode) => {
          setCurrentUser(user);
          setActiveRole(user.role);
          
          // Strict Role Isolation Enforcement upon sign in
          if (user.role === 'CLIENT_CLINIC') {
            setViewMode('CLIENT_PORTAL');
          } else if (user.role === 'DRIVER') {
            setViewMode('DRIVER_MOBILE');
          } else if (mode) {
            setViewMode(mode);
          } else {
            setViewMode('DISPATCH_DASHBOARD');
          }
        }}
      />

    </div>
  );
}
