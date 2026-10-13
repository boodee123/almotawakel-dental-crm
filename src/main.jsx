import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut
} from "firebase/auth";
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, setDoc
} from "firebase/firestore";
import { Search, Plus, LogOut, Users, MapPin, Phone, CalendarDays, Download, X, Pencil, Trash2, Activity } from "lucide-react";
import { auth, db, firebaseConfigured } from "./firebase";
import "./style.css";

const blank = { name:"", phone:"", governorate:"القاهرة", area:"", address:"", status:"جديد", notes:"", nextVisit:"" };
const statuses = ["جديد", "تمت الزيارة", "متابعة", "بدأ الشغل", "غير مهتم"];
const esc = (v="") => `"${String(v).replaceAll('"','""')}"`;

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [error, setError] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [profile, setProfile] = useState(null);
  const [staff, setStaff] = useState([]);
  const [activeTab, setActiveTab] = useState("doctors");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("الكل");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user || !db) { setProfile(null); return; }
    return onSnapshot(doc(db, "users", user.uid), snap => {
      setProfile(snap.exists() ? { id:snap.id, ...snap.data() } : null);
    }, err => setError("تعذر تحميل صلاحيات الحساب: " + err.message));
  }, [user]);

  useEffect(() => {
    if (!user || !db || !profile || profile.active !== true) { setDoctors([]); return; }
    return onSnapshot(query(collection(db, "doctors"), orderBy("createdAt", "desc")),
      snap => setDoctors(snap.docs.map(d => ({ id:d.id, ...d.data() }))),
      err => setError("تعذر تحميل البيانات: " + err.message));
  }, [user, profile?.active]);

  useEffect(() => {
    if (!user || !db || profile?.role !== "admin") { setStaff([]); return; }
    return onSnapshot(collection(db, "users"), snap => setStaff(snap.docs.map(d => ({id:d.id, ...d.data()}))),
      err => setError("تعذر تحميل حسابات المندوبين: " + err.message));
  }, [user, profile?.role]);

  const updateStaff = async (member, patch) => {
    if (member.id === user.uid && patch.active === false) {
      setError("لا يمكنك تعطيل حساب المدير الذي تستخدمه حاليًا.");
      return;
    }
    try {
      await updateDoc(doc(db, "users", member.id), { ...patch, updatedAt:serverTimestamp(), updatedBy:user.email });
      setError("");
    } catch (err) { setError("تعذر تعديل الحساب: " + err.message); }
  };

  const visible = useMemo(() => doctors.filter(d => {
    const text = `${d.name||""} ${d.phone||""} ${d.area||""} ${d.governorate||""} ${d.address||""}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (filter === "الكل" || d.status === filter);
  }), [doctors, search, filter]);

  const openNew = () => { setEditing(null); setForm(blank); setModal(true); };
  const openEdit = d => { setEditing(d.id); setForm({...blank, ...d}); setModal(true); };
  const save = async e => {
    e.preventDefault();
    if (!form.name.trim()) return setError("اكتب اسم الدكتور أولاً.");
    setSaving(true); setError("");
    try {
      const duplicate = doctors.find(d => (d.phone||"").trim() && (d.phone||"").trim() === form.phone.trim() && d.id !== editing);
      if (duplicate && !confirm(`رقم الهاتف مسجل بالفعل باسم ${duplicate.name}. هل تريد المتابعة؟`)) { setSaving(false); return; }
      const payload = { ...form, name:form.name.trim(), phone:form.phone.trim(), area:form.area.trim(), address:form.address.trim(), notes:form.notes.trim(), updatedAt:serverTimestamp(), updatedBy:user.email };
      if (editing) await updateDoc(doc(db, "doctors", editing), payload);
      else await addDoc(collection(db, "doctors"), { ...payload, createdAt:serverTimestamp(), createdBy:user.email });
      setModal(false);
    } catch (err) { setError("لم يتم الحفظ: " + err.message); }
    finally { setSaving(false); }
  };
  const remove = async d => {
    if (!confirm(`تأكيد حذف بيانات ${d.name}؟`)) return;
    try { await deleteDoc(doc(db, "doctors", d.id)); } catch (err) { setError("تعذر الحذف: " + err.message); }
  };
  const exportCsv = () => {
    const headers = ["اسم الدكتور","رقم الهاتف","المحافظة","المنطقة","العنوان","الحالة","الزيارة القادمة","ملاحظات"];
    const rows = visible.map(d => [d.name,d.phone,d.governorate,d.area,d.address,d.status,d.nextVisit,d.notes]);
    const csv = "\uFEFF" + [headers, ...rows].map(r => r.map(esc).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8;"}));
    const a = document.createElement("a"); a.href=url; a.download="اطباء-معمل-المتوكل.csv"; a.click(); URL.revokeObjectURL(url);
  };

  if (!firebaseConfigured) return <Setup />;
  if (!user) return <main className="login-wrap"><section className="login card">
    <div className="brand-mark">م</div><p className="eyebrow">نظام إدارة علاقات الأطباء</p><h1>معمل المتوكل</h1>
    <p className="muted">سجّل الدخول بحساب المستخدم المصرح له.</p>
    <div className="auth-tabs">
      <button type="button" className={authMode==="login"?"auth-tab active":"auth-tab"} onClick={()=>{setAuthMode("login");setError("");}}>تسجيل الدخول</button>
      <button type="button" className={authMode==="signup"?"auth-tab active":"auth-tab"} onClick={()=>{setAuthMode("signup");setError("");}}>إنشاء حساب</button>
    </div>
    <form onSubmit={async e=>{
      e.preventDefault(); setError("");
      if(authMode==="signup" && password!==confirmPassword) return setError("كلمتا المرور غير متطابقتين.");
      if(authMode==="signup" && password.length<6) return setError("كلمة المرور لازم تكون 6 أحرف على الأقل.");
      try {
        if(authMode==="login") await signInWithEmailAndPassword(auth,email,password);
        else {
          const credential = await createUserWithEmailAndPassword(auth,email,password);
          await setDoc(doc(db, "users", credential.user.uid), {
            email: credential.user.email, role:"rep", active:true, createdAt:serverTimestamp()
          });
        }
      } catch(err) {
        const code = err?.code || "";
        if(code==="auth/email-already-in-use") setError("البريد الإلكتروني مسجل بالفعل. سجّل الدخول بدلًا من إنشاء حساب جديد.");
        else if(code==="auth/invalid-email") setError("اكتب بريدًا إلكترونيًا صحيحًا.");
        else if(code==="auth/weak-password") setError("كلمة المرور ضعيفة؛ استخدم 6 أحرف على الأقل.");
        else if(code==="auth/operation-not-allowed") setError("إنشاء الحسابات غير مفعّل. فعّل Email/Password من Firebase Authentication.");
        else if(code==="permission-denied") setError("تم إنشاء الحساب لكن تعذر حفظ ملف المستخدم. تأكد من نشر قواعد Firestore الصحيحة.");
        else setError(authMode==="login"?"بيانات الدخول غير صحيحة أو الحساب غير مفعّل.":"تعذر إنشاء الحساب. راجع إعدادات Firebase وحاول مرة أخرى.");
      }
    }}>
      <label>البريد الإلكتروني<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" /></label>
      <label>كلمة المرور<input type="password" required minLength="6" value={password} onChange={e=>setPassword(e.target.value)} placeholder="6 أحرف على الأقل" /></label>
      {authMode==="signup" && <label>تأكيد كلمة المرور<input type="password" required minLength="6" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="اكتب كلمة المرور مرة أخرى" /></label>}
      {error && <p className="error">{error}</p>}
      <button className="primary full">{authMode==="login"?"تسجيل الدخول":"إنشاء الحساب"}</button>
    </form>
    <p className="tiny">{authMode==="login"?"لو عندك حساب بالفعل، سجّل الدخول ببريدك وكلمة المرور.":"تنبيه: الحسابات الجديدة يمكنها الدخول بعد التسجيل؛ استخدم هذه الخاصية فقط إذا كنت تريد السماح بالتسجيل الذاتي للمندوبين."}</p>
  </section></main>;

  if (user && !profile) return <main className="login-wrap"><section className="login card">
    <div className="brand-mark">م</div><h1>جاري تجهيز الحساب</h1><p className="muted">لو استمرت الشاشة، تأكد من قواعد Firebase أو اطلب من المدير تفعيل حسابك.</p>
    {error && <p className="error">{error}</p>}<button className="secondary full" onClick={()=>signOut(auth)}>تسجيل الخروج</button>
  </section></main>;
  if (profile && profile.active === false) return <main className="login-wrap"><section className="login card">
    <div className="brand-mark">م</div><h1>الحساب غير مفعّل</h1><p className="muted">مدير المعمل أوقف هذا الحساب. تواصل معه لإعادة التفعيل.</p><button className="secondary full" onClick={()=>signOut(auth)}>تسجيل الخروج</button>
  </section></main>;

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark small">م</div><div><strong>معمل المتوكل</strong><span>إدارة بيانات أطباء الأسنان</span></div></div>
      <div className="user-area"><span className="user-email">{user.email}</span><button className="icon-btn" title="تسجيل الخروج" onClick={()=>signOut(auth)}><LogOut size={18}/></button></div>
    </header>
    <main className="main">
      <section className="welcome"><div><p className="eyebrow">{profile.role==="admin"?"مدير النظام":"حساب مندوب"}</p><h1>{activeTab==="staff"?"إدارة حسابات المندوبين":"متابعة الأطباء والزيارات"}</h1><p className="muted">{activeTab==="staff"?"تفعيل الحسابات وتحديد صلاحيات المدير والمندوب.":"سجّل بيانات الأطباء وتابع حالة التواصل من مكان واحد."}</p></div>{activeTab==="doctors" && <button className="primary" onClick={openNew}><Plus size={18}/> إضافة دكتور</button>}</section>
      {profile.role==="admin" && <nav className="admin-tabs"><button className={activeTab==="doctors"?"selected":""} onClick={()=>setActiveTab("doctors")}><Users size={16}/> بيانات الأطباء</button><button className={activeTab==="staff"?"selected":""} onClick={()=>setActiveTab("staff")}><Activity size={16}/> إدارة الحسابات <span>{staff.length}</span></button></nav>}
      {activeTab==="doctors" && <>
      <section className="stats">
        <div className="stat card"><span className="stat-icon"><Users/></span><div><span className="muted">إجمالي الأطباء</span><strong>{doctors.length}</strong></div></div>
        <div className="stat card"><span className="stat-icon"><CalendarDays/></span><div><span className="muted">زيارات قادمة</span><strong>{doctors.filter(d=>d.nextVisit && d.nextVisit >= new Date().toISOString().slice(0,10)).length}</strong></div></div>
        <div className="stat card"><span className="stat-icon"><Activity/></span><div><span className="muted">بدأوا الشغل</span><strong>{doctors.filter(d=>d.status==="بدأ الشغل").length}</strong></div></div>
      </section>
      <section className="toolbar card"><div className="search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث بالاسم أو الهاتف أو المنطقة..." /></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option>الكل</option>{statuses.map(s=><option key={s}>{s}</option>)}</select><button className="secondary" onClick={exportCsv}><Download size={17}/> تصدير Excel/CSV</button></section>
      <section className="records">
        {visible.length===0 ? <div className="empty card"><Users size={32}/><h3>لا توجد بيانات مطابقة</h3><p className="muted">أضف أول دكتور أو غيّر البحث.</p><button className="primary" onClick={openNew}><Plus size={17}/> إضافة دكتور</button></div> :
        <div className="doctor-grid">{visible.map(d=><article className="doctor card" key={d.id}>
          <div className="doctor-head"><div className="avatar">{(d.name||"د").slice(0,1)}</div><div className="doctor-title"><h3>{d.name}</h3><span className={`status s-${statuses.indexOf(d.status)}`}>{d.status||"جديد"}</span></div><div className="actions"><button className="icon-btn" onClick={()=>openEdit(d)} title="تعديل"><Pencil size={16}/></button><button className="icon-btn danger" onClick={()=>remove(d)} title="حذف"><Trash2 size={16}/></button></div></div>
          {d.phone && <p className="detail"><Phone size={15}/><a href={`tel:${d.phone}`}>{d.phone}</a></p>}
          {(d.area||d.governorate||d.address) && <p className="detail"><MapPin size={15}/><span>{[d.governorate,d.area,d.address].filter(Boolean).join("، ")}</span></p>}
          {d.nextVisit && <p className="detail"><CalendarDays size={15}/><span>الزيارة القادمة: {d.nextVisit}</span></p>}
          {d.notes && <p className="notes">{d.notes}</p>}
          <div className="card-foot"><span>أضيف بواسطة: {d.createdBy||"—"}</span><span>{d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString("ar-EG") : ""}</span></div>
        </article>)}</div>}
      </section>
      </>}
      {activeTab==="staff" && profile.role==="admin" && <section className="staff-list">
        <div className="staff-note card"><strong>صلاحيات المدير فقط</strong><p>أي حساب جديد يسجل من الواجهة يحصل تلقائيًا على دور مندوب. يمكنك ترقية حساب موثوق إلى مدير أو إيقافه من هنا.</p></div>
        {staff.map(member=><article className="staff-row card" key={member.id}>
          <div className="staff-avatar">{(member.email||"?").slice(0,1).toUpperCase()}</div>
          <div className="staff-info"><strong>{member.email||"حساب بدون بريد"}</strong><span>{member.id===user.uid?"حسابك الحالي":`UID: ${member.id}`}</span></div>
          <span className={`status ${member.role==="admin"?"s-3":"s-2"}`}>{member.role==="admin"?"مدير":"مندوب"}</span>
          <span className={`status ${member.active===false?"s-4":"s-3"}`}>{member.active===false?"موقوف":"نشط"}</span>
          <div className="staff-actions">
            <select aria-label="دور الحساب" value={member.role||"rep"} onChange={e=>updateStaff(member,{role:e.target.value})} disabled={member.id===user.uid}>
              <option value="rep">مندوب</option><option value="admin">مدير</option>
            </select>
            <button className={member.active===false?"secondary":"danger-btn"} disabled={member.id===user.uid} onClick={()=>updateStaff(member,{active:member.active===false})}>{member.active===false?"تفعيل":"إيقاف"}</button>
          </div>
        </article>)}
        {staff.length===0 && <div className="empty card">لا توجد حسابات ظاهرة.</div>}
      </section>}
      {error && <p className="error global-error">{error}</p>}
      <footer>معمل المتوكل · بيانات العمل مخصصة للمستخدمين المصرح لهم</footer>
    </main>
    {modal && <div className="modal-backdrop" onClick={()=>setModal(false)}><section className="modal card" onClick={e=>e.stopPropagation()}>
      <div className="modal-head"><div><p className="eyebrow">{editing?"تعديل البيانات":"تسجيل جديد"}</p><h2>{editing?"تعديل بيانات الدكتور":"إضافة دكتور جديد"}</h2></div><button className="icon-btn" onClick={()=>setModal(false)}><X/></button></div>
      <form onSubmit={save} className="doctor-form">
        <label>اسم الدكتور *<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="د. أحمد محمد"/></label>
        <label>رقم الهاتف<input inputMode="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="01xxxxxxxxx"/></label>
        <div className="form-row"><label>المحافظة<select value={form.governorate} onChange={e=>setForm({...form,governorate:e.target.value})}>{["القاهرة","الجيزة","الإسكندرية","القليوبية","الشرقية","الدقهلية","الغربية","المنوفية","البحيرة","كفر الشيخ","دمياط","بورسعيد","الإسماعيلية","السويس","شمال سيناء","جنوب سيناء","بني سويف","الفيوم","المنيا","أسيوط","سوهاج","قنا","الأقصر","أسوان","البحر الأحمر","الوادي الجديد","مطروح"].map(x=><option key={x}>{x}</option>)}</select></label><label>المنطقة / المركز<input value={form.area} onChange={e=>setForm({...form,area:e.target.value})} placeholder="حدائق حلوان"/></label></div>
        <label>العنوان بالتفصيل<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="اسم الشارع والعلامة المميزة"/></label>
        <div className="form-row"><label>حالة التواصل<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label><label>موعد الزيارة القادمة<input type="date" value={form.nextVisit} onChange={e=>setForm({...form,nextVisit:e.target.value})}/></label></div>
        <label>ملاحظات<textarea rows="3" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="نتيجة الزيارة أو احتياجات الدكتور..."/></label>
        {error && <p className="error">{error}</p>}
        <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal(false)}>إلغاء</button><button className="primary" disabled={saving}>{saving?"جارٍ الحفظ...":"حفظ البيانات"}</button></div>
      </form>
    </section></div>}
  </div>;
}

function Setup(){return <main className="login-wrap"><section className="setup card"><div className="brand-mark">م</div><h1>معمل المتوكل</h1><h2>خطوة الإعداد الأولى</h2><p>المشروع جاهز كبداية، لكن يلزم ربطه بقاعدة Firebase الخاصة بك قبل تسجيل الدخول أو حفظ البيانات.</p><ol><li>أنشئ مشروعًا مجانيًا في Firebase.</li><li>فعّل Authentication بطريقة Email/Password وأنشئ حسابات المندوبين.</li><li>أنشئ Cloud Firestore وضع إعدادات Web App في <code>src/firebase.js</code>.</li><li>انسخ قواعد الأمان من ملف <code>firestore.rules</code> وانشرها من Firebase.</li></ol><p className="tiny">راجع README_AR.md للتعليمات الكاملة قبل استخدام بيانات حقيقية.</p></section></main>}

createRoot(document.getElementById("root")).render(<App/>);