import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { API_URL } from '../config';
import { 
  Activity, 
  ShieldCheck, 
  ShieldAlert,
  Calendar, 
  Clock,
  KeyRound,
  RotateCcw,
  Sparkles,
  Database,
  Download,
  Upload,
  AlertTriangle,
  Layers,
  Users,
  MapPin,
  Copy,
  ChevronDown,
  ChevronUp,
  FileClock,
  Wrench
} from 'lucide-react';

const Activation = () => {
  const { settings, setSettings, fetchSettings } = useSettings();
  const toast = useToast();
  const { confirm } = useConfirm();

  const [licenseKey, setLicenseKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Capacity Stats
  const [counts, setCounts] = useState({ users: 0, warehouses: 0, items: 0 });

  // Dev Key Generator State
  const [showDevTool, setShowDevTool] = useState(false);
  const [genTier, setGenTier] = useState('EN');
  const [genDuration, setGenDuration] = useState('1Y');
  const [genHolder, setGenHolder] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');

  // Database Backup & Restore state
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [backupFileContent, setBackupFileContent] = useState(null);

  // Load resource counts for capacity tracker
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const [usersRes, whsRes, itemsRes] = await Promise.all([
          axios.get(`${API_URL}/users`, config).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/warehouses`, config).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/inventory`, config).catch(() => ({ data: [] }))
        ]);

        setCounts({
          users: usersRes.data.length || 0,
          warehouses: whsRes.data.length || 0,
          items: itemsRes.data.length || 0
        });
      } catch (err) {
        console.error("Failed to load resource counts for metrics:", err);
      }
    };

    fetchCounts();
  }, [settings]);

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!licenseKey || licenseKey.trim().length < 10) {
      toast.error('Please enter a valid license key.');
      return;
    }

    setSubmitting(true);
    try {
      const token = sessionStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const res = await axios.post(`${API_URL}/settings/activation/activate`, {
        licenseKey: licenseKey.trim()
      }, config);

      if (!res.data.licenseKey) {
        toast.error("Outdated Backend Server: The backend is running old code. Please stop and restart your backend server terminal (npm run dev) to load the new updates!");
        setSubmitting(false);
        return;
      }

      toast.success('System activated successfully!');
      setSettings(res.data); // Update settings instantly in context
      setLicenseKey('');
      await fetchSettings(); // refresh global settings context
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Activation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    const isConfirmed = await confirm({
      title: 'Deactivate System License?',
      message: 'WARNING: Deactivating the license will block all standard operators (cashiers, managers) from logging into or using the terminal immediately. System capacity limits will fall back to basic evaluation limits. Are you sure you want to deactivate?',
      confirmText: 'Deactivate System',
      type: 'danger'
    });

    if (!isConfirmed) return;

    setSubmitting(true);
    try {
      const token = sessionStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      await axios.post(`${API_URL}/settings/activation/deactivate`, {}, config);

      toast.success('System license deactivated successfully.');
      setSettings(res.data); // Update settings instantly in context
      await fetchSettings();
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Deactivation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateKey = () => {
    try {
      const cleanHolder = (genHolder || 'PrasaTek Client')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .substring(0, 4) || 'EVAL';
      
      // Generate 4 random characters (hex style)
      const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase().padStart(4, 'F');
      
      const baseKey = `PT-${genTier}${genDuration}-${cleanHolder}-${randomHex}`;
      
      // Calculate DJB2 checksum
      let hash = 5381;
      const salt = 'PRASATEK_LICENSE_SECRET_KEY';
      const combined = baseKey + salt;
      for (let i = 0; i < combined.length; i++) {
        hash = ((hash << 5) + hash) + combined.charCodeAt(i);
      }
      const checksum = Math.abs(hash & 0xFFFFFFFF).toString(16).toUpperCase().padStart(4, '0').substring(0, 4);
      
      const licenseKeyVal = `${baseKey}-${checksum}`;
      setGeneratedKey(licenseKeyVal);
      toast.success('License Key generated client-side successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate license key.');
    }
  };

  const copyToClipboard = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    toast.success('License key copied to clipboard!');
  };

  const handleKeyChange = (e) => {
    let value = e.target.value.toUpperCase();
    let rawStr = value.replace(/[^A-Z0-9]/g, '');
    
    if (rawStr.startsWith('PT')) {
      rawStr = rawStr.substring(2);
    }
    
    let formatted = 'PT';
    if (rawStr.length > 0) {
      formatted += '-' + rawStr.substring(0, 4);
    }
    if (rawStr.length > 4) {
      formatted += '-' + rawStr.substring(4, 8);
    }
    if (rawStr.length > 8) {
      formatted += '-' + rawStr.substring(8, 12);
    }
    if (rawStr.length > 12) {
      formatted += '-' + rawStr.substring(12, 16);
    }
    
    setLicenseKey(formatted.substring(0, 22));
  };

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const response = await axios.get(`${API_URL}/settings/backup`, config);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(response.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      const shopName = settings?.companyName
        ? settings.companyName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
        : 'system';
      downloadAnchor.setAttribute("download", `prasatek.inv_${shopName}_backup.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success('Database backup generated and downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to generate database backup.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      toast.error("Invalid file format. Please upload a structured JSON file.");
      setSelectedFile(null);
      setBackupFileContent(null);
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonContent = JSON.parse(event.target.result);
        setBackupFileContent(jsonContent);
      } catch (err) {
        toast.error("Failed to parse JSON content. The backup file is corrupted.");
        setSelectedFile(null);
        setBackupFileContent(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreBackup = async () => {
    if (!backupFileContent) {
      toast.error("Please upload a valid backup JSON file first.");
      return;
    }

    const isConfirmed = await confirm({
      title: '🚨 DESTRUCTIVE ACTION: Restore Database?',
      message: 'WARNING: Restoring database is a system-wide destructive action. It will PERMANENTLY ERASE all existing catalog items, users, shifts, warehouses, customers, invoices, sales, and logs, replacing them with the backup data. You will be automatically logged out upon success. Are you sure you want to proceed?',
      confirmText: 'Yes, Overwrite & Restore',
      type: 'danger'
    });

    if (!isConfirmed) return;

    setRestoreLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      await axios.post(`${API_URL}/settings/restore`, {
        backupData: backupFileContent
      }, config);

      toast.success('Database restored successfully! Re-authenticating...');
      
      setTimeout(() => {
        sessionStorage.removeItem('token');
        window.location.href = '/login';
      }, 1500);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Database restore failed.');
    } finally {
      setRestoreLoading(false);
    }
  };

  // License Calculations
  const isExpired = (() => {
    if (settings?.activationStatus !== 'active') return true;
    if (settings?.activationExpiryDate) {
      const expiry = new Date(settings.activationExpiryDate);
      const now = new Date();
      return now > expiry;
    }
    return false;
  })();

  // Live Timer Countdown State & Loop
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (isExpired || !settings?.activationExpiryDate) return;

    const updateTimer = () => {
      const expiry = new Date(settings.activationExpiryDate);
      const now = new Date();
      const diffTime = expiry - now;

      if (diffTime <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffTime % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [settings?.activationExpiryDate, isExpired]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Mask license key for display
  const getMaskedKey = (key) => {
    if (!key) return 'PT-••••-••••-••••-••••';
    const segments = key.split('-');
    if (segments.length < 5) return key;
    return `${segments[0]}-${segments[1]}-••••-••••-${segments[4]}`;
  };

  // Capacity Limits defaults & calculations
  const maxItems = settings?.maxItems || 100;
  const maxUsers = settings?.maxUsers || 5;
  const maxWarehouses = settings?.maxWarehouses || 2;

  const itemPercentage = Math.min(100, Math.round((counts.items / maxItems) * 100));
  const userPercentage = Math.min(100, Math.round((counts.users / maxUsers) * 100));
  const warehousePercentage = Math.min(100, Math.round((counts.warehouses / maxWarehouses) * 100));

  const isDark = settings?.theme === 'dark';
  const isBlue = settings?.theme === 'blue';

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(226, 232, 240, 0.8);
        }
        .dark-theme .glass-card {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .blue-theme .glass-card {
          background: rgba(15, 32, 66, 0.65);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .neon-glow-active {
          box-shadow: 0 0 25px -5px rgba(16, 185, 129, 0.35);
        }
        .neon-glow-expired {
          box-shadow: 0 0 25px -5px rgba(239, 68, 68, 0.35);
        }
        .neon-glow-neutral {
          box-shadow: 0 0 25px -5px rgba(59, 130, 246, 0.25);
        }
        .card-metallic {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          position: relative;
          overflow: hidden;
        }
        .card-metallic::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
          pointer-events: none;
        }
      `}</style>

      {/* Header Panel */}
      <div className="glass-card p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white shadow-lg flex items-center justify-center">
            <Activity className="w-7 h-7 text-blue-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">System Activation Center</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Verify system validity, expand tier thresholds, and generate local database backups.</p>
          </div>
        </div>
        <button
          onClick={() => setShowDevTool(!showDevTool)}
          className={`px-4 py-2 text-xs font-black rounded-xl border flex items-center gap-2 transition-all ${
            showDevTool 
              ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-400' 
              : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          {showDevTool ? 'Close Dev Sandbox' : 'Open Developer Sandbox'}
        </button>
      </div>

      {/* Developer Key Generator Sandbox */}
      {showDevTool && (
        <div className="glass-card border-blue-200 dark:border-blue-900 bg-blue-50/20 dark:bg-blue-950/10 p-6 rounded-3xl shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-blue-900 dark:text-blue-400">Developer License Sandbox</h3>
              <p className="text-xs text-blue-600/80 dark:text-blue-400/80 font-medium">Generate cryptographically verifiable product activation keys to test license levels.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Target Plan Tier</label>
              <select
                value={genTier}
                onChange={(e) => setGenTier(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/5 cursor-pointer"
              >
                <option value="TR">Evaluation License (Trial)</option>
                <option value="PR">Professional Plan</option>
                <option value="EN">Ultimate Enterprise (Unlimited)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Term Duration</label>
              <select
                value={genDuration}
                onChange={(e) => setGenDuration(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/5 cursor-pointer"
              >
                <option value="01">1 Day</option>
                <option value="07">7 Days</option>
                <option value="30">30 Days (1 Month)</option>
                <option value="3M">3 Months</option>
                <option value="6M">6 Months</option>
                <option value="1Y">1 Year</option>
                <option value="3Y">3 Years</option>
                <option value="5Y">5 Years</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">License Holder Name</label>
              <input
                type="text"
                placeholder="e.g. Apex Corporation"
                value={genHolder}
                onChange={(e) => setGenHolder(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/5"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleGenerateKey}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate Activation Code
            </button>

            {generatedKey && (
              <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
                <code className="text-xs font-black text-blue-600 dark:text-blue-400 select-all flex-1 tracking-wider">{generatedKey}</code>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  title="Copy Key"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Card & Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Column 1: Premium License Visual Card */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          <div className={`card-metallic p-6 rounded-[2rem] shadow-xl text-white flex flex-col justify-between min-h-[260px] ${
            isExpired ? 'neon-glow-expired' : 'neon-glow-active'
          }`}>
            {/* Top Brand Block */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase leading-none">PrasaTek Systems</span>
                <h4 className="text-sm font-black tracking-tight mt-1">PRODUCT LICENSE PASSPORT</h4>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                isExpired 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {isExpired ? 'Inactive' : 'Active'}
              </div>
            </div>

            {/* Middle Key Block */}
            <div className="my-8">
              <span className="text-[9px] font-bold text-slate-400 tracking-wider">LICENSE KEY</span>
              <p className="text-lg font-mono font-black tracking-widest mt-1 select-all text-slate-200">
                {getMaskedKey(settings?.licenseKey)}
              </p>
            </div>

            {/* Bottom Metadata Block */}
            <div className="flex justify-between items-end">
              <div>
                <span className="text-[9px] text-slate-400 font-bold tracking-wider">HOLDER</span>
                <p className="text-xs font-black truncate max-w-[150px] tracking-tight">{settings?.licenseHolder || 'Evaluation Instance'}</p>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-400 font-bold tracking-wider">TIER TIER</span>
                <p className="text-xs font-black uppercase text-blue-400 tracking-wider">{settings?.licenseTier || 'Evaluation Defaults'}</p>
              </div>
            </div>
          </div>

          {/* Countdown Pill Card */}
          <div className={`glass-card p-6 rounded-3xl shadow-sm text-center ${
            isExpired ? 'border-rose-100 dark:border-rose-950/30' : 'border-emerald-100 dark:border-emerald-950/30'
          }`}>
            {!isExpired ? (
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">ACTIVE TIME REMAINING</span>
                <div className="flex justify-center items-center gap-1">
                  <div className="bg-slate-900/5 dark:bg-white/5 rounded-xl px-3 py-2 text-center min-w-[50px]">
                    <span className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none block">{countdown.days}</span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5 block">Days</span>
                  </div>
                  <span className="text-slate-400 font-black text-lg">:</span>
                  <div className="bg-slate-900/5 dark:bg-white/5 rounded-xl px-3 py-2 text-center min-w-[50px]">
                    <span className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none block">{String(countdown.hours).padStart(2, '0')}</span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5 block">Hrs</span>
                  </div>
                  <span className="text-slate-400 font-black text-lg">:</span>
                  <div className="bg-slate-900/5 dark:bg-white/5 rounded-xl px-3 py-2 text-center min-w-[50px]">
                    <span className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none block">{String(countdown.minutes).padStart(2, '0')}</span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5 block">Min</span>
                  </div>
                  <span className="text-slate-400 font-black text-lg">:</span>
                  <div className="bg-slate-900/5 dark:bg-white/5 rounded-xl px-3 py-2 text-center min-w-[50px]">
                    <span className="text-xl font-black text-slate-850 dark:text-slate-100 tracking-tight leading-none block">{String(countdown.seconds).padStart(2, '0')}</span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5 block">Sec</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold pt-1">
                  Expires on {formatDate(settings?.activationExpiryDate)}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">ACCESS TERMINATED</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold">
                  The evaluation period has expired. Standard operator account logs are locked. Enter a valid product license key to unlock system services.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Activation Panel & Metrics */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* Form Activation Card */}
          <div className="glass-card p-6 rounded-3xl shadow-sm flex-1 flex flex-col justify-between">
            <form onSubmit={handleActivate} className="flex-1 flex flex-col justify-between gap-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-1">License Activation</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-4">Input the genuine activation key received from your support manager.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Product License Key</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="PT-XXXX-XXXX-XXXX-XXXX"
                        maxLength="22"
                        value={licenseKey}
                        onChange={handleKeyChange}
                        disabled={submitting}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-black text-slate-800 dark:text-slate-200 tracking-widest focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all placeholder:tracking-normal placeholder:font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting || !licenseKey || licenseKey.length < 10}
                  className="w-full bg-slate-900 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-black py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4" /> Activate Product License
                </button>

                {!isExpired && (
                  <button
                    type="button"
                    onClick={handleDeactivate}
                    disabled={submitting}
                    className="w-full bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
                  >
                    <RotateCcw className="w-4 h-4" /> Deactivate Product License
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Plan Limits & Current Metrics */}
          <div className="glass-card p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" /> Plan Capacity Enforcements
            </h3>
            
            <div className="space-y-3">
              {/* Items Catalog Limit */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-350 mb-1">
                  <span>Inventory Catalog Size</span>
                  <span>{counts.items} / {maxItems === 999999 ? 'Unlimited' : `${maxItems} Items`}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      itemPercentage > 90 ? 'bg-rose-500' : itemPercentage > 70 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${itemPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Users Accounts Limit */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-350 mb-1">
                  <span>Operator User Accounts</span>
                  <span>{counts.users} / {maxUsers === 9999 ? 'Unlimited' : `${maxUsers} Users`}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      userPercentage > 90 ? 'bg-rose-500' : userPercentage > 70 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${userPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Warehouses Limit */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-350 mb-1">
                  <span>Location / Branch Warehouses</span>
                  <span>{counts.warehouses} / {maxWarehouses === 9999 ? 'Unlimited' : `${maxWarehouses} Locations`}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      warehousePercentage > 90 ? 'bg-rose-500' : warehousePercentage > 70 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${warehousePercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Activation History Log */}
      {settings?.activationHistory && settings.activationHistory.length > 0 && (
        <div className="glass-card p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500">
              <FileClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">License Lifecycle History</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Historical audit trail of keys activated on this server instance.</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3">License Key</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Activated On</th>
                  <th className="px-4 py-3">Expiration Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold text-slate-700 dark:text-slate-300">
                {settings.activationHistory.map((historyItem, idx) => {
                  const itemExpiry = new Date(historyItem.expiresAt);
                  const isHistoryExpired = new Date() > itemExpiry;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-mono">{getMaskedKey(historyItem.licenseKey)}</td>
                      <td className="px-4 py-3 uppercase tracking-wider text-[10px]">{historyItem.type}</td>
                      <td className="px-4 py-3">{historyItem.tier}</td>
                      <td className="px-4 py-3">{historyItem.duration}</td>
                      <td className="px-4 py-3 font-medium">{formatDate(historyItem.activatedAt)}</td>
                      <td className="px-4 py-3 font-medium">{formatDate(historyItem.expiresAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isHistoryExpired 
                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' 
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/40'
                        }`}>
                          {isHistoryExpired ? 'Expired' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Database Backup & Restore Card */}
      <div className="glass-card p-6 rounded-3xl shadow-sm space-y-6">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900 flex items-center justify-center flex-shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Database Backup & Restore</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Export system-wide tables or restore database state from a verified JSON backup.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          {/* Backup Panel */}
          <div className="space-y-4 pr-0 md:pr-4">
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tight flex items-center gap-2">
              <Download className="w-4 h-4 text-slate-450 dark:text-slate-500" /> Export System Data
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Generate a structured JSON snapshot containing all 12 collections—including users, settings, item catalog, stock entries, invoices, shifts, and audit logs. Perfect for cold storage, audit verification, and server migrations.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={backupLoading || restoreLoading}
                className="w-full md:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-550 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              >
                {backupLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating Snapshot...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Download JSON Backup
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Restore Panel */}
          <div className="space-y-4 pt-6 md:pt-0 pl-0 md:pl-8">
            <h4 className="text-sm font-black text-rose-600 dark:text-rose-450 tracking-tight flex items-center gap-2">
              <Upload className="w-4 h-4 text-rose-500" /> Restore System Data
            </h4>
            <div className="bg-rose-550/5 dark:bg-rose-950/10 border border-rose-100/70 dark:border-rose-900/40 rounded-xl p-3 flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-rose-950 dark:text-rose-200 font-medium leading-relaxed">
                <strong className="font-black">CRITICAL WARNING:</strong> Restoring data purges and overwrites the entire database. Original references are preserved via strict ID mapping. Ensure no active operations are running.
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700 rounded-xl p-4 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer bg-slate-50/50 dark:bg-slate-900/20">
                <input 
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  disabled={restoreLoading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-xs font-bold text-slate-650 dark:text-slate-350 group-hover:text-blue-600 transition-colors">
                  {selectedFile ? selectedFile.name : "Choose system backup JSON file"}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(2)} KB` : "Accepts enterprise JSON backup format"}
                </span>
              </div>

              {selectedFile && backupFileContent && (
                <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-250 dark:border-slate-800 rounded-xl p-3 text-xs space-y-1 font-medium text-slate-700 dark:text-slate-300">
                  <div className="text-slate-500 font-bold">Backup Verification:</div>
                  <div className="grid grid-cols-2 gap-y-1 text-slate-600 dark:text-slate-400">
                    <div>Format Version:</div>
                    <div className="font-black text-right text-slate-800 dark:text-slate-200">{backupFileContent.version || "Unknown"}</div>
                    <div>Created At:</div>
                    <div className="font-bold text-right text-slate-800 dark:text-slate-200">
                      {backupFileContent.timestamp ? new Date(backupFileContent.timestamp).toLocaleDateString() : "N/A"}
                    </div>
                    <div>User Accounts:</div>
                    <div className="font-black text-right text-slate-800 dark:text-slate-200">{backupFileContent.data?.User?.length || 0}</div>
                    <div>Catalog Items:</div>
                    <div className="font-black text-right text-slate-800 dark:text-slate-200">{backupFileContent.data?.Item?.length || 0}</div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleRestoreBackup}
                disabled={restoreLoading || backupLoading || !selectedFile}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-3 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
              >
                {restoreLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Purging & Restoring Tables...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" /> Execute System Restore
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Activation;
