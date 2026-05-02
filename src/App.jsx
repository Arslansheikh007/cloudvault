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
