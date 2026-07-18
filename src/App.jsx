import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, UserCircle2, CalendarDays, PackageSearch,
  Plus, X, Search, Pencil, Trash2, ChevronLeft, ChevronRight,
  CheckCircle2, Circle, AlertTriangle, CreditCard, Clock, ShieldCheck,
  ShoppingBag, Boxes, Receipt, Minus, Download, PackagePlus, LogOut, Wallet, Percent, Goal
} from "lucide-react";
import { supabase } from "./supabaseClient";

/* --------------------------------- Helpers -------------------------------- */
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (dateStr, days) => { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
const fmtMoney = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (s) => new Date(s + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
const fmtDateTime = (iso) => new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
const monthLabel = (key) => { const [y, m] = key.split("-"); return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" }); };
const age = (birthDate) => {
  const b = new Date(birthDate + "T00:00:00"); const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a;
};
function enrollmentStatus(enr, asOf) {
  if (enr.credits !== null && enr.credits_remaining <= 0) return "used-up";
  if (daysBetween(asOf, enr.expiry_date) < 0) return "expired";
  return "active";
}
function activeEnrollmentFor(enrollments, playerId, date) {
  return enrollments.filter((e) => e.player_id === playerId)
    .filter((e) => enrollmentStatus(e, date) === "active" && e.start_date <= date)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] || null;
}
const sessionTypeColor = (type) => (type === "match" ? { fg: "var(--maroon)", bg: "#FBEAE9" } : { fg: "var(--blue)", bg: "#E9EFF9" });
const FULL_KIT_PRICE = 4500;
const STANDARD_SIZES = ["XS Kids", "S Kids", "M Kids", "L Kids", "XL Kids", "S Adult", "M Adult", "L Adult", "XL Adult"];
const SOCK_SIZES = ["S", "M", "L", "XL"];

function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.map((cell) => {
    const s = String(cell ?? "");
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* --------------------------------- Styling -------------------------------- */
const Style = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; }
    .bam-root { --navy:#181733; --maroon:#8D1A17; --blue:#154284; --red:#CF122D; --yellow:#FDC52C; --white:#FFFFFF; --black:#000000;
      --ink:#181733; --muted:#6B6B78; --line:#E7E7EE; --bg:#F7F7FA;
      font-family:'Inter',sans-serif; color:var(--ink); background:var(--bg); min-height:100vh; }
    .bam-display { font-family:'Archivo Black', sans-serif; letter-spacing:.01em; }
    .bam-scroll::-webkit-scrollbar { width:8px; height:8px; }
    .bam-scroll::-webkit-scrollbar-thumb { background:#D6D6E2; border-radius:8px; }
    .bam-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:6px; font-weight:600; font-size:14px; cursor:pointer; border:1px solid transparent; transition:all .15s ease; }
    .bam-btn:active { transform:scale(.97); }
    .bam-btn:disabled { opacity:.5; cursor:not-allowed; }
    .bam-btn-primary { background:var(--maroon); color:var(--white); }
    .bam-btn-primary:hover { background:#711310; }
    .bam-btn-secondary { background:var(--blue); color:var(--white); }
    .bam-btn-secondary:hover { background:#103467; }
    .bam-btn-ghost { background:transparent; color:var(--navy); border-color:var(--line); }
    .bam-btn-ghost:hover { background:#EFEFF5; }
    .bam-btn-danger { background:#fff; color:var(--red); border-color:#F3C4CB; }
    .bam-btn-danger:hover { background:#FDEEF0; }
    .bam-card { background:var(--white); border:1px solid var(--line); border-radius:10px; }
    .bam-input { width:100%; border:1px solid #DADAE4; border-radius:6px; padding:8px 10px; font-size:14px; font-family:'Inter',sans-serif; background:#fff; color:var(--ink); }
    .bam-input:focus { outline:2px solid var(--blue); outline-offset:1px; border-color:var(--blue); }
    .bam-label { font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.05em; margin-bottom:4px; display:block; }
    .bam-nav-item { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:6px; font-weight:600; font-size:14px; cursor:pointer; color:#C7C7DA; }
    .bam-nav-item:hover { background:#232150; }
    .bam-nav-item.active { background:var(--yellow); color:var(--navy); }
    .bam-badge { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:700; }
    .bam-modal-overlay { position:fixed; inset:0; background:rgba(24,23,51,0.55); display:flex; align-items:center; justify-content:center; z-index:50; padding:16px; }
    .bam-table th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); font-weight:700; padding:8px 12px; border-bottom:2px solid var(--navy); }
    .bam-table td { padding:9px 12px; font-size:14px; border-bottom:1px solid var(--line); }
    .bam-table tr:hover td { background:#F9F9FC; }
    .bam-day { border:1px solid var(--line); border-radius:6px; min-height:74px; padding:6px; cursor:pointer; background:#fff; transition:all .12s ease; }
    .bam-day:hover { border-color:var(--blue); box-shadow:0 0 0 2px #DCE6F5; }
    .bam-day.today { border-color:var(--maroon); border-width:2px; }
    .bam-lowstock { color:var(--red); font-weight:700; }
  `}</style>
);

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="bam-modal-overlay" onClick={onClose}>
      <div className="bam-card bam-scroll" style={{ width: wide ? 680 : 460, maxHeight: "88vh", overflowY: "auto", padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 className="bam-display" style={{ fontSize: 17, margin: 0 }}>{title}</h3>
          <button className="bam-btn bam-btn-ghost" style={{ padding: 6 }} onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ==================================================================== */
/*  AUTH — real Supabase Auth (email/password), username stored in profiles */
/* ==================================================================== */
function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(""); setNotice("");
    if (!email.trim() || !password) { setError("Enter an email and password."); return; }
    if (mode === "signup" && !username.trim()) { setError("Enter a username."); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpErr } = await supabase.auth.signUp({ email: email.trim(), password });
        if (signUpErr) throw signUpErr;
        if (data.user) {
          const { error: profileErr } = await supabase.from("profiles").insert({ id: data.user.id, username: username.trim(), email: email.trim() });
          if (profileErr) throw profileErr;
        }
        if (!data.session) {
          setNotice("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInErr) throw signInErr;
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };
  const onKeyDown = (e) => { if (e.key === "Enter") submit(); };

  return (
    <div className="bam-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <Style />
      <div className="bam-card" style={{ width: 340, padding: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <div style={{ width: 30, height: 30, background: "var(--maroon)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="bam-display" style={{ color: "#fff", fontSize: 13 }}>B</span>
          </div>
          <span className="bam-display" style={{ fontSize: 14, color: "var(--navy)" }}>BAM ADMIN TOOL</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button type="button" className="bam-btn" style={{ flex: 1, justifyContent: "center", background: mode === "signin" ? "var(--navy)" : "#fff", color: mode === "signin" ? "#fff" : "var(--navy)", border: "1px solid var(--line)" }} onClick={() => { setMode("signin"); setError(""); }}>Sign In</button>
          <button type="button" className="bam-btn" style={{ flex: 1, justifyContent: "center", background: mode === "signup" ? "var(--navy)" : "#fff", color: mode === "signup" ? "#fff" : "var(--navy)", border: "1px solid var(--line)" }} onClick={() => { setMode("signup"); setError(""); }}>Sign Up</button>
        </div>
        {mode === "signup" && (
          <>
            <label className="bam-label">Username</label>
            <input className="bam-input" style={{ marginBottom: 12 }} value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={onKeyDown} />
          </>
        )}
        <label className="bam-label">Email</label>
        <input type="email" className="bam-input" style={{ marginBottom: 12 }} value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onKeyDown} autoFocus />
        <label className="bam-label">Password</label>
        <input type="password" className="bam-input" style={{ marginBottom: 14 }} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={onKeyDown} minLength={6} />
        {error && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {notice && <div style={{ color: "var(--blue)", fontSize: 13, marginBottom: 12 }}>{notice}</div>}
        <button type="button" className="bam-btn bam-btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={busy} onClick={submit}>
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </div>
    </div>
  );
}

/* ==================================================================== */
export default function App() {
  const [session, setSession] = useState(undefined);
  const [connError, setConnError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => setSession(data.session))
      .catch((err) => setConnError(err.message || "Could not connect to Supabase."));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (connError) {
    return (
      <div className="bam-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24 }}>
        <Style />
        <div className="bam-card" style={{ maxWidth: 480, padding: 24 }}>
          <h3 className="bam-display" style={{ color: "var(--red)", fontSize: 18, marginBottom: 10 }}>Can't reach Supabase</h3>
          <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 10 }}>{connError}</p>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            Check your <code>.env</code> file (or Vercel Environment Variables): <code>VITE_SUPABASE_URL</code> should be just your project's base URL,
            e.g. <code>https://xxxxxxxxxxxx.supabase.co</code> — with nothing added after <code>.co</code>.
          </p>
        </div>
      </div>
    );
  }
  if (session === undefined) return <div className="bam-root" style={{ minHeight: "100vh" }}><Style /></div>;
  if (!session) return <AuthScreen />;
  return <ClubApp user={session.user} />;
}

/* ==================================================================== */
function ClubApp({ user }) {
  const [tab, setTab] = useState("dashboard");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [parents, setParents] = useState([]);
  const [players, setPlayers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [merch, setMerch] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [myProfile, setMyProfile] = useState(null);

  const [playerModal, setPlayerModal] = useState(null);
  const [parentModal, setParentModal] = useState(null);
  const [enrollModal, setEnrollModal] = useState(null);
  const [dayModal, setDayModal] = useState(null);
  const [merchModal, setMerchModal] = useState(null);
  const [stockModal, setStockModal] = useState(null);
  const [packageModal, setPackageModal] = useState(null);
  const [search, setSearch] = useState("");

  const profileName = (id) => profiles.find((p) => p.id === id)?.username || "—";
  const parentById = (id) => parents.find((p) => p.id === id);
  const playerById = (id) => players.find((p) => p.id === id);

  const fetchCore = async () => {
    try {
      const [pa, pl, pk, en, me, pr, myPr] = await Promise.all([
        supabase.from("parents").select("*").order("name"),
        supabase.from("players").select("*").order("name"),
        supabase.from("packages").select("*").order("sort_order"),
        supabase.from("enrollments").select("*"),
        supabase.from("merchandise").select("*").order("item"),
        supabase.from("profiles").select("*"),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      ]);
      for (const r of [pa, pl, pk, en, me, pr]) if (r.error) throw r.error;
      setParents(pa.data); setPlayers(pl.data); setPackages(pk.data); setEnrollments(en.data); setMerch(me.data); setProfiles(pr.data);
      setMyProfile(myPr.data || null);
      setError(null);
    } catch (e) {
      setError(e.message || "Failed to load data.");
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => { fetchCore(); }, []);

  /* ---- parents / players ---- */
  const upsertParent = async (parent) => {
    if (parent.id) await supabase.from("parents").update({ name: parent.name, phone: parent.phone, email: parent.email, updated_by: user.id, updated_at: new Date().toISOString() }).eq("id", parent.id);
    else await supabase.from("parents").insert({ name: parent.name, phone: parent.phone, email: parent.email, created_by: user.id });
    await fetchCore();
  };
  const deleteParent = async (id) => {
    if (players.some((p) => p.parent_id === id)) { alert("This parent still has players linked. Reassign or remove those players first."); return; }
    await supabase.from("parents").delete().eq("id", id);
    await fetchCore();
  };
  const upsertPlayer = async (player) => {
    if (player.id) await supabase.from("players").update({ name: player.name, nickname: player.nickname, birth_date: player.birthDate, parent_id: player.parentId, updated_by: user.id, updated_at: new Date().toISOString() }).eq("id", player.id);
    else await supabase.from("players").insert({ name: player.name, nickname: player.nickname, birth_date: player.birthDate, parent_id: player.parentId, created_by: user.id });
    await fetchCore();
  };
  const deletePlayer = async (id) => { await supabase.from("players").delete().eq("id", id); await fetchCore(); };

  /* ---- packages ---- */
  const upsertPackage = async (pkg) => {
    const row = { id: pkg.id, name: pkg.name, description: pkg.description, amount: pkg.amount, credits: pkg.credits, expiry_days: pkg.expiryDays, terms: pkg.terms, sort_order: pkg.sortOrder };
    const exists = packages.some((p) => p.id === pkg.id);
    if (exists) await supabase.from("packages").update(row).eq("id", pkg.id);
    else await supabase.from("packages").insert({ ...row, id: row.id || uid() });
    await fetchCore();
  };
  const deletePackage = async (id) => {
    if (enrollments.some((e) => e.package_id === id)) { alert("Players have enrollments under this package, so it can't be deleted. You can still edit its details."); return; }
    await supabase.from("packages").delete().eq("id", id);
    await fetchCore();
  };

  /* ---- enrollments / payments ---- */
  const enrollPlayer = async (playerId, packageId, startDate) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return;
    const { data: enrData, error: enrErr } = await supabase.from("enrollments").insert({
      player_id: playerId, package_id: pkg.id, package_name: pkg.name, start_date: startDate,
      expiry_date: addDays(startDate, pkg.expiry_days), credits: pkg.credits, credits_remaining: pkg.credits,
      terms: pkg.terms, terms_paid: 1, amount: pkg.amount, created_by: user.id,
    }).select().single();
    if (enrErr) { alert(enrErr.message); return; }
    const termAmount = pkg.terms > 1 ? pkg.amount / pkg.terms : pkg.amount;
    await supabase.from("payment_log").insert({
      player_id: playerId, enrollment_id: enrData.id, package_name: pkg.name, amount: termAmount,
      term_label: pkg.terms > 1 ? `Term 1 of ${pkg.terms}` : "Full payment", created_by: user.id,
    });
    await fetchCore();
  };
  const payNextTerm = async (enr) => {
    if (enr.terms_paid >= enr.terms) return;
    const newTermsPaid = enr.terms_paid + 1;
    await supabase.from("enrollments").update({ terms_paid: newTermsPaid }).eq("id", enr.id);
    await supabase.from("payment_log").insert({
      player_id: enr.player_id, enrollment_id: enr.id, package_name: enr.package_name, amount: enr.amount / enr.terms,
      term_label: `Term ${newTermsPaid} of ${enr.terms}`, created_by: user.id,
    });
    await fetchCore();
  };

  /* ---- merchandise / inventory ---- */
  const upsertMerch = async (sku) => {
    await supabase.from("merchandise").update({ item: sku.item, size: sku.size, price: sku.price, stock: sku.stock }).eq("id", sku.id);
    await fetchCore();
  };
  const addProductBulk = async (item, price, sizes, initialStock) => {
    await supabase.from("merchandise").insert(sizes.map((size) => ({ item, size, price, stock: initialStock })));
    await fetchCore();
  };
  const deleteMerch = async (id) => { await supabase.from("merchandise").delete().eq("id", id); await fetchCore(); };
  const addStock = async (sku, qty, note) => {
    await supabase.from("merchandise").update({ stock: sku.stock + qty }).eq("id", sku.id);
    await supabase.from("stock_log").insert({ sku_id: sku.id, item: sku.item, size: sku.size, qty, note, created_by: user.id });
    await fetchCore();
  };

  /* ---- attendance (scoped per-day; enrollments updated directly) ---- */
  const toggleAttendance = async (playerId, date, sessionType, noCredit, existingRecord) => {
    if (existingRecord) {
      if (existingRecord.enrollment_id) {
        const enr = enrollments.find((e) => e.id === existingRecord.enrollment_id);
        if (enr && enr.credits !== null) await supabase.from("enrollments").update({ credits_remaining: enr.credits_remaining + 1 }).eq("id", enr.id);
      }
      await supabase.from("attendance").delete().eq("id", existingRecord.id);
    } else {
      let enrollmentId = null;
      if (!noCredit) {
        const enr = activeEnrollmentFor(enrollments, playerId, date);
        if (enr) {
          enrollmentId = enr.id;
          if (enr.credits !== null) await supabase.from("enrollments").update({ credits_remaining: enr.credits_remaining - 1 }).eq("id", enr.id);
        }
      }
      await supabase.from("attendance").insert({ player_id: playerId, date, session_type: sessionType, enrollment_id: enrollmentId, no_credit: !!noCredit, created_by: user.id });
    }
    await fetchCore(); // refresh enrollments' credit counts
  };

  /* ---- sales ---- */
  const recordSale = async (sale) => {
    const { error: saleErr } = await supabase.from("sales").insert({
      date: sale.date, player_id: sale.playerId, lines: sale.lines, discount: sale.discount, subtotal: sale.subtotal, total: sale.total, created_by: user.id,
    });
    if (saleErr) { alert(saleErr.message); return; }
    for (const line of sale.lines) {
      const ids = line.kind === "kit" ? [line.jerseySkuId, line.shortSkuId] : [line.skuId];
      for (const skuId of ids) {
        const m = merch.find((x) => x.id === skuId);
        if (m) await supabase.from("merchandise").update({ stock: m.stock - line.qty }).eq("id", skuId);
      }
    }
    await fetchCore();
  };
  const voidSale = async (sale) => {
    for (const line of sale.lines) {
      const ids = line.kind === "kit" ? [line.jerseySkuId, line.shortSkuId] : [line.skuId];
      for (const skuId of ids) {
        const m = merch.find((x) => x.id === skuId);
        if (m) await supabase.from("merchandise").update({ stock: m.stock + line.qty }).eq("id", skuId);
      }
    }
    await supabase.from("sales").delete().eq("id", sale.id);
    await fetchCore();
  };

  if (!loaded) {
    return <div className="bam-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><Style /><div style={{ color: "#6B6B78" }}>Loading BAM Admin Tool…</div></div>;
  }

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "players", label: "Players", icon: Users },
    { id: "parents", label: "Parents", icon: UserCircle2 },
    { id: "attendance", label: "Attendance", icon: CalendarDays },
    { id: "packages", label: "Packages", icon: PackageSearch },
    { id: "merch", label: "Merchandise", icon: ShoppingBag },
    { id: "inventory", label: "Inventory", icon: Boxes },
    { id: "sales", label: "Daily Sales", icon: Receipt },
    { id: "revenue", label: "Revenue", icon: Wallet },
  ];

  return (
    <div className="bam-root" style={{ display: "flex", minHeight: "100vh" }}>
      <Style />
      <div style={{ width: 208, background: "var(--navy)", padding: "18px 12px", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        <div style={{ padding: "2px 8px 20px" }}>
          <div style={{ width: 34, height: 34, background: "var(--maroon)", borderRadius: 6, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="bam-display" style={{ color: "#fff", fontSize: 14 }}>B</span>
          </div>
          <div className="bam-display" style={{ color: "#fff", fontSize: 15, lineHeight: 1.15 }}>BAM ADMIN<br />TOOL</div>
          <div style={{ color: "#8484A0", fontSize: 11, marginTop: 6 }}>{fmtDate(todayStr())}</div>
        </div>
        {NAV.map((n) => (
          <div key={n.id} className={"bam-nav-item" + (tab === n.id ? " active" : "")} onClick={() => setTab(n.id)}>
            <n.icon size={16} /> {n.label}
          </div>
        ))}
        <div style={{ marginTop: "auto", padding: "10px" }}>
          <div style={{ color: "#C7C7DA", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{myProfile?.username || user.email}</div>
          <button className="bam-btn" style={{ width: "100%", justifyContent: "center", background: "transparent", color: "#C7C7DA", border: "1px solid #2E2C5C" }} onClick={() => supabase.auth.signOut()}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>

      <div className="bam-scroll" style={{ flex: 1, padding: 24, overflowY: "auto", background: "var(--bg)" }}>
        {error && <div className="bam-badge" style={{ background: "#FDEEF0", color: "var(--red)", marginBottom: 12 }}><AlertTriangle size={12} /> {error}</div>}

        {tab === "dashboard" && <Dashboard players={players} parents={parents} enrollments={enrollments} merch={merch} packages={packages} user={user} />}
        {tab === "players" && (
          <PlayersTab players={players} enrollments={enrollments} packages={packages} parentById={parentById}
            search={search} setSearch={setSearch}
            onAdd={() => setPlayerModal({})} onEdit={(p) => setPlayerModal(p)}
            onDelete={(id) => { if (confirm("Remove this player?")) deletePlayer(id); }}
            onEnroll={(id) => setEnrollModal(id)} onPayTerm={payNextTerm} profileName={profileName} />
        )}
        {tab === "parents" && <ParentsTab parents={parents} players={players} onAdd={() => setParentModal({})} onEdit={(p) => setParentModal(p)} onDelete={deleteParent} />}
        {tab === "attendance" && <AttendanceTab players={players} enrollments={enrollments} packages={packages} user={user} onDataChanged={fetchCore} />}
        {tab === "packages" && <PackagesTab packages={packages} enrollments={enrollments} onAdd={() => setPackageModal({ sortOrder: Math.max(0, ...packages.map((p) => p.sort_order || 0)) + 1 })} onEdit={(p) => setPackageModal(p)} onDelete={deletePackage} />}
        {tab === "merch" && <MerchTab merch={merch} onAdd={() => setMerchModal({ bulk: true })} onEdit={(m) => setMerchModal(m)} onDelete={deleteMerch} />}
        {tab === "inventory" && <InventoryTab merch={merch} onAddStock={(m) => setStockModal(m)} />}
        {tab === "sales" && <SalesTab players={players} merch={merch} user={user} onSaleRecorded={fetchCore} />}
        {tab === "revenue" && <RevenueTab players={players} />}
      </div>

      {playerModal && <PlayerModal player={playerModal} parents={parents} onClose={() => setPlayerModal(null)} onSave={async (p) => { await upsertPlayer(p); setPlayerModal(null); }} onNewParent={() => setParentModal({})} />}
      {parentModal && <ParentModal parent={parentModal} onClose={() => setParentModal(null)} onSave={async (p) => { await upsertParent(p); setParentModal(null); }} />}
      {enrollModal && <EnrollModal player={playerById(enrollModal)} packages={packages} onClose={() => setEnrollModal(null)} onSave={async (pkgId, start) => { await enrollPlayer(enrollModal, pkgId, start); setEnrollModal(null); }} />}
      {packageModal && <PackageModal pkg={packageModal} onClose={() => setPackageModal(null)} onSave={async (p) => { await upsertPackage(p); setPackageModal(null); }} />}
      {merchModal && (
        merchModal.bulk
          ? <AddProductModal onClose={() => setMerchModal(null)} onSave={async (item, price, sizes, stock) => { await addProductBulk(item, price, sizes, stock); setMerchModal(null); }} />
          : <EditMerchModal sku={merchModal} onClose={() => setMerchModal(null)} onSave={async (m) => { await upsertMerch(m); setMerchModal(null); }} />
      )}
      {stockModal && <AddStockModal sku={stockModal} onClose={() => setStockModal(null)} onSave={async (qty, note) => { await addStock(stockModal, qty, note); setStockModal(null); }} />}
    </div>
  );
}

/* -------------------------------- Dashboard -------------------------------- */
function Dashboard({ players, parents, enrollments, merch, packages, user }) {
  const [revenueToday, setRevenueToday] = useState(0);
  const [revenueMonth, setRevenueMonth] = useState(0);
  const today = todayStr();
  const thisMonth = today.slice(0, 7);

  useEffect(() => {
    (async () => {
      const [payToday, saleToday, payMonth, saleMonth] = await Promise.all([
        supabase.from("payment_log").select("amount").gte("created_at", today).lt("created_at", addDays(today, 1)),
        supabase.from("sales").select("total").eq("date", today),
        supabase.from("payment_log").select("amount").gte("created_at", thisMonth + "-01"),
        supabase.from("sales").select("total").gte("date", thisMonth + "-01"),
      ]);
      const sum = (r, key) => (r.data || []).reduce((s, x) => s + Number(x[key] || 0), 0);
      setRevenueToday(sum(payToday, "amount") + sum(saleToday, "total"));
      setRevenueMonth(sum(payMonth, "amount") + sum(saleMonth, "total"));
    })();
  }, []);

  const activeCount = players.filter((p) => activeEnrollmentFor(enrollments, p.id, today)).length;
  const expiringSoon = enrollments.filter((e) => enrollmentStatus(e, today) === "active" && (daysBetween(today, e.expiry_date) <= 7 || (e.credits !== null && e.credits_remaining <= 2)));
  const lowStock = merch.filter((m) => m.stock <= 3);

  const stat = (label, value, icon, color) => (
    <div className="bam-card" style={{ padding: 16, flex: 1, minWidth: 150 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div><div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>{label}</div><div className="bam-display" style={{ fontSize: 24 }}>{value}</div></div>
        <div style={{ background: color, borderRadius: 6, padding: 8, display: "flex" }}>{icon}</div>
      </div>
    </div>
  );

  return (
    <div>
      <h2 className="bam-display" style={{ fontSize: 21, marginBottom: 4 }}>Dashboard</h2>
      <p style={{ color: "var(--muted)", marginTop: 0, marginBottom: 18 }}>{fmtDate(today)}</p>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        {stat("Total Players", players.length, <Users size={16} color="#fff" />, "var(--navy)")}
        {stat("Active Packages", activeCount, <ShieldCheck size={16} color="#fff" />, "var(--blue)")}
        {stat("Revenue Today", fmtMoney(revenueToday), <Wallet size={16} color="#fff" />, "var(--maroon)")}
        {stat("Revenue This Month", fmtMoney(revenueMonth), <Receipt size={16} color="var(--navy)" />, "var(--yellow)")}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div className="bam-card" style={{ padding: 16, flex: 1, minWidth: 280 }}>
          <h3 style={{ fontSize: 14, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}><Clock size={15} /> Expiring or running low</h3>
          {expiringSoon.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>Nothing needs attention right now.</p>}
          {expiringSoon.slice(0, 8).map((e) => {
            const pl = players.find((p) => p.id === e.player_id);
            return (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                <span>{pl ? pl.name : "—"} <span style={{ color: "var(--muted)" }}>· {e.package_name}</span></span>
                <span style={{ color: "var(--red)", fontWeight: 600 }}>{e.credits !== null ? `${e.credits_remaining} left` : `${daysBetween(today, e.expiry_date)}d left`}</span>
              </div>
            );
          })}
        </div>
        <div className="bam-card" style={{ padding: 16, flex: 1, minWidth: 280 }}>
          <h3 style={{ fontSize: 14, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}><Boxes size={15} /> Low merchandise stock</h3>
          {lowStock.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>All items well stocked.</p>}
          {lowStock.slice(0, 8).map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
              <span>{m.item} <span style={{ color: "var(--muted)" }}>· {m.size}</span></span>
              <span className="bam-lowstock">{m.stock} left</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 16, fontSize: 12, color: "#9494AA" }}>Parents on file: {parents.length}</div>
    </div>
  );
}

/* --------------------------------- Players --------------------------------- */
function PlayersTab({ players, enrollments, packages, parentById, search, setSearch, onAdd, onEdit, onDelete, onEnroll, onPayTerm, profileName }) {
  const [expanded, setExpanded] = useState(null);
  const [reportPlayer, setReportPlayer] = useState(null);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [coverageFrom, setCoverageFrom] = useState(todayStr().slice(0, 8) + "01");
  const [coverageTo, setCoverageTo] = useState(todayStr());
  const [exporting, setExporting] = useState(false);
  const today = todayStr();
  const pkgById = (id) => packages.find((p) => p.id === id);
  const filtered = players.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || (p.nickname || "").toLowerCase().includes(search.toLowerCase()));

  const packageNameFor = (p) => { const enr = activeEnrollmentFor(enrollments, p.id, today); return enr ? enr.package_name : ""; };
  const sorted = [...filtered].sort((a, b) => {
    let av, bv;
    if (sortKey === "birthDate") { av = a.birth_date || ""; bv = b.birth_date || ""; }
    else if (sortKey === "package") { av = (packageNameFor(a) || "\uffff").toLowerCase(); bv = (packageNameFor(b) || "\uffff").toLowerCase(); }
    else { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });
  const clickSort = (key) => { if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc")); else { setSortKey(key); setSortDir("asc"); } };
  const arrow = (key) => (sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  const exportData = async () => {
    setExporting(true);
    try {
      const { data: trainingRows } = await supabase.from("attendance").select("player_id, date").eq("session_type", "training").gte("date", coverageFrom).lte("date", coverageTo);
      const allDates = new Set((trainingRows || []).map((r) => r.date));
      const byPlayer = {};
      (trainingRows || []).forEach((r) => { (byPlayer[r.player_id] = byPlayer[r.player_id] || new Set()).add(r.date); });
      const pctFor = (playerId) => (allDates.size ? Math.round(((byPlayer[playerId]?.size || 0) / allDates.size) * 100) : null);

      const rows = [["Player Name", "Nickname", "Birthday", "Age", "Package", "Credits Remaining", "Expiry Date", "Parent", `Attendance % (${coverageFrom} to ${coverageTo})`]];
      sorted.forEach((p) => {
        const enr = activeEnrollmentFor(enrollments, p.id, today);
        const parent = parentById(p.parent_id);
        const pct = pctFor(p.id);
        rows.push([p.name, p.nickname || "", p.birth_date, age(p.birth_date), enr ? enr.package_name : "", enr ? (enr.credits !== null ? `${enr.credits_remaining}/${enr.credits}` : "Unlimited") : "", enr ? enr.expiry_date : "", parent ? parent.name : "", pct === null ? "" : pct + "%"]);
      });
      downloadCSV("players.csv", rows);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 className="bam-display" style={{ fontSize: 21, margin: 0 }}>Players</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 9, top: 10, color: "#9494AA" }} />
            <input className="bam-input" style={{ paddingLeft: 28, width: 190 }} placeholder="Search players" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Coverage</span>
            <input type="date" className="bam-input" style={{ width: 138 }} value={coverageFrom} onChange={(e) => setCoverageFrom(e.target.value)} />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>to</span>
            <input type="date" className="bam-input" style={{ width: 138 }} value={coverageTo} onChange={(e) => setCoverageTo(e.target.value)} />
          </div>
          <button className="bam-btn bam-btn-ghost" disabled={exporting} onClick={exportData}><Download size={14} /> {exporting ? "Preparing…" : "Export Data"}</button>
          <button className="bam-btn bam-btn-primary" onClick={onAdd}><Plus size={15} /> Add Player</button>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "#9494AA", marginTop: -8, marginBottom: 12 }}>Click Name, Birthday, or Package to sort. Coverage dates set the attendance-% window used in the export.</p>
      <div className="bam-card" style={{ overflow: "hidden" }}>
        <table className="bam-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ cursor: "pointer" }} onClick={() => clickSort("name")}>Name{arrow("name")}</th>
              <th>Nickname</th>
              <th style={{ cursor: "pointer" }} onClick={() => clickSort("birthDate")}>Birthday{arrow("birthDate")}</th>
              <th>Age</th>
              <th style={{ cursor: "pointer" }} onClick={() => clickSort("package")}>Package{arrow("package")}</th>
              <th>Credits / Expiry</th>
              <th>Parent</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const enr = activeEnrollmentFor(enrollments, p.id, today);
              const parent = parentById(p.parent_id);
              const isOpen = expanded === p.id;
              return (
                <React.Fragment key={p.id}>
                  <tr style={{ cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : p.id)}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ color: "var(--muted)" }}>{p.nickname || "—"}</td>
                    <td>{fmtDate(p.birth_date)}</td>
                    <td>{age(p.birth_date)}</td>
                    <td>{enr ? enr.package_name : <span className="bam-badge" style={{ background: "#FDEEF0", color: "var(--red)" }}>No package</span>}</td>
                    <td>{enr ? <span className="bam-badge" style={{ background: "#E9EFF9", color: "var(--blue)" }}>{enr.credits !== null ? `${enr.credits_remaining}/${enr.credits} credits` : "Unlimited"} · exp {fmtDate(enr.expiry_date)}</span> : "—"}</td>
                    <td>{parent ? parent.name : <span style={{ color: "var(--red)" }}>Unassigned</span>}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="bam-btn bam-btn-ghost" style={{ padding: 6 }} title="Attendance report" onClick={() => setReportPlayer(p)}><Percent size={13} /></button>
                        <button className="bam-btn bam-btn-ghost" style={{ padding: 6 }} onClick={() => onEnroll(p.id)}><CreditCard size={13} /></button>
                        <button className="bam-btn bam-btn-ghost" style={{ padding: 6 }} onClick={() => onEdit(p)}><Pencil size={13} /></button>
                        <button className="bam-btn bam-btn-danger" style={{ padding: 6 }} onClick={() => onDelete(p.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                  {isOpen && <tr><td colSpan={8} style={{ background: "#F9F9FC" }}><PlayerDetail player={p} enrollments={enrollments.filter((e) => e.player_id === p.id)} onPayTerm={onPayTerm} profileName={profileName} /></td></tr>}
                </React.Fragment>
              );
            })}
            {sorted.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", color: "#9494AA", padding: 24 }}>No players found.</td></tr>}
          </tbody>
        </table>
      </div>
      {reportPlayer && <AttendanceReportModal player={reportPlayer} onClose={() => setReportPlayer(null)} />}
    </div>
  );
}

function PlayerDetail({ player, enrollments, onPayTerm, profileName }) {
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loadingAtt, setLoadingAtt] = useState(true);
  const hist = [...enrollments].sort((a, b) => b.start_date.localeCompare(a.start_date));

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("attendance").select("*").eq("player_id", player.id).order("date", { ascending: false }).limit(8);
      setRecentAttendance(data || []);
      setLoadingAtt(false);
    })();
  }, [player.id]);

  return (
    <div style={{ padding: "12px 16px 18px", display: "flex", gap: 24, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 260 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase" }}>Package history</div>
        {hist.length === 0 && <div style={{ fontSize: 13, color: "#9494AA" }}>No enrollments yet.</div>}
        {hist.map((e) => {
          const status = enrollmentStatus(e, todayStr());
          const color = status === "active" ? "var(--blue)" : status === "expired" ? "var(--red)" : "#8A6D1F";
          return (
            <div key={e.id} style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><strong>{e.package_name}</strong><span style={{ color, fontWeight: 700, textTransform: "capitalize" }}>{status.replace("-", " ")}</span></div>
              <div style={{ color: "var(--muted)" }}>{fmtDate(e.start_date)} → {fmtDate(e.expiry_date)} · {e.credits !== null ? `${e.credits_remaining}/${e.credits} credits` : "Unlimited"}</div>
              <div style={{ color: "#9494AA", fontSize: 11 }}>Enrolled by {profileName(e.created_by)} · {fmtDateTime(e.created_at)}</div>
              {e.terms > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span style={{ color: "var(--muted)" }}>Payment terms: {e.terms_paid}/{e.terms} paid ({fmtMoney(e.amount / e.terms)} each)</span>
                  {e.terms_paid < e.terms && <button className="bam-btn bam-btn-ghost" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => onPayTerm(e)}>Mark next term paid</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase" }}>Recent attendance</div>
        {loadingAtt && <div style={{ fontSize: 13, color: "#9494AA" }}>Loading…</div>}
        {!loadingAtt && recentAttendance.length === 0 && <div style={{ fontSize: 13, color: "#9494AA" }}>No attendance logged.</div>}
        {recentAttendance.map((a) => {
          const c = sessionTypeColor(a.session_type);
          return (
            <div key={a.id} style={{ fontSize: 13, padding: "5px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{fmtDate(a.date)}</span>
                <span className="bam-badge" style={{ background: c.bg, color: c.fg, textTransform: "capitalize" }}>{a.session_type}</span>
              </div>
              {a.no_credit && <div style={{ color: "var(--blue)", fontSize: 11 }}>Attendance only — no credit deducted</div>}
              {!a.no_credit && !a.enrollment_id && <div style={{ color: "var(--red)", fontSize: 11 }}>No active package — nothing deducted</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------- Attendance % report (scoped queries, quick view) --------------------------- */
function AttendanceReportModal({ player, onClose }) {
  const [coverageFrom, setCoverageFrom] = useState(() => todayStr().slice(0, 4) + "-01-01");
  const [coverageTo, setCoverageTo] = useState(todayStr());
  const [monthsMap, setMonthsMap] = useState({});
  const [loaded, setLoadedR] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadedR(false);
      const [clubWide, mine] = await Promise.all([
        supabase.from("attendance").select("date").eq("session_type", "training").gte("date", coverageFrom).lte("date", coverageTo),
        supabase.from("attendance").select("date").eq("session_type", "training").eq("player_id", player.id).gte("date", coverageFrom).lte("date", coverageTo),
      ]);
      const map = {};
      (clubWide.data || []).forEach((a) => { const k = a.date.slice(0, 7); if (!map[k]) map[k] = { all: new Set(), mine: new Set() }; map[k].all.add(a.date); });
      (mine.data || []).forEach((a) => { const k = a.date.slice(0, 7); if (!map[k]) map[k] = { all: new Set(), mine: new Set() }; map[k].mine.add(a.date); });
      setMonthsMap(map);
      setLoadedR(true);
    })();
  }, [player.id, coverageFrom, coverageTo]);

  const months = Object.keys(monthsMap).sort().reverse();
  let totalAll = 0, totalMine = 0;
  months.forEach((k) => { totalAll += monthsMap[k].all.size; totalMine += monthsMap[k].mine.size; });
  const overallPct = totalAll ? Math.round((totalMine / totalAll) * 100) : 0;

  return (
    <Modal title={`Attendance Report — ${player.name}`} onClose={onClose} wide>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Coverage</span>
        <input type="date" className="bam-input" style={{ width: 150 }} value={coverageFrom} onChange={(e) => setCoverageFrom(e.target.value)} />
        <span style={{ fontSize: 12, color: "var(--muted)" }}>to</span>
        <input type="date" className="bam-input" style={{ width: 150 }} value={coverageTo} onChange={(e) => setCoverageTo(e.target.value)} />
      </div>
      {!loaded ? <p style={{ color: "#9494AA" }}>Loading…</p> : (
        <>
          <div className="bam-card" style={{ padding: 14, marginBottom: 14, background: "#E9EFF9" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Training attendance in this range</div>
            <div className="bam-display" style={{ fontSize: 22 }}>{overallPct}%</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{totalMine} of {totalAll} training days</div>
          </div>
          <table className="bam-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th>Month</th><th>Training Days Held</th><th>Days Attended</th><th>Attendance %</th></tr></thead>
            <tbody>
              {months.map((k) => {
                const { all, mine } = monthsMap[k]; const pct = all.size ? Math.round((mine.size / all.size) * 100) : 0;
                return (<tr key={k}><td>{monthLabel(k)}</td><td>{all.size}</td><td>{mine.size}</td><td style={{ fontWeight: 700, color: pct >= 75 ? "var(--blue)" : pct >= 50 ? "var(--navy)" : "var(--red)" }}>{pct}%</td></tr>);
              })}
              {months.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: "#9494AA", padding: 20 }}>No training attendance logged in this range.</td></tr>}
            </tbody>
          </table>
          <p style={{ fontSize: 11, color: "#9494AA", marginTop: 10 }}>This is a quick view. The full attendance-% figure is already included in the Players tab's Export Data file.</p>
        </>
      )}
    </Modal>
  );
}

/* --------------------------------- Parents --------------------------------- */
function ParentsTab({ parents, players, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const filtered = parents.filter((pa) => pa.name.toLowerCase().includes(search.toLowerCase()) || (pa.phone || "").includes(search) || (pa.email || "").toLowerCase().includes(search.toLowerCase()));
  const exportCSV = () => {
    const rows = [["Parent Name", "Phone", "Email", "Players"]];
    filtered.forEach((pa) => { const kids = players.filter((p) => p.parent_id === pa.id).map((k) => k.name).join("; "); rows.push([pa.name, pa.phone || "", pa.email || "", kids]); });
    downloadCSV("parents.csv", rows);
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 className="bam-display" style={{ fontSize: 21, margin: 0 }}>Parents</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 9, top: 10, color: "#9494AA" }} />
            <input className="bam-input" style={{ paddingLeft: 28, width: 190 }} placeholder="Search parents" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="bam-btn bam-btn-ghost" onClick={exportCSV}><Download size={14} /> Export Data</button>
          <button className="bam-btn bam-btn-primary" onClick={onAdd}><Plus size={15} /> Add Parent</button>
        </div>
      </div>
      <div className="bam-card" style={{ overflow: "hidden" }}>
        <table className="bam-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th>Name</th><th>Contact</th><th>Players</th><th></th></tr></thead>
          <tbody>
            {filtered.map((pa) => {
              const kids = players.filter((p) => p.parent_id === pa.id);
              return (
                <tr key={pa.id}>
                  <td style={{ fontWeight: 600 }}>{pa.name}</td>
                  <td style={{ color: "var(--muted)" }}>{pa.phone || pa.email || "—"}</td>
                  <td>{kids.length === 0 ? <span style={{ color: "#9494AA" }}>None linked</span> : kids.map((k) => k.name).join(", ")}</td>
                  <td><div style={{ display: "flex", gap: 6 }}>
                    <button className="bam-btn bam-btn-ghost" style={{ padding: 6 }} onClick={() => onEdit(pa)}><Pencil size={13} /></button>
                    <button className="bam-btn bam-btn-danger" style={{ padding: 6 }} onClick={() => onDelete(pa.id)}><Trash2 size={13} /></button>
                  </div></td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: "#9494AA", padding: 24 }}>No parents found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------- Attendance (month-scoped) -------------------------------- */
function AttendanceTab({ players, enrollments, packages, user, onDataChanged }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [monthAttendance, setMonthAttendance] = useState([]);
  const [dayModalDate, setDayModalDate] = useState(null);
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const monthLabelStr = cursor.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  const today = todayStr();
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const loadMonth = async () => {
    const { data } = await supabase.from("attendance").select("date, session_type").gte("date", monthStart).lte("date", monthEnd);
    setMonthAttendance(data || []);
  };
  useEffect(() => { loadMonth(); }, [year, month]);

  const countsFor = (day) => {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayRecords = monthAttendance.filter((a) => a.date === ds);
    return { training: dayRecords.filter((a) => a.session_type === "training").length, match: dayRecords.filter((a) => a.session_type === "match").length };
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 className="bam-display" style={{ fontSize: 21, margin: 0 }}>Attendance Calendar</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)" }}><span style={{ width: 9, height: 9, borderRadius: 3, background: "var(--blue)", display: "inline-block" }} /> Training</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)" }}><span style={{ width: 9, height: 9, borderRadius: 3, background: "var(--maroon)", display: "inline-block" }} /> Match</span>
          <button className="bam-btn bam-btn-ghost" style={{ padding: 6 }} onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft size={15} /></button>
          <span style={{ fontWeight: 700, minWidth: 150, textAlign: "center" }}>{monthLabelStr}</span>
          <button className="bam-btn bam-btn-ghost" style={{ padding: 6 }} onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight size={15} /></button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8, marginBottom: 6 }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} style={{ fontSize: 11, fontWeight: 700, color: "#9494AA", textAlign: "center", textTransform: "uppercase" }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const { training, match } = countsFor(day);
          return (
            <div key={i} className={"bam-day" + (ds === today ? " today" : "")} onClick={() => setDayModalDate(ds)}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{day}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 6 }}>
                {training > 0 && <div style={{ fontSize: 9, fontWeight: 700, color: "var(--blue)", textTransform: "uppercase" }}>Training · {training}</div>}
                {match > 0 && <div style={{ fontSize: 9, fontWeight: 700, color: "var(--maroon)", textTransform: "uppercase" }}>Match · {match}</div>}
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 12, color: "#9494AA", marginTop: 14 }}>Click any day to mark players present for a training or match day. Blue = training, maroon = match.</p>
      {dayModalDate && (
        <DayModal date={dayModalDate} players={players} enrollments={enrollments} packages={packages} user={user}
          onClose={() => setDayModalDate(null)}
          onChanged={async () => { await loadMonth(); await onDataChanged(); }} />
      )}
    </div>
  );
}

function DayModal({ date, players, enrollments, packages, user, onClose, onChanged }) {
  const [noCreditSet, setNoCreditSet] = useState(new Set()); // keys: `${playerId}:${type}`
  const [records, setRecords] = useState([]);
  const [loadingDay, setLoadingDay] = useState(true);
  const [busyKey, setBusyKey] = useState(null); // prevents double-click while a write is in flight

  const loadDay = async () => {
    const { data } = await supabase.from("attendance").select("*").eq("date", date);
    setRecords(data || []);
    setLoadingDay(false);
  };
  useEffect(() => { loadDay(); }, [date]);

  const recordFor = (id, type) => records.find((r) => r.player_id === id && r.session_type === type);
  const toggleNoCredit = (id, type) => setNoCreditSet((prev) => { const key = `${id}:${type}`; const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
  const trainingCount = records.filter((r) => r.session_type === "training").length;
  const matchCount = records.filter((r) => r.session_type === "match").length;

  const handleToggle = async (playerId, type, existing) => {
    const key = `${playerId}:${type}`;
    setBusyKey(key);
    try {
      if (existing) {
        if (existing.enrollment_id) {
          const enr = enrollments.find((e) => e.id === existing.enrollment_id);
          if (enr && enr.credits !== null) await supabase.from("enrollments").update({ credits_remaining: enr.credits_remaining + 1 }).eq("id", enr.id);
        }
        await supabase.from("attendance").delete().eq("id", existing.id);
      } else {
        const noCredit = noCreditSet.has(key);
        let enrollmentId = null;
        if (!noCredit) {
          const enr = activeEnrollmentFor(enrollments, playerId, date);
          if (enr) {
            enrollmentId = enr.id;
            if (enr.credits !== null) await supabase.from("enrollments").update({ credits_remaining: enr.credits_remaining - 1 }).eq("id", enr.id);
          }
        }
        await supabase.from("attendance").insert({ player_id: playerId, date, session_type: type, enrollment_id: enrollmentId, no_credit: noCredit, created_by: user.id });
      }
      await loadDay();
      await onChanged();
    } finally {
      setBusyKey(null);
    }
  };

  const countBlock = (label, count, color) => (
    <div style={{ textAlign: "center", minWidth: 110 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      <div className="bam-display" style={{ fontSize: 22, color }}>{count}</div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>present</div>
    </div>
  );

  return (
    <Modal title={`Attendance · ${fmtDate(date)}`} onClose={onClose} wide>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 20, marginBottom: 16 }}>
        {countBlock("Training Session", trainingCount, "var(--blue)")}
        {countBlock("Match Day", matchCount, "var(--maroon)")}
      </div>
      <div style={{ display: "flex", gap: 10, padding: "0 4px 8px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
        <div style={{ flex: 1 }}>Player</div>
        <div style={{ width: 150, textAlign: "center" }}>Training Session</div>
        <div style={{ width: 150, textAlign: "center" }}>Match Day</div>
      </div>
      {loadingDay ? <p style={{ color: "#9494AA" }}>Loading…</p> : (
        <div style={{ maxHeight: 400, overflowY: "auto" }} className="bam-scroll">
          {players.map((p) => {
            const enr = activeEnrollmentFor(enrollments, p.id, date);
            const trainingRec = recordFor(p.id, "training");
            const matchRec = recordFor(p.id, "match");

            const cell = (type, rec) => {
              const c = sessionTypeColor(type);
              const isPresent = !!rec;
              const key = `${p.id}:${type}`;
              return (
                <div style={{ width: 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <button className="bam-btn" disabled={busyKey === key} style={{ width: "100%", justifyContent: "center", background: isPresent ? c.fg : "#fff", color: isPresent ? "#fff" : c.fg, border: `1px solid ${c.fg}`, fontSize: 12, padding: "6px 8px" }} onClick={() => handleToggle(p.id, type, rec)}>
                    {isPresent ? <><CheckCircle2 size={13} /> Present</> : <><Circle size={13} /> Mark present</>}
                  </button>
                  {!isPresent && (
                    <label style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 4, color: "var(--muted)", cursor: "pointer", textAlign: "center" }}>
                      <input type="checkbox" checked={noCreditSet.has(key)} onChange={() => toggleNoCredit(p.id, type)} /> No credit
                    </label>
                  )}
                  {isPresent && rec.no_credit && <div style={{ fontSize: 10, color: "var(--blue)", textAlign: "center" }}>No credit deducted</div>}
                  {isPresent && !rec.no_credit && !rec.enrollment_id && <div style={{ fontSize: 10, color: "var(--red)", textAlign: "center" }}>No package</div>}
                </div>
              );
            };

            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderBottom: "1px solid var(--line)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}{p.nickname ? <span style={{ color: "var(--muted)", fontWeight: 400 }}> "{p.nickname}"</span> : ""}</div>
                  <div style={{ fontSize: 12, color: enr ? "var(--muted)" : "var(--red)" }}>{enr ? `${enr.package_name} · ${enr.credits !== null ? enr.credits_remaining + " credits left" : "unlimited"}` : "No active package"}</div>
                </div>
                {cell("training", trainingRec)}
                {cell("match", matchRec)}
              </div>
            );
          })}
          {players.length === 0 && <p style={{ color: "#9494AA", fontSize: 13 }}>Add players first.</p>}
        </div>
      )}
    </Modal>
  );
}

/* --------------------------------- Packages --------------------------------- */
function PackagesTab({ packages, enrollments, onAdd, onEdit, onDelete }) {
  const sorted = [...packages].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 className="bam-display" style={{ fontSize: 21, margin: 0 }}>Packages</h2>
        <button className="bam-btn bam-btn-primary" onClick={onAdd}><Plus size={15} /> Add Package</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map((pkg) => {
          const active = enrollments.filter((e) => e.package_id === pkg.id && enrollmentStatus(e, todayStr()) === "active").length;
          return (
            <div key={pkg.id} className="bam-card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              <div style={{ flex: "2 1 220px", minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{pkg.name}</div>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>{pkg.description}</div>
              </div>
              <div style={{ flex: "1 1 180px", fontSize: 12, color: "#9494AA", minWidth: 160 }}>
                {pkg.credits !== null ? `${pkg.credits} credits · ` : "Unlimited · "}{pkg.expiry_days} days{pkg.terms > 1 ? ` · ${pkg.terms} terms of ${fmtMoney(pkg.amount / pkg.terms)}` : ""}
              </div>
              <div className="bam-display" style={{ fontSize: 17, minWidth: 100, textAlign: "right" }}>{fmtMoney(pkg.amount)}</div>
              <div className="bam-badge" style={{ background: "#E9EFF9", color: "var(--blue)", flexShrink: 0 }}>{active} active</div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button className="bam-btn bam-btn-ghost" style={{ padding: 6 }} onClick={() => onEdit({ id: pkg.id, name: pkg.name, description: pkg.description, amount: pkg.amount, credits: pkg.credits, expiryDays: pkg.expiry_days, terms: pkg.terms, sortOrder: pkg.sort_order })}><Pencil size={13} /></button>
                <button className="bam-btn bam-btn-danger" style={{ padding: 6 }} onClick={() => { if (confirm(`Remove ${pkg.name}?`)) onDelete(pkg.id); }}><Trash2 size={13} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PackageModal({ pkg, onClose, onSave }) {
  const [name, setName] = useState(pkg.name || "");
  const [description, setDescription] = useState(pkg.description || "");
  const [amount, setAmount] = useState(pkg.amount ?? 0);
  const [unlimited, setUnlimited] = useState(pkg.credits === null || pkg.credits === undefined);
  const [credits, setCredits] = useState(pkg.credits ?? 10);
  const [expiryDays, setExpiryDays] = useState(pkg.expiryDays ?? 30);
  const [terms, setTerms] = useState(pkg.terms ?? 1);
  const [sortOrder, setSortOrder] = useState(pkg.sortOrder ?? 99);
  const submit = () => {
    if (!name.trim()) { alert("Package name is required."); return; }
    if (!expiryDays || expiryDays <= 0) { alert("Expiry days must be greater than 0."); return; }
    onSave({ id: pkg.id || uid(), name: name.trim(), description: description.trim(), amount: Number(amount) || 0, credits: unlimited ? null : (Number(credits) || 0), expiryDays: Number(expiryDays), terms: Number(terms) || 1, sortOrder: Number(sortOrder) || 0 });
  };
  return (
    <Modal title={pkg.id ? "Edit Package" : "Add Package"} onClose={onClose}>
      <label className="bam-label">Package Name</label>
      <input className="bam-input" style={{ marginBottom: 12 }} value={name} onChange={(e) => setName(e.target.value)} />
      <label className="bam-label">Description</label>
      <input className="bam-input" style={{ marginBottom: 12 }} value={description} onChange={(e) => setDescription(e.target.value)} />
      <label className="bam-label">Amount (₱)</label>
      <input type="number" className="bam-input" style={{ marginBottom: 12 }} value={amount} onChange={(e) => setAmount(e.target.value)} />
      <label className="bam-label">Session Credits</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}><input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} /> Unlimited</label>
        {!unlimited && <input type="number" className="bam-input" style={{ maxWidth: 120 }} value={credits} onChange={(e) => setCredits(e.target.value)} />}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><label className="bam-label">Expiry (days)</label><input type="number" className="bam-input" style={{ marginBottom: 16 }} value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} /></div>
        <div style={{ flex: 1 }}><label className="bam-label">Payment Terms</label><input type="number" min="1" className="bam-input" style={{ marginBottom: 16 }} value={terms} onChange={(e) => setTerms(e.target.value)} /></div>
      </div>
      <label className="bam-label">Position in list</label>
      <input type="number" className="bam-input" style={{ marginBottom: 6 }} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
      <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 0, marginBottom: 16 }}>Lower numbers show first. Packages are shown in this order rather than by price.</p>
      <button className="bam-btn bam-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={submit}>Save Package</button>
    </Modal>
  );
}

/* ------------------------------- Merchandise -------------------------------- */
function MerchTab({ merch, onAdd, onEdit, onDelete }) {
  const grouped = {};
  merch.forEach((m) => { (grouped[m.item] = grouped[m.item] || []).push(m); });
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 className="bam-display" style={{ fontSize: 21, margin: 0 }}>Merchandise</h2>
        <button className="bam-btn bam-btn-primary" onClick={onAdd}><Plus size={15} /> Add Product</button>
      </div>
      <div className="bam-card" style={{ padding: 12, marginBottom: 16, background: "#E9EFF9" }}>
        <strong>Full Kit — Jersey and Short</strong> · {fmtMoney(FULL_KIT_PRICE)} · built from any jersey + shorts variant, sold from the Daily Sales tab. Stock is deducted from those individual items.
      </div>
      {Object.keys(grouped).sort().map((itemName) => (
        <div key={itemName} className="bam-card" style={{ marginBottom: 14, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", fontWeight: 700, borderBottom: "1px solid var(--line)", background: "#F9F9FC" }}>{itemName}</div>
          <table className="bam-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th>Size</th><th>Price</th><th>Stock</th><th></th></tr></thead>
            <tbody>
              {grouped[itemName].map((m) => (
                <tr key={m.id}>
                  <td>{m.size}</td>
                  <td>{fmtMoney(m.price)}</td>
                  <td className={m.stock <= 3 ? "bam-lowstock" : ""}>{m.stock}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="bam-btn bam-btn-ghost" style={{ padding: 6 }} onClick={() => onEdit(m)}><Pencil size={13} /></button>
                      <button className="bam-btn bam-btn-danger" style={{ padding: 6 }} onClick={() => { if (confirm(`Remove ${itemName} (${m.size})?`)) onDelete(m.id); }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {merch.length === 0 && <p style={{ color: "#9494AA" }}>No products yet — add your first one.</p>}
    </div>
  );
}

function EditMerchModal({ sku, onClose, onSave }) {
  const [item, setItem] = useState(sku.item);
  const [size, setSize] = useState(sku.size);
  const [price, setPrice] = useState(sku.price);
  const [stock, setStock] = useState(sku.stock);
  return (
    <Modal title="Edit Product" onClose={onClose}>
      <label className="bam-label">Item Name</label>
      <input className="bam-input" style={{ marginBottom: 12 }} value={item} onChange={(e) => setItem(e.target.value)} />
      <label className="bam-label">Size</label>
      <input className="bam-input" style={{ marginBottom: 12 }} value={size} onChange={(e) => setSize(e.target.value)} />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><label className="bam-label">Price (₱)</label><input type="number" className="bam-input" style={{ marginBottom: 16 }} value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
        <div style={{ flex: 1 }}><label className="bam-label">Stock on hand</label><input type="number" className="bam-input" style={{ marginBottom: 16 }} value={stock} onChange={(e) => setStock(Number(e.target.value))} /></div>
      </div>
      <button className="bam-btn bam-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => onSave({ ...sku, item, size, price, stock })}>Save Changes</button>
    </Modal>
  );
}

function AddProductModal({ onClose, onSave }) {
  const [item, setItem] = useState("");
  const [price, setPrice] = useState(0);
  const [sizeMode, setSizeMode] = useState("standard");
  const [customSizes, setCustomSizes] = useState("");
  const [initialStock, setInitialStock] = useState(0);
  const resolvedSizes = sizeMode === "standard" ? STANDARD_SIZES : sizeMode === "socks" ? SOCK_SIZES : sizeMode === "onesize" ? ["One Size"] : customSizes.split(",").map((s) => s.trim()).filter(Boolean);
  const submit = () => {
    if (!item.trim()) { alert("Item name is required."); return; }
    if (resolvedSizes.length === 0) { alert("Add at least one size."); return; }
    onSave(item.trim(), Number(price) || 0, resolvedSizes, Number(initialStock) || 0);
  };
  return (
    <Modal title="Add Product" onClose={onClose}>
      <label className="bam-label">Item Name</label>
      <input className="bam-input" style={{ marginBottom: 12 }} placeholder="e.g. Jersey (White)" value={item} onChange={(e) => setItem(e.target.value)} />
      <label className="bam-label">Price (₱) — applies to all sizes below</label>
      <input type="number" className="bam-input" style={{ marginBottom: 12 }} value={price} onChange={(e) => setPrice(e.target.value)} />
      <label className="bam-label">Sizes</label>
      <select className="bam-input" style={{ marginBottom: 10 }} value={sizeMode} onChange={(e) => setSizeMode(e.target.value)}>
        <option value="standard">Standard apparel sizes (XS–XL, Kids &amp; Adult)</option>
        <option value="socks">Sock sizes (S, M, L, XL)</option>
        <option value="onesize">One size</option>
        <option value="custom">Custom (comma-separated)</option>
      </select>
      {sizeMode === "custom" && <input className="bam-input" style={{ marginBottom: 12 }} placeholder="e.g. 32, 34, 36" value={customSizes} onChange={(e) => setCustomSizes(e.target.value)} />}
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>Will create: {resolvedSizes.join(", ") || "—"}</div>
      <label className="bam-label">Initial stock per size</label>
      <input type="number" className="bam-input" style={{ marginBottom: 16 }} value={initialStock} onChange={(e) => setInitialStock(e.target.value)} />
      <button className="bam-btn bam-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={submit}>Add Product</button>
    </Modal>
  );
}

/* -------------------------------- Inventory (recent restock log) --------------------------------- */
function InventoryTab({ merch, onAddStock }) {
  const [recentLog, setRecentLog] = useState([]);
  useEffect(() => { (async () => { const { data } = await supabase.from("stock_log").select("*").order("created_at", { ascending: false }).limit(300); setRecentLog(data || []); })(); }, []);

  const totalUnits = merch.reduce((s, m) => s + m.stock, 0);
  const totalValue = merch.reduce((s, m) => s + m.stock * m.price, 0);
  const grouped = {};
  merch.forEach((m) => { (grouped[m.item] = grouped[m.item] || []).push(m); });
  const lastRestock = (skuId) => recentLog.find((l) => l.sku_id === skuId) || null;
  const latest = recentLog[0];

  const exportCSV = () => {
    const rows = [["Item", "Size", "Price", "Remaining Stock", "Last Restocked (last 300 entries)", "Restocked By"]];
    Object.keys(grouped).sort().forEach((itemName) => grouped[itemName].forEach((m) => {
      const lr = lastRestock(m.id);
      rows.push([itemName, m.size, m.price, m.stock, lr ? fmtDateTime(lr.created_at) : "", ""]);
    }));
    downloadCSV("inventory.csv", rows);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
        <div>
          <h2 className="bam-display" style={{ fontSize: 21, marginBottom: 4 }}>Inventory</h2>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>Live stock summary across all merchandise.</p>
        </div>
        <button className="bam-btn bam-btn-ghost" onClick={exportCSV}><Download size={14} /> Export Data</button>
      </div>
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <div className="bam-card" style={{ padding: 16, flex: 1, minWidth: 160 }}><div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Total units in stock</div><div className="bam-display" style={{ fontSize: 24 }}>{totalUnits}</div></div>
        <div className="bam-card" style={{ padding: 16, flex: 1, minWidth: 160 }}><div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Inventory value</div><div className="bam-display" style={{ fontSize: 24 }}>{fmtMoney(totalValue)}</div></div>
        <div className="bam-card" style={{ padding: 16, flex: 1, minWidth: 160 }}><div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Items low on stock (≤3)</div><div className="bam-display" style={{ fontSize: 24, color: "var(--red)" }}>{merch.filter((m) => m.stock <= 3).length}</div></div>
        <div className="bam-card" style={{ padding: 16, flex: 1.4, minWidth: 220 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>Latest stock addition</div>
          {latest ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{latest.item} — {latest.size} <span style={{ color: "var(--blue)" }}>+{latest.qty}</span></div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{fmtDateTime(latest.created_at)}{latest.note ? ` · ${latest.note}` : ""}</div>
            </>
          ) : <div style={{ fontSize: 13, color: "#9494AA" }}>No stock additions logged yet.</div>}
        </div>
      </div>
      <div className="bam-card" style={{ overflow: "hidden" }}>
        <table className="bam-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th>Item</th><th>Size</th><th>Remaining Stock</th><th>Last Restocked</th><th></th></tr></thead>
          <tbody>
            {Object.keys(grouped).sort().map((itemName) => grouped[itemName].map((m, idx) => {
              const lr = lastRestock(m.id);
              return (
                <tr key={m.id}>
                  <td style={{ fontWeight: idx === 0 ? 600 : 400 }}>{idx === 0 ? itemName : ""}</td>
                  <td>{m.size}</td>
                  <td className={m.stock <= 3 ? "bam-lowstock" : ""}>{m.stock}{m.stock <= 3 && <span className="bam-badge" style={{ marginLeft: 6, background: "#FDEEF0", color: "var(--red)" }}>Low</span>}</td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>{lr ? `${fmtDateTime(lr.created_at)} (+${lr.qty})` : "—"}</td>
                  <td><button className="bam-btn bam-btn-secondary" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => onAddStock(m)}><PackagePlus size={13} /> Add Stock</button></td>
                </tr>
              );
            }))}
            {merch.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "#9494AA", padding: 24 }}>No merchandise yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddStockModal({ sku, onClose, onSave }) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const submit = () => { const n = Number(qty); if (!n || n <= 0) { alert("Enter a quantity greater than 0."); return; } onSave(n, note.trim()); };
  return (
    <Modal title={`Add Stock — ${sku.item} (${sku.size})`} onClose={onClose}>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>Current stock: <strong>{sku.stock}</strong></div>
      <label className="bam-label">Quantity to add</label>
      <input type="number" min="1" className="bam-input" style={{ marginBottom: 12 }} value={qty} onChange={(e) => setQty(e.target.value)} />
      <label className="bam-label">Note (optional)</label>
      <input className="bam-input" style={{ marginBottom: 16 }} placeholder="e.g. Restock from supplier" value={note} onChange={(e) => setNote(e.target.value)} />
      <div style={{ fontSize: 12, color: "#9494AA", marginBottom: 12 }}>Logged with today's date, time, and your username automatically.</div>
      <button className="bam-btn bam-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={submit}>Add Stock</button>
    </Modal>
  );
}

/* -------------------------------- Daily Sales (date-range scoped) -------------------------------- */
function SalesTab({ players, merch, user, onSaleRecorded }) {
  const [date, setDate] = useState(todayStr());
  const [playerId, setPlayerId] = useState("");
  const [lines, setLines] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [pickerKind, setPickerKind] = useState("single");
  const [pickerSkuId, setPickerSkuId] = useState("");
  const [pickerJerseyId, setPickerJerseyId] = useState("");
  const [pickerShortId, setPickerShortId] = useState("");
  const [pickerQty, setPickerQty] = useState(1);
  const [dayList, setDayList] = useState([]);
  const [exportFrom, setExportFrom] = useState(todayStr());
  const [exportTo, setExportTo] = useState(todayStr());

  const loadDay = async () => {
    const { data } = await supabase.from("sales").select("*").eq("date", date).order("created_at", { ascending: false });
    setDayList(data || []);
  };
  useEffect(() => { loadDay(); }, [date]);

  const jerseyOptions = merch.filter((m) => m.item.toLowerCase().includes("jersey"));
  const shortOptions = merch.filter((m) => m.item.toLowerCase().includes("short"));
  const reserved = (skuId) => lines.reduce((s, l) => s + ((l.skuId === skuId || l.jerseySkuId === skuId || l.shortSkuId === skuId) ? l.qty : 0), 0);
  const availableStock = (skuId) => { const m = merch.find((x) => x.id === skuId); return m ? m.stock - reserved(skuId) : 0; };

  const addLine = () => {
    if (pickerKind === "single") {
      if (!pickerSkuId) { alert("Choose an item."); return; }
      const m = merch.find((x) => x.id === pickerSkuId);
      if (availableStock(pickerSkuId) < pickerQty) { alert(`Only ${availableStock(pickerSkuId)} left in stock.`); return; }
      setLines((ls) => [...ls, { id: uid(), kind: "single", skuId: pickerSkuId, label: `${m.item} — ${m.size}`, unitPrice: m.price, qty: pickerQty }]);
    } else {
      if (!pickerJerseyId || !pickerShortId) { alert("Choose both a jersey and a short for the kit."); return; }
      if (availableStock(pickerJerseyId) < pickerQty || availableStock(pickerShortId) < pickerQty) { alert("Not enough stock for one of the kit components."); return; }
      const j = merch.find((x) => x.id === pickerJerseyId); const s = merch.find((x) => x.id === pickerShortId);
      setLines((ls) => [...ls, { id: uid(), kind: "kit", jerseySkuId: pickerJerseyId, shortSkuId: pickerShortId, label: `Full Kit — ${j.item} (${j.size}) + ${s.item} (${s.size})`, unitPrice: FULL_KIT_PRICE, qty: pickerQty }]);
    }
    setPickerSkuId(""); setPickerJerseyId(""); setPickerShortId(""); setPickerQty(1);
  };
  const removeLine = (id) => setLines((ls) => ls.filter((l) => l.id !== id));
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));

  const completeSale = async () => {
    if (!playerId) { alert("Select the player this sale is connected to."); return; }
    if (lines.length === 0) { alert("Add at least one item."); return; }
    const { error: saleErr } = await supabase.from("sales").insert({ date, player_id: playerId, lines, discount: Number(discount) || 0, subtotal, total, created_by: user.id });
    if (saleErr) { alert(saleErr.message); return; }
    for (const line of lines) {
      const ids = line.kind === "kit" ? [line.jerseySkuId, line.shortSkuId] : [line.skuId];
      for (const skuId of ids) {
        const m = merch.find((x) => x.id === skuId);
        if (m) await supabase.from("merchandise").update({ stock: m.stock - line.qty }).eq("id", skuId);
      }
    }
    setLines([]); setDiscount(0); setPlayerId("");
    await loadDay();
    await onSaleRecorded();
  };

  const voidSale = async (sale) => {
    if (!confirm("Void this sale? Stock will be restored.")) return;
    for (const line of sale.lines) {
      const ids = line.kind === "kit" ? [line.jerseySkuId, line.shortSkuId] : [line.skuId];
      for (const skuId of ids) {
        const m = merch.find((x) => x.id === skuId);
        if (m) await supabase.from("merchandise").update({ stock: m.stock + line.qty }).eq("id", skuId);
      }
    }
    await supabase.from("sales").delete().eq("id", sale.id);
    await loadDay();
    await onSaleRecorded();
  };

  const playerName = (id) => players.find((p) => p.id === id)?.name || "—";

  const exportCSV = async () => {
    const { data } = await supabase.from("sales").select("*").gte("date", exportFrom).lte("date", exportTo).order("date");
    const rows = [["Date", "Player", "Items", "Subtotal", "Discount", "Total"]];
    (data || []).forEach((s) => rows.push([s.date, playerName(s.player_id), s.lines.map((l) => `${l.label} ×${l.qty}`).join("; "), s.subtotal, s.discount, s.total]));
    downloadCSV(`sales_${exportFrom}_to_${exportTo}.csv`, rows);
  };

  return (
    <div>
      <h2 className="bam-display" style={{ fontSize: 21, marginBottom: 16 }}>Daily Sales</h2>
      <div className="bam-card" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{ flex: "1 1 160px" }}><label className="bam-label">Date</label><input type="date" className="bam-input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div style={{ flex: "2 1 220px" }}>
            <label className="bam-label">Player</label>
            <select className="bam-input" value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
              <option value="">Select player…</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12, marginBottom: 14, background: "#F9F9FC" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button className="bam-btn" style={{ background: pickerKind === "single" ? "var(--navy)" : "#fff", color: pickerKind === "single" ? "#fff" : "var(--navy)", border: "1px solid var(--line)" }} onClick={() => setPickerKind("single")}>Single item</button>
            <button className="bam-btn" style={{ background: pickerKind === "kit" ? "var(--navy)" : "#fff", color: pickerKind === "kit" ? "#fff" : "var(--navy)", border: "1px solid var(--line)" }} onClick={() => setPickerKind("kit")}>Full Kit</button>
          </div>
          {pickerKind === "single" ? (
            <select className="bam-input" style={{ marginBottom: 10 }} value={pickerSkuId} onChange={(e) => setPickerSkuId(e.target.value)}>
              <option value="">Choose item…</option>
              {merch.map((m) => <option key={m.id} value={m.id} disabled={availableStock(m.id) <= 0}>{m.item} — {m.size} ({availableStock(m.id)} in stock) · {fmtMoney(m.price)}</option>)}
            </select>
          ) : (
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <select className="bam-input" style={{ flex: 1, minWidth: 180 }} value={pickerJerseyId} onChange={(e) => setPickerJerseyId(e.target.value)}>
                <option value="">Choose jersey…</option>
                {jerseyOptions.map((m) => <option key={m.id} value={m.id} disabled={availableStock(m.id) <= 0}>{m.item} — {m.size} ({availableStock(m.id)} in stock)</option>)}
              </select>
              <select className="bam-input" style={{ flex: 1, minWidth: 180 }} value={pickerShortId} onChange={(e) => setPickerShortId(e.target.value)}>
                <option value="">Choose short…</option>
                {shortOptions.map((m) => <option key={m.id} value={m.id} disabled={availableStock(m.id) <= 0}>{m.item} — {m.size} ({availableStock(m.id)} in stock)</option>)}
              </select>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label className="bam-label" style={{ margin: 0 }}>Qty</label>
            <button className="bam-btn bam-btn-ghost" style={{ padding: 6 }} onClick={() => setPickerQty((q) => Math.max(1, q - 1))}><Minus size={13} /></button>
            <span style={{ minWidth: 24, textAlign: "center", fontWeight: 700 }}>{pickerQty}</span>
            <button className="bam-btn bam-btn-ghost" style={{ padding: 6 }} onClick={() => setPickerQty((q) => q + 1)}><Plus size={13} /></button>
            <button className="bam-btn bam-btn-secondary" style={{ marginLeft: "auto" }} onClick={addLine}><Plus size={14} /> Add to sale</button>
          </div>
        </div>
        {lines.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            {lines.map((l) => (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 4px", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                <span>{l.label} <span style={{ color: "var(--muted)" }}>× {l.qty}</span></span>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>{fmtMoney(l.unitPrice * l.qty)}<button className="bam-btn bam-btn-danger" style={{ padding: 4 }} onClick={() => removeLine(l.id)}><X size={12} /></button></span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: 260 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span>Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 6 }}>
              <span>Discount (₱)</span>
              <input type="number" className="bam-input" style={{ width: 100, textAlign: "right" }} value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, borderTop: "1px solid var(--line)", paddingTop: 8, marginBottom: 12 }}><span>Total</span><span>{fmtMoney(total)}</span></div>
            <button className="bam-btn bam-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={completeSale}>Complete Sale</button>
          </div>
        </div>
      </div>
      <h3 style={{ fontSize: 15, marginBottom: 10 }}>Sales on {fmtDate(date)}</h3>
      <div className="bam-card" style={{ overflow: "hidden" }}>
        <table className="bam-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th>Player</th><th>Items</th><th>Discount</th><th>Total</th><th></th></tr></thead>
          <tbody>
            {dayList.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{playerName(s.player_id)}</td>
                <td style={{ fontSize: 13, color: "var(--muted)" }}>{s.lines.map((l) => `${l.label} ×${l.qty}`).join(", ")}</td>
                <td>{fmtMoney(s.discount)}</td>
                <td style={{ fontWeight: 700 }}>{fmtMoney(s.total)}</td>
                <td><button className="bam-btn bam-btn-danger" style={{ padding: 6 }} onClick={() => voidSale(s)}><Trash2 size={13} /></button></td>
              </tr>
            ))}
            {dayList.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "#9494AA", padding: 24 }}>No sales recorded for this date.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="bam-card" style={{ padding: 16, marginTop: 16, display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="bam-label" style={{ marginBottom: 6 }}>Export sales report</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" className="bam-input" style={{ width: 150 }} value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} />
            <span style={{ color: "var(--muted)", fontSize: 13 }}>to</span>
            <input type="date" className="bam-input" style={{ width: 150 }} value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
          </div>
        </div>
        <button className="bam-btn bam-btn-ghost" onClick={exportCSV}><Download size={14} /> Export Data</button>
      </div>
    </div>
  );
}

/* --------------------------------- Revenue (date-range scoped) --------------------------------- */
function RevenueTab({ players }) {
  const [rangeFrom, setRangeFrom] = useState(todayStr());
  const [rangeTo, setRangeTo] = useState(todayStr());
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [totalToday, setTotalToday] = useState(0);
  const [totalMonth, setTotalMonth] = useState(0);
  const [totalAllTime, setTotalAllTime] = useState(0);
  const playerName = (id) => players.find((p) => p.id === id)?.name || "—";
  const today = todayStr();
  const thisMonth = today.slice(0, 7);

  const loadRange = async () => {
    setLoadingRows(true);
    const [pay, sales] = await Promise.all([
      supabase.from("payment_log").select("*").gte("created_at", rangeFrom).lt("created_at", addDays(rangeTo, 1)),
      supabase.from("sales").select("*").gte("date", rangeFrom).lte("date", rangeTo),
    ]);
    const combined = [
      ...(pay.data || []).map((p) => ({ id: p.id, date: p.created_at.slice(0, 10), at: p.created_at, type: "Package", player: playerName(p.player_id), description: `${p.package_name} — ${p.term_label}`, amount: p.amount })),
      ...(sales.data || []).map((s) => ({ id: s.id, date: s.date, at: s.created_at, type: "Merchandise", player: playerName(s.player_id), description: s.lines.map((l) => `${l.label} ×${l.qty}`).join(", "), amount: s.total })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    setRows(combined);
    setLoadingRows(false);
  };
  useEffect(() => { loadRange(); }, [rangeFrom, rangeTo]);

  useEffect(() => {
    (async () => {
      const [payToday, saleToday, payMonth, saleMonth, payAll, saleAll] = await Promise.all([
        supabase.from("payment_log").select("amount").gte("created_at", today).lt("created_at", addDays(today, 1)),
        supabase.from("sales").select("total").eq("date", today),
        supabase.from("payment_log").select("amount").gte("created_at", thisMonth + "-01"),
        supabase.from("sales").select("total").gte("date", thisMonth + "-01"),
        supabase.from("payment_log").select("amount"),
        supabase.from("sales").select("total"),
      ]);
      const sum = (r, key) => (r.data || []).reduce((s, x) => s + Number(x[key] || 0), 0);
      setTotalToday(sum(payToday, "amount") + sum(saleToday, "total"));
      setTotalMonth(sum(payMonth, "amount") + sum(saleMonth, "total"));
      setTotalAllTime(sum(payAll, "amount") + sum(saleAll, "total"));
    })();
  }, []);

  const rangeTotal = rows.reduce((s, x) => s + x.amount, 0);
  const exportCSV = () => {
    const csvRows = [["Date/Time", "Type", "Player", "Description", "Amount"]];
    rows.forEach((x) => csvRows.push([fmtDateTime(x.at), x.type, x.player, x.description, x.amount]));
    downloadCSV(`revenue_${rangeFrom}_to_${rangeTo}.csv`, csvRows);
  };

  const stat = (label, value, color) => (
    <div className="bam-card" style={{ padding: 16, flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div className="bam-display" style={{ fontSize: 22, color }}>{fmtMoney(value)}</div>
    </div>
  );

  return (
    <div>
      <h2 className="bam-display" style={{ fontSize: 21, marginBottom: 16 }}>Revenue</h2>
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        {stat("Today", totalToday, "var(--maroon)")}
        {stat("This Month", totalMonth, "var(--blue)")}
        {stat("All-Time", totalAllTime, "var(--navy)")}
      </div>
      <div className="bam-card" style={{ padding: 16, marginBottom: 16, display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="bam-label" style={{ marginBottom: 6 }}>Coverage dates</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" className="bam-input" style={{ width: 150 }} value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
            <span style={{ color: "var(--muted)", fontSize: 13 }}>to</span>
            <input type="date" className="bam-input" style={{ width: 150 }} value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
          </div>
        </div>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{rows.length} transaction{rows.length === 1 ? "" : "s"} · {fmtMoney(rangeTotal)} total</span>
        <button className="bam-btn bam-btn-ghost" style={{ marginLeft: "auto" }} onClick={exportCSV}><Download size={14} /> Export Data</button>
      </div>
      <div className="bam-card" style={{ overflow: "hidden" }}>
        <table className="bam-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th>Date</th><th>Time</th><th>Type</th><th>Player</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>
            {loadingRows ? <tr><td colSpan={6} style={{ textAlign: "center", color: "#9494AA", padding: 24 }}>Loading…</td></tr> : rows.map((x) => (
              <tr key={x.type + x.id}>
                <td>{fmtDate(x.date)}</td>
                <td>{new Date(x.at).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</td>
                <td><span className="bam-badge" style={{ background: x.type === "Package" ? "#E9EFF9" : "#FFF6DC", color: x.type === "Package" ? "var(--blue)" : "#8A6D1F" }}>{x.type}</span></td>
                <td style={{ fontWeight: 600 }}>{x.player}</td>
                <td style={{ fontSize: 13, color: "var(--muted)" }}>{x.description}</td>
                <td style={{ fontWeight: 700 }}>{fmtMoney(x.amount)}</td>
              </tr>
            ))}
            {!loadingRows && rows.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "#9494AA", padding: 24 }}>No transactions in this date range.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --------------------------------- Modals: forms --------------------------------- */
function PlayerModal({ player, parents, onClose, onSave, onNewParent }) {
  const [name, setName] = useState(player.name || "");
  const [nickname, setNickname] = useState(player.nickname || "");
  const [birthDate, setBirthDate] = useState(player.birth_date || "");
  const [parentId, setParentId] = useState(player.parent_id || "");
  const submit = () => { if (!name || !birthDate || !parentId) { alert("Name, birth date, and parent are all required."); return; } onSave({ id: player.id, name, nickname: nickname.trim(), birthDate, parentId }); };
  return (
    <Modal title={player.id ? "Edit Player" : "Add Player"} onClose={onClose}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 2 }}><label className="bam-label">Player's Name</label><input className="bam-input" style={{ marginBottom: 12 }} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div style={{ flex: 1 }}><label className="bam-label">Nickname</label><input className="bam-input" style={{ marginBottom: 12 }} placeholder="Optional" value={nickname} onChange={(e) => setNickname(e.target.value)} /></div>
      </div>
      <label className="bam-label">Birth Date</label>
      <input type="date" className="bam-input" style={{ marginBottom: 12 }} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
      <label className="bam-label">Parent</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <select className="bam-input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">Select parent…</option>
          {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="bam-btn bam-btn-ghost" onClick={onNewParent}><Plus size={14} /> New</button>
      </div>
      <button className="bam-btn bam-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={submit}>Save Player</button>
    </Modal>
  );
}

function ParentModal({ parent, onClose, onSave }) {
  const [name, setName] = useState(parent.name || "");
  const [phone, setPhone] = useState(parent.phone || "");
  const [email, setEmail] = useState(parent.email || "");
  const submit = () => { if (!name) { alert("Parent's name is required."); return; } onSave({ id: parent.id, name, phone, email }); };
  return (
    <Modal title={parent.id ? "Edit Parent" : "Add Parent"} onClose={onClose}>
      <label className="bam-label">Parent's Name</label>
      <input className="bam-input" style={{ marginBottom: 12 }} value={name} onChange={(e) => setName(e.target.value)} />
      <label className="bam-label">Phone (optional)</label>
      <input className="bam-input" style={{ marginBottom: 12 }} value={phone} onChange={(e) => setPhone(e.target.value)} />
      <label className="bam-label">Email (optional)</label>
      <input className="bam-input" style={{ marginBottom: 16 }} value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className="bam-btn bam-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={submit}>Save Parent</button>
    </Modal>
  );
}

function EnrollModal({ player, packages, onClose, onSave }) {
  const [packageId, setPackageId] = useState(packages[0]?.id || "");
  const [start, setStart] = useState(todayStr());
  const pkg = packages.find((p) => p.id === packageId);
  return (
    <Modal title={`Enroll ${player ? player.name : ""}`} onClose={onClose}>
      <label className="bam-label">Package</label>
      <select className="bam-input" style={{ marginBottom: 12 }} value={packageId} onChange={(e) => setPackageId(e.target.value)}>
        {packages.map((p) => <option key={p.id} value={p.id}>{p.name} — {fmtMoney(p.amount)}</option>)}
      </select>
      {pkg && (
        <div className="bam-card" style={{ padding: 12, marginBottom: 12, background: "#F9F9FC" }}>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{pkg.description}</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>{pkg.credits !== null ? `${pkg.credits} credits` : "Unlimited sessions"} · expires {pkg.expiry_days} days after start{pkg.terms > 1 ? ` · ${pkg.terms} terms of ${fmtMoney(pkg.amount / pkg.terms)}` : ""}</div>
        </div>
      )}
      <label className="bam-label">Start Date</label>
      <input type="date" className="bam-input" style={{ marginBottom: 16 }} value={start} onChange={(e) => setStart(e.target.value)} />
      <button className="bam-btn bam-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => { if (!packageId) { alert("Choose a package."); return; } onSave(packageId, start); }}>Confirm Enrollment</button>
    </Modal>
  );
}
