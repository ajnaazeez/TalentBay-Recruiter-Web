import React from 'react';
import { Outlet } from 'react-router-dom';
import { Users, Zap, ShieldCheck } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Cinematic Ambient Background Lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-left Cyan Glow */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        {/* Bottom-right Blue Glow */}
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl" />
        {/* Center Ambient Gradient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-tr from-cyan-950/20 via-transparent to-blue-950/20 rounded-full blur-3xl opacity-60" />
        {/* Subtle grid mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] opacity-20" />
      </div>

      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left Side: Brand Visual & Proposition matching TalentBay Recruiter identity */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between p-10 lg:p-12 bg-[#080e1a]/85 backdrop-blur-2xl text-white rounded-3xl shadow-2xl border border-cyan-500/15 min-h-[640px] relative overflow-hidden group">
          {/* Atmospheric Office Backdrop Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity pointer-events-none scale-105 transition-transform duration-1000 ease-out group-hover:scale-100"
            style={{ backgroundImage: "url('/auth_bg.jpg')" }}
          />
          {/* Subtle gradient overlay on top of background image */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#080e1a]/90 via-[#080e1a]/75 to-[#080e1a]/95 pointer-events-none" />

          {/* Ambient Curved Decorative Arc matching Reference */}
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-cyan-500/15 pointer-events-none" />
          <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full border border-cyan-500/10 pointer-events-none" />
          <div className="absolute top-1/3 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Section: Logo & Branding */}
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-10">
              <div className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 opacity-30 blur-sm"></div>
                <img
                  src="/recruiter.png"
                  alt="TalentBay Recruiter"
                  className="relative w-14 h-14 rounded-2xl object-contain bg-slate-950 p-1.5 border border-cyan-500/30 shadow-xl shadow-cyan-950/50"
                />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl font-black text-white tracking-tight">
                    Talent<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">Bay</span>
                  </span>
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider shadow-xs shadow-cyan-500/20">
                    Recruiter
                  </span>
                </div>
                <p className="text-xs text-cyan-400/90 font-semibold tracking-wide mt-1">
                  Better Talent. Brighter Future.
                </p>
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-5 leading-[1.2] text-white">
              Find the right people, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-300 to-cyan-100">
                build amazing teams.
              </span>
            </h2>

            <p className="text-slate-300/80 text-sm leading-relaxed max-w-md">
              Professional hiring workspace for talent acquisition leaders and recruitment teams. Connect with verified talent, evaluate skill fit, and manage applicants in real-time.
            </p>
          </div>

          {/* Bottom Feature Cards */}
          <div className="relative z-10 grid grid-cols-3 gap-3.5 pt-8 border-t border-slate-800/80">
            <div className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-cyan-500/30 transition duration-200">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 mb-2.5 shadow-sm shadow-cyan-500/10">
                <Users className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Quality Talent</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Verified candidates</p>
            </div>

            <div className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-cyan-500/30 transition duration-200">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 mb-2.5 shadow-sm shadow-cyan-500/10">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Faster Hiring</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Direct chat</p>
            </div>

            <div className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-cyan-500/30 transition duration-200">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 mb-2.5 shadow-sm shadow-cyan-500/10">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Trusted</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Secure workspace</p>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form Container */}
        <div className="lg:col-span-6 w-full max-w-lg mx-auto">
          <div className="bg-[#0b121e]/85 backdrop-blur-2xl py-8 px-6 sm:px-10 rounded-3xl shadow-2xl shadow-cyan-950/30 border border-cyan-500/20 text-white relative overflow-hidden">
            {/* Top right subtle ambient glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
