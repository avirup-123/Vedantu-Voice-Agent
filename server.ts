import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || "MOCK_KEY",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Server Endpoint to Chat with simulated counselor
app.post("/api/chat", async (req, res) => {
  try {
    const { parentName, childName, triggerAction, history, userMessage } = req.body;

    if (!parentName || !childName || !triggerAction) {
      return res.status(400).json({ error: "Missing session variables" });
    }

    const systemInstruction = `You are an expert, empathetic, and highly persuasive outbound academic counselor for Vedantu (India's leading online tutoring platform).
You are speaking on a phone call as an Indian male counselor aged between 30-35 years. Your voice is warm, confident, professional, mature, and natural.

Your Objective:
Your singular goal is to book a free 30-minute virtual career counseling and platform demo session that requires both the parent and the student to attend.

Contact Variables:
- Parent Name: ${parentName}
- Child Name: ${childName}
- Trigger Action: ${triggerAction} (e.g., "aapne pichle hafte Vedantu app par register kiya tha", "Riya ne MVSAT exam diya tha")

Language Requirement:
Speak entirely in natural, conversational Hinglish (a mix of Hindi and English, written in the Roman alphabet). Use simple, everyday words. DO NOT speak heavy Hindi or dry English. Use casual words like "kaise ho", "padhai kaisi chal rahi hai", "theek rahega", etc.

Critical Rules (MUST STRICTLY FOLLOW AT ALL TIMES):
1. KEEP IT SHORT: Never speak more than 2-3 sentences at a time.
2. THE BRIDGE TECHNIQUE: If the parent asks a question or objects, give a very brief, friendly answer (1 sentence) and IMMEDIATELY pivot/bridge back to asking for a time slot. Never just answer and wait.
3. NO LISTS OR MARKDOWN: Output plain conversational text only. Absolutely no asterisks (**), backticks (\`), dashes (-), or numbering. Do not use markdown to format text. It represents spoken words.
4. DO NOT HALLUCINATE: If asked something you don't know, say that the senior counselor will explain it perfectly during the free demo.
5. NO STRUCTURAL LABELS: Do not preface your response with "Counselor:", "Vedantu:", "Model:", "[Response]" or include phase labels. Just output the actual spoken dialogue.

The Conversation Flow:
- Phase 1: Warm Intro. Start with: "Namaste ${parentName} ji! Main Vedantu se bol raha hoon. Maine dekha ki ${triggerAction}. Bas ek quick call kiya tha yeh janne ke liye ki ${childName} ki padhai kaisi chal rahi hai?"
- Phase 2: Academic Profiling. Ask ONE profiling question (e.g., "Achha, abhi kaunsi class aur board me hain?") once they answer about padhai.
- Phase 3: The Pitch. Transition directly into the demo pitch: "Achha, samajh gaya. Dekhiye, isi padhai me aur help karne ke liye hum ek free 30-minute virtual counseling aur demo session de rahe hain. Isme hum ${childName} ki requirements samjhenge aur dikhayenge ki hamare personal mentors kaise help karte hain. Aap aur ${childName} dono isme jud sakte hain. Toh kya hum kal sham 6 baje ka time fix karein?"
- Phase 4: FAQ & Objection Handling. If the parent asks or raises an objection, respond using these exact bridges:
  * "Fees kitni hai?" OR Cost -> "Fees ${childName} ki class aur plan ke hisaab se customize hoti hai. Hamare paas monthly EMI aur scholarships dono hain. Exact details hum demo session me share karenge kyunki wahan hum best plan suggest kar payenge. Kal 6 baje theek rahega?"
  * "Kaun padhayega?" OR Teachers -> "Hamare paas India ke top teachers hain, IITians aur NITians, jinka saalo ka experience hai. Demo class me aap khud unka padhane ka tareeqa dekh sakte hain. Kya main kal sham ka slot book karoon?"
  * "Offline classes hain kya?" -> "Hum primarily LIVE online classes dete hain taaki bachcha ghar ke safe environment me padh sake, aur unka travel time bache. Humare results offline se bhi better aate hain. Ek baar aap demo attend karke dekhiye, aapko farq dikhega. Kal sham connect karein?"
  * "Send details on WhatsApp" -> "Main zaroor bhej dunga, par WhatsApp par poori cheez samajhna mushkil hota hai. Demo session bilkul free hai aur aapke questions live clear ho jayenge. Kal sham 5 baje ya 6 baje?"
  * "Abhi busy hoon" -> "Koi baat nahi, main aapka zyada time nahi lunga. Kya main kal dopahar me call karoon, ya sham me?"
  * "Pehle bachche se baat karni hai" -> "Bilkul, aur yeh session bachche ke liye hi hai! Aap ${childName} se baat kar lijiye. Main aapka ek tentative slot kal sham 7 baje ka book kar deta hoon. Agar change karna ho toh bata dijiyega. Theek hai?"
- Phase 5: Closing. Once they agree to a slot, confirm and end politely: "Great! Maine kal sham ka slot book kar diya hai. Aapko WhatsApp par link mil jayega. Thank you and have a great day!"`;

    // Map history to standard parts
    const chatParts: any[] = [];
    if (history && history.length > 0) {
      for (const item of history) {
        chatParts.push({
          role: item.role === "model" ? "model" : "user",
          parts: [{ text: item.text }],
        });
      }
    }

    // Append the current message
    chatParts.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    if (!process.env.GEMINI_API_KEY) {
      // Return a simulated mock response if API Key is missing, so it doesn't crash
      console.warn("GEMINI_API_KEY not found. Simulating response.");
      let mockReply = "";
      const lower = userMessage.toLowerCase();
      if (lower.includes("fees") || lower.includes("cost") || lower.includes("price") || lower.includes("paise")) {
        mockReply = `Fees ${childName} ki class aur plan ke hisaab se customize hoti hai. Hamare paas monthly EMI aur scholarships dono hain. Exact details hum demo session me share karenge kyunki wahan hum best plan suggest kar payenge. Kal 6 baje theek rahega?`;
      } else if (lower.includes("teacher") || lower.includes("kaun padhayega") || lower.includes("experience")) {
        mockReply = `Hamare paas India ke top teachers hain, IITians aur NITians, jinka saalo ka experience hai. Demo class me aap khud unka padhane ka tareeqa dekh sakte hain. Kya main kal sham ka slot book karoon?`;
      } else if (lower.includes("offline") || lower.includes("center") || lower.includes("ghar aakar")) {
        mockReply = `Hum primarily LIVE online classes dete hain taaki bachcha ghar ke safe environment me padh sake, aur unka travel time bache. Humare results offline se bhi better aate hain. Ek baar aap demo attend karke dekhiye, aapko farq dikhega. Kal sham connect karein?`;
      } else if (lower.includes("whatsapp") || lower.includes("details) bhej")) {
        mockReply = `Main zaroor bhej dunga, par WhatsApp par poori cheez samajhna mushkil hota hai. Demo session bilkul free hai aur aapke questions live clear ho jayenge. Kal sham 5 baje ya 6 baje?`;
      } else if (lower.includes("busy") || lower.includes("time nahi")) {
        mockReply = `Koi baat nahi, main aapka zyada time nahi lunga. Kya main kal dopahar me call karoon, ya sham me?`;
      } else if (lower.includes("bachche") || lower.includes("child") || lower.includes("puchna")) {
        mockReply = `Bilkul, aur yeh session bachche ke liye hi hai! Aap ${childName} se baat kar lijiye. Main aapka ek tentative slot kal sham 7 baje ka book kar deta hoon. Agar change karna ho toh bata dijiyega. Theek hai?`;
      } else if (lower.includes("theek hai") || lower.includes("haan") || lower.includes("yes") || lower.includes("ok") || lower.includes("book")) {
        mockReply = `Great! Maine kal sham ka slot book kar diya hai. Aapko WhatsApp par link mil jayega. Thank you and have a great day!`;
      } else {
        mockReply = `Bilkul, main samajh sakta hoon. Isliye toh hum free 30-minute counseling aur demo sessions de rahe hain taaki aap poora platform experience kar skein. Toh kya hum kal sham 6 baje ka session book karein?`;
      }
      return res.json({ text: mockReply });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: chatParts,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.6,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error with Gemini Chat API:", error);
    res.status(500).json({ error: error?.message || "Something went wrong" });
  }
});

// --- Plivo Voice Call Webhook and API System ---

// Helper to determine the public-facing URL of this app.
// Since Cloud Run terminates SSL at the load balancer, req.secure is false and req.protocol is http inside the container.
// We force https if the host is standard Google Cloud Run (contains run.app) or if x-forwarded-proto says https.
const getHostUrl = (req: express.Request) => {
  if (process.env.APP_URL) return process.env.APP_URL;
  const reqHost = req.get("host") || "";
  const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https" || reqHost.includes(".run.app");
  return `${isSecure ? "https" : "http"}://${reqHost}`;
};

interface PlivoSession {
  parentName: string;
  childName: string;
  triggerAction: string;
  messages: { role: "user" | "model"; text: string }[];
  status: string;
  answeredAt?: number;
}

const plivoSessions: Record<string, PlivoSession> = {};
const callLogs: { timestamp: string; message: string }[] = [];

// Endpoint to fetch call logs
app.get("/api/plivo/logs", (req, res) => {
  res.json({ logs: callLogs });
});

// Endpoint to clear call logs
app.post("/api/plivo/clear-logs", (req, res) => {
  callLogs.length = 0;
  res.json({ success: true });
});

// Endpoint to check status of a specific session
app.get("/api/plivo/session-status", (req, res) => {
  const sessionId = req.query.sessionId as string;
  const session = plivoSessions[sessionId];
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json(session);
});

// Endpoint to make the outbound call
app.post("/api/plivo/make-call", async (req, res) => {
  try {
    const { parentName, childName, triggerAction, toNumber, fromNumber, authId, authToken, gatewayUrl } = req.body;

    if (!toNumber || !authId || !authToken) {
      return res.status(400).json({ error: "Missing required call configurations (toNumber, authId, authToken)" });
    }

    const sessionId = `session_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    plivoSessions[sessionId] = {
      parentName: parentName || "Parent",
      childName: childName || "Student",
      triggerAction: triggerAction || "register kiya",
      messages: [],
      status: "Call Initiated",
    };

    callLogs.push({
      timestamp: new Date().toISOString(),
      message: `[Call ${sessionId}] Outbound call order received for ${parentName} (${toNumber})`,
    });

    // Support custom Plivo-compatible gateway gateways (e.g. Vobiz custom URL)
    const baseUrl = (gatewayUrl && gatewayUrl.trim()) ? gatewayUrl.trim().replace(/\/$/, "") : "https://api.vobiz.ai";
    const isVobiz = baseUrl.includes("vobiz");

    if (isVobiz && (!fromNumber || !fromNumber.trim())) {
      plivoSessions[sessionId].status = "Failed";
      callLogs.push({
        timestamp: new Date().toISOString(),
        message: `[Call ${sessionId}] Pre-flight validation failed: Missing verified Vobiz Caller ID.`,
      });
      return res.status(400).json({
        error: "Vobiz requires a verified outbound Caller ID. Please input your registered/verified Vobiz phone number in the 'Verified Vobiz Number (From)' field. Defaulting to a simulated USA number is not allowed by Vobiz."
      });
    }
    
    let url = "";
    if (isVobiz) {
      const cleanBase = baseUrl.replace(/\/api$/, "");
      url = `${cleanBase}/api/v1/Account/${authId}/Call/`;
    } else {
      url = `${baseUrl}/v1/Account/${authId}/Call/`;
    }
    
    const host = getHostUrl(req);
    const answerUrl = `${host}/api/plivo/answer?sessionId=${sessionId}`;

    callLogs.push({
      timestamp: new Date().toISOString(),
      message: `[Call ${sessionId}] Answer webhook set to: ${answerUrl}`,
    });

    const basicAuth = Buffer.from(`${authId}:${authToken}`).toString("base64");

    const payload = {
      from: fromNumber || "+15017250604",
      to: toNumber,
      answer_url: answerUrl,
      answer_method: "POST",
      time_limit: 600, // Ensure the call doesn't cut off before 5 minutes are completed (10 mins max)
    };

    callLogs.push({
      timestamp: new Date().toISOString(),
      message: `[Call ${sessionId}] Routing request to telecom gateway: ${baseUrl}`,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const resultText = await response.text();
    let jsonResult: any = {};
    try {
      jsonResult = JSON.parse(resultText);
    } catch (e) {}

    if (!response.ok) {
      callLogs.push({
        timestamp: new Date().toISOString(),
        message: `[Call ${sessionId}] Connection Failed: ${resultText}`,
      });
      plivoSessions[sessionId].status = "Failed";
      return res.status(response.status).json({ error: resultText || "Failed to trigger call via Plivo gateway" });
    }

    callLogs.push({
      timestamp: new Date().toISOString(),
      message: `[Call ${sessionId}] Call initiated successfully! Gateway Request ID: ${jsonResult.api_id || "N/A"}. Waiting for response...`,
    });

    plivoSessions[sessionId].status = "Ringing";

    res.json({
      success: true,
      sessionId,
      detail: jsonResult,
    });
  } catch (error: any) {
    console.error("Error making plivo call:", error);
    res.status(500).json({ error: error?.message || "Failed to trigger call" });
  }
});

// Standard Webhook: When caller answers
const handleAnswer = (req: express.Request, res: express.Response) => {
  const sessionId = (req.query.sessionId as string) || (req.body.sessionId as string);
  const session = plivoSessions[sessionId];

  const pName = session?.parentName || "Parent";
  const cName = session?.childName || "Student";
  const trig = session?.triggerAction || "register kiya tha";

  if (session) {
    session.status = "In-Progress";
    session.answeredAt = Date.now();
  }

  callLogs.push({
    timestamp: new Date().toISOString(),
    message: `[Call ${sessionId || 'Unknown'}] CALL PICKED UP! Customer is active on the phone.`,
  });

  const introText = `Namaste ${pName} ji! Main Vedantu se bol raha hoon. Maine dekha ki ${trig}. Bas ek quick call kiya tha yeh janne ke liye ki ${cName} ki padhai kaisi chal rahi hai?`;

  if (session) {
    session.messages.push({ role: "model", text: introText });
  }

  const host = getHostUrl(req);
  const processUrl = `${host}/api/plivo/process?sessionId=${sessionId}`;

  res.set("Content-Type", "application/xml");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather action="${processUrl}" method="POST" inputType="speech" speechTimeout="200" speechEndTimeout="5" timeout="200">
        <Speak voice="Polly.Madhav" language="en-IN">${introText}</Speak>
    </Gather>
</Response>`;

  callLogs.push({
    timestamp: new Date().toISOString(),
    message: `[Call ${sessionId || 'Unknown'}] AI Spoke outbound pitch: "${introText}"`,
  });

  res.send(xml);
};

app.get("/api/plivo/answer", handleAnswer);
app.post("/api/plivo/answer", handleAnswer);

// Webhook Process: Handle ongoing conversation speech input
const handleProcess = async (req: express.Request, res: express.Response) => {
  const sessionId = (req.query.sessionId as string) || (req.body.sessionId as string);
  const userSpeech = req.body.SpeechResult || req.body.Speech || req.body.Digits || "";

  const session = plivoSessions[sessionId];
  if (!session) {
    res.set("Content-Type", "application/xml");
    return res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Speak voice="Polly.Madhav" language="en-IN">Aapka call session expire ho gaya hai.</Speak><Hangup/></Response>`);
  }

  callLogs.push({
    timestamp: new Date().toISOString(),
    message: `[Call ${sessionId}] User Spoke: "${userSpeech || '(Silence)'}"`,
  });

  if (userSpeech.trim()) {
    session.messages.push({ role: "user", text: userSpeech });
  } else {
    session.messages.push({ role: "user", text: "[Silence/No response]" });
  }

  const pName = session.parentName;
  const cName = session.childName;
  const trig = session.triggerAction;

  const systemInstruction = `You are an expert, empathetic, and highly persuasive outbound academic counselor for Vedantu (India's leading online tutoring platform).
You are speaking on a live, real phone call as an Indian male counselor aged between 30-35 years. Your voice is warm, confident, professional, mature, and natural.

Your Objective:
Your singular goal is to book a free 30-minute virtual career counseling and platform demo session that requires both the parent and the student to attend.

Contact Variables:
- Parent Name: ${pName}
- Child Name: ${cName}
- Trigger Action: ${trig} (e.g., "aapne pichle hafte Vedantu app par register kiya tha")

Language Requirement:
Speak entirely in natural, conversational Hinglish (a mix of Hindi and English, written in the Roman alphabet). Use simple, everyday words. DO NOT speak heavy Hindi or dry English. Use casual words like "kaise ho", "padhai kaisi chal rahi hai", "theek rahega", etc.

Critical Rules (MUST STRICTLY FOLLOW AT ALL TIMES):
1. KEEP IT SHORT: Never speak more than 2-3 sentences at a time. This is a live voice phone call!
2. THE BRIDGE TECHNIQUE: If the parent asks a question or objects, give a very brief, friendly answer (1 sentence) and IMMEDIATELY pivot/bridge back to asking for a time slot. Never just answer and wait.
3. NO LISTS OR MARKDOWN: Output plain conversational text only. Absolutely no asterisks (**), backticks (\`), dashes (-), or numbering.
4. DO NOT HALLUCINATE: If asked something you don't know, say that the senior counselor will explain it perfectly during the free demo.
5. NO STRUCTURAL LABELS: Do not preface your response with structural labels. Just output the actual spoken dialogue.

The Conversation Flow:
- Phase 1: Warm Intro. (Already done)
- Phase 2: Academic Profiling. Ask ONE profiling questiononce they answer. (e.g., "kaunsi class aur board me hain?")
- Phase 3: The Pitch. Transition directly into the demo pitch: "Achha, samajh gaya. Dekhiye, isi padhai me aur help karne ke liye hum ek free 30-minute virtual counseling aur demo session de rahe hain. Isme hum ${cName} ki requirements samjhenge aur dikhayenge ki hamare personal mentors kaise help karte hain. Aap aur ${cName} dono isme jud sakte hain. Toh kya hum kal sham 6 baje ka time fix karein?"
- Phase 4: FAQ & Objection Handling. If the parent asks or raises an objection, respond using these exact bridges:
  * "Fees kitni hai?" OR Cost -> "Fees ${cName} ki class aur plan ke hisaab se customize hoti hai. Hamare paas monthly EMI aur scholarships dono hain. Exact details hum demo session me share karenge kyunki wahan hum best plan suggest kar payenge. Kal 6 baje theek rahega?"
  * "Kaun padhayega?" OR Teachers -> "Hamare paas India ke top teachers hain, IITians aur NITians, jinka saalo ka experience hai. Demo class me aap khud unka padhane ka tareeqa dekh sakte hain. Kya main kal sham ka slot book karoon?"
  * "Offline classes hain kya?" -> "Hum primarily LIVE online classes dete hain taaki bachcha ghar ke safe environment me padh sake, aur unka travel time bache. Humare results offline se bhi better aate hain. Ek baar aap demo attend karke dekhiye, aapko farq dikhega. Kal sham connect karein?"
  * "Send details on WhatsApp" -> "Main zaroor bhej dunga, par WhatsApp par poori cheez samajhna mushkil hota hai. Demo session bilkul free hai aur aapke questions live clear ho jayenge. Kal sham 5 baje ya 6 baje?"
  * "Abhi busy hoon" -> "Koi baat nahi, main aapka zyada time nahi lunga. Kya main kal dopahar me call karoon, ya sham me?"
  * "Pehle bachche se baat karni hai" -> "Bilkul, aur yeh session bachche ke liye hi hai! Aap ${cName} s baat kar lijiye. Main aapka ek tentative slot kal sham 7 baje ka book kar deta hoon."
- Phase 5: Closing. Once they agree to a slot, confirm and end politely: "Great! Maine kal sham ka slot book kar diya hai. Aapko WhatsApp par link mil jayega. Thank you and have a great day!"`;

  let counselorReply = "";

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined. Using offline rule replies.");
      const lower = userSpeech.toLowerCase();
      if (lower.includes("fees") || lower.includes("cost") || lower.includes("price") || lower.includes("paise")) {
        counselorReply = `Fees ${cName} ki class aur plan ke hisaab se customize hoti hai. Hamare paas scholarships aur monthly EMI dono options hain. Exact details hum live demo me suggest karenge. Kal sham 6 baje theek rahega?`;
      } else if (lower.includes("offline") || lower.includes("center") || lower.includes("ghar")) {
        counselorReply = `Hum primarily LIVE online classes dete hain taaki bachcha ghar ke safe environment me padh sake aur travel time bache. Results isse bhi dhasu aate hain. Kal sham ka slot book karoon?`;
      } else if (lower.includes("busy") || lower.includes("time nahi")) {
        counselorReply = `Koi baat nahi ji, main aapka zyada time nahi lunga. Kal dopahar me call karoon, ya sham me?`;
      } else if (lower.includes("theek hai") || lower.includes("haan") || lower.includes("yes") || lower.includes("ok") || lower.includes("book") || lower.includes("baje")) {
        counselorReply = "Great! Maine kal sham ka slot book kar diya hai. Aapko WhatsApp par link mil jayega. Thank you and have a great day!";
      } else {
        counselorReply = `Samajh gaya ji. Isi padhai me guidance dene ke liye hum counseling aur demo session de rahe hain. Kya kal sham 6 baje theek rahega connect karne ke liye?`;
      }
    } else {
      const chatParts: any[] = [];
      for (const msg of session.messages) {
        chatParts.push({
          role: msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.text }],
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: chatParts,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.62,
        },
      });

      counselorReply = response.text || "Samajh gaya ji, main isme poori help karunga. Toh kya kal sham connect karein hum counseling session ke liye?";
    }
  } catch (error: any) {
    console.error("Gemini webhook call error:", error);
    counselorReply = "Samajh gaya ji. Details aapko senior expert live demo session me click karke clear bata denge. Kal sham connect karein?";
  }

  // Formatting sanitizing
  counselorReply = counselorReply.replace(/[*#`_\-]/g, "").trim();

  session.messages.push({ role: "model", text: counselorReply });

  callLogs.push({
    timestamp: new Date().toISOString(),
    message: `[Call ${sessionId}] AI Counselor Spoke: "${counselorReply}"`,
  });

  res.set("Content-Type", "application/xml");

  const isClosing = counselorReply.toLowerCase().includes("thank you and have a great day") || 
                    counselorReply.toLowerCase().includes("slot book kar diya hai") ||
                    counselorReply.toLowerCase().includes("have a great day");

  const host = getHostUrl(req);
  const processUrl = `${host}/api/plivo/process?sessionId=${sessionId}`;

  const elapsedMs = session.answeredAt ? (Date.now() - session.answeredAt) : 0;
  const fiveMinutesInMs = 5 * 60 * 1000;

  let actualIsClosing = isClosing;
  if (isClosing && elapsedMs < fiveMinutesInMs) {
    actualIsClosing = false;
    const remainingSeconds = Math.max(0, Math.ceil((fiveMinutesInMs - elapsedMs) / 1000));
    const remainingMins = Math.ceil(remainingSeconds / 60);
    counselorReply += ` (Hum feedback aur quality aur counseling questions ke liye 5 minute tak call par bane rahenge. Abhi lagbhag ${remainingMins} minute baaki hain, aapko koi aur sawaal puchna hai ya details chahiye?)`;
    
    // Update the saved message in history
    if (session.messages.length > 0 && session.messages[session.messages.length - 1].role === "model") {
      session.messages[session.messages.length - 1].text = counselorReply;
    }
  }

  let xml = "";
  if (actualIsClosing) {
    xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Speak voice="Polly.Madhav" language="en-IN">${counselorReply}</Speak>
    <Hangup/>
</Response>`;
    session.status = "Completed";
    callLogs.push({
      timestamp: new Date().toISOString(),
      message: `[Call ${sessionId}] Call TERMINATED gracefully (Success).`,
    });
  } else {
    xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather action="${processUrl}" method="POST" inputType="speech" speechTimeout="200" speechEndTimeout="5" timeout="200">
        <Speak voice="Polly.Madhav" language="en-IN">${counselorReply}</Speak>
    </Gather>
</Response>`;
  }

  res.send(xml);
};

app.post("/api/plivo/process", handleProcess);
app.get("/api/plivo/process", handleProcess);

// Start server within async function to avoid top-level await bundle error
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});

