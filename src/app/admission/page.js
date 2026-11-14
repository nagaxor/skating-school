"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { Logo, LogoMark, RinkLines } from "@/components/Brand";

const MAX_PHOTO_BYTES = 200 * 1024; // matches the school's own stated limit
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const MONTHS = [
  ["01", "January"], ["02", "February"], ["03", "March"], ["04", "April"],
  ["05", "May"], ["06", "June"], ["07", "July"], ["08", "August"],
  ["09", "September"], ["10", "October"], ["11", "November"], ["12", "December"],
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 68 }, (_, i) => String(CURRENT_YEAR - 3 - i));

// Resize + re-encode an uploaded photo client-side until it's under the
// school's 200KB limit. The legacy form just printed that limit as text
// with no enforcement — this actually enforces it.
function compressImage(file, maxBytes) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That doesn't look like a valid image"));
      img.onload = () => {
        let [w, h] = [img.width, img.height];
        const maxDim = 900;
        if (w > maxDim || h > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.round(w * scale); h = Math.round(h * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        let quality = 0.9;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        const sizeOf = (du) => Math.round((du.length - du.indexOf(",") - 1) * 0.75);
        while (sizeOf(dataUrl) > maxBytes && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve({ dataUrl, bytes: sizeOf(dataUrl) });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const initialForm = {
  name: "", email: "", password: "", confirmPassword: "", mobile: "", clubId: "", program: "Beginner",
  presentAddress: "", sameAsPresent: false, permanentAddress: "",
  fatherName: "", fatherNid: "", fatherOccupation: "", fatherOccupationType: "", fatherMobile: "",
  motherName: "", motherNid: "", motherOccupation: "", motherOccupationType: "", motherMobile: "",
  dobDay: "", dobMonth: "", dobYear: "", birthReg: "", bloodGroup: "", presentSchool: "",
  religion: "ISLAM", gender: "", shift: "", agree: false,
};

// Single source of truth for "is this field filled in correctly", shared by
// the Continue-button gate, the inline red error text, and the final Submit
// gate. Every rule here mirrors admissionSchema on the server (src/lib/validation.js)
// on purpose — a field the frontend treats as optional but the backend treats
// as required is exactly how the old form could look complete and still fail
// on submit with a generic "check the form" error.
function fieldError(key, form, photo) {
  switch (key) {
    case "photo": return photo ? "" : "Upload the applicant's photo";
    case "name": return form.name.trim().length >= 2 ? "" : "Enter the student's full name";
    case "clubId": return form.clubId ? "" : "Select a branch";
    case "mobile": return form.mobile.trim().length >= 6 ? "" : "Enter a valid mobile number";
    case "email": return /\S+@\S+\.\S+/.test(form.email) ? "" : "Enter a valid email address";
    case "presentAddress": return form.presentAddress.trim().length >= 5 ? "" : "Enter the present address";
    case "permanentAddress": return (form.sameAsPresent || form.permanentAddress.trim().length >= 5) ? "" : "Enter the permanent address";
    case "fatherName": return form.fatherName.trim().length >= 2 ? "" : "Enter father's name";
    case "fatherNid": return form.fatherNid.trim().length >= 2 ? "" : "Enter father's NID number";
    case "fatherOccupation": return form.fatherOccupation.trim().length >= 2 ? "" : "Enter father's occupation";
    case "fatherOccupationType": return form.fatherOccupationType ? "" : "Select an occupation type";
    case "fatherMobile": return form.fatherMobile.trim().length >= 6 ? "" : "Enter father's mobile number";
    case "motherName": return form.motherName.trim().length >= 2 ? "" : "Enter mother's name";
    case "motherNid": return form.motherNid.trim().length >= 2 ? "" : "Enter mother's NID number";
    case "motherOccupation": return form.motherOccupation.trim().length >= 2 ? "" : "Enter mother's occupation";
    case "motherOccupationType": return form.motherOccupationType ? "" : "Select an occupation type";
    case "motherMobile": return form.motherMobile.trim().length >= 6 ? "" : "Enter mother's mobile number";
    case "dob": return (form.dobDay && form.dobMonth && form.dobYear) ? "" : "Select the full date of birth";
    case "birthReg": return form.birthReg.trim().length >= 2 ? "" : "Enter the birth registration number";
    case "bloodGroup": return form.bloodGroup.trim().length >= 1 ? "" : "Enter a blood group";
    case "presentSchool": return form.presentSchool.trim().length >= 2 ? "" : "Enter the present school";
    case "gender": return form.gender ? "" : "Select a gender";
    case "shift": return form.shift ? "" : "Select a shift";
    case "password": return form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password) ? "" : "Use at least 8 characters, with a letter and a number";
    case "confirmPassword":
      if (!form.confirmPassword) return "Re-enter the password";
      return form.confirmPassword === form.password ? "" : "Passwords don't match";
    case "agree": return form.agree ? "" : "Please confirm before submitting";
    default: return "";
  }
}


const STEPS = [
  { name: "Basics", title: "Tell us about the skater", desc: "Photo, branch and how we can reach you.", icon: Icon.User, fields: ["photo", "name", "clubId", "mobile", "email"] },
  { name: "Address", title: "Where do you live?", desc: "We use this for school records only.", icon: Icon.MapPin, fields: ["presentAddress", "permanentAddress"] },
  { name: "Guardians", title: "Parents & guardians", desc: "Who should we contact about classes and fees?", icon: Icon.Users, fields: ["fatherName", "fatherNid", "fatherOccupation", "fatherOccupationType", "fatherMobile", "motherName", "motherNid", "motherOccupation", "motherOccupationType", "motherMobile"] },
  { name: "Details", title: "A few more details", desc: "Date of birth, school and preferred shift.", icon: Icon.Clipboard, fields: ["dob", "birthReg", "bloodGroup", "presentSchool", "gender", "shift"] },
  { name: "Account", title: "Review & create your login", desc: "Check the summary, then set a password for the parent portal.", icon: Icon.Lock, fields: ["password", "confirmPassword", "agree"] },
];

const PROGRAMS = [
  { value: "Beginner", sub: "Ages 3+ · ৳2,000/mo" },
  { value: "Intermediate", sub: "Ages 6+ · ৳2,500/mo" },
  { value: "Advanced", sub: "Ages 8+ · ৳3,000/mo" },
];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const inputCls = (hasErr) =>
  `w-full h-12 px-4 rounded-xl text-[15px] bg-white text-ink-900 outline-none transition-shadow ring-1 ring-inset placeholder:text-ink-400 ${
    hasErr ? "ring-red-400 focus:ring-2 focus:ring-red-500 bg-red-50/30" : "ring-ink-900/10 focus:ring-2 focus:ring-brand-500"
  }`;
const areaCls = (hasErr) => inputCls(hasErr).replace("h-12", "min-h-[96px] py-3 resize-y");
const labelCls = "text-[13px] font-semibold text-ink-800 block mb-2";
const sectionTitleCls = "text-[11px] font-semibold text-ink-400 uppercase tracking-[0.14em] mb-4";

// Label + control + inline error. Module scope on purpose: a component
// declared inside AdmissionPage would remount on every render and make
// inputs lose focus after one keystroke.
function Field({ label, required, hint, error, showError, children }) {
  return (
    <div>
      <label className={labelCls}>
        {label}{required && <span className="text-gold-500 ml-0.5">*</span>}
      </label>
      {children}
      {showError ? (
        <p className="text-[12px] text-red-600 mt-1.5 flex items-center gap-1"><Icon.AlertTriangle width={12} height={12} className="flex-shrink-0" /> {error}</p>
      ) : hint ? (
        <p className="text-[12px] text-ink-400 mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}

// Tappable option chips: faster than a dropdown on phones, and every choice is visible.
function Choice({ options, value, onChange, hasErr, cols = 2, stack = false }) {
  const grid = stack ? "grid-cols-1 sm:grid-cols-3" : { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[cols];
  return (
    <div className={`grid ${grid} gap-2`} role="radiogroup">
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : { label: o.value, ...o };
        const active = value === opt.value;
        return (
          <button
            type="button" key={opt.value} role="radio" aria-checked={active} onClick={() => onChange(opt.value)}
            className={`relative text-left rounded-xl px-3.5 py-3 ring-1 ring-inset transition-all ${
              active ? "ring-2 ring-brand-500 bg-brand-50/60" : hasErr ? "ring-red-300 hover:ring-red-400" : "ring-ink-900/10 hover:ring-ink-900/25 hover:bg-ink-50/50"
            }`}
          >
            <span className={`block text-[14px] font-semibold capitalize ${active ? "text-brand-800" : "text-ink-800"}`}>{opt.label.toLowerCase()}</span>
            {opt.sub && <span className="block text-[12px] text-ink-500 mt-0.5">{opt.sub}</span>}
            {active && <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-brand-500 text-white flex items-center justify-center"><Icon.Check width={10} height={10} strokeWidth={3} /></span>}
          </button>
        );
      })}
    </div>
  );
}

function PhotoThumb({ photo, size = "w-16 h-16" }) {
  return (
    <div className={`${size} rounded-2xl bg-ink-50 ring-1 ring-ink-900/10 flex items-center justify-center overflow-hidden flex-shrink-0`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- inline base64 data URL, nothing for next/image to optimise */}
      {photo ? <img src={photo.dataUrl} alt="Applicant" className="w-full h-full object-cover" /> : <Icon.User width={24} height={24} className="text-ink-300" />}
    </div>
  );
}

export default function AdmissionPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [clubs, setClubs] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [photo, setPhoto] = useState(null); // { dataUrl, bytes }
  const [photoError, setPhotoError] = useState("");
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState({});

  const u = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const touch = (k) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));
  const touchMany = (keys) => setTouched((t) => ({ ...t, ...Object.fromEntries(keys.map((k) => [k, true])) }));
  const err = (k) => fieldError(k, form, photo);
  const show = (k) => touched[k] && err(k);

  useEffect(() => {
    fetch("/api/clubs").then((r) => r.json()).then(setClubs).catch(() => {});
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const [dragOver, setDragOver] = useState(false);

  const processPhotoFile = async (file) => {
    if (!file) return;
    setPhotoError("");
    if (!file.type.startsWith("image/")) { setPhotoError("Please upload an image file"); return; }
    setCompressing(true);
    try {
      const result = await compressImage(file, MAX_PHOTO_BYTES);
      setPhoto(result);
      touch("photo");
    } catch (photoErr) {
      setPhotoError(photoErr.message);
    } finally {
      setCompressing(false);
    }
  };
  const handlePhoto = (e) => processPhotoFile(e.target.files?.[0]);
  const handlePhotoDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processPhotoFile(e.dataTransfer.files?.[0]);
  };

  const stepHasErrors = (i) => STEPS[i].fields.some((k) => err(k));
  const formValid = STEPS.every((_, i) => !stepHasErrors(i));

  const goNext = () => {
    if (stepHasErrors(step)) { touchMany(STEPS[step].fields); return; }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const submit = async (e) => {
    e.preventDefault();
    if (!formValid) {
      // Shouldn't be reachable (Submit is disabled until formValid), but if
      // it ever is, jump to the first step that still has a problem instead
      // of firing a request the backend will reject.
      const badStep = STEPS.findIndex((_, i) => stepHasErrors(i));
      touchMany(STEPS[badStep].fields);
      setStep(badStep);
      return;
    }
    setError(""); setSubmitting(true);
    try {
      const payload = {
        name: form.name, email: form.email, password: form.password, mobile: form.mobile,
        clubId: form.clubId || null, program: form.program,
        presentAddress: form.presentAddress,
        sameAsPresent: form.sameAsPresent,
        // The server validates permanentAddress as its own required field
        // before it ever looks at sameAsPresent — so when the box is
        // checked, send the present address as the permanent one instead
        // of an empty string, or every "same as present" submission gets
        // rejected with a generic validation error.
        permanentAddress: form.sameAsPresent ? form.presentAddress : form.permanentAddress,
        fatherName: form.fatherName, fatherNid: form.fatherNid, fatherOccupation: form.fatherOccupation,
        fatherOccupationType: form.fatherOccupationType, fatherMobile: form.fatherMobile,
        motherName: form.motherName, motherNid: form.motherNid, motherOccupation: form.motherOccupation,
        motherOccupationType: form.motherOccupationType, motherMobile: form.motherMobile,
        dob: { day: form.dobDay, month: form.dobMonth, year: form.dobYear },
        birthReg: form.birthReg, bloodGroup: form.bloodGroup, presentSchool: form.presentSchool,
        religion: form.religion, gender: form.gender, shift: form.shift,
        photo: photo?.dataUrl || "", agree: form.agree,
      };
      const res = await fetch("/api/admission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); setSubmitting(false); return; }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };


  const program = PROGRAMS.find((p) => p.value === form.program);
  const branch = clubs.find((c) => c.id === form.clubId);
  const progress = ((step + 1) / STEPS.length) * 100;
  const dobLabel = form.dobDay && form.dobMonth && form.dobYear ? `${Number(form.dobDay)} ${MONTHS.find(([v]) => v === form.dobMonth)?.[1]} ${form.dobYear}` : "—";

  return (
    <div className="min-h-screen bg-white text-ink-900 lg:grid lg:grid-cols-[400px_1fr] xl:grid-cols-[440px_1fr]">
      {/* Brand rail (desktop) */}
      <aside className="hidden lg:flex flex-col justify-between sticky top-0 h-screen bg-ink-950 text-white p-10 overflow-hidden">
        <RinkLines className="absolute inset-0 w-full h-full opacity-30" />
        <div className="absolute inset-0 grain" />
        <div className="absolute -bottom-32 -left-24 w-[460px] h-[420px] bg-[radial-gradient(closest-side,rgba(47,107,224,0.28),transparent)]" />
        <Link href="/" className="relative" aria-label="Home"><Logo size={36} /></Link>

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lime-400">Admission {CURRENT_YEAR}</p>
          <h1 className="font-display text-[32px] leading-[1.1] font-semibold tracking-[-0.025em] mt-3">
            Join the rink.<br /><span className="text-ink-400">It takes about five minutes.</span>
          </h1>
          <ol className="mt-10 space-y-1">
            {STEPS.map((s, i) => {
              const done = i < step, current = i === step;
              return (
                <li key={s.name}>
                  <button type="button" disabled={i > step} onClick={() => i < step && setStep(i)}
                    className={`w-full flex items-center gap-4 rounded-xl px-2 py-2.5 text-left transition ${done ? "hover:bg-white/[0.04]" : ""} disabled:cursor-default`}>
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0 transition ${
                      done ? "bg-lime-400 text-ink-950" : current ? "bg-white text-ink-950 ring-4 ring-white/10" : "ring-1 ring-white/15 text-ink-500"}`}>
                      {done ? <Icon.Check width={15} height={15} strokeWidth={2.6} /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[14px] font-semibold ${current ? "text-white" : done ? "text-ink-200" : "text-ink-500"}`}>{s.name}</span>
                      <span className="block text-[12px] text-ink-500 truncate">{s.desc}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="relative rounded-2xl bg-white/[0.05] ring-1 ring-white/10 p-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-lime-400/15 text-lime-300 flex items-center justify-center"><Icon.Award width={18} height={18} /></span>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold">{form.program} program</div>
              <div className="text-[12px] text-ink-400 truncate">{program?.sub}{branch ? ` · ${branch.name}` : ""}</div>
            </div>
          </div>
          <a href="https://wa.me/8801707080260" target="_blank" rel="noopener noreferrer" className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-[12.5px] text-ink-400 hover:text-white transition">
            <Icon.MessageCircle width={14} height={14} className="text-emerald-400" /> Questions? Chat with us on WhatsApp
          </a>
        </div>
      </aside>

      <main className="min-h-screen flex flex-col">
        {/* Top bar + progress */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl">
          <div className="max-w-2xl mx-auto px-5 sm:px-8 h-16 flex items-center gap-3">
            <Link href="/" className="lg:hidden" aria-label="Home"><LogoMark size={32} /></Link>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Step {step + 1} of {STEPS.length}</div>
              <div className="text-[14px] font-semibold text-ink-950 truncate">{STEPS[step].name}</div>
            </div>
            <Link href="/login" className="text-[13px] font-semibold text-ink-500 hover:text-ink-900 px-3 py-2 rounded-lg hover:bg-ink-50">Sign in</Link>
          </div>
          <div className="h-[3px] bg-ink-100"><div className="h-full bg-gradient-to-r from-brand-600 to-brand-300 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} /></div>
        </div>

        <form onSubmit={submit} className="flex-1 flex flex-col w-full max-w-2xl mx-auto px-5 sm:px-8">
          <div key={step} className="animate-slideUp flex-1 pt-8 sm:pt-12 pb-32 sm:pb-6">
            <h2 className="font-display text-[26px] sm:text-[32px] leading-tight font-semibold tracking-[-0.02em] text-ink-950">{STEPS[step].title}</h2>
            <p className="text-[15px] text-ink-500 mt-2 mb-8">{STEPS[step].desc}</p>

            {error && (
              <div className="bg-red-500/[0.07] ring-1 ring-red-500/20 text-red-700 text-sm px-4 py-3 rounded-xl mb-6 flex items-center gap-2 animate-slideUp" role="alert">
                <Icon.AlertTriangle width={16} height={16} className="flex-shrink-0" /> {error}
              </div>
            )}

            <div className="space-y-8">
              {step === 0 && (
                <>
                  <div>
                    <h3 className={sectionTitleCls}>Applicant&apos;s photo</h3>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handlePhotoDrop}
                      className={`relative flex items-center gap-5 rounded-2xl border-2 border-dashed p-5 cursor-pointer transition-all ${
                        dragOver ? "border-brand-500 bg-brand-50/50" : show("photo") ? "border-red-300 bg-red-50/40" : "border-ink-200 hover:border-brand-400 hover:bg-ink-50/60"
                      }`}
                    >
                      <PhotoThumb photo={photo} size="w-20 h-20" />
                      <div className="flex-1 min-w-0">
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                        <p className="text-[15px] font-semibold text-ink-900">
                          {photo ? "Change photo" : "Upload a photo"}<span className="hidden sm:inline text-ink-400 font-normal"> or drag it here</span>
                          {!photo && <span className="text-gold-500 ml-0.5">*</span>}
                        </p>
                        <p className="text-[12px] text-ink-400 mt-1">A clear, recent face photo. JPG or PNG, resized automatically.</p>
                        {photo && <p className="text-[12px] text-emerald-600 mt-1.5 flex items-center gap-1"><Icon.Check width={12} height={12} /> Ready · {Math.round(photo.bytes / 1024)} KB</p>}
                        {photoError && <p className="text-[12px] text-red-600 mt-1.5">{photoError}</p>}
                        {!photo && !photoError && show("photo") && <p className="text-[12px] text-red-600 mt-1.5 flex items-center gap-1"><Icon.AlertTriangle width={12} height={12} /> {err("photo")}</p>}
                      </div>
                      {compressing && (
                        <div className="absolute inset-0 bg-white/85 backdrop-blur-[1px] rounded-2xl flex items-center justify-center gap-2 text-sm font-medium text-ink-500">
                          <span className="w-4 h-4 border-2 border-ink-300 border-t-brand-500 rounded-full animate-spin" /> Processing…
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <h3 className={sectionTitleCls + " !mb-0"}>Skater</h3>
                    <Field error={err("name")} showError={show("name")} label="Student's full name" required>
                      <input className={inputCls(show("name"))} autoComplete="off" value={form.name} onChange={(e) => u("name", e.target.value)} onBlur={() => touch("name")} />
                    </Field>
                    <Field label="Program">
                      <Choice stack options={PROGRAMS} value={form.program} onChange={(v) => u("program", v)} />
                    </Field>
                    <Field error={err("clubId")} showError={show("clubId")} label="Branch" required>
                      <select className={inputCls(show("clubId"))} value={form.clubId} onChange={(e) => u("clubId", e.target.value)} onBlur={() => touch("clubId")}>
                        <option value="">Select a branch…</option>
                        {clubs.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.location}</option>)}
                      </select>
                    </Field>
                  </div>

                  <div className="space-y-5">
                    <h3 className={sectionTitleCls + " !mb-0"}>Contact</h3>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <Field error={err("mobile")} showError={show("mobile")} label="Mobile number" required>
                        <input className={inputCls(show("mobile"))} inputMode="tel" autoComplete="tel" placeholder="01XXX XXXXXX" value={form.mobile} onChange={(e) => u("mobile", e.target.value)} onBlur={() => touch("mobile")} />
                      </Field>
                      <Field error={err("email")} showError={show("email")} label="Email" required hint="You'll use this to sign in">
                        <input type="email" autoComplete="email" className={inputCls(show("email"))} value={form.email} onChange={(e) => u("email", e.target.value)} onBlur={() => touch("email")} />
                      </Field>
                    </div>
                  </div>
                </>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <Field error={err("presentAddress")} showError={show("presentAddress")} label="Present address" required>
                    <textarea className={areaCls(show("presentAddress"))} value={form.presentAddress} onChange={(e) => u("presentAddress", e.target.value)} onBlur={() => touch("presentAddress")} placeholder="House, road, area, city" />
                  </Field>
                  <label className={`flex items-center gap-3 rounded-xl px-4 py-3.5 ring-1 ring-inset cursor-pointer transition ${form.sameAsPresent ? "ring-brand-500 bg-brand-50/50" : "ring-ink-900/10 hover:bg-ink-50/60"}`}>
                    <input type="checkbox" checked={form.sameAsPresent} onChange={(e) => u("sameAsPresent", e.target.checked)} className="w-[18px] h-[18px] accent-brand-600" />
                    <span className="text-[14px] font-medium text-ink-800">Permanent address is the same as present address</span>
                  </label>
                  {!form.sameAsPresent && (
                    <Field error={err("permanentAddress")} showError={show("permanentAddress")} label="Permanent address" required>
                      <textarea className={areaCls(show("permanentAddress"))} value={form.permanentAddress} onChange={(e) => u("permanentAddress", e.target.value)} onBlur={() => touch("permanentAddress")} />
                    </Field>
                  )}
                </div>
              )}

              {step === 2 && ["father", "mother"].map((who) => (
                <div key={who} className="rounded-2xl ring-1 ring-ink-900/[0.08] p-5 sm:p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-ink-950 text-lime-400 flex items-center justify-center"><Icon.User width={16} height={16} /></span>
                    <h3 className="font-display font-semibold text-[17px] text-ink-950 capitalize">{who}</h3>
                  </div>
                  <Field error={err(`${who}Name`)} showError={show(`${who}Name`)} label="Full name" required>
                    <input className={inputCls(show(`${who}Name`))} value={form[`${who}Name`]} onChange={(e) => u(`${who}Name`, e.target.value)} onBlur={() => touch(`${who}Name`)} />
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field error={err(`${who}Mobile`)} showError={show(`${who}Mobile`)} label="Mobile" required>
                      <input className={inputCls(show(`${who}Mobile`))} inputMode="tel" value={form[`${who}Mobile`]} onChange={(e) => u(`${who}Mobile`, e.target.value)} onBlur={() => touch(`${who}Mobile`)} />
                    </Field>
                    <Field error={err(`${who}Nid`)} showError={show(`${who}Nid`)} label="NID number" required>
                      <input className={inputCls(show(`${who}Nid`))} inputMode="numeric" value={form[`${who}Nid`]} onChange={(e) => u(`${who}Nid`, e.target.value)} onBlur={() => touch(`${who}Nid`)} />
                    </Field>
                  </div>
                  <Field error={err(`${who}Occupation`)} showError={show(`${who}Occupation`)} label="Occupation" required>
                    <input className={inputCls(show(`${who}Occupation`))} value={form[`${who}Occupation`]} onChange={(e) => u(`${who}Occupation`, e.target.value)} onBlur={() => touch(`${who}Occupation`)} />
                  </Field>
                  <Field error={err(`${who}OccupationType`)} showError={show(`${who}OccupationType`)} label="Occupation type" required>
                    <Choice cols={3} options={["Govt.", "Non Govt.", "Others"]} value={form[`${who}OccupationType`]} hasErr={show(`${who}OccupationType`)} onChange={(v) => { u(`${who}OccupationType`, v); touch(`${who}OccupationType`); }} />
                  </Field>
                </div>
              ))}

              {step === 3 && (
                <div className="space-y-5">
                  <Field error={err("dob")} showError={show("dob")} label="Date of birth" required>
                    <div className="grid grid-cols-3 gap-3">
                      <select className={inputCls(show("dob"))} value={form.dobDay} onChange={(e) => u("dobDay", e.target.value)} onBlur={() => touch("dob")} aria-label="Day"><option value="">Day</option>{DAYS.map((d) => <option key={d} value={d}>{Number(d)}</option>)}</select>
                      <select className={inputCls(show("dob"))} value={form.dobMonth} onChange={(e) => u("dobMonth", e.target.value)} onBlur={() => touch("dob")} aria-label="Month"><option value="">Month</option>{MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                      <select className={inputCls(show("dob"))} value={form.dobYear} onChange={(e) => u("dobYear", e.target.value)} onBlur={() => touch("dob")} aria-label="Year"><option value="">Year</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
                    </div>
                  </Field>
                  <Field error={err("gender")} showError={show("gender")} label="Gender" required>
                    <Choice options={[{ value: "MALE" }, { value: "FEMALE" }]} value={form.gender} hasErr={show("gender")} onChange={(v) => { u("gender", v); touch("gender"); }} />
                  </Field>
                  <Field error={err("shift")} showError={show("shift")} label="Preferred shift" required>
                    <Choice options={[{ value: "MORNING", sub: "Before noon" }, { value: "DAY", sub: "Afternoon & evening" }]} value={form.shift} hasErr={show("shift")} onChange={(v) => { u("shift", v); touch("shift"); }} />
                  </Field>
                  <Field error={err("bloodGroup")} showError={show("bloodGroup")} label="Blood group" required>
                    <Choice cols={4} options={BLOOD_GROUPS} value={form.bloodGroup} hasErr={show("bloodGroup")} onChange={(v) => { u("bloodGroup", v); touch("bloodGroup"); }} />
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field error={err("birthReg")} showError={show("birthReg")} label="Birth registration no." required>
                      <input className={inputCls(show("birthReg"))} inputMode="numeric" value={form.birthReg} onChange={(e) => u("birthReg", e.target.value)} onBlur={() => touch("birthReg")} />
                    </Field>
                    <Field label="Religion" required>
                      <select className={inputCls(false)} value={form.religion} onChange={(e) => u("religion", e.target.value)}>
                        <option value="ISLAM">Islam</option><option value="HINDU">Hindu</option><option value="CHRISTIAN">Christian</option>
                      </select>
                    </Field>
                  </div>
                  <Field error={err("presentSchool")} showError={show("presentSchool")} label="Present school" required hint={`Session ${CURRENT_YEAR}`}>
                    <input className={inputCls(show("presentSchool"))} value={form.presentSchool} onChange={(e) => u("presentSchool", e.target.value)} onBlur={() => touch("presentSchool")} />
                  </Field>
                </div>
              )}

              {step === 4 && (
                <>
                  <div className="rounded-2xl bg-ink-950 text-white p-5 sm:p-6 relative overflow-hidden">
                    <div className="absolute inset-0 grain" />
                    <div className="absolute -top-20 -right-16 w-60 h-60 bg-[radial-gradient(closest-side,rgba(47,107,224,0.35),transparent)]" />
                    <div className="relative flex items-center gap-4">
                      <PhotoThumb photo={photo} size="w-16 h-16" />
                      <div className="min-w-0">
                        <div className="font-display text-xl font-semibold truncate">{form.name || "Applicant"}</div>
                        <div className="text-[13px] text-ink-400 truncate">{form.program} · {branch?.name || "No branch"} · {form.shift ? form.shift.toLowerCase() : "—"} shift</div>
                      </div>
                    </div>
                    <dl className="relative grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 mt-5 pt-5 border-t border-white/10 text-[13px]">
                      {[["Mobile", form.mobile], ["Email", form.email], ["Date of birth", dobLabel], ["Father", form.fatherName], ["Mother", form.motherName], ["Blood group", form.bloodGroup]].map(([l, v]) => (
                        <div key={l} className="min-w-0"><dt className="text-ink-500 text-[11.5px]">{l}</dt><dd className="font-medium truncate">{v || "—"}</dd></div>
                      ))}
                    </dl>
                    <button type="button" onClick={() => setStep(0)} className="relative mt-4 text-[12.5px] font-semibold text-brand-300 hover:text-brand-200 inline-flex items-center gap-1"><Icon.Edit width={13} height={13} /> Edit details</button>
                  </div>

                  <div className="space-y-5">
                    <h3 className={sectionTitleCls + " !mb-0"}>Parent portal login</h3>
                    <p className="text-[14px] text-ink-500 -mt-2">Sign in with <span className="font-semibold text-ink-800">{form.email || "your email"}</span> to see schedules, attendance and receipts.</p>
                    <Field error={err("password")} showError={show("password")} label="Password" required hint="At least 8 characters, with a letter and a number">
                      <div className="relative">
                        <input type={showPassword ? "text" : "password"} autoComplete="new-password" className={inputCls(show("password")) + " pr-12"} value={form.password} onChange={(e) => u("password", e.target.value)} onBlur={() => touch("password")} />
                        <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-ink-400 hover:text-ink-700" aria-label={showPassword ? "Hide password" : "Show password"}>
                          <Icon.Eye width={17} height={17} />
                        </button>
                      </div>
                    </Field>
                    <Field error={err("confirmPassword")} showError={show("confirmPassword")} label="Confirm password" required>
                      <input type={showPassword ? "text" : "password"} autoComplete="new-password" className={inputCls(show("confirmPassword"))} value={form.confirmPassword} onChange={(e) => u("confirmPassword", e.target.value)} onBlur={() => touch("confirmPassword")} />
                    </Field>
                  </div>

                  <div>
                    <label className={`flex items-start gap-3 rounded-xl p-4 ring-1 ring-inset cursor-pointer transition ${form.agree ? "ring-brand-500 bg-brand-50/50" : show("agree") ? "ring-red-300" : "ring-ink-900/10"}`}>
                      <input type="checkbox" checked={form.agree} onChange={(e) => { u("agree", e.target.checked); touch("agree"); }} className="w-[18px] h-[18px] accent-brand-600 mt-0.5 flex-shrink-0" />
                      <span className="text-[14px] text-ink-700 leading-relaxed">I confirm all the information is correct. The form can&apos;t be edited after it is submitted.</span>
                    </label>
                    {show("agree") && <p className="text-[12px] text-red-600 mt-1.5 flex items-center gap-1"><Icon.AlertTriangle width={12} height={12} /> {err("agree")}</p>}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action bar: fixed on phones like a native app footer */}
          <div className="fixed sm:sticky bottom-0 inset-x-0 z-20 bg-white/90 backdrop-blur-xl border-t border-ink-900/[0.06] -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 sm:py-4 flex items-center gap-3"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
            {step > 0 ? (
              <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 h-12 px-5 rounded-xl ring-1 ring-ink-900/10 text-ink-700 font-semibold text-sm hover:bg-ink-50 transition">
                <Icon.ArrowLeft width={15} height={15} /> Back
              </button>
            ) : (
              <span className="hidden sm:block text-[13px] text-ink-400 flex-1">Already a member? <Link href="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link></span>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={goNext} className="flex-1 sm:flex-none sm:ml-auto sm:min-w-[200px] h-12 inline-flex items-center justify-center gap-2 bg-ink-950 text-white font-semibold rounded-xl hover:bg-ink-800 active:scale-[0.99] transition">
                Continue <Icon.ArrowRight width={16} height={16} />
              </button>
            ) : (
              <button type="submit" disabled={!formValid || submitting}
                className="flex-1 sm:flex-none sm:ml-auto sm:min-w-[240px] h-12 inline-flex items-center justify-center gap-2 bg-lime-400 text-ink-950 font-semibold rounded-xl hover:bg-lime-300 hover:shadow-glow-lime active:scale-[0.99] transition disabled:opacity-50">
                {submitting ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting…</> : <>Submit admission <Icon.Check width={16} height={16} /></>}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
