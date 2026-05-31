import React from "react";
import { BookOpen, CheckCircle, Clock, Award, ShieldAlert, CheckSquare } from "lucide-react";

interface ObjectionHandbookProps {
  currentPhase: number;
  completedObjectives: {
    intro: boolean;
    profile: boolean;
    pitch: boolean;
    objection: boolean;
    close: boolean;
  };
}

export const ObjectionHandbook: React.FC<ObjectionHandbookProps> = ({
  currentPhase,
  completedObjectives,
}) => {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm sticky top-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-brand-orange animate-pulse" />
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Outbound Counselor Playbook</h2>
      </div>
      <p className="text-sm text-slate-500 mb-5 leading-relaxed">
        This is your textbook Vedantu playbook. Use this simulator to verify if the counselor successfully navigates all phases, handles objections matching these exact scripts, and books the slot.
      </p>

      {/* Checklist Grid */}
      <div className="space-y-4">
        {/* Phase 1 */}
        <div
          className={`p-3 rounded-xl border transition-all duration-300 ${
            currentPhase === 1
              ? "bg-brand-lightOrange border-brand-orange"
              : "bg-slate-50 border-slate-100"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-orange/10 text-brand-orange mb-1.5 inline-block">
              Phase 1
            </span>
            {completedObjectives.intro ? (
              <CheckSquare className="w-4 h-4 text-emerald-500 fill-emerald-50" />
            ) : (
              <Clock className="w-4 h-4 text-slate-300" />
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-700">The Warm Intro</h3>
          <p className="text-xs text-slate-500 mt-1 italic">
            "Namaste [Parent] ji! Main Vedantu se... Bas ek quick call kiya tha yeh janne ke liye ki [Child] ki padhai kaisi chal rahi hai?"
          </p>
        </div>

        {/* Phase 2 */}
        <div
          className={`p-3 rounded-xl border transition-all duration-300 ${
            currentPhase === 2
              ? "bg-teal-50 border-teal-500"
              : "bg-slate-50 border-slate-100"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 mb-1.5 inline-block">
              Phase 2
            </span>
            {completedObjectives.profile ? (
              <CheckSquare className="w-4 h-4 text-emerald-500 fill-emerald-50" />
            ) : (
              <Clock className="w-4 h-4 text-slate-300" />
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-700">Academic Profiling</h3>
          <p className="text-xs text-slate-500 mt-1">
            Once they respond regarding the studies, ask ONE profiling question:
            <span className="block mt-1 text-slate-600 italic">"Achha, abhi kaunsi class aur board me hain?"</span>
          </p>
        </div>

        {/* Phase 3 */}
        <div
          className={`p-3 rounded-xl border transition-all duration-300 ${
            currentPhase === 3
              ? "bg-amber-50 border-amber-500"
              : "bg-slate-50 border-slate-100"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 mb-1.5 inline-block">
              Phase 3
            </span>
            {completedObjectives.pitch ? (
              <CheckSquare className="w-4 h-4 text-emerald-500 fill-emerald-50" />
            ) : (
              <Clock className="w-4 h-4 text-slate-300" />
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-700">The Virtual Demo Pitch</h3>
          <p className="text-xs text-slate-500 mt-1 italic">
            "Dekhiye, isi padhai me aur help karne ke liye hum ek free 30-minute counseling session de rahe hain... kya hum kal sham 6 baje ka time fix karein?"
          </p>
        </div>

        {/* Phase 4 */}
        <div
          className={`p-3 rounded-xl border transition-all duration-300 ${
            currentPhase === 4
              ? "bg-indigo-50 border-indigo-500"
              : "bg-slate-50 border-slate-100"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 mb-1.5 inline-block">
              Phase 4
            </span>
            {completedObjectives.objection ? (
              <CheckSquare className="w-4 h-4 text-emerald-500 fill-emerald-50" />
            ) : (
              <Clock className="w-4 h-4 text-slate-300" />
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-700">The Bridge Technique</h3>
          <p className="text-xs text-slate-500 mt-1">
            Answer the parent's objection immediately + bridge/pivot back to pitch.
            <span className="block mt-1 font-mono text-[10px] text-slate-500 leading-tight">
              - Price? ➔ "Scholarships hain... kal 6 baje?"<br />
              - Teachers? ➔ "IITians hain... slot book karoon?"<br />
              - WhatsApp? ➔ "Zaroor bhejunga... kal 5 ya 6 baje?"
            </span>
          </p>
        </div>

        {/* Phase 5 */}
        <div
          className={`p-3 rounded-xl border transition-all duration-300 ${
            currentPhase === 5
              ? "bg-emerald-50 border-emerald-500"
              : "bg-slate-50 border-slate-100"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 mb-1.5 inline-block">
              Phase 5
            </span>
            {completedObjectives.close ? (
              <CheckSquare className="w-4 h-4 text-emerald-500 fill-emerald-50" />
            ) : (
              <Clock className="w-4 h-4 text-slate-300" />
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-700">Polite Booking Closing</h3>
          <p className="text-xs text-slate-500 mt-1 italic text-slate-700">
            "Great! Maine kal sham ka slot book kar diya hai. Aapko WhatsApp par link mil jayega. Thank you and have a great day!"
          </p>
        </div>
      </div>

      <div className="mt-5 p-3 rounded-xl bg-orange-50 border border-brand-orange/20 flex gap-2.5">
        <ShieldAlert className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
        <div className="text-[11px] text-brand-orange leading-snug">
          <strong>TTS/Voice Guidelines:</strong> The simulator uses advanced browser audio TTS with real-time word-by-word streaming animation when speaking his outbound pitch.
        </div>
      </div>
    </div>
  );
};
