import { Maximize2, Users, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

function todayKey() {
  return `clinic_serials_${new Date().toISOString().slice(0, 10)}`;
}

interface SerialEntry {
  id: string;
  serial: number;
  patientName: string;
  phone: string;
  arrivalTime: string;
  status: "waiting" | "in-progress" | "done";
}

export default function SerialDisplay() {
  const [serials, setSerials] = useState<SerialEntry[]>([]);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const prevNowServingRef = useRef<string | null>(null);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(todayKey());
        const data: SerialEntry[] = raw ? JSON.parse(raw) : [];
        setSerials(data);
      } catch {
        setSerials([]);
      }
    };

    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, []);

  const nowServing = serials.find((s) => s.status === "in-progress") ?? null;
  const waiting = serials.filter((s) => s.status === "waiting");

  // Announce when now-serving changes
  useEffect(() => {
    const name = nowServing?.patientName ?? null;
    if (name && name !== prevNowServingRef.current && speechEnabled) {
      const serial = nowServing?.serial;
      const utterance = new SpeechSynthesisUtterance(
        `Now serving: ${name}, serial number ${serial}. Please proceed to the consultation room.`,
      );
      utterance.rate = 0.85;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
    prevNowServingRef.current = name;
  }, [nowServing, speechEnabled]);

  const handleFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const currentTime = new Date().toLocaleTimeString("en-BD", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const currentDate = new Date().toLocaleDateString("en-BD", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-gray-900/80 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">
            Dr. Arman Kabir&apos;s Care
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Patient Queue Display</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-white tabular-nums">
            {currentTime}
          </p>
          <p className="text-gray-400 text-sm">{currentDate}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSpeechEnabled((v) => !v)}
            className="p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
            title={
              speechEnabled ? "Mute announcements" : "Enable announcements"
            }
          >
            {speechEnabled ? (
              <Volume2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <button
            type="button"
            onClick={handleFullscreen}
            className="p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-8">
        {/* Now serving */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {nowServing ? (
              <motion.div
                key={nowServing.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <p className="text-gray-400 text-lg uppercase tracking-[0.3em] mb-4">
                  Now Serving
                </p>
                <div className="w-32 h-32 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/30">
                  <span className="text-5xl font-black text-white">
                    {nowServing.serial}
                  </span>
                </div>
                <h2 className="text-5xl font-bold text-white mb-3">
                  {nowServing.patientName}
                </h2>
                <p className="text-gray-400 text-xl">
                  Serial #{nowServing.serial}
                </p>
                {speechEnabled && (
                  <div className="mt-6 flex items-center gap-2 text-emerald-400 text-sm">
                    <Volume2 className="w-4 h-4 animate-pulse" />
                    Announcement active
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-16 h-16 text-gray-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-500">
                  No patient currently being served
                </h2>
                <p className="text-gray-600 mt-2">
                  Waiting for the doctor to call next patient
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Next patient indicator */}
          {waiting.length > 0 && (
            <div className="mt-8 px-8 py-4 bg-gray-900 rounded-2xl border border-gray-800 text-center">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">
                Next
              </p>
              <p className="text-2xl font-bold text-amber-400">
                #{waiting[0].serial} — {waiting[0].patientName}
              </p>
            </div>
          )}
        </div>

        {/* Waiting queue */}
        <div className="lg:w-80 flex flex-col">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 flex-1 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-gray-200">Waiting Queue</h3>
              <span className="bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {waiting.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {waiting.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-8">
                  No patients waiting
                </p>
              ) : (
                <AnimatePresence>
                  {waiting.map((s, idx) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                        <span className="font-bold text-white text-sm">
                          {s.serial}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          {s.patientName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Arrived: {s.arrivalTime}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Done count */}
          <div className="mt-3 bg-gray-900 rounded-xl border border-gray-800 px-5 py-3 flex items-center justify-between">
            <span className="text-gray-400 text-sm">Completed today</span>
            <span className="text-lg font-bold text-gray-300">
              {serials.filter((s) => s.status === "done").length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
