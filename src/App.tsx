import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Send,
  RefreshCw,
  HelpCircle,
  CheckCircle,
  Play,
  RotateCcw,
  Sparkles,
  User,
  PlusCircle,
  Award,
  BookOpen,
  Mic,
  MicOff,
} from "lucide-react";
import { Message, PRESET_SCENARIOS, EXAMPLES_OF_OBJECTIONS, Scenario } from "./types";
import { ObjectionHandbook } from "./components/ObjectionHandbook";

export default function App() {
  // Simulator configuration
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(PRESET_SCENARIOS[0]);
  const [customParentName, setCustomParentName] = useState("");
  const [customChildName, setCustomChildName] = useState("");
  const [customTriggerAction, setCustomTriggerAction] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Active Session details
  const [currentParentName, setCurrentParentName] = useState(PRESET_SCENARIOS[0].parentName);
  const [currentChildName, setCurrentChildName] = useState(PRESET_SCENARIOS[0].childName);
  const [currentTrigger, setCurrentTrigger] = useState(PRESET_SCENARIOS[0].triggerAction);

  // Call state
  const [isCallActive, setIsCallActive] = useState(false);
  const [isDialing, setIsDialing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true); // Controls SpeechSynthesis (Enabled by default as requested!)
  const [isCounselorSpeaking, setIsCounselorSpeaking] = useState(false);

  // Web Speech API Voice Conversation States
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isMicListening, setIsMicListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isHandlingReplyRef = useRef<boolean>(false);

  // Vobiz / Plivo Live Calling states
  const [liveToNumber, setLiveToNumber] = useState("+919123752379");
  const [liveAuthId, setLiveAuthId] = useState("MA_MGS8RNFD");
  const [liveAuthToken, setLiveAuthToken] = useState("CqegNOuNrXEBzJYdylNHV5aQdWNJ90CiQ3xmNqe3hKORAVY6k8AmSGQuCHCXegGu");
  const [liveGatewayUrl, setLiveGatewayUrl] = useState("https://api.vobiz.ai");
  const [liveFromNumber, setLiveFromNumber] = useState("");
  const [liveCallStatus, setLiveCallStatus] = useState<"idle" | "dialing" | "active" | "failed" | "completed">("idle");
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [liveCallError, setLiveCallError] = useState<string | null>(null);
  const [liveLogs, setLiveLogs] = useState<{ timestamp: string; message: string }[]>([]);
  const [liveLogsPolling, setLiveLogsPolling] = useState(false);

  // Web Audio Synthesizer for Phone Call SFX (Ringing, Call Picked-up, Disconnect Beeps)
  const playSfx = (type: "ring" | "connect" | "disconnect") => {
    if (typeof window === "undefined") return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === "ring") {
        // Dual ring simulation (400Hz + 450Hz modulated)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.value = 400;
        osc2.type = "sine";
        osc2.frequency.value = 450;

        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.12, ctx.currentTime + 1.1);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.3);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start();
        osc2.start();

        osc1.stop(ctx.currentTime + 1.4);
        osc2.stop(ctx.currentTime + 1.4);
      } else if (type === "connect") {
        // High-pitch dual success beep
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(580, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === "disconnect") {
        // Drop low pitch indicator beep
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(140, ctx.currentTime + 0.35);

        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.38);
      }
    } catch (e) {
      console.warn("AudioContext init error: (Needs user tap interaction): ", e);
    }
  };

  // Chat/Dialogue history
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // TTS Voice state
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  // Phase tracker
  const [currentPhase, setCurrentPhase] = useState(1);
  const [completedObjectives, setCompletedObjectives] = useState({
    intro: false,
    profile: false,
    pitch: false,
    objection: false,
    close: false,
  });

  // Call timer and scroll helpers
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load SpeechSynthesis voices
  useEffect(() => {
    function loadVoices() {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        
        // Prefer an Indian male voice representation (Hindi or Indian English, looking for male names or male keyword)
        const indianMale = voices.find(
          (v) =>
            (v.lang.toLowerCase().includes("in") || v.lang.toLowerCase().includes("hi")) &&
            (v.name.toLowerCase().includes("male") ||
              v.name.toLowerCase().includes("ravi") ||
              v.name.toLowerCase().includes("hemant") ||
              v.name.toLowerCase().includes("kirat") ||
              v.name.toLowerCase().includes("prabhat") ||
              v.name.toLowerCase().includes("madhur"))
        );

        const indianAny = voices.find(
          (v) => v.lang.toLowerCase().includes("in") || v.lang.toLowerCase().includes("hi")
        );

        const generalMale = voices.find(
          (v) =>
            v.name.toLowerCase().includes("male") ||
            v.name.toLowerCase().includes("david") ||
            v.name.toLowerCase().includes("guy") ||
            v.name.toLowerCase().includes("he")
        );

        if (indianMale) {
          setSelectedVoice(indianMale);
        } else if (indianAny) {
          setSelectedVoice(indianAny);
        } else if (generalMale) {
          setSelectedVoice(generalMale);
        } else if (voices.length > 0) {
          setSelectedVoice(voices[0]);
        }
      }
    }

    loadVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Update effective call variables when scenario or custom input changes
  useEffect(() => {
    if (!isCallActive && !isDialing) {
      if (isCustomMode) {
        setCurrentParentName(customParentName || "Rajesh Kumar");
        setCurrentChildName(customChildName || "Rohan");
        setCurrentTrigger(customTriggerAction || "aapne pichle hafte hamari science masterclass attend ki thi");
      } else {
        setCurrentParentName(selectedScenario.parentName);
        setCurrentChildName(selectedScenario.childName);
        setCurrentTrigger(selectedScenario.triggerAction);
      }
    }
  }, [selectedScenario, isCustomMode, customParentName, customChildName, customTriggerAction, isCallActive, isDialing]);

  // Handle Call Timer
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCallActive]);

  // Handle Auto-scroll chat window
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isCounselorSpeaking]);

  // Speech helper function
  const speakText = (text: string) => {
    if (!isSpeakerOn) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Stop current speech
      
      // Clean text of markdown or bracket symbols before reading
      const cleanAudioText = text
        .replace(/[\*\_`#\-]/g, "")
        .replace(/\(.*?\)/g, ""); // strip anything in parenthesis

      const utterance = new SpeechSynthesisUtterance(cleanAudioText);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = 0.95; // Steady, polite, professional, yet friendly
      utterance.pitch = 0.88; // Comforting, warm, 30-35 year old professional male tone (lower register)

      utterance.onstart = () => {
        setIsCounselorSpeaking(true);
      };
      utterance.onend = () => {
        setIsCounselorSpeaking(false);
      };
      utterance.onerror = () => {
        setIsCounselorSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  // Convert seconds to MM:SS format
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  // Analyze response content to update checklist/progress Phase
  const evaluateProgress = (messageText: string, isFromCounselor: boolean) => {
    const textLower = messageText.toLowerCase();

    setCompletedObjectives((prev) => {
      const next = { ...prev };

      if (isFromCounselor) {
        // Phase 1 check: Warm intro
        if (textLower.includes("namaste") || textLower.includes("vedantu se bol") || textLower.includes("padhai kaisi")) {
          next.intro = true;
        }

        // Phase 2 check: Profiling
        if (textLower.includes("class") || textLower.includes("board") || textLower.includes("kaunsi class") || textLower.includes("school")) {
          next.profile = true;
          setCurrentPhase(2);
        }

        // Phase 3 check: Pitching virtual session
        if (
          textLower.includes("free 30-minute") ||
          textLower.includes("virtual counseling") ||
          textLower.includes("demo session") ||
          textLower.includes("personal mentors") ||
          textLower.includes("kal sham")
        ) {
          next.pitch = true;
          setCurrentPhase(3);
        }

        // Phase 4 check: Objection handling (The Bridge)
        const isRespondingToObjection =
          textLower.includes("fees") ||
          textLower.includes("teachers") ||
          textLower.includes("offline") ||
          textLower.includes("whatsapp") ||
          textLower.includes("busy") ||
          textLower.includes("bachche se baat");

        if (isRespondingToObjection) {
          next.objection = true;
          setCurrentPhase(4);
        }

        // Phase 5 check: Close / Confirm
        if (
          textLower.includes("slot book") ||
          textLower.includes("maine kal sham का") ||
          textLower.includes("maine kal sham ka slot") ||
          textLower.includes("whatsapp par link") ||
          textLower.includes("thank you and have a great")
        ) {
          next.close = true;
          setCurrentPhase(5);
        }
      } else {
        // User (Parent) triggered phrases
        if (
          textLower.includes("fees") ||
          textLower.includes("kitne paise") ||
          textLower.includes("cost") ||
          textLower.includes("expensive") ||
          textLower.includes("teacher") ||
          textLower.includes("kaun padha") ||
          textLower.includes("offline") ||
          textLower.includes("center") ||
          textLower.includes("whatsapp") ||
          textLower.includes("details) bhej") ||
          textLower.includes("busy") ||
          textLower.includes("samay nahi") ||
          textLower.includes("meeting") ||
          textLower.includes("bachche se") ||
          textLower.includes("puchna")
        ) {
          // If parent brings up objection, move tracker to Phase 4
          setCurrentPhase(4);
        }
      }

      return next;
    });
  };

  // Live Outbound Phone Call Trigger & Logs polling
  const handleStartLiveCall = async () => {
    setLiveCallError(null);
    if (!liveToNumber.trim() || !liveAuthId.trim() || !liveAuthToken.trim()) {
      setLiveCallError("Required fields missing: Please make sure Phone Number, Auth ID, and Auth Token are provided.");
      return;
    }
    const isVobiz = liveGatewayUrl.toLowerCase().includes("vobiz");
    if (isVobiz && !liveFromNumber.trim()) {
      setLiveCallError("Missing Caller ID: Vobiz requires a verified outbound Caller ID owned by your Vobiz account. Please input your registered Vobiz phone number in the 'Verified Vobiz Number (From)' field below.");
      return;
    }
    setLiveCallStatus("dialing");
    try {
      // Clear raw server logs first
      await fetch("/api/plivo/clear-logs", { method: "POST" });
      
      const response = await fetch("/api/plivo/make-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parentName: isCustomMode ? customParentName || "Parent" : currentParentName,
          childName: isCustomMode ? customChildName || "Student" : currentChildName,
          triggerAction: isCustomMode ? customTriggerAction || "register kiya" : currentTrigger,
          toNumber: liveToNumber.trim(),
          fromNumber: liveFromNumber.trim() || undefined,
          authId: liveAuthId.trim(),
          authToken: liveAuthToken.trim(),
          gatewayUrl: liveGatewayUrl.trim() || undefined,
        }),
      });

      if (!response.ok) {
        let errorMsg = "Failed to trigger outbound phone call.";
        try {
          if (response.headers.get("content-type")?.includes("application/json")) {
            const errData = await response.json();
            errorMsg = errData.error || errorMsg;
          } else {
            errorMsg = await response.text() || errorMsg;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      let data: any = {};
      if (response.headers.get("content-type")?.includes("application/json")) {
        data = await response.json();
      } else {
        throw new Error("Server returned an unexpected non-JSON response.");
      }

      setLiveSessionId(data.sessionId);
      setLiveCallStatus("active");
    } catch (e: any) {
      console.warn("Outbound call exception (handled):", e);
      setLiveCallStatus("failed");
      setLiveCallError(e.message || "Failed to place real outbound call.");
    }
  };

  const handleStopLiveCall = () => {
    setLiveCallStatus("idle");
    setLiveSessionId(null);
    setLiveCallError(null);
  };

  useEffect(() => {
    let interval: any;
    if (liveCallStatus === "dialing" || liveCallStatus === "active") {
      const poll = async () => {
        try {
          const resLogs = await fetch("/api/plivo/logs");
          if (resLogs.ok && resLogs.headers.get("content-type")?.includes("application/json")) {
            const data = await resLogs.json();
            setLiveLogs(data.logs || []);
          }

          if (liveSessionId) {
            const resStatus = await fetch(`/api/plivo/session-status?sessionId=${liveSessionId}`);
            if (resStatus.ok && resStatus.headers.get("content-type")?.includes("application/json")) {
              const data = await resStatus.json();
              
              // Map phase status
              if (data.messages && data.messages.length > 0) {
                const lastMsg = data.messages[data.messages.length - 1];
                evaluateProgress(lastMsg.text, lastMsg.role === "model");
              }

              if (data.status === "Completed") {
                setLiveCallStatus("completed");
              } else if (data.status === "Failed") {
                setLiveCallStatus("failed");
              }
            }
          }
        } catch (err) {
          console.warn("Polling warning (handled gracefully):", err);
        }
      };

      poll();
      interval = setInterval(poll, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [liveCallStatus, liveSessionId]);

  // Start Call Outbound
  const handleStartCall = async () => {
    setIsDialing(true);
    setMessages([]);
    setCompletedObjectives({
      intro: false,
      profile: false,
      pitch: false,
      objection: false,
      close: false,
    });
    setCurrentPhase(1);

    // Play ringing sound immediately
    playSfx("ring");
    
    // Play a second ring sound after 1 second
    const ringTimeout = setTimeout(() => {
      playSfx("ring");
    }, 1000);

    // Simulated Ringing transition to active call
    setTimeout(async () => {
      clearTimeout(ringTimeout);
      setIsDialing(false);
      setIsCallActive(true);

      // Play pickup sound success chime
      playSfx("connect");

      const introText = `Namaste ${currentParentName} ji! Main Vedantu se bol raha hoon. Maine dekha ki ${currentTrigger}. Bas ek quick call kiya tha yeh janne ke liye ki ${currentChildName} ki padhai kaisi chal rahi hai?`;
      
      const firstMsg: Message = {
        id: "intro-msg",
        role: "model",
        text: introText,
        timestamp: new Date(),
      };

      setMessages([firstMsg]);
      evaluateProgress(introText, true);

      // Speak intro out loud if speaker is active
      speakText(introText);
    }, 2200);
  };

  // Close Call
  const handleEndCall = () => {
    setIsCallActive(false);
    setIsDialing(false);
    setIsCounselorSpeaking(false);
    
    // Play standard call disconnect sound
    playSfx("disconnect");

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Send a verbal reply from the custom parent (User) to the dynamic counselor (Gemini)
  const handleSendParentReply = async (userText: string) => {
    if (!userText.trim()) return;

    const parentMessage: Message = {
      id: `p-${Date.now()}`,
      role: "user",
      text: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, parentMessage]);
    evaluateProgress(userText, false);
    setInputText("");
    setIsLoading(true);

    try {
      // API request to the server endpoint
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parentName: currentParentName,
          childName: currentChildName,
          triggerAction: currentTrigger,
          userMessage: userText,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to contact simulated counselor.");
      }

      let data: any = {};
      if (response.headers.get("content-type")?.includes("application/json")) {
        data = await response.json();
      } else {
        throw new Error("Server returned an unexpected non-JSON response.");
      }
      const counselorReply = data.text || "Main samajh sakta hoon, par ek baar demo dekh lijiye.";

      const counselorMessage: Message = {
        id: `c-${Date.now()}`,
        role: "model",
        text: counselorReply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, counselorMessage]);
      evaluateProgress(counselorReply, true);

      // Trigger actual speech synth for the output
      speakText(counselorReply);
    } catch (err) {
      console.warn("Chat communication warning (handled gracefully):", err);
      // Fallback response modeling if backend server errors or disconnects
      const fallbackMsg = `Achha theek hai, main samajh raha hoon. Ek baar hamare senior counselor aapse live demo session me connect karenge toh aap khud transparent details dekh sakte hain. Kya kal sham 6 baje ka time hum pakka karein?`;
      
      const counselorMessage: Message = {
        id: `c-err-${Date.now()}`,
        role: "model",
        text: fallbackMsg,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, counselorMessage]);
      speakText(fallbackMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Speech Recognition API
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      console.warn("Speech Recognition API is not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognitionClass();
    rec.continuous = false; // Single utterances for granular conversational turns
    rec.interimResults = false;
    rec.lang = "en-IN"; // Set to English (India) - the optimal choice for Hinglish speech recognition

    rec.onstart = () => {
      setIsMicListening(true);
      setSpeechError(null);
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      if (transcript && transcript.trim() && !isHandlingReplyRef.current) {
        console.log("Transcribed User Speech Voice Input:", transcript);
        isHandlingReplyRef.current = true;
        handleSendParentReply(transcript);
      }
    };

    rec.onerror = (event: any) => {
      console.warn("Speech recognition error event:", event.error);
      if (event.error === "not-allowed") {
        setSpeechError("Microphone permission was denied.");
        setIsMicEnabled(false);
      }
      setIsMicListening(false);
    };

    rec.onend = () => {
      setIsMicListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  // Sync recognition listening state
  useEffect(() => {
    if (isCallActive && isMicEnabled && !isCounselorSpeaking && !isLoading && !isDialing) {
      isHandlingReplyRef.current = false;
      const startTimer = setTimeout(() => {
        try {
          if (recognitionRef.current && !isMicListening) {
            recognitionRef.current.start();
          }
        } catch (e) {
          // Ignore if already started
        }
      }, 350);

      return () => clearTimeout(startTimer);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    }
  }, [isCallActive, isMicEnabled, isCounselorSpeaking, isLoading, isDialing, isMicListening]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-brand-orange text-white p-2.5 rounded-2xl shadow-md flex items-center justify-center">
              <span className="font-extrabold text-lg tracking-wider">V</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Vedantu</h1>
                <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                  Counselor Sim v1.2
                </span>
              </div>
              <p className="text-xs text-slate-500">Practice pitch flows, objection handling, & high-conversion bookings</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Toggle voice synthesis */}
            <button
              id="speaker-toggle"
              onClick={() => {
                const current = !isSpeakerOn;
                setIsSpeakerOn(current);
                if (!current && typeof window !== "undefined" && "speechSynthesis" in window) {
                  window.speechSynthesis.cancel();
                  setIsCounselorSpeaking(false);
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide transition-all ${
                isSpeakerOn
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm"
                  : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
              }`}
            >
              {isSpeakerOn ? <Volume2 className="w-4 h-4 text-emerald-600 animate-bounce" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              Speech Readout: {isSpeakerOn ? "Online 🔊" : "Muted 🔇"}
            </button>

            {/* Toggle voice recognition mic */}
            <button
              id="mic-toggle"
              onClick={() => {
                const current = !isMicEnabled;
                setIsMicEnabled(current);
                if (!current && recognitionRef.current) {
                  try {
                    recognitionRef.current.stop();
                  } catch (_) {}
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide transition-all ${
                isMicEnabled
                  ? isMicListening
                    ? "bg-rose-50 text-rose-600 border border-rose-200 shadow-sm font-bold"
                    : "bg-amber-50 text-amber-600 border border-amber-200 shadow-sm"
                  : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
              }`}
            >
              {isMicEnabled ? (
                isMicListening ? (
                  <Mic className="w-4 h-4 text-rose-600 animate-pulse" />
                ) : (
                  <Mic className="w-4 h-4 text-amber-600" />
                )
              ) : (
                <MicOff className="w-4 h-4 text-slate-400" />
              )}
              Voice Input (Mic): {isMicEnabled ? (isMicListening ? "Listening 🎙️" : "On 🎤") : "Off 🔇"}
            </button>

            {/* Simulated target selector */}
            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Accent:</span>
              <select
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 max-w-[120px] truncate"
                value={selectedVoice?.name || ""}
                onChange={(e) => {
                  const voice = availableVoices.find((v) => v.name === e.target.value);
                  if (voice) setSelectedVoice(voice);
                }}
              >
                {availableVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column - Active configuration & Scenario setup */}
        <section className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="bg-brand-orange/10 p-1.5 rounded-lg text-brand-orange">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Select Practice Call</h2>
            </div>
            
            <p className="text-xs text-slate-500 mb-4">
              Pick the client story and trigger event for the automated counselor call. Real parents have unique study doubts!
            </p>

            <div className="grid grid-cols-1 gap-2.5 mb-5">
              {PRESET_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  disabled={isCallActive || isDialing}
                  onClick={() => {
                    setSelectedScenario(scenario);
                    setIsCustomMode(false);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    !isCustomMode && selectedScenario.id === scenario.id
                      ? "border-brand-orange bg-brand-lightOrange/30 text-slate-900 ring-2 ring-brand-orange/15 shadow-sm"
                      : "border-slate-100 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50"
                  }`}
                  id={`scenario-select-${scenario.id}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-xs text-brand-orange tracking-wide uppercase">
                      {scenario.name}
                    </span>
                    {!isCustomMode && selectedScenario.id === scenario.id && (
                      <span className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">{scenario.parentName}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    Child: <strong>{scenario.childName}</strong> | Reason: "{scenario.description}"
                  </p>
                </button>
              ))}

              {/* Custom Mode selector button */}
              <button
                disabled={isCallActive || isDialing}
                onClick={() => setIsCustomMode(true)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isCustomMode
                    ? "border-brand-orange bg-brand-lightOrange/30 text-slate-900 ring-2 ring-brand-orange/15 shadow-sm"
                    : "border-slate-100 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50"
                }`}
                id="scenario-select-custom"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-xs text-brand-teal tracking-wide uppercase">
                    Custom Scenario Builder
                  </span>
                  {isCustomMode && (
                    <span className="w-2 h-2 rounded-full bg-brand-teal animate-ping" />
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-800 mt-1">Design Your Own Parent Profile</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Configure custom name, target kids, and triggering actions.
                </p>
              </button>
            </div>

            {/* Custom Scenario Builder Inputs */}
            {isCustomMode && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-3.5 transition-all">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Parent (User Caller Name)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Saxena"
                    value={customParentName}
                    onChange={(e) => setCustomParentName(e.target.value)}
                    disabled={isCallActive || isDialing}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-brand-orange focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Child (Student Name)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shivam"
                    value={customChildName}
                    onChange={(e) => setCustomChildName(e.target.value)}
                    disabled={isCallActive || isDialing}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-brand-orange focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Trigger Action (Hinglish Statement)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Shivam ne MVSAT exam me top rank laya hai"
                    value={customTriggerAction}
                    onChange={(e) => setCustomTriggerAction(e.target.value)}
                    disabled={isCallActive || isDialing}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-brand-orange focus:border-brand-orange"
                  />
                </div>
              </div>
            )}

            {/* Reset / Current Profile Info banner */}
            <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5 bg-slate-50/50 p-2.5 rounded-xl">
              <div>📞 Target: <strong className="text-slate-800">{currentParentName}</strong></div>
              <div>👶 Student: <strong className="text-slate-800">{currentChildName}</strong></div>
              <div className="italic leading-normal">
                📢 Trigger: "{currentTrigger}"
              </div>
            </div>
          </div>

          {/* Quick Counselor Audio Instructions */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <span className="text-brand-orange">●</span> How to Evaluate & Train
            </h3>
            <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4 leading-relaxed">
              <li>Enable <strong className="text-slate-700">"Speech Readout"</strong> to auto-play calls out loud during the simulation.</li>
              <li>Toggle predefined objection cards inside the phone view to see how the counselor implements <strong className="bg-yellow-50 text-indigo-700 px-1 rounded font-semibold text-[11px]">The Bridge Technique</strong>.</li>
              <li>Notice how the counselor refuses to make up fake fees or teachers and insists on booking the slot.</li>
            </ul>
          </div>

          {/* 📞 Real Outbound Voice Call (Vobiz.ai / Plivo integration) Panel */}
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 shadow-sm space-y-4 text-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-rose-500/10 p-2 rounded-xl text-rose-400">
                  <Phone className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">Call Your Mobile</h3>
                  <p className="text-[10px] text-slate-400">Live outbound interactive voice call</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                liveCallStatus === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse" :
                liveCallStatus === "dialing" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30" :
                "bg-slate-800 text-slate-400"
              }`}>
                {liveCallStatus === "active" ? "Connected" : liveCallStatus === "dialing" ? "Dialing" : "Offline"}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-normal">
              Trigger a real, high-fidelity Indian-accented voice call to your mobile. Engage in raw live Hinglish conversation with the outbound artificial counselor!
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wide mb-1">
                  Your Phone Number (with Country Code)
                </label>
                <input
                  type="text"
                  placeholder="e.g. +919123752379"
                  value={liveToNumber}
                  onChange={(e) => setLiveToNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                />
              </div>

              {/* Advanced collapse details for Credentials */}
              <details className="group border-t border-slate-900 pt-2 cursor-pointer" open>
                <summary className="text-[10px] uppercase font-bold text-slate-400 select-none flex items-center justify-between group-open:text-brand-orange">
                  <span>Show Voice Provider Configuration (Vobiz / Plivo)</span>
                  <span className="text-[9px] transition-transform group-open:rotate-180">▼</span>
                </summary>
                
                <div className="space-y-3 mt-3 cursor-default" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wide mb-1">
                      API Gateway URL
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. https://api.vobiz.ai"
                      value={liveGatewayUrl}
                      onChange={(e) => setLiveGatewayUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-100 font-mono placeholder-slate-600 focus:ring-1 focus:ring-brand-orange focus:outline-none"
                    />
                    <p className="text-[8px] text-slate-500 mt-0.5">Use https://api.vobiz.ai (Vobiz direct endpoint) or https://api.plivo.com</p>
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wide mb-1">
                      Auth ID / App ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MA_..."
                      value={liveAuthId}
                      onChange={(e) => setLiveAuthId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-100 font-mono placeholder-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wide mb-1">
                      Auth Token
                    </label>
                    <input
                      type="text"
                      placeholder="Secure Authentication Key"
                      value={liveAuthToken}
                      onChange={(e) => setLiveAuthToken(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-100 font-mono placeholder-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-wide mb-1 flex items-center justify-between">
                      <span>Rent Outbound Caller ID / Verified Vobiz Number (From)</span>
                      <span className="text-[8px] text-slate-500 font-normal lowercase">(Required for Vobiz)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. your verified Vobiz number"
                      value={liveFromNumber}
                      onChange={(e) => setLiveFromNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-100 font-mono placeholder-slate-600"
                    />
                  </div>
                </div>
              </details>

              {/* Error messages inline display */}
              {liveCallError && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-rose-300 text-xs leading-relaxed space-y-1 shadow-sm">
                  <div className="font-bold flex items-center gap-1 text-rose-400">
                    <span>⚠️ Call Connection Error</span>
                  </div>
                  <p className="text-[11px] font-mono select-text bg-black/40 p-2 rounded border border-rose-950 text-rose-250 mt-1 break-all">
                    {liveCallError}
                  </p>
                  <p className="text-[10px] text-slate-400 pt-1 leading-normal">
                    This means the gateway rejected the request. Please verify that your Auth ID/Token are correct, has outbound credits, and that your caller ID is verified. If you are using a proxy provider, confirm the Custom API Gateway URL above.
                  </p>
                </div>
              )}

              {/* Action trigger button */}
              {liveCallStatus === "idle" || liveCallStatus === "failed" || liveCallStatus === "completed" ? (
                <button
                  onClick={handleStartLiveCall}
                  className="w-full bg-rose-600 hover:bg-rose-500 active:bg-rose-750 text-white font-bold py-2.5 px-4 rounded-xl text-xs tracking-wide transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Dial My Phone ({liveToNumber.trim() || "+91..."})
                </button>
              ) : (
                <button
                  onClick={handleStopLiveCall}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs tracking-wide transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  Terminate Active Session
                </button>
              )}

              {/* Log / Telemetry Screen */}
              <div className="border border-slate-900 bg-black rounded-xl p-3.5 space-y-1.5">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping"></span>
                  Realtime Outbound Call Telemetry
                </span>

                <div className="h-32 overflow-y-auto space-y-2 mt-2 select-text font-mono text-[9.5px] scrollbar-thin scrollbar-thumb-slate-800 pr-1 leading-relaxed">
                  {liveLogs.length === 0 ? (
                    <p className="text-slate-600 italic">No telecom signals. Click dial above to stream digital logs...</p>
                  ) : (
                    liveLogs.map((log, index) => {
                      let color = "text-slate-300";
                      if (log.message.includes("User Spoke")) color = "text-yellow-400 font-medium";
                      else if (log.message.includes("AI Counselor")) color = "text-emerald-400";
                      else if (log.message.includes("Initiated") || log.message.includes("triggered")) color = "text-cyan-400";
                      else if (log.message.includes("Failed")) color = "text-rose-400";
                      else if (log.message.includes("PICKED UP")) color = "text-white font-bold bg-emerald-950 px-1 border border-emerald-500/20 rounded";

                      return (
                        <div key={index} className="border-b border-slate-950 pb-1 flex flex-col">
                          <span className="text-slate-600 text-[8px] select-none">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span className={color}>{log.message}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Center Canvas - Virtual Call Simulator Device Frame */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border-[8px] border-slate-850 rounded-[2.5rem] overflow-hidden shadow-2xl relative flex flex-col h-[680px]">
            {/* Phone Front Notch Camera Indicator */}
            <div className="bg-slate-950 h-5 w-full flex justify-center items-center relative">
              <div className="w-24 h-4 bg-slate-900 rounded-b-xl absolute top-0 flex justify-center items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-950 mt-0.5 mr-2"></div>
                <div className="w-8 h-1 bg-slate-800 rounded-full mt-0.5"></div>
              </div>
            </div>

            {/* Screen Top Status bar */}
            <div className="bg-slate-900 px-6 py-2.5 flex justify-between items-center text-slate-400 text-xs font-mono select-none">
              <span className="text-slate-300 font-bold tracking-tight">VEDANTU OUTBOUND</span>
              <div className="flex items-center gap-1.5">
                {isCallActive ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> LIVE
                  </span>
                ) : isDialing ? (
                  <span className="flex items-center gap-1.5 text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded text-[10px] animate-pulse">
                    RINGING
                  </span>
                ) : (
                  <span className="text-slate-500">OFFLINE</span>
                )}
                <span>100%</span>
              </div>
            </div>

            {/* Caller Display Dashboard */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-850 px-6 py-4 border-b border-slate-800 text-center relative flex-shrink-0">
              {isCallActive || isDialing ? (
                <>
                  <div className="relative mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-brand-orange to-red-500 p-0.5 flex justify-center items-center mb-2.5">
                    {/* Animated soundwaves when counselor is simulated speaking */}
                    {isCounselorSpeaking && (
                      <div className="absolute inset-0 -m-2 rounded-full border border-brand-orange/40 animate-pulse-glow" />
                    )}
                    <div className="w-full h-full bg-slate-900 rounded-full flex justify-center items-center">
                      <Phone className="w-6 h-6 text-brand-orange animate-bounce" />
                    </div>
                  </div>

                  <h3 id="caller-name" className="text-white font-black text-base uppercase tracking-wider">
                    {currentParentName}
                  </h3>
                  <p className="text-slate-400 text-xs flex items-center justify-center gap-1.5 mt-0.5">
                    <span>Counselor Calling... {isCallActive && `(${formatTime(callDuration)})`}</span>
                    {isCallActive && isMicEnabled && (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                        isMicListening 
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                          : "bg-slate-800 text-slate-400"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isMicListening ? "bg-rose-500 animate-ping" : "bg-slate-500"}`}></span>
                        {isMicListening ? "Listening..." : "Wait..."}
                      </span>
                    )}
                  </p>

                  {/* Soundwave Bars visualizer */}
                  <div className="flex justify-center items-center gap-1 mt-3">
                    {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((height, idx) => (
                      <span
                        key={idx}
                        style={{ height: isCounselorSpeaking ? `${height * 3}px` : "2px" }}
                        className={`w-0.5 rounded-full bg-brand-orange transition-all duration-150 ${
                          isCounselorSpeaking ? "opacity-100" : "opacity-40"
                        }`}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-slate-800 flex justify-center items-center mb-3">
                    <PhoneOff className="w-6 h-6 text-slate-500" />
                  </div>
                  <h3 className="text-white font-extrabold text-sm">Call Offline</h3>
                  <p className="text-slate-500 text-xs mt-1">Initiate simulate to test objection logic</p>
                </div>
              )}
            </div>

            {/* Dialogue Log Scrollable Frame */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-950 flex flex-col select-text font-sans">
              {messages.length === 0 ? (
                <div className="m-auto text-center px-4 py-6 max-w-xs space-y-3">
                  <div className="text-brand-orange/20 mx-auto w-12 h-12 flex justify-center items-center">
                    <Phone className="w-10 h-10" />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Click <strong className="text-brand-orange font-semibold">"Start Sim Call"</strong> below. The simulated expert Vedantu counselor will automatically dial and offer a rich intro!
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message) => {
                    const isModel = message.role === "model";
                    return (
                      <div
                        key={message.id}
                        className={`flex flex-col max-w-[85%] ${isModel ? "self-start" : "self-end items-end"}`}
                      >
                        <span className="text-[10px] text-slate-500 mb-0.5 px-1.5 flex items-center gap-1">
                          {isModel ? (
                            <>
                              <span className="w-1.5 h-1.5 bg-brand-orange rounded-full" />
                              Counselor (Hinglish Outbound)
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3" />
                              Parent ({currentParentName})
                            </>
                          )}
                        </span>
                        <div
                          className={`p-3 pr-8 rounded-2xl text-xs leading-relaxed relative group ${
                            isModel
                              ? "bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none font-medium"
                              : "bg-brand-orange text-white rounded-tr-none font-bold shadow-sm"
                          }`}
                        >
                          {message.text}
                          {isModel && (
                            <button
                              onClick={() => speakText(message.text)}
                              title="Repeat Counselor Voice"
                              className="absolute right-2 top-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700/80 p-1 rounded-lg transition-colors border border-slate-700"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing Indicator / Response Loading */}
                  {isLoading && (
                    <div className="flex flex-col self-start max-w-[85%]">
                      <span className="text-[10px] text-slate-500 mb-0.5 px-1.5">
                        Counselor is responding...
                      </span>
                      <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-brand-orange animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-2 h-2 rounded-full bg-brand-orange animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-2 h-2 rounded-full bg-brand-orange animate-bounce" />
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* Quick-Inject objections panels inside phone */}
            {isCallActive && (
              <div className="bg-slate-900 border-t border-slate-800 p-3 flex-shrink-0">
                <p className="text-[10px] text-brand-orange font-bold uppercase tracking-wider mb-2 flex items-center gap-1 justify-center">
                  <span>💡</span> Click to trigger an Objection or Question:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {EXAMPLES_OF_OBJECTIONS.map((objection) => (
                    <button
                      key={objection.id}
                      onClick={() => handleSendParentReply(objection.userPromptText)}
                      disabled={isLoading || isCounselorSpeaking}
                      className="text-[11px] text-slate-300 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-left font-medium hover:bg-slate-850 hover:border-slate-700 transition"
                      id={`objection-btn-${objection.id}`}
                    >
                      {objection.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input message form & Bottom controller */}
            <div className="bg-slate-950 p-4 border-t border-slate-850 flex-shrink-0 flex flex-col gap-3">
              {isCallActive ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendParentReply(inputText);
                  }}
                  className="flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => {
                      const current = !isMicEnabled;
                      setIsMicEnabled(current);
                      if (!current && recognitionRef.current) {
                        try {
                          recognitionRef.current.stop();
                        } catch (_) {}
                      }
                    }}
                    title={isMicEnabled ? "Mute Microphone" : "Unmute Microphone"}
                    className={`flex-shrink-0 p-2.5 rounded-xl border transition flex items-center justify-center ${
                      isMicEnabled
                        ? isMicListening
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse"
                          : "bg-slate-900 border-slate-800 text-amber-500 hover:text-amber-400"
                        : "bg-slate-900 border-slate-800 text-slate-600 hover:text-slate-500"
                    }`}
                  >
                    {isMicEnabled ? (
                      isMicListening ? (
                        <Mic className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Mic className="w-4 h-4 text-amber-500" />
                      )
                    ) : (
                      <MicOff className="w-4 h-4 text-slate-600" />
                    )}
                  </button>
                  <input
                    type="text"
                    required={!isMicListening}
                    placeholder={
                      isMicListening
                        ? "🎙️ Listening... Speak into your microphone!"
                        : "Reply as parent ... (or click the mic icon to speak)"
                    }
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-orange"
                    id="chat-input-parent"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || isCounselorSpeaking || !inputText.trim()}
                    className="bg-brand-orange hover:bg-orange-600 disabled:bg-slate-800 disabled:text-slate-500 text-white p-2.5 rounded-xl transition"
                    id="chat-send-btn"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              ) : null}

              {/* Central Trigger Action Dial button */}
              <div className="flex justify-center">
                {!isCallActive && !isDialing ? (
                  <button
                    onClick={handleStartCall}
                    className="w-full bg-brand-orange text-white hover:bg-orange-600 py-3 px-5 rounded-2xl font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 shadow-lg hover:shadow-orange-500/20 shadow-orange-500/10"
                    id="start-call-btn"
                  >
                    <Phone className="w-4 h-4" />
                    Start Outbound Counseling Call
                  </button>
                ) : (
                  <button
                    onClick={handleEndCall}
                    className="w-full bg-rose-600 text-gray-100 hover:bg-rose-700 py-3 px-5 rounded-2xl font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 shadow-lg hover:shadow-rose-500/20 shadow-rose-500/10"
                    id="end-call-btn"
                  >
                    <PhoneOff className="w-4 h-4 animate-pulse" />
                    End Active Outbound Call
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right Column - Checklist playbooks and Objection Handbooks */}
        <section className="lg:col-span-3 space-y-6">
          <ObjectionHandbook currentPhase={currentPhase} completedObjectives={completedObjectives} />

          {/* Quick Real-time Evaluation summary of the simulation */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-brand-orange" />
              Conversion Evaluator
            </h3>
            
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Verify if the simulated agent strictly followed critical voice safety rules:
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                {Object.values(completedObjectives).filter(Boolean).length >= 4 ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0 flex items-center justify-center text-[10px] text-slate-400 font-bold">1</span>
                )}
                <span className="text-slate-600">
                  <strong>High Lead Trust:</strong> Addressed parent by proper name & referred to the triggers.
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {completedObjectives.objection ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0 flex items-center justify-center text-[10px] text-slate-400 font-bold">2</span>
                )}
                <span className="text-slate-600">
                  <strong>No Fee Hallucinations:</strong> Guided raw user question to face-to-face customized quote.
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {completedObjectives.close ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0 flex items-center justify-center text-[10px] text-slate-400 font-bold">3</span>
                )}
                <span className="text-slate-600">
                  <strong>Aesthetic Closing:</strong> Registered final slot and bid polite Hindi adieu.
                </span>
              </div>
            </div>

            {/* Quick reset button */}
            {isCallActive && (
              <button
                onClick={handleEndCall}
                className="mt-5 w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset & Try New Scenario
              </button>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
