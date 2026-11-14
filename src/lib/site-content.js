// Public-site copy in one place, so the marketing pages stay consistent.
// Facts here come from the school (fees, ages, contacts, established year).

export const CONTACT = {
  phone: "+880 1707 080 260",
  phoneHref: "tel:+8801707080260",
  email: "onlineskatingschool@gmail.com",
  whatsapp: "https://wa.me/8801707080260",
};

export const STATS = [
  { val: "1000+", lbl: "Active skaters" },
  { val: "6+", lbl: "Affiliated clubs" },
  { val: "2020", lbl: "Established" },
  { val: "4 mo", lbl: "Course duration" },
];

export const PROGRAMS = [
  { title: "Beginner", age: "Ages 3+", fee: "2,000", accent: "brand", desc: "Balance, forward glide, safe stopping and first turns, with full safety-gear guidance from day one.", points: ["Balance & posture", "Stopping safely", "Basic turns", "Fall-safe technique"] },
  { title: "Intermediate", age: "Ages 6+", fee: "2,500", accent: "lime", featured: true, desc: "Crossovers, backward skating and speed control. Builds the confidence to skate anywhere.", points: ["Crossovers", "Backward skating", "Speed control", "Inline technique"] },
  { title: "Advanced", age: "Ages 8+", fee: "3,000", accent: "white", desc: "Speed skating, rollball and competition preparation on the pathway to national events.", points: ["Speed training", "Rollball", "Competition prep", "National event pathway"] },
];

export const INCLUDED = [
  { title: "4-month structured course", text: "Clear milestones each month, then move up a level." },
  { title: "Safety gear guidance", text: "Coaches help every family choose the right protective gear." },
  { title: "Morning or day shift", text: "Pick the shift that fits school and family routines." },
  { title: "Parent portal access", text: "Attendance, schedule, notices and receipts online." },
];

export const FEATURES = [
  { icon: "Shield", title: "Safety first, always", text: "Every class starts with protective gear checks and fall-safe technique." },
  { icon: "Award", title: "Competition pathway", text: "Advanced skaters train toward rollball and national-level speed events." },
  { icon: "MapPin", title: "Venues across Dhaka", text: "Train at the branch closest to home, on the shift that suits your family." },
  { icon: "Smartphone", title: "Parent portal", text: "Check schedules, attendance and notices any time from your phone." },
  { icon: "FileText", title: "Digital receipts", text: "Every payment is recorded with a printable, verifiable receipt." },
  { icon: "Zap", title: "Structured progress", text: "A 4-month course structure, so you always know the next milestone." },
];

export const STEPS = [
  { n: "01", title: "Apply online", text: "Fill in the admission form in about five minutes, with a photo of the skater." },
  { n: "02", title: "Pick branch & shift", text: "Choose the venue and morning or day shift that fits your routine." },
  { n: "03", title: "Start skating", text: "Sign in to your portal for schedules, notices and fee receipts." },
];

export const FAQ = [
  { q: "What age can my child start?", a: "Children can join the Beginner course from age 3. Intermediate starts at 6+ and Advanced at 8+." },
  { q: "How long is a course?", a: "Each course runs for 4 months with structured milestones, after which skaters can move up a level." },
  { q: "What equipment is needed?", a: "Skates and full protective gear (helmet, knee, elbow and wrist guards). Coaches guide new families on what to buy." },
  { q: "How can I pay fees?", a: "Cash, bKash, Nagad, Rocket or bank transfer. Every payment gets a digital receipt in your portal." },
  { q: "Which branches do you have?", a: "Uttara, Bashundhara, Aftab Nagar and Gulshan. You choose your branch during admission." },
  { q: "Can parents follow their child's progress?", a: "Yes. Parents get a guardian portal showing each child's attendance, upcoming classes, fee balance and receipts. Several children can be followed from one account." },
];

// Order = top menu order = Previous/Next order at the bottom of each page.
export const NAV = [
  { href: "/", label: "Home", blurb: "Overview of the school" },
  { href: "/programs", label: "Programs", blurb: "Levels, ages and monthly fees" },
  { href: "/why-us", label: "Why us", blurb: "Coaching, safety and the parent portal" },
  { href: "/branches", label: "Branches", blurb: "Uttara, Bashundhara, Aftab Nagar, Gulshan" },
  { href: "/how-to-join", label: "How to join", blurb: "Three steps and what to have ready" },
  { href: "/faq", label: "FAQ", blurb: "Answers to common questions" },
];

// What the online admission form asks for (keep in sync with /admission).
export const CHECKLIST = [
  { title: "A clear photo of the skater", text: "Taken on a phone is fine. It is resized automatically." },
  { title: "Parents' names, mobile numbers and NID numbers", text: "For both father and mother, with their occupation." },
  { title: "Date of birth and birth registration number", text: "From the child's birth certificate." },
  { title: "Present and permanent address", text: "Tick one box if they are the same." },
  { title: "Current school, blood group and religion", text: "Short answers, no documents to upload." },
  { title: "A preferred branch and shift", text: "Morning or day. You can ask us if you're unsure." },
];
