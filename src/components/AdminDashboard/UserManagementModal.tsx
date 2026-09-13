import React, { useState, useEffect } from 'react';
import { User, Role } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Building2,
  FlaskConical,
  Truck,
  Crown,
  Key,
  Copy,
  Check,
  AlertCircle,
  X,
  Database,
  Trash2,
  Power,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  FileCode,
} from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const { token, currentUser, dbStatus, refreshDbStatus } = useAuth();

  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE' | 'DATABASE'>('LIST');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // SQL schema state
  const [sqlCode, setSqlCode] = useState<string>('');
  const [isSqlCopied, setIsSqlCopied] = useState<boolean>(false);
  const [isVerifyingDb, setIsVerifyingDb] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('CLIENT_CLINIC');
  const [organization, setOrganization] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [facilityType, setFacilityType] = useState<'CLINIC' | 'LABORATORY' | 'HQ' | 'COURIER'>('CLINIC');
  const [facilityAddress, setFacilityAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleRegNumber, setVehicleRegNumber] = useState('');

  // Credentials copy card
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    name: string;
    role: string;
    contractNumber?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchSqlSchema = async () => {
    try {
      const res = await fetch('/api/db/schema-sql');
      if (res.ok) {
        const text = await res.text();
        setSqlCode(text);
      }
    } catch (err) {
      console.warn('Could not fetch schema SQL:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      refreshDbStatus();
      fetchSqlSchema();
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Response was not JSON (e.g. Vercel text error)
      }

      if (res.ok) {
        if (Array.isArray(parsed)) {
          setUsers(parsed);
        } else {
          setUsers([]);
        }
      } else {
        const errorMsg = parsed?.message || text || `Server error (${res.status})`;
        setErrorMsg(errorMsg);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error fetching user directory');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    if (newRole === 'CLIENT_CLINIC') {
      setFacilityType('CLINIC');
      if (!contractNumber) setContractNumber(`CTR-2026-CLN-${Math.floor(100 + Math.random() * 900)}`);
    } else if (newRole === 'LAB_STAFF') {
      setFacilityType('LABORATORY');
      if (!contractNumber) setContractNumber(`CTR-2026-LAB-${Math.floor(100 + Math.random() * 900)}`);
    } else if (newRole === 'DRIVER') {
      setFacilityType('COURIER');
      setContractNumber('');
      if (!vehicleRegNumber) setVehicleRegNumber('WI-MG ' + Math.floor(1000 + Math.random() * 9000));
    } else {
      setFacilityType('HQ');
      setContractNumber('');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password || !name || !role) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    // Validate contract number requirement
    if ((role === 'CLIENT_CLINIC' || role === 'LAB_STAFF') && !contractNumber.trim()) {
      setErrorMsg('Contract Number is strictly mandatory for Clinics and Laboratories.');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
          role,
          phone: phone.trim(),
          organization: organization.trim(),
          contractNumber: contractNumber.trim(),
          facilityType,
          facilityAddress: facilityAddress.trim(),
          vehicleRegNumber: vehicleRegNumber.trim(),
        }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        // Not JSON
      }

      if (!res.ok) {
        setErrorMsg(data?.message || text || `Server error (${res.status})`);
        return;
      }

      setSuccessMsg(`User ${data?.user?.name || name} was successfully registered and saved.`);
      setCreatedCredentials({
        email,
        password,
        name,
        role,
        contractNumber: contractNumber || undefined,
      });

      // Clear fields
      setName('');
      setEmail('');
      setPassword('');
      setOrganization('');
      setContractNumber('');
      setFacilityAddress('');
      setPhone('');
      setVehicleRegNumber('');

      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while creating user');
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed to toggle active status:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user account?')) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const text = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          // Not JSON
        }
        alert(data?.message || text || 'Could not delete user');
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const copyCredentialsToClipboard = () => {
    if (!createdCredentials) return;
    const text = `--- BioDispatch MediGo Access Credentials ---
Name: ${createdCredentials.name}
Role: ${createdCredentials.role}
Email: ${createdCredentials.email}
Initial Password: ${createdCredentials.password}
${createdCredentials.contractNumber ? `Authorized Contract Number: ${createdCredentials.contractNumber}\n` : ''}
Login URL: ${window.location.origin}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="bg-slate-800/90 border-b border-slate-700 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white">Personnel & Facility Administration</h3>
                <span className="bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                User Verification, Contract Provisioning & Supabase Persistence Control
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-950 border-b border-slate-800 px-4 flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setActiveTab('LIST')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'LIST'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Directory ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CREATE')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'CREATE'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision User or Facility</span>
          </button>

          <button
            onClick={() => setActiveTab('DATABASE')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
              activeTab === 'DATABASE'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>
              Supabase Database ({dbStatus?.tablesCreated ? 'Active' : dbStatus?.supabaseConfigured ? 'Tables Pending' : 'Standby'})
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs p-3 rounded-xl flex items-start space-x-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs p-3 rounded-xl flex items-start space-x-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: USER DIRECTORY */}
          {activeTab === 'LIST' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>All authenticated system users with verified roles & assigned contracts</span>
                <button
                  onClick={fetchUsers}
                  className="text-cyan-400 hover:underline font-mono text-[11px]"
                >
                  Refresh Table
                </button>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">User & Email</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Contract # / Vehicle</th>
                      <th className="p-3">Organization</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-white flex items-center space-x-1.5">
                            <span>{u.name}</span>
                            {u.role === 'ADMIN' && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                              u.role === 'ADMIN'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : u.role === 'DRIVER'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                : u.role === 'CLIENT_CLINIC'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : u.role === 'LAB_STAFF'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          {u.contractNumber ? (
                            <span className="font-mono text-[11px] text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-1.5 py-0.5 rounded font-bold">
                              {u.contractNumber}
                            </span>
                          ) : u.vehicleRegNumber ? (
                            <span className="font-mono text-[11px] text-cyan-300 bg-cyan-950/70 border border-cyan-800 px-1.5 py-0.5 rounded">
                              {u.vehicleRegNumber}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-mono text-[11px]">N/A</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="text-slate-300 truncate max-w-[180px]">{u.organization || 'MediGo Hessen'}</div>
                          {u.phone && <div className="text-[10px] text-slate-500 font-mono">{u.phone}</div>}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleActive(u.id, u.active !== false)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                              u.active !== false
                                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700 hover:bg-emerald-900'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            {u.active !== false ? 'Active' : 'Suspended'}
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          {u.email.toLowerCase() !== 'nsansvester89@gmail.com' ? (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-950/40 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-amber-500 font-bold">Master</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PROVISION NEW USER OR FACILITY */}
          {activeTab === 'CREATE' && (
            <div className="space-y-4">
              {createdCredentials && (
                <div className="bg-emerald-950/70 border border-emerald-700 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                      <Key className="w-4 h-4" />
                      <span>Account Credentials Ready to Hand Over:</span>
                    </span>
                    <button
                      onClick={copyCredentialsToClipboard}
                      className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
                    </button>
                  </div>
                  <div className="bg-slate-950/80 p-3 rounded-lg font-mono text-xs space-y-1 text-slate-200">
                    <div>
                      <span className="text-slate-400">Name:</span> {createdCredentials.name}
                    </div>
                    <div>
                      <span className="text-slate-400">Email:</span> {createdCredentials.email}
                    </div>
                    <div>
                      <span className="text-slate-400">Temporary Password:</span>{' '}
                      <span className="text-cyan-400 font-bold">{createdCredentials.password}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Role:</span> {createdCredentials.role}
                    </div>
                    {createdCredentials.contractNumber && (
                      <div>
                        <span className="text-slate-400">Contract Number:</span>{' '}
                        <span className="text-emerald-400 font-bold">{createdCredentials.contractNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
                {/* Role Selection */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-200 block">Select Account Classification *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRoleChange('CLIENT_CLINIC')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        role === 'CLIENT_CLINIC'
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Building2 className="w-4 h-4 mb-1 text-emerald-400" />
                      <span className="font-bold">Hospital Clinic</span>
                      <span className="text-[10px] opacity-75">Requires Contract #</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleChange('LAB_STAFF')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        role === 'LAB_STAFF'
                          ? 'bg-purple-950/60 border-purple-500 text-purple-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <FlaskConical className="w-4 h-4 mb-1 text-purple-400" />
                      <span className="font-bold">Diagnostic Lab</span>
                      <span className="text-[10px] opacity-75">Requires Contract #</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleChange('DRIVER')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        role === 'DRIVER'
                          ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Truck className="w-4 h-4 mb-1 text-cyan-400" />
                      <span className="font-bold">Medical Courier</span>
                      <span className="text-[10px] opacity-75">Driver Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleChange('DISPATCHER')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        role === 'DISPATCHER'
                          ? 'bg-blue-950/60 border-blue-500 text-blue-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 mb-1 text-blue-400" />
                      <span className="font-bold">Dispatcher</span>
                      <span className="text-[10px] opacity-75">Dispatch Staff</span>
                    </button>
                  </div>
                </div>

                {/* Primary Credentials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Staff / Facility Contact Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. Thomas Weber or Schwester Petra"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Login Email Address *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. virchow.infekt@charite.de"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Initial Password *</label>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters (e.g. ClinicPass2026!)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Hospital / Company / Lab Organization</label>
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="e.g. Universitätsklinikum Frankfurt or Synlab"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Contract Number & Facility Address (For Clinics / Labs) */}
                {(role === 'CLIENT_CLINIC' || role === 'LAB_STAFF') && (
                  <div className="bg-emerald-950/30 border border-emerald-800/80 p-3.5 rounded-xl space-y-3 animate-fade-in">
                    <div className="flex items-center space-x-2 text-emerald-300 font-bold">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Authorized Transport Contract & Facility Specifications</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-emerald-200">Contract Number (Mandatory) *</label>
                        <input
                          type="text"
                          value={contractNumber}
                          onChange={(e) => setContractNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. CTR-2026-UKF-HE-01"
                          className="w-full bg-slate-950 border border-emerald-700/80 rounded-xl px-3 py-2 text-white font-mono font-bold text-cyan-300 focus:outline-none focus:border-emerald-500"
                          required
                        />
                        <span className="text-[10px] text-emerald-400/80 block">
                          Identifies billing tariffs and transport agreements.
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-300">Facility Address</label>
                        <input
                          type="text"
                          value={facilityAddress}
                          onChange={(e) => setFacilityAddress(e.target.value)}
                          placeholder="e.g. Theodor-Stern-Kai 7, 60590 Frankfurt"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Vehicle details (For Drivers) */}
                {role === 'DRIVER' && (
                  <div className="bg-cyan-950/30 border border-cyan-800/80 p-3.5 rounded-xl space-y-3 animate-fade-in">
                    <div className="flex items-center space-x-2 text-cyan-300 font-bold">
                      <Truck className="w-4 h-4" />
                      <span>Driver & Fleet Vehicle Configuration</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-cyan-200">Vehicle Registration Number</label>
                        <input
                          type="text"
                          value={vehicleRegNumber}
                          onChange={(e) => setVehicleRegNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. F-MG 7741 (Thermo Van)"
                          className="w-full bg-slate-950 border border-cyan-700 rounded-xl px-3 py-2 text-white font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-300">Courier Mobile Phone</label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+49 171 0000000"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-950 text-xs flex items-center space-x-2 active:scale-95 transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create User & Issue Credentials</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: SUPABASE DATABASE INTEGRATION */}
          {activeTab === 'DATABASE' && (
            <div className="space-y-4 text-xs">
              {/* Connection & Table Status Header */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Database className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h4 className="font-bold text-sm text-white">Supabase PostgreSQL Connection</h4>
                      <p className="text-[11px] text-slate-400">
                        High-availability PostgreSQL database for UN 3373 medical logistics
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={async () => {
                        setIsVerifyingDb(true);
                        await refreshDbStatus();
                        await fetchUsers();
                        setIsVerifyingDb(false);
                      }}
                      disabled={isVerifyingDb}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center space-x-1.5 transition-all border border-slate-700 font-medium"
                      title="Re-query Supabase to check if tables exist"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isVerifyingDb ? 'animate-spin' : ''}`} />
                      <span>{isVerifyingDb ? 'Checking...' : 'Check Connection'}</span>
                    </button>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                        dbStatus?.tablesCreated
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : dbStatus?.supabaseConfigured
                          ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {dbStatus?.tablesCreated
                        ? 'Connected & Tables Active'
                        : dbStatus?.supabaseConfigured
                        ? 'Connected (Tables Missing)'
                        : 'Standby: Local Storage'}
                    </span>
                  </div>
                </div>

                {/* Status Callout Banner */}
                {dbStatus?.supabaseConfigured && !dbStatus?.tablesCreated ? (
                  <div className="bg-amber-950/60 border border-amber-700/80 p-3 rounded-lg flex items-start space-x-3 text-amber-200">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-xs text-amber-300">
                        Supabase Project Connected, but Database Tables Have Not Been Created Yet
                      </p>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed">
                        The backend successfully verified connection to your project (<code>{dbStatus.supabaseUrl}</code>), but PostgreSQL tables <code>public.users</code> and <code>public.orders</code> do not exist yet. Please run the SQL migration script below in your Supabase SQL Editor.
                      </p>
                    </div>
                  </div>
                ) : dbStatus?.tablesCreated ? (
                  <div className="bg-emerald-950/60 border border-emerald-700/80 p-3 rounded-lg flex items-start space-x-3 text-emerald-200">
                    <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs text-emerald-300">
                        Supabase PostgreSQL Tables Verified & Synchronized
                      </p>
                      <p className="text-[11px] text-emerald-200/90">
                        All UN 3373 medical courier personnel, facilities, orders, and telemetry logs are persisting directly to your Supabase PostgreSQL instance.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Total Users</span>
                    <span className="text-base font-bold text-white font-mono">{dbStatus?.userCount || 0}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Active Orders</span>
                    <span className="text-base font-bold text-white font-mono">{dbStatus?.orderCount || 0}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 col-span-2">
                    <span className="text-[10px] text-slate-500 block">Supabase Endpoint</span>
                    <span className="text-xs font-mono text-cyan-400 truncate block">
                      {dbStatus?.supabaseUrl || 'Standby (Provide SUPABASE_URL in Settings)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SQL Migration Assistant */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h5 className="font-bold text-slate-200 flex items-center space-x-2">
                      <FileCode className="w-4 h-4 text-cyan-400" />
                      <span>PostgreSQL Migration Script (supabase-schema.sql)</span>
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Creates <code>users</code>, <code>orders</code>, and <code>audit_logs</code> tables with seed records.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        if (sqlCode) {
                          navigator.clipboard.writeText(sqlCode);
                          setIsSqlCopied(true);
                          setTimeout(() => setIsSqlCopied(false), 3000);
                        }
                      }}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-md active:scale-95"
                    >
                      {isSqlCopied ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isSqlCopied ? 'SQL Copied!' : 'Copy SQL Script'}</span>
                    </button>

                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition-all border border-slate-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Open Supabase</span>
                    </a>
                  </div>
                </div>

                {/* Step Instructions */}
                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg space-y-2 text-[11px] text-slate-300">
                  <span className="font-bold text-white text-xs block">Execution Instructions:</span>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                    <li>Click <strong>Copy SQL Script</strong> above (or copy from the box below).</li>
                    <li>Go to your Supabase project dashboard and click <strong>SQL Editor</strong> on the left.</li>
                    <li>Click <strong>New Query</strong>, paste the script, and click <strong>Run</strong> (Ctrl+Enter).</li>
                    <li>Return here and click <strong>Check Connection</strong> — your tables will immediately turn active!</li>
                  </ol>
                </div>

                {/* SQL Preview Box */}
                {sqlCode && (
                  <div className="relative">
                    <pre className="font-mono text-[10px] leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800 text-cyan-300 max-h-48 overflow-y-auto whitespace-pre font-normal">
                      {sqlCode}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 border-t border-slate-800 p-3 px-5 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Signed in as: {currentUser?.name} ({currentUser?.role})</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
