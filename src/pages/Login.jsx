import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  User, 
  Loader2, 
  ShieldCheck, 
  Cpu, 
  Database, 
  Server, 
  Eye, 
  EyeOff, 
  Shield, 
  TrendingUp, 
  Cloud, 
  AlertCircle 
} from 'lucide-react';
import logo from '../assets/logo.png';

// Background Accent Blobs
const BackgroundBlobs = React.memo(() => (
  <>
    <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px] animate-pulse"></div>
    <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-emerald-600/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
  </>
));
BackgroundBlobs.displayName = 'BackgroundBlobs';

const Login = () => {
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const pageRef = useRef(null);
  const cardRef = useRef(null);

  const handlePageMouseMove = useCallback((e) => {
    if (!pageRef.current) return;
    const rect = pageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    pageRef.current.style.setProperty('--mouse-page-x', `${x}px`);
    pageRef.current.style.setProperty('--mouse-page-y', `${y}px`);
  }, []);

  const handlePageMouseEnter = useCallback(() => {
    if (!pageRef.current) return;
    pageRef.current.style.setProperty('--mouse-page-opacity', '0.6');
  }, []);

  const handlePageMouseLeave = useCallback(() => {
    if (!pageRef.current) return;
    pageRef.current.style.setProperty('--mouse-page-opacity', '0');
  }, []);

  const handleCardMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  const handleCardMouseEnter = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty('--mouse-opacity', '1');
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty('--mouse-opacity', '0');
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const username = usernameRef.current?.value || '';
    const password = passwordRef.current?.value || '';
    
    const res = await login(username.trim(), password);
    setIsLoading(false);
    
    if (res.success) {
      navigate('/');
    } else {
      setError(res.error);
    }
  }, [login, navigate]);

  return (
    <div 
      ref={pageRef}
      onMouseMove={handlePageMouseMove}
      onMouseEnter={handlePageMouseEnter}
      onMouseLeave={handlePageMouseLeave}
      className="min-h-screen flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden px-4 py-8 font-sans"
    >
      <BackgroundBlobs />
      
      {/* Page-level ambient spotlight */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 mix-blend-screen"
        style={{
          opacity: 'var(--mouse-page-opacity, 0)',
          background: 'radial-gradient(800px circle at var(--mouse-page-x, 0px) var(--mouse-page-y, 0px), rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 50%, transparent 100%)'
        }}
      />
      
      <div className="w-full max-w-4xl relative z-10 flex flex-col items-center gap-6">
        
        {/* Main Card with Neon Spotlight Border */}
        <div 
          ref={cardRef}
          onMouseMove={handleCardMouseMove}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          className="w-full relative p-[1.5px] rounded-[24px] transition-all duration-300 group"
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)',
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.05), 0 0 40px rgba(16, 185, 129, 0.03)'
          }}
        >
          {/* Border spotlight glow layer */}
          <div 
            className="absolute inset-0 rounded-[24px] pointer-events-none transition-opacity duration-300"
            style={{
              opacity: 'var(--mouse-opacity, 0)',
              background: 'radial-gradient(350px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(16, 185, 129, 0.5) 0%, rgba(59, 130, 246, 0.5) 50%, transparent 100%)',
            }}
          />

          {/* Ambient card back-glow */}
          <div 
            className="absolute -inset-10 rounded-[40px] pointer-events-none transition-opacity duration-300 filter blur-2xl opacity-0 group-hover:opacity-100"
            style={{
              background: 'radial-gradient(400px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.12) 50%, transparent 100%)',
            }}
          />

          {/* Main Split container card */}
          <div className="w-full bg-[#080c16]/98 backdrop-blur-2xl rounded-[23px] overflow-hidden flex flex-col md:flex-row relative z-10">
            {/* Inner soft spotlight overlay */}
            <div 
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
              style={{
                opacity: 'var(--mouse-opacity, 0)',
                background: 'radial-gradient(600px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(16, 185, 129, 0.04) 0%, rgba(59, 130, 246, 0.04) 50%, transparent 100%)',
              }}
            />
          
          {/* Left panel: Logo, Tagline, Brand features */}
          <div className="w-full md:w-[350px] bg-slate-950/40 p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-900/60 flex-shrink-0">
            
            {/* Logo area */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-slate-950 border border-slate-900 text-white shadow-xl mb-5 transform hover:scale-105 transition-all">
                <img src={logo} className="w-14 h-14 object-contain" alt="Logo" loading="eager" />
              </div>
              
              <h2 className="text-2xl font-black text-white tracking-tight">PrasaTek</h2>
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.25em] mt-1.5">Inventory System</p>
              
              <div className="h-[2px] w-16 mx-auto my-6 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"></div>
              
              <p className="text-xs text-slate-400 font-semibold leading-relaxed px-2">
                Advanced Inventory Management<br />
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black block mt-1">Made Simple & Secure</span>
              </p>
            </div>

            {/* Feature lists */}
            <div className="space-y-6 my-10 md:my-0 text-left">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-200">Enterprise Security</h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5 leading-snug">End-to-end encrypted data protection</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-200">Real-time Analytics</h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5 leading-snug">Live inventory tracking and insights</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <Cloud className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-200">Cloud Optimized</h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5 leading-snug">High performance cloud infrastructure</p>
                </div>
              </div>
            </div>

            {/* Pulse Indicator */}
            <div className="flex items-center gap-3 mt-6 md:mt-0 justify-center md:justify-start">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </div>
              <div className="text-left">
                <span className="block text-[9px] font-black text-emerald-400 uppercase tracking-widest">System Online</span>
                <span className="block text-[8px] font-bold text-slate-500 uppercase mt-0.5">All systems operational</span>
              </div>
            </div>

          </div>

          {/* Right panel: Login credentials form */}
          <div className="flex-1 p-8 md:p-12 flex flex-col justify-center text-left">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Welcome Back</h1>
              <p className="text-xs text-slate-400 font-medium mt-1">Sign in to access your inventory dashboard</p>
              
              <div className="h-[2px] w-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full mt-4"></div>
            </div>

            <div className="mt-8">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-2xl mb-6 text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-6">
                
                {/* Username */}
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Operator Username</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                    <input
                      type="text"
                      name="username"
                      ref={usernameRef}
                      autoComplete="username"
                      className="block w-full pl-12 pr-4 py-3.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 placeholder:text-slate-650 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                      placeholder="Enter your username"
                      required
                    />
                  </div>
                </div>

                {/* Password / Access Key */}
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Access Key</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      ref={passwordRef}
                      autoComplete="current-password"
                      className="block w-full pl-12 pr-12 py-3.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 placeholder:text-slate-650 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
                      placeholder="Enter your access key"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-400 hover:to-blue-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.2em] cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        <span>Validating Access...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4.5 h-4.5" />
                        <span>Authorize Session</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Secure By Design separator */}
              <div className="relative flex py-6 items-center">
                <div className="flex-grow border-t border-slate-900/60"></div>
                <span className="flex-shrink mx-4 text-[8px] font-black text-slate-500 uppercase tracking-[0.25em]">Secure By Design</span>
                <div className="flex-grow border-t border-slate-900/60"></div>
              </div>

              {/* Footer Metrics Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-950/30 border border-slate-900/30 rounded-xl flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div className="text-[8px] leading-tight text-left">
                    <span className="block font-black text-slate-300 uppercase">Encrypted</span>
                    <span className="block font-bold text-slate-500 uppercase mt-0.5">256-bit SSL</span>
                  </div>
                </div>
                
                <div className="p-3 bg-slate-950/30 border border-slate-900/30 rounded-xl flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="text-[8px] leading-tight text-left">
                    <span className="block font-black text-slate-300 uppercase">System Login</span>
                    <span className="block font-bold text-slate-500 uppercase mt-0.5">Secure Auth</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/30 border border-slate-900/30 rounded-xl flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <div className="text-[8px] leading-tight text-left">
                    <span className="block font-black text-slate-300 uppercase">Optimized</span>
                    <span className="block font-bold text-slate-500 uppercase mt-0.5">High Perf</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

        {/* Small Bottom Signature */}
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">
          Core Secure v4.2.1 • PrasaTek System Solutions
        </p>

      </div>
    </div>
  );
};

export default Login;
