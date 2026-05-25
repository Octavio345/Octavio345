import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as icons from "simple-icons";
import { mkdir, writeFile } from "node:fs/promises";

const username =
  process.env.PROFILE_USERNAME ||
  process.env.GITHUB_REPOSITORY_OWNER ||
  "Octavio345";

const token = process.env.GITHUB_TOKEN || "";
const outputDir = "assets";
const h = React.createElement;

function contributionWindow() {
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);

  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 370);
  from.setUTCHours(0, 0, 0, 0);

  return {
    from,
    to,
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
    fromDateTime: from.toISOString(),
    toDateTime: to.toISOString()
  };
}

function xml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderSvg(component) {
  return `${renderToStaticMarkup(component)}\n`;
}

function levelFor(count) {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

function emptyCalendar() {
  const days = [];
  const { from } = contributionWindow();

  for (let i = 0; i <= 370; i += 1) {
    const date = new Date(from);
    date.setUTCDate(from.getUTCDate() + i);

    days.push({
      date: date.toISOString().slice(0, 10),
      contributionCount: 0,
      weekday: date.getUTCDay()
    });
  }

  return {
    totalContributions: 0,
    totalCommitContributions: 0,
    days
  };
}

async function fetchContributionCalendar() {
  if (!token) {
    const publicCalendar = await fetchPublicCommitCalendar();
    return publicCalendar || emptyCalendar();
  }

  const range = contributionWindow();

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                weekday
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "octavio-profile-readme"
    },
    body: JSON.stringify({
      query,
      variables: {
        login: username,
        from: range.fromDateTime,
        to: range.toDateTime
      }
    })
  });

  if (!response.ok) return (await fetchPublicCommitCalendar()) || emptyCalendar();

  const payload = await response.json();
  const collection = payload?.data?.user?.contributionsCollection;
  const calendar = collection?.contributionCalendar;

  if (!calendar?.weeks) return (await fetchPublicCommitCalendar()) || emptyCalendar();

  return {
    totalContributions: calendar.totalContributions,
    totalCommitContributions: collection.totalCommitContributions,
    days: calendar.weeks.flatMap((week) => week.contributionDays)
  };
}

async function fetchPublicCommitCalendar() {
  const range = contributionWindow();
  const headers = {
    accept: "application/vnd.github.cloak-preview+json",
    "user-agent": "octavio-profile-readme"
  };

  const daysByDate = new Map();
  const start = new Date(range.from);

  for (let i = 0; i <= 370; i += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    daysByDate.set(date.toISOString().slice(0, 10), {
      date: date.toISOString().slice(0, 10),
      contributionCount: 0,
      weekday: date.getUTCDay()
    });
  }

  const query = encodeURIComponent(`author:${username} author-date:${range.fromDate}..${range.toDate}`);
  let totalCommitContributions = 0;
  let page = 1;

  while (page <= 10) {
    let response;

    try {
      response = await fetch(`https://api.github.com/search/commits?q=${query}&per_page=100&page=${page}`, {
        headers
      });
    } catch {
      return null;
    }

    if (!response.ok) return null;

    const payload = await response.json();
    totalCommitContributions = payload.total_count ?? totalCommitContributions;

    for (const item of payload.items || []) {
      const date = item?.commit?.author?.date?.slice(0, 10);
      const day = daysByDate.get(date);
      if (day) day.contributionCount += 1;
    }

    if (!payload.items?.length || page * 100 >= totalCommitContributions) break;
    page += 1;
  }

  const days = Array.from(daysByDate.values());

  return {
    totalContributions: totalCommitContributions,
    totalCommitContributions,
    days
  };
}

function Svg({ width, height, children }) {
  return h(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      fill: "none"
    },
    children
  );
}

function SimpleIcon({ icon, x, y, size = 28, color = `#${icon.hex}` }) {
  return h(
    "g",
    { transform: `translate(${x} ${y}) scale(${size / 24})` },
    h("path", { d: icon.path, fill: color })
  );
}

function ChatGptMark({ x, y, size = 28, color = "#10A37F" }) {
  const scale = size / 64;

  return h(
    "g",
    {
      transform: `translate(${x} ${y}) scale(${scale})`,
      fill: "none",
      stroke: color,
      strokeWidth: 5,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    h("path", { d: "M32 8C42 8 47 17 43 25" }),
    h("path", { d: "M43 25C52 28 55 39 48 47" }),
    h("path", { d: "M48 47C42 55 30 54 26 46" }),
    h("path", { d: "M26 46C17 49 8 42 9 32" }),
    h("path", { d: "M9 32C8 22 17 15 26 18" }),
    h("path", { d: "M26 18C30 10 42 9 47 17" }),
    h("path", { d: "M22 25L38 16" }),
    h("path", { d: "M42 27L42 45" }),
    h("path", { d: "M36 49L20 40" }),
    h("path", { d: "M17 35L17 19" }),
    h("path", { d: "M22 18L38 27" }),
    h("path", { d: "M42 38L26 47" })
  );
}

function TechChip({ x, y, icon, label, color }) {
  return h(
    "g",
    { transform: `translate(${x} ${y})` },
    h("rect", {
      width: 212,
      height: 64,
      rx: 18,
      fill: "#0B111D",
      stroke: "#263449"
    }),
    h("rect", {
      x: 12,
      y: 12,
      width: 40,
      height: 40,
      rx: 12,
      fill: "#111C2E"
    }),
    h(SimpleIcon, { icon, x: 20, y: 20, size: 24, color }),
    h("text", {
      x: 66,
      y: 39,
      fill: "#F0F6FC",
      fontFamily: "Inter, Segoe UI, Arial, sans-serif",
      fontSize: 18,
      fontWeight: 850
    }, label)
  );
}

function StackCard({ x, y, icon, label, color, customIcon }) {
  return h(
    "g",
    { transform: `translate(${x} ${y})` },
    h("rect", {
      width: 170,
      height: 124,
      rx: 22,
      fill: "#0B111D",
      stroke: "#263449"
    }),
    h("rect", {
      x: 45,
      y: 22,
      width: 80,
      height: 58,
      rx: 18,
      fill: "#111827",
      stroke: "#243044"
    }),
    customIcon
      ? customIcon(68, 35, 34)
      : h(SimpleIcon, { icon, x: 70, y: 35, size: 34, color }),
    h("text", {
      x: 85,
      y: 103,
      textAnchor: "middle",
      fill: "#F0F6FC",
      fontFamily: "Inter, Segoe UI, Arial, sans-serif",
      fontSize: 16,
      fontWeight: 850
    }, label)
  );
}

function StackShowcase() {
  const items = [
    { label: "HTML5", icon: icons.siHtml5, color: "#E34F26" },
    { label: "CSS", icon: icons.siCss, color: "#663399" },
    { label: "JavaScript", icon: icons.siJavascript, color: "#F7DF1E" },
    { label: "React", icon: icons.siReact, color: "#61DAFB" },
    { label: "Bootstrap", icon: icons.siBootstrap, color: "#7952B3" },
    { label: "Tailwind", icon: icons.siTailwindcss, color: "#06B6D4" },
    { label: "Python", icon: icons.siPython, color: "#3776AB" },
    { label: "PHP", icon: icons.siPhp, color: "#777BB4" },
    { label: "Git", icon: icons.siGit, color: "#F05032" },
    { label: "GitHub", icon: icons.siGithub, color: "#F0F6FC" },
    { label: "ChatGPT", color: "#10A37F", customIcon: (x, y, size) => h(ChatGptMark, { x, y, size }) },
    { label: "Claude", icon: icons.siAnthropic, color: "#D97757" },
    { label: "OpenCV", icon: icons.siOpencv, color: "#5C3EE8" },
    { label: "Scikit-Learn", icon: icons.siScikitlearn, color: "#F7931E" }
  ];

  return h(
    Svg,
    { width: 1400, height: 520 },
    h(
      "defs",
      null,
      h(
        "linearGradient",
        { id: "stackBg", x1: 0, y1: 0, x2: 1400, y2: 520, gradientUnits: "userSpaceOnUse" },
        h("stop", { stopColor: "#070B12" }),
        h("stop", { offset: 0.55, stopColor: "#0D1117" }),
        h("stop", { offset: 1, stopColor: "#081521" })
      ),
      h(
        "radialGradient",
        { id: "stackGlow", cx: 0, cy: 0, r: 1, gradientUnits: "userSpaceOnUse", gradientTransform: "translate(700 250) scale(650 260)" },
        h("stop", { stopColor: "#58A6FF", stopOpacity: 0.15 }),
        h("stop", { offset: 1, stopColor: "#58A6FF", stopOpacity: 0 })
      ),
      h(
        "pattern",
        { id: "stackGrid", width: 44, height: 44, patternUnits: "userSpaceOnUse" },
        h("path", { d: "M44 0H0V44", stroke: "#1B2636", strokeWidth: 1, opacity: 0.28 })
      ),
      h("style", null, `
        .stack-line { stroke-dasharray: 12 18; animation: stackDash 34s linear infinite; }
        .stack-card { animation: stackFloat 8s ease-in-out infinite; }
        .stack-card:nth-of-type(2n) { animation-delay: .7s; }
        .stack-card:nth-of-type(3n) { animation-delay: 1.2s; }
        @keyframes stackDash { to { stroke-dashoffset: -520; } }
        @keyframes stackFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `)
    ),
    h("rect", { width: 1400, height: 520, rx: 32, fill: "url(#stackBg)" }),
    h("rect", { width: 1400, height: 520, rx: 32, fill: "url(#stackGrid)", opacity: 0.7 }),
    h("rect", { width: 1400, height: 520, rx: 32, fill: "url(#stackGlow)" }),
    h("rect", { x: 42, y: 42, width: 1316, height: 436, rx: 28, fill: "#0D1117", opacity: 0.72, stroke: "#30363D" }),
    h("path", {
      className: "stack-line",
      d: "M82 405C250 338 388 380 542 298C710 208 858 310 1020 220C1150 148 1242 178 1318 120",
      stroke: "#58A6FF",
      strokeWidth: 2,
      opacity: 0.20
    }),
    h("text", { x: 82, y: 92, fill: "#F0F6FC", fontFamily: "Inter, Segoe UI, Arial, sans-serif", fontSize: 32, fontWeight: 900, letterSpacing: 1 }, "Stack"),
    h("text", { x: 82, y: 122, fill: "#8B949E", fontFamily: "Inter, Segoe UI, Arial, sans-serif", fontSize: 16 }, "Tecnologias que uso para construir interfaces, APIs, IA aplicada e visao computacional."),
    items.map((item, index) => {
      const col = index % 7;
      const row = Math.floor(index / 7);
      return h(
        "g",
        { className: "stack-card", key: item.label },
        h(StackCard, {
          x: 82 + col * 182,
          y: 166 + row * 148,
          ...item
        })
      );
    })
  );
}

function ProfileHeader() {
  return h(
    Svg,
    { width: 1400, height: 440 },
    h(
      "defs",
      null,
      h(
        "linearGradient",
        { id: "bg", x1: 0, y1: 0, x2: 1400, y2: 440, gradientUnits: "userSpaceOnUse" },
        h("stop", { stopColor: "#05070D" }),
        h("stop", { offset: 0.48, stopColor: "#0D1117" }),
        h("stop", { offset: 1, stopColor: "#061B2D" })
      ),
      h(
        "linearGradient",
        { id: "accent", x1: 120, y1: 70, x2: 1240, y2: 365, gradientUnits: "userSpaceOnUse" },
        h("stop", { stopColor: "#58A6FF" }),
        h("stop", { offset: 0.5, stopColor: "#2F81F7" }),
        h("stop", { offset: 1, stopColor: "#39D353" })
      ),
      h(
        "radialGradient",
        { id: "glowA", cx: 0, cy: 0, r: 1, gradientUnits: "userSpaceOnUse", gradientTransform: "translate(260 105) rotate(24) scale(480 220)" },
        h("stop", { stopColor: "#58A6FF", stopOpacity: 0.38 }),
        h("stop", { offset: 1, stopColor: "#58A6FF", stopOpacity: 0 })
      ),
      h(
        "radialGradient",
        { id: "glowB", cx: 0, cy: 0, r: 1, gradientUnits: "userSpaceOnUse", gradientTransform: "translate(1110 310) rotate(18) scale(430 220)" },
        h("stop", { stopColor: "#39D353", stopOpacity: 0.16 }),
        h("stop", { offset: 1, stopColor: "#39D353", stopOpacity: 0 })
      ),
      h(
        "pattern",
        { id: "grid", width: 44, height: 44, patternUnits: "userSpaceOnUse" },
        h("path", { d: "M44 0H0V44", stroke: "#223149", strokeWidth: 1, opacity: 0.38 })
      ),
      h(
        "filter",
        { id: "blur", x: "-40%", y: "-40%", width: "180%", height: "180%" },
        h("feGaussianBlur", { stdDeviation: 8, result: "blur" }),
        h("feMerge", null, h("feMergeNode", { in: "blur" }), h("feMergeNode", { in: "SourceGraphic" }))
      ),
      h("style", null, `
        .dash { stroke-dasharray: 14 24; animation: dash 32s linear infinite; }
        .scan { animation: scan 8s ease-in-out infinite; }
        .pulse { animation: pulse 5s ease-in-out infinite; transform-origin: center; }
        .pulse2 { animation: pulse 5s ease-in-out infinite; animation-delay: 1.6s; transform-origin: center; }
        .cursor { animation: cursor 1.2s steps(2, end) infinite; }
        @keyframes dash { to { stroke-dashoffset: -520; } }
        @keyframes scan {
          0%, 100% { transform: translateX(-240px); opacity: 0; }
          18%, 65% { opacity: .42; }
          82% { transform: translateX(1050px); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: .52; transform: scale(.98); }
          50% { opacity: .9; transform: scale(1.02); }
        }
        @keyframes cursor {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `)
    ),
    h("rect", { width: 1400, height: 440, rx: 34, fill: "url(#bg)" }),
    h("rect", { width: 1400, height: 440, rx: 34, fill: "url(#grid)", opacity: 0.72 }),
    h("rect", { width: 1400, height: 440, rx: 34, fill: "url(#glowA)" }),
    h("rect", { width: 1400, height: 440, rx: 34, fill: "url(#glowB)" }),
    h("path", {
      className: "dash",
      d: "M76 348C220 258 348 328 486 226C630 120 788 264 940 158C1078 62 1200 102 1322 76",
      stroke: "url(#accent)",
      strokeWidth: 2.4,
      opacity: 0.48
    }),
    h("path", {
      className: "dash",
      d: "M86 108C220 150 338 66 500 102C660 138 764 80 922 120C1075 159 1180 228 1315 186",
      stroke: "#58A6FF",
      strokeWidth: 1.5,
      opacity: 0.22
    }),
    h(
      "g",
      { className: "scan" },
      h("rect", { x: 70, y: 38, width: 220, height: 364, rx: 110, fill: "#58A6FF", opacity: 0.09 }),
      h("rect", { x: 174, y: 38, width: 3, height: 364, fill: "#A5D6FF", opacity: 0.9 })
    ),
    h(
      "g",
      { transform: "translate(82 76)" },
      h("text", { x: 0, y: 24, fill: "#8B949E", fontFamily: "Inter, Segoe UI, Arial, sans-serif", fontSize: 16, fontWeight: 800, letterSpacing: 3 }, "DESENVOLVIMENTO DE SISTEMAS"),
      h("text", { x: 0, y: 98, fill: "#F0F6FC", fontFamily: "Inter, Segoe UI, Arial, sans-serif", fontSize: 72, fontWeight: 900, letterSpacing: 1 }, "OCTAVIO AUGUSTO"),
      h("text", { x: 4, y: 145, fill: "#C9D1D9", fontFamily: "Inter, Segoe UI, Arial, sans-serif", fontSize: 24, fontWeight: 650 }, "Web Developer | Machine Learning | IA Aplicada | Marketing Digital")
    ),
    h(TechChip, { x: 88, y: 272, icon: icons.siReact, label: "Frontend", color: "#61DAFB" }),
    h(TechChip, { x: 324, y: 272, icon: icons.siPython, label: "Machine Learning", color: "#3776AB" }),
    h(TechChip, { x: 560, y: 272, icon: icons.siGithub, label: "Versionamento", color: "#F0F6FC" }),
    h(
      "g",
      { transform: "translate(1010 238)" },
      h("rect", { x: 0, y: 0, width: 298, height: 110, rx: 24, fill: "#0D1117", stroke: "#30363D" }),
      h("text", { x: 28, y: 42, fill: "#8B949E", fontFamily: "Inter, Segoe UI, Arial, sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: 2 }, "PROJETO ATUAL"),
      h("text", { x: 28, y: 78, fill: "#F0F6FC", fontFamily: "Inter, Segoe UI, Arial, sans-serif", fontSize: 26, fontWeight: 900 }, "TCC | ML | Backend")
    ),
    h(
      "g",
      { filter: "url(#blur)" },
      h("circle", { className: "pulse", cx: 680, cy: 306, r: 6, fill: "#58A6FF" }),
      h("circle", { className: "pulse2", cx: 835, cy: 232, r: 5, fill: "#39D353" }),
      h("circle", { className: "pulse", cx: 1096, cy: 124, r: 5, fill: "#58A6FF" }),
      h("circle", { className: "pulse2", cx: 1216, cy: 190, r: 5, fill: "#39D353" })
    )
  );
}

function ContributionGrid({ calendar }) {
  const days = calendar.days.slice(-371);
  const totalCommits = calendar.totalCommitContributions ?? calendar.totalContributions ?? days.reduce((sum, day) => sum + day.contributionCount, 0);
  const totalContributions = calendar.totalContributions ?? days.reduce((sum, day) => sum + day.contributionCount, 0);
  const activeDays = days.filter((day) => day.contributionCount > 0).length;
  const maxDay = days.reduce((best, day) => (day.contributionCount > best.contributionCount ? day : best), days[0]);

  const cell = 14;
  const gap = 5;
  const startX = 76;
  const startY = 174;
  const gridWidth = 53 * (cell + gap) - gap;
  const gridHeight = 7 * (cell + gap) - gap;

  const cells = days.map((day, index) => {
    const week = Math.floor(index / 7);
    const weekday = day.weekday ?? new Date(`${day.date}T00:00:00Z`).getUTCDay();
    const x = startX + week * (cell + gap);
    const y = startY + weekday * (cell + gap);
    const level = levelFor(day.contributionCount);
    const delay = `${((index % 23) * 0.11).toFixed(2)}s`;
    const duration = `${(3.4 + (index % 7) * 0.18).toFixed(2)}s`;

    return h(
      "rect",
      {
        key: `${day.date}-${index}`,
        className: `cell l${level}${level >= 3 ? " hot" : ""}`,
        x,
        y,
        width: cell,
        height: cell,
        rx: 4,
        style: {
          animationDelay: delay,
          animationDuration: duration
        }
      },
      h("title", null, `${day.date}: ${day.contributionCount} contributions`)
    );
  });

  return h(
    Svg,
    { width: 1400, height: 520 },
    h(
      "defs",
      null,
      h(
        "linearGradient",
        { id: "bg", x1: 0, y1: 0, x2: 1400, y2: 520, gradientUnits: "userSpaceOnUse" },
        h("stop", { stopColor: "#05070D" }),
        h("stop", { offset: 0.52, stopColor: "#0D1117" }),
        h("stop", { offset: 1, stopColor: "#061B2D" })
      ),
      h(
        "linearGradient",
        { id: "accent", x1: 60, y1: 95, x2: 1285, y2: 400, gradientUnits: "userSpaceOnUse" },
        h("stop", { stopColor: "#58A6FF" }),
        h("stop", { offset: 0.55, stopColor: "#2F81F7" }),
        h("stop", { offset: 1, stopColor: "#39D353" })
      ),
      h(
        "filter",
        { id: "glow", x: "-50%", y: "-50%", width: "200%", height: "200%" },
        h("feGaussianBlur", { stdDeviation: 5, result: "blur" }),
        h("feMerge", null, h("feMergeNode", { in: "blur" }), h("feMergeNode", { in: "SourceGraphic" }))
      ),
      h("style", null, `
        .cell { stroke: #243044; stroke-width: 1; transform-origin: center; }
        .l0 { fill: #161B22; }
        .l1 { fill: #0E4429; }
        .l2 { fill: #006D32; }
        .l3 { fill: #26A641; }
        .l4 { fill: #39D353; filter: url(#glow); }
        .hot { animation-name: pulse; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        .sweep { animation: sweep 8.5s ease-in-out infinite; }
        .dash { stroke-dasharray: 18 24; animation: dash 36s linear infinite; }
        @keyframes pulse {
          0%, 100% { opacity: .78; transform: scale(.98); }
          50% { opacity: .98; transform: scale(1.025); }
        }
        @keyframes sweep {
          0%, 100% { transform: translateX(-170px); opacity: 0; }
          18%, 62% { opacity: .42; }
          82% { transform: translateX(${gridWidth + 80}px); opacity: 0; }
        }
        @keyframes dash { to { stroke-dashoffset: -650; } }
      `)
    ),
    h("rect", { width: 1400, height: 520, rx: 32, fill: "url(#bg)" }),
    h("rect", { x: 34, y: 34, width: 1332, height: 452, rx: 28, fill: "#0D1117", opacity: 0.62, stroke: "#30363D" }),
    h("text", { x: 76, y: 90, fill: "#F0F6FC", fontFamily: "Inter, Segoe UI, Arial, sans-serif", fontSize: 34, fontWeight: 900, letterSpacing: 0 }, "Commits e contribuicoes"),
    h("text", { x: 76, y: 124, fill: "#B7C3D0", fontFamily: "Inter, Segoe UI, Arial, sans-serif", fontSize: 17, fontWeight: 500 }, "Numeros reais do GitHub, atualizados automaticamente pela Action."),
    h("path", {
      className: "dash",
      d: "M76 405C220 312 340 396 485 284C628 176 780 306 932 206C1070 115 1194 170 1322 94",
      stroke: "url(#accent)",
      strokeWidth: 2.4,
      opacity: 0.46
    }),
    h(
      "g",
      null,
      h("rect", { x: startX - 18, y: startY - 20, width: gridWidth + 36, height: gridHeight + 40, rx: 22, fill: "#05070D", opacity: 0.72, stroke: "#30363D" }),
      h(
        "g",
        { className: "sweep" },
        h("rect", { x: startX - 34, y: startY - 22, width: 120, height: gridHeight + 44, rx: 60, fill: "#58A6FF", opacity: 0.08 }),
        h("rect", { x: startX + 20, y: startY - 22, width: 3, height: gridHeight + 44, fill: "#A5D6FF", opacity: 0.82 })
      ),
      cells
    ),
    h(
      "g",
      { transform: "translate(1120 172)" },
      h("rect", { x: 0, y: 0, width: 202, height: 96, rx: 20, fill: "#05070D", stroke: "#30363D" }),
      h("text", { x: 24, y: 34, fill: "#B7C3D0", fontFamily: "Inter, Segoe UI, Arial, sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 2 }, "COMMITS"),
      h("text", { x: 24, y: 72, fill: "#39D353", fontFamily: "Inter, Segoe UI, Arial, sans-serif", fontSize: 38, fontWeight: 900 }, `${xml(totalCommits)}`)
    ),
    h(
      "g",
      { transform: "translate(1120 292)" },
      h("rect", { x: 0, y: 0, width: 202, height: 86, rx: 20, fill: "#05070D", stroke: "#30363D" }),
      h("text", { x: 24, y: 31, fill: "#B7C3D0", fontFamily: "Inter, Segoe UI, Arial, sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 2 }, "CONTRIB."),
      h("text", { x: 24, y: 66, fill: "#58A6FF", fontFamily: "Inter, Segoe UI, Arial, sans-serif", fontSize: 34, fontWeight: 900 }, `${xml(totalContributions)}`)
    ),
    h(
      "g",
      { transform: "translate(1120 398)" },
      h("rect", { x: 0, y: 0, width: 202, height: 58, rx: 18, fill: "#05070D", stroke: "#30363D" }),
      h("text", { x: 22, y: 24, fill: "#B7C3D0", fontFamily: "Inter, Segoe UI, Arial, sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: 1.4 }, "DIAS ATIVOS"),
      h("text", { x: 146, y: 38, fill: "#58A6FF", fontFamily: "Inter, Segoe UI, Arial, sans-serif", fontSize: 26, fontWeight: 900 }, `${xml(activeDays)}`)
    ),
    h("text", { x: 76, y: 458, fill: "#B7C3D0", fontFamily: "Inter, Segoe UI, Arial, sans-serif", fontSize: 14 }, `Melhor dia: ${xml(maxDay?.date || "carregando")} com ${xml(maxDay?.contributionCount || 0)} contribuicoes`)
  );
}

await mkdir(outputDir, { recursive: true });

const calendar = await fetchContributionCalendar();

await writeFile(`${outputDir}/profile-header.svg`, renderSvg(h(ProfileHeader)), "utf8");
await writeFile(`${outputDir}/tech-stack.svg`, renderSvg(h(StackShowcase)), "utf8");
await writeFile(`${outputDir}/cinematic-contributions.svg`, renderSvg(h(ContributionGrid, { calendar })), "utf8");

console.log(`Generated React profile assets for ${username}`);
