import { mkdir, writeFile } from "node:fs/promises";

const username = process.env.PROFILE_USERNAME || process.env.GITHUB_REPOSITORY_OWNER || "Octavio345";
const token = process.env.GITHUB_TOKEN || "";
const outputDir = "assets";

function contributionWindow() {
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 370);
  from.setUTCHours(0, 0, 0, 0);
  return { from, to, fromDate: from.toISOString().slice(0, 10), toDate: to.toISOString().slice(0, 10), fromDateTime: from.toISOString(), toDateTime: to.toISOString() };
}

function emptyCalendar() {
  const days = [];
  const { from } = contributionWindow();
  for (let i = 0; i <= 370; i++) {
    const date = new Date(from);
    date.setUTCDate(from.getUTCDate() + i);
    days.push({ date: date.toISOString().slice(0, 10), contributionCount: 0, weekday: date.getUTCDay() });
  }
  return { totalContributions: 0, totalCommitContributions: 0, days };
}

async function fetchPublicCommitCalendar() {
  const range = contributionWindow();
  const headers = { accept: "application/vnd.github.cloak-preview+json", "user-agent": "octavio-profile-readme" };
  const daysByDate = new Map();
  for (let i = 0; i <= 370; i++) {
    const date = new Date(range.from);
    date.setUTCDate(range.from.getUTCDate() + i);
    daysByDate.set(date.toISOString().slice(0, 10), { date: date.toISOString().slice(0, 10), contributionCount: 0, weekday: date.getUTCDay() });
  }
  const query = encodeURIComponent(`author:${username} author-date:${range.fromDate}..${range.toDate}`);
  let totalCommitContributions = 0;
  for (let page = 1; page <= 10; page++) {
    let response;
    try { response = await fetch(`https://api.github.com/search/commits?q=${query}&per_page=100&page=${page}`, { headers }); }
    catch { return null; }
    if (!response.ok) return null;
    const payload = await response.json();
    totalCommitContributions = payload.total_count ?? totalCommitContributions;
    for (const item of payload.items || []) {
      const date = item?.commit?.author?.date?.slice(0, 10);
      const day = daysByDate.get(date);
      if (day) day.contributionCount += 1;
    }
    if (!payload.items?.length || page * 100 >= totalCommitContributions) break;
  }
  return { totalContributions: totalCommitContributions, totalCommitContributions, days: Array.from(daysByDate.values()) };
}

async function fetchContributionCalendar() {
  if (!token) return (await fetchPublicCommitCalendar()) || emptyCalendar();
  const range = contributionWindow();
  const query = `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){totalCommitContributions contributionCalendar{totalContributions weeks{contributionDays{date weekday contributionCount}}}}}}`;
  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "user-agent": "octavio-profile-readme" },
      body: JSON.stringify({ query, variables: { login: username, from: range.fromDateTime, to: range.toDateTime } })
    });
    if (!response.ok) return (await fetchPublicCommitCalendar()) || emptyCalendar();
    const payload = await response.json();
    const collection = payload?.data?.user?.contributionsCollection;
    const calendar = collection?.contributionCalendar;
    if (!calendar?.weeks) return (await fetchPublicCommitCalendar()) || emptyCalendar();
    return { totalContributions: calendar.totalContributions, totalCommitContributions: collection.totalCommitContributions, days: calendar.weeks.flatMap(w => w.contributionDays) };
  } catch { return (await fetchPublicCommitCalendar()) || emptyCalendar(); }
}

const esc = (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function profileHeader() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="520" viewBox="0 0 1400 520">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1400" y2="520"><stop stop-color="#050907"/><stop offset=".52" stop-color="#09150E"/><stop offset="1" stop-color="#0A2014"/></linearGradient>
    <linearGradient id="lime" x1="250" y1="100" x2="1240" y2="420"><stop stop-color="#A9FFB7"/><stop offset=".45" stop-color="#63E67A"/><stop offset="1" stop-color="#20B85A"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#63E67A" stop-opacity=".26"/><stop offset="1" stop-color="#63E67A" stop-opacity="0"/></radialGradient>
    <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0V44" fill="none" stroke="#1D3928" stroke-width="1" opacity=".34"/></pattern>
    <filter id="soft"><feGaussianBlur stdDeviation="9"/></filter>
    <style>
      .flow{stroke-dasharray:10 18;animation:flow 18s linear infinite}.scan{animation:scan 6s ease-in-out infinite}.drone{animation:drone 4.8s ease-in-out infinite;transform-origin:1120px 145px}.pulse{animation:pulse 2.8s ease-in-out infinite}.data{animation:data 3s ease-in-out infinite}.data2{animation:data 3s ease-in-out 1s infinite}.row{animation:row 5s ease-in-out infinite}
      @keyframes flow{to{stroke-dashoffset:-420}} @keyframes scan{0%,100%{transform:translateX(-420px);opacity:0}18%{opacity:.6}72%{opacity:.6}88%{transform:translateX(1180px);opacity:0}} @keyframes drone{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}} @keyframes pulse{0%,100%{opacity:.35}50%{opacity:1}} @keyframes data{0%,100%{opacity:.35;transform:translateY(0)}50%{opacity:1;transform:translateY(-5px)}} @keyframes row{0%,100%{opacity:.24}50%{opacity:.48}}
    </style>
  </defs>
  <rect width="1400" height="520" rx="36" fill="url(#bg)"/><rect width="1400" height="520" rx="36" fill="url(#grid)"/>
  <ellipse cx="1060" cy="245" rx="470" ry="330" fill="url(#glow)"/>
  <path d="M0 442C210 390 355 410 520 360C706 304 858 328 1030 282C1186 240 1297 204 1400 214V520H0Z" fill="#0A1E12"/>
  <g class="row" fill="none" stroke="#2E7D46" stroke-width="2">
    <path d="M720 520L1005 276"/><path d="M850 520L1055 276"/><path d="M995 520L1106 276"/><path d="M1140 520L1158 276"/><path d="M1285 520L1210 276"/><path d="M1400 468L1262 276"/>
  </g>
  <g opacity=".62" stroke="#63E67A" stroke-width="2" fill="#0D2818">
    ${[0,1,2,3,4,5,6,7].map(i=>`<path d="M${735+i*86} ${470-i*13}q18-25 36 0q-18 29-36 0Z"/>`).join("")}
  </g>
  <path class="flow" d="M54 385C245 274 366 356 540 252C705 153 823 277 980 185C1119 103 1247 128 1360 74" fill="none" stroke="url(#lime)" stroke-width="2.4" opacity=".48"/>
  <g class="scan"><rect x="80" y="42" width="180" height="412" rx="90" fill="#63E67A" opacity=".045"/><rect x="168" y="42" width="2" height="412" fill="#A9FFB7" opacity=".75"/></g>
  <g transform="translate(76 70)">
    <text x="0" y="20" fill="#73A982" font-family="Segoe UI,Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="3.8">SOFTWARE  •  IA  •  AGTECH</text>
    <text x="0" y="104" fill="#F3FFF6" font-family="Segoe UI,Arial,sans-serif" font-size="76" font-weight="900">OCTAVIO</text>
    <text x="0" y="174" fill="url(#lime)" font-family="Segoe UI,Arial,sans-serif" font-size="76" font-weight="900">AUGUSTO</text>
    <text x="4" y="222" fill="#C0D8C7" font-family="Segoe UI,Arial,sans-serif" font-size="23" font-weight="600">Desenvolvimento de Software + Inteligência Artificial aplicada ao campo</text>
    <g transform="translate(0 265)">
      <rect width="190" height="52" rx="16" fill="#0C1C12" stroke="#285839"/><circle cx="28" cy="26" r="6" fill="#63E67A" class="pulse"/><text x="48" y="33" fill="#E8F9ED" font-family="Segoe UI,Arial,sans-serif" font-size="16" font-weight="700">Visão Computacional</text>
      <g transform="translate(210 0)"><rect width="142" height="52" rx="16" fill="#0C1C12" stroke="#285839"/><circle cx="28" cy="26" r="6" fill="#63E67A" class="pulse"/><text x="48" y="33" fill="#E8F9ED" font-family="Segoe UI,Arial,sans-serif" font-size="16" font-weight="700">Backend</text></g>
      <g transform="translate(372 0)"><rect width="178" height="52" rx="16" fill="#0C1C12" stroke="#285839"/><circle cx="28" cy="26" r="6" fill="#63E67A" class="pulse"/><text x="48" y="33" fill="#E8F9ED" font-family="Segoe UI,Arial,sans-serif" font-size="16" font-weight="700">Machine Learning</text></g>
    </g>
  </g>
  <g class="drone">
    <path d="M1065 135h110M1120 135v36M1083 126l-36-20M1157 126l36-20" stroke="#A9FFB7" stroke-width="4" stroke-linecap="round"/>
    <rect x="1091" y="116" width="58" height="37" rx="14" fill="#0C1C12" stroke="#63E67A" stroke-width="2"/><circle cx="1120" cy="136" r="8" fill="#63E67A" opacity=".8"/>
    <ellipse cx="1038" cy="102" rx="38" ry="5" fill="#63E67A" opacity=".35"/><ellipse cx="1202" cy="102" rx="38" ry="5" fill="#63E67A" opacity=".35"/>
    <path d="M1099 166L1038 305M1141 166l92 139" stroke="#63E67A" stroke-width="1.5" opacity=".24" stroke-dasharray="6 8"/>
  </g>
  <g transform="translate(1015 322)">
    <rect width="305" height="122" rx="24" fill="#07110C" stroke="#2A5D3B"/>
    <text x="24" y="34" fill="#73A982" font-family="Segoe UI,Arial,sans-serif" font-size="13" font-weight="800" letter-spacing="2.3">TCC • MONITORAMENTO DE SOJA</text>
    <text x="24" y="68" fill="#F3FFF6" font-family="Segoe UI,Arial,sans-serif" font-size="22" font-weight="800">IA + Visão Computacional</text>
    <g class="data"><circle cx="28" cy="96" r="4" fill="#63E67A"/><path d="M40 96h52" stroke="#63E67A" stroke-width="2"/><text x="104" y="101" fill="#AFC9B6" font-family="Segoe UI,Arial,sans-serif" font-size="13">campo → dados → decisão</text></g>
  </g>
</svg>`;
}

function agrotechProject() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="620" viewBox="0 0 1400 620">
  <defs>
    <linearGradient id="b" x1="0" y1="0" x2="1400" y2="620"><stop stop-color="#050907"/><stop offset="1" stop-color="#0C2115"/></linearGradient>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#B7FFC3"/><stop offset="1" stop-color="#43D76B"/></linearGradient>
    <pattern id="g" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#183422" stroke-width="1" opacity=".45"/></pattern>
    <style>.pipe{stroke-dasharray:8 12;animation:p 8s linear infinite}.scan{animation:s 4.5s ease-in-out infinite}.blink{animation:b 2.6s ease-in-out infinite}.float{animation:f 4s ease-in-out infinite}@keyframes p{to{stroke-dashoffset:-240}}@keyframes s{0%,100%{transform:translateX(0);opacity:.15}50%{transform:translateX(180px);opacity:.8}}@keyframes b{0%,100%{opacity:.35}50%{opacity:1}}@keyframes f{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}</style>
  </defs>
  <rect width="1400" height="620" rx="34" fill="url(#b)"/><rect width="1400" height="620" rx="34" fill="url(#g)"/>
  <text x="70" y="78" fill="#73A982" font-family="Segoe UI,Arial,sans-serif" font-size="15" font-weight="800" letter-spacing="3">PROJETO EM DESTAQUE</text>
  <text x="70" y="128" fill="#F3FFF6" font-family="Segoe UI,Arial,sans-serif" font-size="38" font-weight="900">Monitoramento agrícola com IA</text>
  <text x="70" y="160" fill="#9AB7A2" font-family="Segoe UI,Arial,sans-serif" font-size="17">Da captura da imagem ao resultado estruturado no backend.</text>

  <path class="pipe" d="M258 330H418M626 330H786M994 330H1150" fill="none" stroke="#63E67A" stroke-width="2" opacity=".52"/>
  <g transform="translate(70 220)" class="float"><rect width="188" height="220" rx="24" fill="#08150D" stroke="#2A5D3B"/>
    <text x="24" y="34" fill="#73A982" font-family="Segoe UI,Arial,sans-serif" font-size="12" font-weight="800" letter-spacing="2">01 • CAPTURA</text>
    <g transform="translate(94 96)"><path d="M-42 0h84M0 0v26M-28-8l-30-16M28-8l30-16" stroke="#A9FFB7" stroke-width="4" stroke-linecap="round"/><rect x="-24" y="-18" width="48" height="34" rx="12" fill="#0D2818" stroke="#63E67A"/><circle r="7" fill="#63E67A"/></g>
    <text x="24" y="172" fill="#F3FFF6" font-family="Segoe UI,Arial,sans-serif" font-size="18" font-weight="800">Campo / Drone</text><text x="24" y="197" fill="#92AE99" font-family="Segoe UI,Arial,sans-serif" font-size="13">imagens da lavoura</text></g>

  <g transform="translate(418 220)"><rect width="208" height="220" rx="24" fill="#08150D" stroke="#2A5D3B"/><text x="24" y="34" fill="#73A982" font-family="Segoe UI,Arial,sans-serif" font-size="12" font-weight="800" letter-spacing="2">02 • PROCESSAMENTO</text>
    <rect x="28" y="65" width="152" height="82" rx="15" fill="#0C2115" stroke="#39794F"/><path d="M38 133c28-42 48-20 68-52 13 25 30 13 64 50" fill="none" stroke="#63E67A" stroke-width="3"/><g class="scan"><rect x="38" y="72" width="3" height="68" fill="#B7FFC3"/></g>
    <text x="24" y="172" fill="#F3FFF6" font-family="Segoe UI,Arial,sans-serif" font-size="18" font-weight="800">OpenCV + NumPy</text><text x="24" y="197" fill="#92AE99" font-family="Segoe UI,Arial,sans-serif" font-size="13">segmentação e análise visual</text></g>

  <g transform="translate(786 220)"><rect width="208" height="220" rx="24" fill="#08150D" stroke="#2A5D3B"/><text x="24" y="34" fill="#73A982" font-family="Segoe UI,Arial,sans-serif" font-size="12" font-weight="800" letter-spacing="2">03 • INTELIGÊNCIA</text>
    <g transform="translate(104 106)" fill="none" stroke="#63E67A" stroke-width="2"><circle r="20"/><circle cx="-48" cy="-28" r="8"/><circle cx="50" cy="-30" r="8"/><circle cx="-50" cy="32" r="8"/><circle cx="48" cy="34" r="8"/><path d="M-19-8l-22-15M19-8l24-17M-18 10l-25 17M18 11l23 18"/></g>
    <text x="24" y="172" fill="#F3FFF6" font-family="Segoe UI,Arial,sans-serif" font-size="18" font-weight="800">TensorFlow / ML</text><text x="24" y="197" fill="#92AE99" font-family="Segoe UI,Arial,sans-serif" font-size="13">classificação de doenças</text></g>

  <g transform="translate(1150 220)"><rect width="180" height="220" rx="24" fill="#08150D" stroke="#2A5D3B"/><text x="24" y="34" fill="#73A982" font-family="Segoe UI,Arial,sans-serif" font-size="12" font-weight="800" letter-spacing="2">04 • API</text>
    <g transform="translate(30 67)" fill="#0D2818" stroke="#63E67A"><rect width="120" height="22" rx="8"/><rect y="32" width="120" height="22" rx="8"/><rect y="64" width="120" height="22" rx="8"/></g><g fill="#63E67A" class="blink"><circle cx="46" cy="78" r="3"/><circle cx="46" cy="110" r="3"/><circle cx="46" cy="142" r="3"/></g>
    <text x="24" y="172" fill="#F3FFF6" font-family="Segoe UI,Arial,sans-serif" font-size="18" font-weight="800">FastAPI</text><text x="24" y="197" fill="#92AE99" font-family="Segoe UI,Arial,sans-serif" font-size="13">resultado estruturado</text></g>

  <g transform="translate(70 490)">
    <rect width="1260" height="78" rx="22" fill="#07110C" stroke="#234A31"/>
    <text x="26" y="31" fill="#73A982" font-family="Segoe UI,Arial,sans-serif" font-size="12" font-weight="800" letter-spacing="2">O QUE O SISTEMA OBSERVA</text>
    <text x="26" y="57" fill="#E8F9ED" font-family="Segoe UI,Arial,sans-serif" font-size="16" font-weight="700">doenças da soja   •   falhas de plantio   •   densidade   •   uniformidade   •   regiões fora do padrão</text>
  </g>
</svg>`;
}

const stackGroups = [
  { title: "IA & VISÃO", accent: "#7CFF95", items: ["Python", "TensorFlow", "OpenCV", "NumPy"] },
  { title: "BACKEND", accent: "#58D68D", items: ["FastAPI", "PHP", "APIs", "Uvicorn"] },
  { title: "FRONTEND", accent: "#75D9FF", items: ["React", "JavaScript", "HTML5", "CSS"] },
  { title: "ENTREGA", accent: "#FFD84C", items: ["Git", "GitHub", "Docker", "Hugging Face"] }
];

function stackSvg() {
  const groups = stackGroups.map((group, gi) => {
    const x = 70 + gi * 322;
    const pills = group.items.map((label, i) => {
      const y = 110 + i * 58;
      return `<g transform="translate(22 ${y})" class="pill" style="animation-delay:${(gi*4+i)*.09}s"><rect width="236" height="44" rx="14" fill="#0B1A11" stroke="#254C33"/><circle cx="22" cy="22" r="5" fill="${group.accent}"/><text x="40" y="28" fill="#EAF8EE" font-family="Segoe UI,Arial,sans-serif" font-size="15" font-weight="700">${label}</text><path d="M204 22h12m-6-6 6 6-6 6" fill="none" stroke="${group.accent}" stroke-width="1.5" opacity=".5"/></g>`;
    }).join("");
    return `<g transform="translate(${x} 154)"><rect width="280" height="350" rx="25" fill="#07110C" stroke="#244D33"/><rect x="1" y="1" width="278" height="58" rx="24" fill="#0C2115"/><circle cx="24" cy="29" r="6" fill="${group.accent}"/><text x="42" y="35" fill="#F3FFF6" font-family="Segoe UI,Arial,sans-serif" font-size="16" font-weight="800" letter-spacing="1.4">${esc(group.title)}</text>${pills}</g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="560" viewBox="0 0 1400 560"><defs><linearGradient id="bg" x1="0" y1="0" x2="1400" y2="560"><stop stop-color="#050907"/><stop offset="1" stop-color="#0A1D12"/></linearGradient><pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse"><path d="M42 0H0V42" fill="none" stroke="#193422" stroke-width="1" opacity=".35"/></pattern><style>.pill{animation:f 5.5s ease-in-out infinite}@keyframes f{0%,100%{opacity:.82;transform:translateX(0)}50%{opacity:1;transform:translateX(3px)}}</style></defs><rect width="1400" height="560" rx="32" fill="url(#bg)"/><rect width="1400" height="560" rx="32" fill="url(#grid)"/><text x="70" y="68" fill="#F3FFF6" font-family="Segoe UI,Arial,sans-serif" font-size="34" font-weight="900">Tecnologia de ponta a ponta</text><text x="70" y="101" fill="#92AE99" font-family="Segoe UI,Arial,sans-serif" font-size="16">A stack muda conforme o problema. A base continua sendo construir bem e integrar tudo.</text><path d="M70 126H1330" stroke="#244D33"/><circle cx="1170" cy="126" r="4" fill="#63E67A"/><circle cx="1200" cy="126" r="4" fill="#63E67A" opacity=".6"/><circle cx="1230" cy="126" r="4" fill="#63E67A" opacity=".3"/>${groups}</svg>`;
}

function contributionSvg(calendar) {
  const days = calendar.days.slice(-371);
  const total = calendar.totalContributions ?? days.reduce((s,d)=>s+d.contributionCount,0);
  const commits = calendar.totalCommitContributions ?? total;
  const active = days.filter(d=>d.contributionCount>0).length;
  const cell=14,gap=5,startX=74,startY=188;
  const colors=["#102019","#17452A","#1E7439","#36B85B","#7CFF95"];
  const cells=days.map((d,i)=>{const week=Math.floor(i/7), wd=d.weekday??new Date(`${d.date}T00:00:00Z`).getUTCDay();const x=startX+week*(cell+gap), y=startY+wd*(cell+gap);const l=d.contributionCount<=0?0:d.contributionCount<=2?1:d.contributionCount<=5?2:d.contributionCount<=9?3:4;return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="4" fill="${colors[l]}" stroke="#1B3927"><title>${esc(d.date)}: ${d.contributionCount} contribuições</title></rect>`}).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="500" viewBox="0 0 1400 500"><defs><linearGradient id="bg" x1="0" y1="0" x2="1400" y2="500"><stop stop-color="#050907"/><stop offset="1" stop-color="#0A1D12"/></linearGradient><pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse"><path d="M42 0H0V42" fill="none" stroke="#193422" opacity=".3"/></pattern><style>.s{animation:s 7s ease-in-out infinite}@keyframes s{0%,100%{transform:translateX(-100px);opacity:0}20%,70%{opacity:.4}85%{transform:translateX(1000px);opacity:0}}</style></defs><rect width="1400" height="500" rx="32" fill="url(#bg)"/><rect width="1400" height="500" rx="32" fill="url(#grid)"/><text x="74" y="76" fill="#F3FFF6" font-family="Segoe UI,Arial,sans-serif" font-size="34" font-weight="900">Mapa de atividade</text><text x="74" y="108" fill="#92AE99" font-family="Segoe UI,Arial,sans-serif" font-size="16">Um ano de código visto como um campo de dados.</text><g><rect x="56" y="156" width="1036" height="184" rx="22" fill="#07110C" stroke="#244D33"/><g class="s"><rect x="60" y="158" width="120" height="180" rx="60" fill="#63E67A" opacity=".06"/><rect x="116" y="158" width="2" height="180" fill="#A9FFB7"/></g>${cells}</g><g transform="translate(1130 156)"><rect width="200" height="82" rx="20" fill="#07110C" stroke="#244D33"/><text x="22" y="29" fill="#73A982" font-family="Segoe UI,Arial,sans-serif" font-size="12" font-weight="800" letter-spacing="2">COMMITS</text><text x="22" y="63" fill="#7CFF95" font-family="Segoe UI,Arial,sans-serif" font-size="32" font-weight="900">${esc(commits)}</text><g transform="translate(0 100)"><rect width="200" height="82" rx="20" fill="#07110C" stroke="#244D33"/><text x="22" y="29" fill="#73A982" font-family="Segoe UI,Arial,sans-serif" font-size="12" font-weight="800" letter-spacing="2">CONTRIBUIÇÕES</text><text x="22" y="63" fill="#7CFF95" font-family="Segoe UI,Arial,sans-serif" font-size="32" font-weight="900">${esc(total)}</text></g><g transform="translate(0 200)"><rect width="200" height="82" rx="20" fill="#07110C" stroke="#244D33"/><text x="22" y="29" fill="#73A982" font-family="Segoe UI,Arial,sans-serif" font-size="12" font-weight="800" letter-spacing="2">DIAS ATIVOS</text><text x="22" y="63" fill="#7CFF95" font-family="Segoe UI,Arial,sans-serif" font-size="32" font-weight="900">${esc(active)}</text></g></g><path d="M74 403C250 350 392 418 560 366C720 316 860 352 1012 300" fill="none" stroke="#63E67A" stroke-width="2" opacity=".22" stroke-dasharray="8 14"/><text x="74" y="448" fill="#6F8F78" font-family="Segoe UI,Arial,sans-serif" font-size="13">dados atualizados automaticamente pelo GitHub Actions</text></svg>`;
}

await mkdir(outputDir,{recursive:true});
const calendar = await fetchContributionCalendar();
await writeFile(`${outputDir}/profile-header.svg`, profileHeader(), "utf8");
await writeFile(`${outputDir}/agrotech-project.svg`, agrotechProject(), "utf8");
await writeFile(`${outputDir}/tech-stack.svg`, stackSvg(), "utf8");
await writeFile(`${outputDir}/cinematic-contributions.svg`, contributionSvg(calendar), "utf8");
console.log(`Generated AgroTech profile assets for ${username}`);
