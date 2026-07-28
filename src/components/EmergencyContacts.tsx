/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { 
  Phone, 
  ShieldAlert, 
  Flame, 
  HeartPulse, 
  Shield, 
  AlertTriangle, 
  PhoneCall,
  ArrowRight,
  Info
} from "lucide-react";

interface ContactCardProps {
  title: string;
  number: string;
  description: string;
  icon: React.ReactNode;
  bgGradient: string;
  borderColor: string;
}

const ContactCard: React.FC<ContactCardProps> = ({ 
  title, 
  number, 
  description, 
  icon,
  bgGradient,
  borderColor
}) => {
  return (
    <motion.a
      href={`tel:${number}`}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`block p-6 rounded-[32px] border-3 ${borderColor} bg-gradient-to-br ${bgGradient} shadow-[6px_6px_0px_#1A1F36] hover:shadow-[8px_8px_0px_#1A1F36] transition-all group relative overflow-hidden text-ink`}
    >
      {/* Decorative background circle */}
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/20 dark:bg-slate-900/20 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
      
      <div className="flex items-start justify-between">
        <div className="p-3 bg-white dark:bg-slate-900 border-2 border-ink rounded-2xl shadow-[2px_2px_0px_#1A1F36] text-ink flex-shrink-0">
          {icon}
        </div>
        <div className="sticker-badge sticker-badge-orange uppercase tracking-wider text-[10px] font-black px-2.5 py-0.5 shadow-sm border-2 border-ink">
          Tap to Call
        </div>
      </div>

      <div className="mt-6 space-y-1">
        <h4 className="text-lg font-black uppercase tracking-tight">{title}</h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-snug">{description}</p>
      </div>

      <div className="mt-6 flex items-center justify-between border-t-2 border-ink/10 pt-4">
        <span className="text-3xl font-black font-mono tracking-tighter text-ink flex items-center space-x-1">
          <PhoneCall className="h-6 w-6 text-[#FF8A4C] animate-pulse mr-1" />
          <span>{number}</span>
        </span>
        <div className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center border-2 border-ink group-hover:bg-[#FF8A4C] transition-colors">
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </motion.a>
  );
};

export const EmergencyContacts: React.FC = () => {
  const contacts = [
    {
      title: "National Emergency",
      number: "112",
      description: "All-in-one emergency helpline for police, fire, health, and disaster response.",
      icon: <ShieldAlert className="h-6 w-6 text-[#FF8A4C]" />,
      bgGradient: "from-[#FFF1EB] via-[#FFF8F5] to-[#FFF1EB]/40",
      borderColor: "border-[#FF8A4C]"
    },
    {
      title: "Police",
      number: "100",
      description: "Direct line for local law enforcement, safety assistance, and crime reporting.",
      icon: <Shield className="h-6 w-6 text-[#2D5BFF]" />,
      bgGradient: "from-[#EBF0FF] via-white to-[#EBF0FF]/30",
      borderColor: "border-[#2D5BFF]"
    },
    {
      title: "Fire Brigade",
      number: "101",
      description: "Emergency fire services, rescue operations, and hazardous material response.",
      icon: <Flame className="h-6 w-6 text-[#FF4C4C]" />,
      bgGradient: "from-[#FFEBEB] via-white to-[#FFEBEB]/30",
      borderColor: "border-[#FF4C4C]"
    },
    {
      title: "Ambulance",
      number: "108",
      description: "Direct medical emergencies, critical response trauma transport, and paramedic services.",
      icon: <HeartPulse className="h-6 w-6 text-[#34C77B]" />,
      bgGradient: "from-[#EBF9F2] via-white to-[#EBF9F2]/30",
      borderColor: "border-[#34C77B]"
    },
    {
      title: "Women's Helpline",
      number: "1091",
      description: "Dedicated national safety, counseling, and direct police response helpline for women.",
      icon: <Phone className="h-6 w-6 text-[#9A4CFF]" />,
      bgGradient: "from-[#F5EBFB] via-white to-[#F5EBFB]/30",
      borderColor: "border-[#9A4CFF]"
    },
    {
      title: "Disaster Management",
      number: "1078",
      description: "State disaster response, floods, structural issues, and extreme weather emergencies.",
      icon: <AlertTriangle className="h-6 w-6 text-[#FFC93C]" />,
      bgGradient: "from-[#FFFCEB] via-white to-[#FFFCEB]/30",
      borderColor: "border-[#FFC93C]"
    }
  ];

  return (
    <div className="space-y-8 py-6" id="emergency-contacts-container">
      {/* Safety Alert Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#FFF1EB] via-white to-[#FFF1EB]/50 border-3 border-[#FF8A4C] rounded-[32px] p-6 sm:p-8 shadow-[6px_6px_0px_#1A1F36] relative overflow-hidden"
        id="emergency-header-card"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF8A4C]/10 rounded-full blur-2xl pointer-events-none animate-pulse" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="sticker-badge sticker-badge-orange uppercase tracking-wider text-xs font-black inline-flex items-center space-x-1.5 shadow-sm border-2 border-ink">
              <ShieldAlert className="h-4 w-4 animate-bounce" style={{ animationDuration: '2s' }} />
              <span>Urgent Assistance</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight font-display leading-tight">
              In an emergency, call directly — don't wait to report it here.
            </h2>
            
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 leading-relaxed">
              CivicTrack is for reporting and tracking non-emergency civic issues like potholes, garbage, or broken streetlights. 
              For anything urgent or life-threatening, always call emergency services directly first.
            </p>
          </div>

          <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-3 border-ink rounded-[24px] p-4 text-center shadow-[4px_4px_0px_#1A1F36] max-w-[200px] w-full self-start md:self-auto">
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Call Routing</div>
            <div className="text-2xl font-mono font-black text-ink mt-1">112</div>
            <div className="text-[9px] font-bold text-[#FF8A4C] mt-1 uppercase tracking-wider animate-pulse">National Direct</div>
          </div>
        </div>
      </motion.div>

      {/* Info Notice Banner */}
      <div className="flex items-start space-x-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-ink shadow-[3px_3px_0px_#1A1F36]">
        <div className="p-2 bg-[#EBF0FF] text-[#2D5BFF] border border-ink rounded-xl">
          <Info className="h-4.5 w-4.5" />
        </div>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-relaxed">
          <strong>Note for Mobile Users:</strong> Tapping any contact card below will immediately open your phone's dialer application with the preset emergency speed code. For desktop users, please dial these numbers manually on your phone device.
        </p>
      </div>

      {/* Grid of Emergency Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="emergency-cards-grid">
        {contacts.map((contact, idx) => (
          <ContactCard key={idx} {...contact} />
        ))}
      </div>

      {/* FAQs / Guidelines Box */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] border-3 border-ink p-6 sm:p-8 shadow-[6px_6px_0px_#1A1F36] space-y-4">
        <h3 className="text-lg font-black uppercase tracking-wider text-ink">Emergency Response Best Practices</h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <li className="flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-[#EBF0FF] text-[#2D5BFF] border border-ink flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">1</span>
            <span><strong>Stay Calm & Clear:</strong> State your exact location, the nature of the emergency, and any immediate hazards clearly.</span>
          </li>
          <li className="flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-[#EBF0FF] text-[#2D5BFF] border border-ink flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">2</span>
            <span><strong>Do Not Hang Up:</strong> Stay on the line until the operator confirms they have all necessary dispatch details and tells you to hang up.</span>
          </li>
          <li className="flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-[#EBF0FF] text-[#2D5BFF] border border-ink flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">3</span>
            <span><strong>Provide Safe Access:</strong> If safe, wait for emergency responders at a visible entrance or street-level to guide them in quickly.</span>
          </li>
          <li className="flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-[#EBF0FF] text-[#2D5BFF] border border-ink flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">4</span>
            <span><strong>Use 112 as Fallback:</strong> If direct helplines like 100 or 101 are busy, dial 112 for priority national-level dispatch routing.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
