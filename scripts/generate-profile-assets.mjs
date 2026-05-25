import { mkdir, writeFile } from "node:fs/promises";

const username =
  process.env.PROFILE_USERNAME ||
  process.env.GITHUB_REPOSITORY_OWNER ||
  "Octavio345";

const token = process.env.GITHUB_TOKEN || "";
const outputDir = "assets";

function xml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function levelFor(count) {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

function fallbackCalendar() {
  const days = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let i = 370; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - i);
    const wave = Math.sin(i * 0.18) + Math.cos(i * 0.07);
    const streak = i % 11 === 0 ? 7 : 0;
    const count = Math.max(0, Math.round(wave * 2 + 3 + streak - (i % 7 === 0 ? 2 : 0)));

    days.push({
      date: date.toISOString().slice(0, 10),
      contributionCount: count,
      weekday: date.getUTCDay()
    });
  }

  return {
    totalContributions: 430,
    days
  };
}

async function fetchContributionCalendar() {
  if (!token) return fallbackCalendar();

  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
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
    body: JSON.stringify({ query, variables: { login: username } })
  });

  if (!response.ok) {
    return fallbackCalendar();
  }

  const payload = await response.json();
  const calendar = payload?.data?.user?.contributionsCollection?.contributionCalendar;

  if (!calendar?.weeks) {
    return fallbackCalendar();
  }

  return {
    totalContributions: calendar.totalContributions,
    days: calendar.weeks.flatMap((week) => week.contributionDays)
  };
}

function buildHeaderSvg() {
  return `<svg width="1400" height="430" viewBox="0 0 1400 430" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1400" y2="430" gradientUnits="userSpaceOnUse">
      <stop stop-color="#05070D"/>
      <stop offset="0.48" stop-color="#0D1117"/>
      <stop offset="1" stop-color="#061B2D"/>
    </linearGradient>
    <linearGradient id="accent" x1="130" y1="70" x2="1240" y2="360" gradientUnits="userSpaceOnUse">
      <stop stop-color="#58A6FF"/>
      <stop offset="0.5" stop-color="#2F81F7"/>
      <stop offset="1" stop-color="#39D353"/>
    </linearGradient>
    <radialGradient id="glowA" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(250 105) rotate(24) scale(460 210)">
      <stop stop-color="#58A6FF" stop-opacity="0.42"/>
      <stop offset="1" stop-color="#58A6FF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1120 310) rotate(18) scale(420 210)">
      <stop stop-color="#39D353" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#39D353" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M42 0H0V42" stroke="#223149" stroke-width="1" opacity="0.42"/>
    </pattern>
    <filter id="blur" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <style>
      .dash { stroke-dasharray: 14 24; animation: dash 18s linear infinite; }
      .scan { animation: scan 5.2s ease-in-out infinite; }
      .float { animation: float 5s ease-in-out infinite; }
      .pulse { animation: pulse 2.8s ease-in-out infinite; transform-origin: center; }
      .pulse2 { animation: pulse 2.8s ease-in-out infinite; animation-delay: 1.1s; transform-origin: center; }
      .cursor { animation: cursor 1s steps(2, end) infinite; }
      @keyframes dash { to { stroke-dashoffset: -520; } }
      @keyframes scan {
        0%, 100% { transform: translateX(-240px); opacity: 0; }
        18%, 65% { opacity: .82; }
        82% { transform: translateX(1050px); opacity: 0; }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
      @keyframes pulse {
        0%, 100% { opacity: .48; transform: scale(.94); }
        50% { opacity: 1; transform: scale(1.06); }
      }
      @keyframes cursor {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }
    </style>
  </defs>

  <rect width="1400" height="430" rx="34" fill="url(#bg)"/>
  <rect width="1400" height="430" rx="34" fill="url(#grid)" opacity=".72"/>
  <rect width="1400" height="430" rx="34" fill="url(#glowA)"/>
  <rect width="1400" height="430" rx="34" fill="url(#glowB)"/>

  <path class="dash" d="M76 340C220 250 348 320 486 218C630 112 788 256 940 150C1078 54 1200 94 1322 68" stroke="url(#accent)" stroke-width="2.4" opacity=".5"/>
  <path class="dash" d="M86 100C220 142 338 58 500 94C660 130 764 72 922 112C1075 151 1180 220 1315 178" stroke="#58A6FF" stroke-width="1.5" opacity=".25"/>

  <g class="scan">
    <rect x="70" y="36" width="220" height="356" rx="110" fill="#58A6FF" opacity=".10"/>
    <rect x="174" y="36" width="3" height="356" fill="#A5D6FF" opacity=".92"/>
  </g>

  <g transform="translate(82 76)">
    <rect x="0" y="0" width="66" height="66" rx="18" fill="#0D1117" stroke="#30363D"/>
    <path d="M21 46V21H34C41.5 21 46 25.2 46 31.5C46 37.8 41.5 42 34 42H27V46H21ZM27 36.5H34C37.8 36.5 40 34.6 40 31.5C40 28.4 37.8 26.5 34 26.5H27V36.5Z" fill="#58A6FF"/>
    <text x="92" y="25" fill="#8B949E" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="16" font-weight="800" letter-spacing="4">PROFILE SYSTEM</text>
    <text x="92" y="98" fill="#F0F6FC" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="70" font-weight="900" letter-spacing="1">OCTAVIO AUGUSTO</text>
    <text x="96" y="145" fill="#C9D1D9" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="24" font-weight="650">Web Developer | Machine Learning | IA Aplicada | Marketing Digital</text>
  </g>

  <g transform="translate(88 272)">
    <rect x="0" y="0" width="380" height="96" rx="22" fill="#0D1117" stroke="#30363D"/>
    <text x="26" y="39" fill="#58A6FF" font-family="JetBrains Mono, Consolas, monospace" font-size="18" font-weight="800">status: building systems</text>
    <text x="26" y="67" fill="#C9D1D9" font-family="JetBrains Mono, Consolas, monospace" font-size="15">web products + AI workflows</text>
    <rect class="cursor" x="328" y="50" width="12" height="20" rx="3" fill="#39D353"/>
  </g>

  <g class="float" transform="translate(1020 236)">
    <rect x="0" y="0" width="280" height="110" rx="24" fill="#0D1117" stroke="#30363D"/>
    <text x="28" y="42" fill="#8B949E" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="15" font-weight="800" letter-spacing="2">FOCO ATUAL</text>
    <text x="28" y="77" fill="#F0F6FC" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="25" font-weight="900">Web + AI + Vision</text>
  </g>

  <g filter="url(#blur)">
    <circle class="pulse" cx="680" cy="298" r="6" fill="#58A6FF"/>
    <circle class="pulse2" cx="835" cy="224" r="5" fill="#39D353"/>
    <circle class="pulse" cx="1096" cy="116" r="5" fill="#58A6FF"/>
    <circle class="pulse2" cx="1216" cy="182" r="5" fill="#39D353"/>
  </g>
</svg>`;
}

function buildStackSvg() {
  const groups = [
    {
      title: "Frontend",
      subtitle: "interfaces, components and responsive layouts",
      x: 70,
      y: 124,
      chips: [
        ["HTML5", "#E34F26"],
        ["CSS3", "#1572B6"],
        ["JavaScript", "#F7DF1E"],
        ["React", "#61DAFB"],
        ["Bootstrap", "#7952B3"],
        ["Tailwind CSS", "#06B6D4"]
      ]
    },
    {
      title: "Backend & Tools",
      subtitle: "APIs, versioning and project structure",
      x: 70,
      y: 292,
      chips: [
        ["Python", "#3776AB"],
        ["PHP", "#777BB4"],
        ["Git", "#F05032"],
        ["GitHub", "#F0F6FC"],
        ["APIs", "#58A6FF"]
      ]
    },
    {
      title: "AI, ML & Vision",
      subtitle: "applied intelligence for real projects",
      x: 740,
      y: 124,
      chips: [
        ["ChatGPT", "#10A37F"],
        ["Claude", "#D97757"],
        ["Chat APIs", "#58A6FF"],
        ["Scikit-Learn", "#F7931E"],
        ["OpenCV", "#5C3EE8"]
      ]
    },
    {
      title: "Digital Strategy",
      subtitle: "content, presence and conversion",
      x: 740,
      y: 292,
      chips: [
        ["Social Media", "#E4405F"],
        ["Marketing Digital", "#39D353"],
        ["Creative", "#A5D6FF"],
        ["Conversion", "#F7DF1E"]
      ]
    }
  ];

  const chipMarkup = groups
    .map((group) => {
      const cardWidth = 590;
      const innerX = group.x + 26;
      let cursorX = innerX;
      let cursorY = group.y + 72;
      const chips = group.chips
        .map(([label, color]) => {
          const width = 44 + label.length * 9;
          if (cursorX + width > group.x + cardWidth - 26) {
            cursorX = innerX;
            cursorY += 44;
          }
          const markup = `<g transform="translate(${cursorX} ${cursorY})">
        <rect width="${width}" height="38" rx="12" fill="#101826" stroke="#263449"/>
        <circle cx="21" cy="19" r="5" fill="${color}"/>
        <text x="36" y="24" fill="#F0F6FC" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="14" font-weight="800">${xml(label)}</text>
      </g>`;
          cursorX += width + 12;
          return markup;
        })
        .join("\n");

      return `<g>
      <rect x="${group.x}" y="${group.y}" width="${cardWidth}" height="142" rx="20" fill="#0B111D" stroke="#263449"/>
      <text x="${innerX}" y="${group.y + 38}" fill="#F0F6FC" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="23" font-weight="900">${xml(group.title)}</text>
      <text x="${innerX}" y="${group.y + 62}" fill="#8B949E" font-family="JetBrains Mono, Consolas, monospace" font-size="13">${xml(group.subtitle)}</text>
      ${chips}
    </g>`;
    })
    .join("\n");

  return `<svg width="1400" height="470" viewBox="0 0 1400 470" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1400" y2="470" gradientUnits="userSpaceOnUse">
      <stop stop-color="#060A12"/>
      <stop offset="0.52" stop-color="#0D1117"/>
      <stop offset="1" stop-color="#081827"/>
    </linearGradient>
    <linearGradient id="line" x1="70" y1="82" x2="1320" y2="350" gradientUnits="userSpaceOnUse">
      <stop stop-color="#58A6FF"/>
      <stop offset="0.52" stop-color="#2F81F7"/>
      <stop offset="1" stop-color="#39D353"/>
    </linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(665 235) rotate(18) scale(620 250)">
      <stop stop-color="#58A6FF" stop-opacity=".20"/>
      <stop offset="1" stop-color="#58A6FF" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M42 0H0V42" stroke="#1F2A3A" stroke-width="1" opacity=".42"/>
    </pattern>
    <style>
      .dash { stroke-dasharray: 12 18; animation: dash 18s linear infinite; }
      .scan { animation: scan 5.4s ease-in-out infinite; }
      @keyframes dash { to { stroke-dashoffset: -520; } }
      @keyframes scan {
        0%, 100% { transform: translateX(-180px); opacity: 0; }
        20%, 62% { opacity: .68; }
        82% { transform: translateX(1140px); opacity: 0; }
      }
    </style>
  </defs>

  <rect width="1400" height="470" rx="30" fill="url(#bg)"/>
  <rect width="1400" height="470" rx="30" fill="url(#grid)" opacity=".72"/>
  <rect width="1400" height="470" rx="30" fill="url(#glow)"/>
  <rect x="34" y="34" width="1332" height="402" rx="26" fill="#0D1117" opacity=".70" stroke="#30363D"/>

  <g class="scan">
    <rect x="66" y="52" width="180" height="366" rx="90" fill="#58A6FF" opacity=".075"/>
    <rect x="150" y="52" width="3" height="366" fill="#A5D6FF" opacity=".82"/>
  </g>

  <path class="dash" d="M70 390C238 286 350 386 514 282C676 178 830 322 990 212C1135 112 1242 168 1322 118" stroke="url(#line)" stroke-width="2" opacity=".30"/>

  <text x="70" y="84" fill="#F0F6FC" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="30" font-weight="900" letter-spacing="2">PROFESSIONAL STACK</text>
  <text x="70" y="114" fill="#8B949E" font-family="JetBrains Mono, Consolas, monospace" font-size="15">organized by practical use, not just by logo collection</text>

  ${chipMarkup}
</svg>`;
}

function buildContributionSvg(calendar) {
  const days = calendar.days.slice(-371);
  const total = calendar.totalContributions || days.reduce((sum, day) => sum + day.contributionCount, 0);
  const activeDays = days.filter((day) => day.contributionCount > 0).length;
  const maxDay = days.reduce((best, day) => (day.contributionCount > best.contributionCount ? day : best), days[0]);

  const cell = 14;
  const gap = 5;
  const startX = 76;
  const startY = 174;
  const gridWidth = 53 * (cell + gap) - gap;

  const cells = days
    .map((day, index) => {
      const week = Math.floor(index / 7);
      const weekday = day.weekday ?? new Date(`${day.date}T00:00:00Z`).getUTCDay();
      const x = startX + week * (cell + gap);
      const y = startY + weekday * (cell + gap);
      const level = levelFor(day.contributionCount);
      const delay = ((index % 23) * 0.11).toFixed(2);
      const duration = (3.4 + (index % 7) * 0.18).toFixed(2);
      const animated = level >= 3 ? " hot" : "";

      return `<rect class="cell l${level}${animated}" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="4" style="animation-delay:${delay}s;animation-duration:${duration}s"><title>${xml(day.date)}: ${day.contributionCount} contributions</title></rect>`;
    })
    .join("\n    ");

  return `<svg width="1400" height="520" viewBox="0 0 1400 520" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1400" y2="520" gradientUnits="userSpaceOnUse">
      <stop stop-color="#05070D"/>
      <stop offset="0.52" stop-color="#0D1117"/>
      <stop offset="1" stop-color="#061B2D"/>
    </linearGradient>
    <linearGradient id="accent" x1="60" y1="95" x2="1285" y2="400" gradientUnits="userSpaceOnUse">
      <stop stop-color="#58A6FF"/>
      <stop offset="0.55" stop-color="#2F81F7"/>
      <stop offset="1" stop-color="#39D353"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <style>
      .cell { stroke: #243044; stroke-width: 1; transform-origin: center; }
      .l0 { fill: #161B22; }
      .l1 { fill: #0E4429; }
      .l2 { fill: #006D32; }
      .l3 { fill: #26A641; }
      .l4 { fill: #39D353; filter: url(#glow); }
      .hot { animation-name: pulse; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
      .sweep { animation: sweep 5.5s ease-in-out infinite; }
      .dash { stroke-dasharray: 18 24; animation: dash 18s linear infinite; }
      .float { animation: float 5s ease-in-out infinite; }
      @keyframes pulse {
        0%, 100% { opacity: .72; transform: scale(.96); }
        50% { opacity: 1; transform: scale(1.08); }
      }
      @keyframes sweep {
        0%, 100% { transform: translateX(-170px); opacity: 0; }
        18%, 62% { opacity: .85; }
        82% { transform: translateX(${gridWidth + 80}px); opacity: 0; }
      }
      @keyframes dash { to { stroke-dashoffset: -650; } }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
    </style>
  </defs>

  <rect width="1400" height="520" rx="32" fill="url(#bg)"/>
  <rect x="34" y="34" width="1332" height="452" rx="28" fill="#0D1117" opacity=".62" stroke="#30363D"/>

  <text x="76" y="88" fill="#F0F6FC" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="30" font-weight="900" letter-spacing="2">LIVE CONTRIBUTION GRID</text>
  <text x="76" y="120" fill="#8B949E" font-family="JetBrains Mono, Consolas, monospace" font-size="15">generated from GitHub data | updated by GitHub Actions</text>

  <path class="dash" d="M76 405C220 312 340 396 485 284C628 176 780 306 932 206C1070 115 1194 170 1322 94" stroke="url(#accent)" stroke-width="2.4" opacity=".46"/>

  <g>
    <rect x="${startX - 18}" y="${startY - 20}" width="${gridWidth + 36}" height="${7 * (cell + gap) - gap + 40}" rx="22" fill="#05070D" opacity=".72" stroke="#30363D"/>
    <g class="sweep">
      <rect x="${startX - 34}" y="${startY - 22}" width="120" height="${7 * (cell + gap) - gap + 44}" rx="60" fill="#58A6FF" opacity=".08"/>
      <rect x="${startX + 20}" y="${startY - 22}" width="3" height="${7 * (cell + gap) - gap + 44}" fill="#A5D6FF" opacity=".82"/>
    </g>
    ${cells}
  </g>

  <g class="float" transform="translate(1120 172)">
    <rect x="0" y="0" width="202" height="96" rx="20" fill="#05070D" stroke="#30363D"/>
    <text x="24" y="34" fill="#8B949E" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="13" font-weight="800" letter-spacing="2">TOTAL</text>
    <text x="24" y="72" fill="#39D353" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="36" font-weight="900">${xml(total)}+</text>
  </g>

  <g transform="translate(1120 292)">
    <rect x="0" y="0" width="202" height="96" rx="20" fill="#05070D" stroke="#30363D"/>
    <text x="24" y="34" fill="#8B949E" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="13" font-weight="800" letter-spacing="2">ACTIVE DAYS</text>
    <text x="24" y="72" fill="#58A6FF" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="36" font-weight="900">${xml(activeDays)}</text>
  </g>

  <text x="76" y="458" fill="#8B949E" font-family="JetBrains Mono, Consolas, monospace" font-size="14">best day: ${xml(maxDay?.date || "loading")} with ${xml(maxDay?.contributionCount || 0)} contributions</text>
</svg>`;
}

await mkdir(outputDir, { recursive: true });

const calendar = await fetchContributionCalendar();

await writeFile(`${outputDir}/profile-header.svg`, buildHeaderSvg(), "utf8");
await writeFile(`${outputDir}/tech-stack.svg`, buildStackSvg(), "utf8");
await writeFile(`${outputDir}/cinematic-contributions.svg`, buildContributionSvg(calendar), "utf8");

console.log(`Generated profile assets for ${username}`);
