import { useState, useEffect, useRef } from "react";

const PIN_KEY = "cv_pin_hash";
const VAULTS_KEY = "cv_vaults";
const CHAT_KEY = "cv_chat";

const DEFAULT_VAULTS = [
  { id: "personal", name: "Personal", emoji: "📱", token: "", chatId: "" },
  { id: "documents", name: "Documents", emoji: "📄", token: "", chatId: "" },
  { id: "private", name: "Private", emoji: "🔒", token: "", chatId: "" },
];

function hashPin(pin) {
  let h = 0;
  for (let i = 0; i < pin.length; i++) h = Math.imul(31, h) + pin.charCodeAt(i) | 0;
  return h.toString(36);
}
function saveVaults(v) { localStorage.setItem(VAULTS_KEY, JSON.stringify(v)); }
function loadVaults() { try { return JSON.parse(localStorage.getItem(VAULTS_KEY)) || DEFAULT_VAULTS; } catch { return DEFAULT_VAULTS; } }
function saveChat(h) { localStorage.setItem(CHAT_KEY, JSON.stringify(h)); }
function loadChat() { try { return JSON.parse(localStorage.getItem(CHAT_KEY)) || []; } catch { return []; } }
async function tgSendFile(token, chatId, file) {
  const form = new FormData();
  form.append("chat_id", chatId);
  const isImg = file.type.startsWith("image/");
  const isVid = file.type.startsWith("video/");
  const isAud = file.type.startsWith("audio/");
  const field = isImg ? "photo" : isVid ? "video" : isAud ? "audio" : "document";
  const ep = isImg ? "sendPhoto" : isVid ? "sendVideo" : isAud ? "sendAudio" : "sendDocument";
  form.append(field, file);
  form.append("caption", `📦 ${file.name} | ${(file.size/1024).toFixed(1)}KB`);
  const res = await fetch(`https://api.telegram.org/bot${token}/${ep}`, { method:"POST", body:form });
  return res.json();
}

async function tgGetFiles(token, chatId) {
  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`);
  const data = await res.json();
  if (!data.ok) return [];
  const files = [];
  for (const u of data.result || []) {
    const msg = u.message;
    if (!msg || String(msg.chat.id) !== String(chatId)) continue;
    if (msg.document) files.push({ type:"document", name:msg.document.file_name, fileId:msg.document.file_id, size:msg.document.file_size, date:msg.date });
    else if (msg.photo) { const p = msg.photo[msg.photo.length-1]; files.push({ type:"photo", name:`photo_${msg.date}.jpg`, fileId:p.file_id, size:p.file_size||0, date:msg.date }); }
    else if (msg.video) files.push({ type:"video", name:msg.video.file_name||`video_${msg.date}.mp4`, fileId:msg.video.file_id, size:msg.video.file_size, date:msg.date });
    else if (msg.audio) files.push({ type:"audio", name:msg.audio.file_name||`audio_${msg.date}.mp3`, fileId:msg.audio.file_id, size:msg.audio.file_size, date:msg.date });
  }
  return files.reverse();
}

async function tgGetFileUrl(token, fileId) {
  const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
  const data = await res.json();
  if (!data.ok) return null;
  return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
}

async function askClaude(messages, system) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, system, messages })
  });
  const data = await res.json();
  return data.content?.[0]?.text || "Jawab nahi aya.";
    }const icons = {
  cloud:"M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z",
  upload:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4|M17 8l-5-5-5 5|M12 3v12",
  download:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4|M7 10l5 5 5-5|M12 15V3",
  file:"M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z|M13 2v7h7",
  img:"M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z|M8.5 8.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z|M21 15l-5-5L5 21",
  video:"M23 7l-7 5 7 5V7z|M1 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V5z",
  music:"M9 18V5l12-2v13|M6 21a3 3 0 100-6 3 3 0 000 6z|M18 19a3 3 0 100-6 3 3 0 000 6z",
  send:"M22 2L11 13|M22 2L15 22l-4-9-9-4 22-7z",
  settings:"M12 15a3 3 0 100-6 3 3 0 000 6z|M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  check:"M20 6L9 17l-5-5",
  refresh:"M23 4v6h-6|M1 20v-6h6|M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z|M12 9a3 3 0 100 6 3 3 0 000-6z",
  eyeoff:"M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94|M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24|M1 1l22 22",
  ai:"M12 2a10 10 0 100 20A10 10 0 0012 2z|M12 8v4l3 3",
  warn:"M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z|M12 9v4|M12 17h.01",
};

const I = ({ n, s=20 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {(icons[n]||"").split("|").map((d,i)=><path key={i} d={d}/>)}
  </svg>
);
function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const isNew = !localStorage.getItem(PIN_KEY);

  const submit = () => {
    setErr("");
    if (isNew) {
      if (!name.trim()) return setErr("Naam daalo");
      if (pin.length < 4) return setErr("PIN 4+ numbers ka ho");
      if (pin !== confirm) return setErr("PIN match nahi hua");
      localStorage.setItem(PIN_KEY, hashPin(pin));
      localStorage.setItem("cv_name", name.trim());
      onUnlock(name.trim());
    } else {
      if (hashPin(pin) !== localStorage.getItem(PIN_KEY)) { setErr("Galat PIN!"); setPin(""); return; }
      onUnlock(localStorage.getItem("cv_name") || "User");
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#070d18", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:20 }}>
      <style>{`
        @keyframes up{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 30px rgba(0,180,255,.1)}50%{box-shadow:0 0 50px rgba(0,180,255,.2)}}
        .pb{animation:up .5s ease,glow 4s infinite;background:rgba(8,16,28,.98);border:1px solid rgba(0,190,255,.15);border-radius:24px;padding:44px 32px;width:100%;max-width:350px}
        .pi{width:100%;background:rgba(0,190,255,.05);border:1px solid rgba(0,190,255,.2);color:#c8e8ff;border-radius:12px;padding:13px 15px;font-family:'Courier New',monospace;font-size:15px;outline:none;transition:.3s;box-sizing:border-box}
        .pi:focus{border-color:#00c0ff;box-shadow:0 0 14px rgba(0,190,255,.15)}
        .pb-btn{width:100%;background:linear-gradient(135deg,#00c0ff,#0068bb);border:none;color:#000;padding:15px;border-radius:12px;font-family:'Courier New',monospace;font-weight:bold;font-size:15px;cursor:pointer;letter-spacing:3px;transition:.3s}
        .pb-btn:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(0,180,255,.3)}
      `}</style>
      <div className="pb">
        <div style={{ textAlign:"center", marginBottom:30 }}>
          <div style={{ fontSize:48, marginBottom:10 }}>☁️</div>
          <div style={{ color:"#00c0ff", fontSize:20, letterSpacing:5 }}>CLOUDVAULT</div>
          <div style={{ color:"#1a3d50", fontSize:11, marginTop:6, letterSpacing:2 }}>TELEGRAM · AI · STORAGE</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {isNew && <input className="pi" placeholder="Apna naam" value={name} onChange={e=>setName(e.target.value)}/>}
          <div style={{ position:"relative" }}>
            <input className="pi" type={show?"text":"password"} placeholder="PIN (4+ digits)" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,""))} maxLength={8} onKeyDown={e=>e.key==="Enter"&&submit()} style={{ paddingRight:46 }}/>
            <button onClick={()=>setShow(!show)} style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#1a4d60",padding:3 }}>
              <I n={show?"eyeoff":"eye"} s={16}/>
            </button>
          </div>
          {isNew && <input className="pi" type={show?"text":"password"} placeholder="PIN confirm" value={confirm} onChange={e=>setConfirm(e.target.value.replace(/\D/g,""))} maxLength={8} onKeyDown={e=>e.key==="Enter"&&submit()}/>}
          {err && <div style={{ background:"rgba(255,60,60,.1)",border:"1px solid rgba(255,60,60,.25)",color:"#ff7878",padding:"9px 13px",borderRadius:9,fontSize:12,textAlign:"center" }}>{err}</div>}
          <button className="pb-btn" onClick={submit} style={{ marginTop:6 }}>{isNew?"BANAO ▶":"UNLOCK ▶"}</button>
        </div>
        <p style={{ color:"#0f2230",fontSize:11,textAlign:"center",marginTop:18,lineHeight:1.8 }}>
          🔐 PIN encrypted · Sirf aap access karo<br/>Telegram = unlimited storage
        </p>
      </div>
    </div>
  );
}export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [userName, setUserName] = useState("");
  const [tab, setTab] = useState("vaults");
  const [vaults, setVaults] = useState(loadVaults);
  const [activeVault, setActiveVault] = useState(null);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [upMsg, setUpMsg] = useState("");
  const [chat, setChat] = useState(loadChat);
  const [chatIn, setChatIn] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [settings, setSettings] = useState(false);
  const fileRef = useRef();
  const chatEnd = useRef();

  useEffect(()=>{ chatEnd.current?.scrollIntoView({behavior:"smooth"}); },[chat,chatLoading]);
  useEffect(()=>{ if(activeVault?.token) fetchFiles(activeVault); },[activeVault]);
  useEffect(()=>{ saveChat(chat); },[chat]);

  const sv = v => { setVaults(v); saveVaults(v); };
  const notify = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const fetchFiles = async (vault) => {
    if (!vault?.token || !vault?.chatId) return;
    setLoadingFiles(true);
    try { setFiles(await tgGetFiles(vault.token, vault.chatId)); }
    catch { notify("Files load nahi hui","err"); }
    setLoadingFiles(false);
  };

  const handleUpload = async (e) => {
    const picked = Array.from(e.target.files);
    if (!picked.length || !activeVault?.token) return;
    setUploading(true);
    for (let i=0; i<picked.length; i++) {
      const f = picked[i];
      setUpMsg(`${i+1}/${picked.length}: ${f.name}`);
      try {
        const r = await tgSendFile(activeVault.token, activeVault.chatId, f);
        if (r.ok) notify(`✓ ${f.name}`);
        else notify(`${f.name} — failed`,"err");
      } catch { notify(`${f.name} — error`,"err"); }
    }
    setUploading(false); setUpMsg("");
    e.target.value = "";
    await fetchFiles(activeVault);
  };

  const handleDownload = async (file) => {
    notify("Download shuru...");
    try {
      const url = await tgGetFileUrl(activeVault.token, file.fileId);
      if (!url) ret
        urn notify("URL nahi mili","err");
      const a = document.createElement("a");
      a.href=url; a.download=file.name; a.target="_blank"; a.click();
    } catch { notify("Download failed","err"); }
  };

  const sendChat = async () => {
    const msg = chatIn.trim();
    if (!msg || chatLoading) return;
    setChatIn("");
    const updated = [...chat, {role:"user",content:msg}];
    setChat(updated);
    setChatLoading(true);
    try {
      const sys = `Tum CloudVault AI ho. Urdu/English mein jawab do.
User: ${userName}
Vaults: ${vaults.map(v=>`${v.emoji}${v.name}:${v.token?"connected":"setup needed"}`).join(", ")}
Files loaded: ${files.length}
Friendly, short jawab do.`;
      const reply = await askClaude(updated.map(m=>({role:m.role,content:m.content})), sys);
      setChat(h=>[...h,{role:"assistant",content:reply}]);
    } catch {
      setChat(h=>[...h,{role:"assistant",content:"⚠️ Internet check karo."}]);
    }
    setChatLoading(false);
  };

  const fmt = b => !b?"?" : b<1024?b+"B" : b<1048576?(b/1024).toFixed(1)+"KB" : (b/1048576).toFixed(1)+"MB";
  const fmtDate = ts => new Date(ts*1000).toLocaleDateString("en-PK");
  const fIcon = t => t==="photo"?"img":t==="video"?"video":t==="audio"?"music":"file";

  if (!unlocked) return <PinScreen onUnlock={n=>{setUnlocked(true);setUserName(n);}}/>;
  return (
    <div style={{ minHeight:"100vh", background:"#070d18", fontFamily:"'Courier New',monospace", color:"#c8e8ff", maxWidth:480, margin:"0 auto", display:"flex", flexDirection:"column" }}>
      <style>{`
        @keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes dot{0%,100%{opacity:.2}50%{opacity:1}}
        @keyframes toast{0%{opacity:0;transform:translateY(-10px)}15%,80%{opacity:1;transform:translateY(0)}100%{opacity:0}}
        .card{background:rgba(0,25,45,.6);border:1px solid rgba(0,190,255,.1);border-radius:14px;padding:15px;margin-bottom:10px;animation:up .3s ease;transition:all .2s}
        .card:hover{border-color:rgba(0,190,255,.22)}
        .card.active{border-color:rgba(0,190,255,.45);background:rgba(0,40,65,.7)}
        .tb{flex:1;background:none;border:none;color:#1a3d50;padding:13px 4px;cursor:pointer;font-family:'Courier New',monospace;font-size:10px;letter-spacing:1px;transition:.3s;border-top:2px solid transparent;display:flex;flex-direction:column;align-items:center;gap:4px}
        .tb.on{color:#00c0ff;border-top-color:#00c0ff}
        .btn{background:rgba(0,190,255,.07);border:1px solid rgba(0,190,255,.18);color:#00c0ff;padding:9px 13px;border-radius:9px;cursor:pointer;font-family:'Courier New',monospace;font-size:12px;letter-spacing:1px;transition:.2s;display:flex;align-items:center;gap:7px}
        .btn:hover{background:rgba(0,190,255,.16)}
        .btn.red{background:rgba(255,60,60,.07);border-color:rgba(255,60,60,.2);color:#ff7878}
        .btn.full{width:100%;justify-content:center;box-sizing:border-box}
        .btn.primary{background:rgba(0,190,255,.14);border-color:rgba(0,190,255,.35)}
        .btn:disabled{opacity:.4;cursor:not-allowed}
        .inp{width:100%;background:rgba(0,190,255,.05);border:1px solid rgba(0,190,255,.18);color:#c8e8ff;border-radius:10px;padding:11px 14px;font-family:'Courier New',monospace;font-size:13px;outline:none;transition:.3s;box-sizing:border-box}
        .inp:focus{border-color:#00c0ff;box-shadow:0 0 10px rgba(0,190,255,.12)}
        .spinner{width:16px;height:16px;border:2px solid rgba(0,190,255,.2);border-top-color:#00c0ff;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#070d18}::-webkit-scrollbar-thumb{background:#0a3040;border-radius:2px}
      `}</style>

      <div style={{ padding:"13px 17px", background:"rgba(4,10,20,.98)", borderBottom:"1px solid rgba(0,190,255,.1)", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:22 }}>☁️</span>
          <div>
            <div style={{ color:"#00c0ff", fontSize:13, letterSpacing:3 }}>CLOUDVAULT</div>
            <div style={{ color:"#0f2d40", fontSize:10 }}>Hey {userName}!</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ background:"rgba(0,255,120,.07)", border:"1px solid rgba(0,255,120,.18)", color:"#00ee88", padding:"3px 9px", borderRadius:20, fontSize:10 }}>● LIVE</div>
          <button onClick={()=>setSettings(!settings)} style={{ background:"none", border:"1px solid rgba(0,190,255,.15)", color:settings?"#00c0ff":"#1a3d50", padding:"6px 8px", borderRadius:8, cursor:"pointer", display:"flex" }}>
            <I n="settings" s={14}/>
          </button>
        </div>
      </div>

      {settings && (
        <div style={{ background:"rgba(4,12,22,.99)", borderBottom:"1px solid rgba(0,190,255,.1)", padding:"18px 15px" }}>
          <div style={{ color:"#00c0ff", fontSize:11, letterSpacing:2, marginBottom:4 }}>⚙ VAULT SETUP</div>
          <div style={{ color:"#0f2d40", fontSize:11, marginBottom:14 }}>BotFather se token lo · @userinfobot se chat ID lo</div>
          {vaults.map((vault, idx) => (
            <div key={vault.id} className="card" style={{ marginBottom:10 }}>
              <div style={{ color:"#80c8e0", fontSize:12, marginBottom:10 }}>{vault.emoji} {vault.name}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <input className="inp" placeholder="Bot Token" value={vault.token} onChange={e=>{const v=[...vaults];v[idx]={...v[idx],token:e.target.value};sv(v);}} style={{ fontSize:11 }}/>
                <input className="inp" placeholder="Chat ID" value={vault.chatId} onChange={e=>{const v=[...vaults];v[idx]={...v[idx],chatId:e.target.value};sv(v);}} style={{ fontSize:11 }}/>
              </div>
              <div style={{ marginTop:8, fontSize:10, color: vault.token&&vault.chatId ? "#00ee88" : "#ff7878" }}>
                {vault.token&&vault.chatId ? "✓ Connected" : "⚠ Token/ChatID daalo"}
              </div>
            </div>
          ))}
          <button className="btn full primary" onClick={()=>setSettings(false)}><I n="check" s={14}/> SAVE & CLOSE</button>
        </div>
      )}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 82px" }}>
        {tab==="vaults" && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:"#00c0ff", fontSize:12, letterSpacing:2 }}>AAPKE VAULTS</div>
              <div style={{ color:"#0f2d40", fontSize:11, marginTop:3 }}>Vault chunno → files dekho</div>
            </div>
            {vaults.map(v=>(
              <div key={v.id} className={`card ${activeVault?.id===v.id?"active":""}`} style={{ cursor:"pointer" }} onClick={()=>{setActiveVault(v);setTab("files");}}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:13 }}>
                    <span style={{ fontSize:30 }}>{v.emoji}</span>
                    <div>
                      <div style={{ color:"#90d0e8", fontSize:14 }}>{v.name}</div>
                      <div style={{ fontSize:10, marginTop:3, color:v.token?"#00ee88":"#ff7878" }}>
                        {v.token ? "✓ Telegram connected" : "⚠ Setup karo"}
                      </div>
                    </div>
                  </div>
                  <span style={{ color:"#0f2d40", fontSize:22 }}>›</span>
                </div>
              </div>
            ))}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:9, marginTop:4 }}>
              {[{l:"Vaults",v:vaults.length},{l:"Active",v:vaults.filter(v=>v.token).length},{l:"Storage",v:"∞ GB"}].map(s=>(
                <div key={s.l} style={{ background:"rgba(0,190,255,.04)", border:"1px solid rgba(0,190,255,.1)", borderRadius:12, padding:"13px 8px", textAlign:"center" }}>
                  <div style={{ color:"#00c0ff", fontSize:18, fontWeight:"bold" }}>{s.v}</div>
                  <div style={{ color:"#0f2d40", fontSize:10, marginTop:3 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="files" && (
          <div>
            <div style={{ display:"flex", gap:7, marginBottom:14, overflowX:"auto", paddingBottom:4 }}>
              {vaults.map(v=>(
                <button key={v.id} onClick={()=>setActiveVault(v)} style={{
                  background:activeVault?.id===v.id?"rgba(0,190,255,.14)":"rgba(0,190,255,.04)",
                  border:`1px solid ${activeVault?.id===v.id?"rgba(0,190,255,.45)":"rgba(0,190,255,.1)"}`,
                  color:activeVault?.id===v.id?"#00c0ff":"#1a3d50",
                  padding:"7px 13px", borderRadius:20, cursor:"pointer", whiteSpace:"nowrap",
                  fontFamily:"'Courier New',monospace", fontSize:12, display:"flex", alignItems:"center", gap:6
                }}>{v.emoji} {v.name}</button>
              ))}
            </div>
            {!activeVault?.token ? (
              <div style={{ textAlign:"center", padding:"50px 20px", border:"1px dashed rgba(0,190,255,.1)", borderRadius:14, color:"#0f2d40" }}>
                <span style={{ fontSize:40 }}>⚙️</span>
                <div style={{ fontSize:13, marginTop:12 }}>Pehle Settings mein token daalo</div>
                <button className="btn" onClick={()=>setSettings(true)} style={{ margin:"14px auto 0" }}>Settings Kholo</button>
              </div>
            ) : (
              <>
                <input ref={fileRef} type="file" multiple style={{ display:"none" }} onChange={handleUpload}/>
                <button className="btn primary full" onClick={()=>fileRef.current.click()} disabled={uploading} style={{ marginBottom:10, padding:13 }}>
                  {uploading ? <><span className="spinner"/>{upMsg||"Uploading..."}</> : <><I n="upload" s={17}/> FILE UPLOAD KARO</>}
                </button>
                <button className="btn full" onClick={()=>fetchFiles(activeVault)} disabled={loadingFiles} style={{ marginBottom:14 }}>
                  {loadingFiles ? <><span className="spinner"/>Loading...</> : <><I n="refresh" s={14}/>Refresh</>}
                </button>
                {loadingFiles ? (
                  <div style={{ textAlign:"center", padding:"40px", color:"#0f2d40" }}>
                    <span className="spinner" style={{ width:28,height:28 }}/><br/><br/>Files aa rahi hain...
                  </div>
                ) : files.length===0 ? (
                  <div style={{ textAlign:"center", padding:"50px 20px", border:"1px dashed rgba(0,190,255,.1)", borderRadius:14, color:"#0f2d40" }}>
                    <I n="cloud" s={42}/><br/><br/>Koi file nahi — Upload karo ↑
                  </div>
                ) : (
                  <>
                    <div style={{ color:"#0f2d40", fontSize:10, marginBottom:10 }}>{files.length} FILES</div>
                    {files.map((file,i)=>(
                      <div key={i} className="card">
                        <div style={{ display:"flex", alignItems:"center", gap:11 }}>
                          <div style={{ width:38,height:38,background:"rgba(0,190,255,.08)",border:"1px solid rgba(0,190,255,.15)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#00c0ff" }}>
                            <I n={fIcon(file.type)} s={17}/>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ color:"#90d0e8", fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{file.name}</div>
                            <div style={{ color:"#0f2d40", fontSize:10, marginTop:3 }}>{fmt(file.size)} · {fmtDate(file.date)}</div>
                          </div>
                          <button className="btn" onClick={()=>handleDownload(file)} style={{ padding:"8px 10px", flexShrink:0 }}>
                            <I n="download" s={14}/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}
        {tab==="ai" && (
          <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 160px)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <div style={{ color:"#00c0ff", fontSize:12, letterSpacing:2 }}>AI ASSISTANT</div>
                <div style={{ color:"#0f2d40", fontSize:10 }}>Storage baare mein poochho</div>
              </div>
              {chat.length>0 && <button className="btn red" onClick={()=>{setChat([]);saveChat([]);}} style={{ fontSize:11,padding:"7px 11px" }}>CLEAR</button>}
            </div>
            {chat.length===0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                  {["Meri files organize karo","Storage tips do","Konsa vault use karun?","Bot setup mein help karo"].map(q=>(
                    <button key={q} onClick={()=>setChatIn(q)} style={{ background:"rgba(0,190,255,.06)",border:"1px solid rgba(0,190,255,.14)",color:"#1a5070",padding:"7px 12px",borderRadius:20,cursor:"pointer",fontSize:11,fontFamily:"'Courier New',monospace" }}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ flex:1, overflowY:"auto", marginBottom:12 }}>
              {chat.map((m,i)=>(
                <div key={i} style={{
                  padding:"12px 14px", borderRadius:12, marginBottom:9, fontSize:13, lineHeight:1.7,
                  background:m.role==="user"?"rgba(0,190,255,.07)":"rgba(255,255,255,.02)",
                  border:`1px solid ${m.role==="user"?"rgba(0,190,255,.18)":"rgba(255,255,255,.05)"}`,
                  marginLeft:m.role==="user"?20:0, marginRight:m.role==="user"?0:20
                }}>
                  <div style={{ color:m.role==="user"?"#00c0ff":"#00ee88", fontSize:10, marginBottom:5 }}>
                    {m.role==="user"?`▶ ${userName}`:"◆ AI"}
                  </div>
                  <div style={{ color:"#90c8d8", whiteSpace:"pre-wrap" }}>{m.content}</div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ padding:"12px 14px", borderRadius:12, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.05)", marginRight:20 }}>
                  <div style={{ color:"#00ee88", fontSize:10, marginBottom:8 }}>◆ AI</div>
                  <div style={{ display:"flex", gap:5 }}>
                    {[0,1,2].map(i=><div key={i} style={{ width:6,height:6,borderRadius:"50%",background:"#00c0ff",animation:`dot 1.2s ${i*.3}s infinite`}}/>)}
                  </div>
                </div>
              )}
              <div ref={chatEnd}/>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input className="inp" placeholder="Kuch bhi poochho..." value={chatIn} onChange={e=>setChatIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} disabled={chatLoading} style={{ flex:1 }}/>
              <button onClick={sendChat} disabled={chatLoading||!chatIn.trim()} style={{ background:"linear-gradient(135deg,#00c0ff,#0068bb)",border:"none",color:"#000",padding:"11px 15px",borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center" }}>
                <I n="send" s={17}/>
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:"rgba(4,10,20,.98)", borderTop:"1px solid rgba(0,190,255,.08)", display:"flex", zIndex:100 }}>
        {[{id:"vaults",icon:"cloud",label:"VAULTS"},{id:"files",icon:"file",label:"FILES"},{id:"ai",icon:"ai",label:"AI CHAT"}].map(t=>(
          <button key={t.id} className={`tb ${tab===t.id?"on":""}`} onClick={()=>setTab(t.id)}>
            <I n={t.icon} s={20}/>{t.label}
          </button>
        ))}
      </div>

      {toast && (
        <div style={{
          position:"fixed", top:68, left:"50%", transform:"translateX(-50%)",
          background:toast.type==="err"?"rgba(255,50,50,.15)":"rgba(0,200,100,.1)",
          border:`1px solid ${toast.type==="err"?"rgba(255,50,50,.3)":"rgba(0,200,100,.25)"}`,
          color:toast.type==="err"?"#ff7878":"#00ee88",
          padding:"9px 18px", borderRadius:10, fontSize:12,
          animation:"toast 3s ease forwards", zIndex:999, whiteSpace:"nowrap"
        }}>{toast.msg}</div>
      )}
    </div>
  );
              }
