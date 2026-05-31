export interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

export interface Scenario {
  id: string;
  name: string;
  parentName: string;
  childName: string;
  triggerAction: string;
  description: string;
}

export const PRESET_SCENARIOS: Scenario[] = [
  {
    id: "app-reg",
    name: "Vedantu App Registration",
    parentName: "Sanjay Kumar",
    childName: "Aarav",
    triggerAction: "aapne pichle hafte Vedantu app par register kiya tha",
    description: "Parent registered Aarav on the Vedantu App last week, looking around but hasn't booked anything.",
  },
  {
    id: "mvsat",
    name: "MVSAT Exam Topper",
    parentName: "Meenakshi Sharma",
    childName: "Riya",
    triggerAction: "Riya ne pure India level par MVSAT exam me bohot achha score kiya tha",
    description: "Riya excelled in the Mega Vedantu Scholarship Admissions Test (MVSAT). Parent is proud but cautious.",
  },
  {
    id: "download-resources",
    name: "Syllabus/Resource Download",
    parentName: "Rajesh Patel",
    childName: "Karan",
    triggerAction: "aapne Vedantu website se Class 10 Board exam ke notes aur PYQs download kiye the",
    description: "Downloaded prep papers and study resources for Karan's upcoming Class 10 boards.",
  },
  {
    id: "masterclass",
    name: "Masterclass Attendee",
    parentName: "Anjali Gupta",
    childName: "Sneha",
    triggerAction: "Sneha ne hamari physics masterclass live attend ki thi aur teacher se doubts bhi pooche the",
    description: "Sneha attended a free live science demo masterclass, loved the interactive interactive quiz features.",
  },
];

export interface ObjectionCheck {
  id: string;
  label: string;
  userPromptText: string;
  category: "fees" | "teachers" | "offline" | "whatsapp" | "busy" | "checks" | "custom";
}

export const EXAMPLES_OF_OBJECTIONS: ObjectionCheck[] = [
  {
    id: "fees",
    label: "💰 Ask and Grumble about Fees",
    userPromptText: "Fees bohot zyada hai kya? Mujhse afford nahi ho payega, detail me kharcha batao.",
    category: "fees",
  },
  {
    id: "teachers",
    label: "🎓 Question Teacher's Experience",
    userPromptText: "Aapke paas teacher kaun hai? Pata kaise chalega unhe padhana aata hai?",
    category: "teachers",
  },
  {
    id: "offline",
    label: "🏫 Demand Offline Classes",
    userPromptText: "Mujhe online pasand nahi hai, bachcha dhyan nahi deta. Aapka koi offline center hai?",
    category: "offline",
  },
  {
    id: "whatsapp",
    label: "📱 Request Info on WhatsApp",
    userPromptText: " Mujhe abhi call par poora mat samjhao. Ek kaam karo, WhatsApp par details bhej do.",
    category: "whatsapp",
  },
  {
    id: "busy",
    label: "⏰ Complain: 'I am busy right now'",
    userPromptText: "Main abhi office me ek meeting me busy hoon, baad me baat karte hain.",
    category: "busy",
  },
  {
    id: "checks",
    label: "👶 Say: 'I need to talk to my child'",
    userPromptText: "Theek hai par mujhe pehle apne bachche se pooch ke unka schedule dekhna padega.",
    category: "checks",
  },
];
