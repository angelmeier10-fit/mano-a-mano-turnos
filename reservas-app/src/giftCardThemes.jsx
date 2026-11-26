import React from "react";

// Cada dibujo va dentro de un div posicionado: html2canvas copia el estilo del svg a la imagen y lo dejaría fuera de cuadro.
function Art({ children }) {
  return (
    <div style={{ position: "absolute", inset: 0, lineHeight: 0 }}>
      <svg width="100%" height="110" viewBox="0 0 340 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true">{children}</svg>
    </div>
  );
}

const HEART = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";
const LEAF = "M0 0 C8 -10, 22 -10, 30 0 C22 10, 8 10, 0 0Z";
const SNOW = "M0 -7 L0 7 M-6 -3.5 L6 3.5 M-6 3.5 L6 -3.5";
const STAR = "0,-24 2,-19 7,-19 3,-16 4.5,-11 0,-14 -4.5,-11 -3,-16 -7,-19 -2,-19";
const PETALS = [[0, -7], [6.66, -2.16], [4.11, 5.66], [-4.11, 5.66], [-6.66, -2.16]];

function Flower({ x, y, s = 1, color }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {PETALS.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="6.5" fill={color} />)}
      <circle r="4" fill="#F4C430" />
    </g>
  );
}

function Box({ x, y, s, body, lid, ribbon }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="3" y="19" width="34" height="24" fill={body} />
      <rect x="0" y="10" width="40" height="9" fill={lid} />
      <rect x="17" y="10" width="6" height="33" fill={ribbon} />
      <path d="M20 10 C14 0, 6 3, 12 10 Z" fill={ribbon} />
      <path d="M20 10 C26 0, 34 3, 28 10 Z" fill={ribbon} />
    </g>
  );
}

function Tree({ x, y, s = 1, balls }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <polygon points="0,-16 15,8 -15,8" fill="#1E6B4A" />
      <polygon points="0,-4 20,24 -20,24" fill="#1E6B4A" />
      <polygon points="0,10 25,42 -25,42" fill="#1E6B4A" />
      <rect x="-4" y="42" width="8" height="10" fill="#6B3A22" />
      <polygon points={STAR} fill="#F4C430" />
      {balls.map(([cx, cy, c], i) => <circle key={i} cx={cx} cy={cy} r="2.4" fill={c} />)}
    </g>
  );
}

function ClassicHeader() {
  return (
    <>
      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1.5, background: "linear-gradient(90deg, transparent, #C9A84C 20%, #F0D060 50%, #C9A84C 80%, transparent)" }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1.5, background: "linear-gradient(180deg, transparent, #C9A84C 20%, #F0D060 50%, #C9A84C 80%, transparent)" }} />
      <div style={{ position: "absolute", top: 8, left: 8, width: 60, height: 60, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", top: 20, right: 25, width: 40, height: 40, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: 10, right: 12, width: 55, height: 55, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", top: 5, right: 80, width: 25, height: 25, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", lineHeight: 0 }}>
        <svg width="72" height="60" viewBox="0 0 72 60" fill="none" aria-hidden="true">
          <path d="M36 30 C24 18, 2 12, 5 26 C7 38, 26 34, 36 30Z" fill="#C9A84C" />
          <path d="M36 30 C48 18, 70 12, 67 26 C65 38, 46 34, 36 30Z" fill="#C9A84C" />
          <path d="M36 30 C24 42, 2 48, 5 34 C7 22, 26 26, 36 30Z" fill="#A87E2A" />
          <path d="M36 30 C48 42, 70 48, 67 34 C65 22, 46 26, 36 30Z" fill="#A87E2A" />
          <ellipse cx="36" cy="30" rx="5.5" ry="5" fill="#D4AF37" />
          <ellipse cx="36" cy="30" rx="3" ry="2.8" fill="#F0D060" />
        </svg>
      </div>
    </>
  );
}

function HeartsHeader() {
  const small = [[18, 14, 0.9, "#E39AA6"], [60, 62, 0.7, "#E39AA6"], [250, 10, 0.8, "#E39AA6"], [296, 60, 1, "#E39AA6"], [100, 18, 0.6, "#D06A7D"], [220, 70, 0.65, "#D06A7D"], [20, 76, 0.5, "#D06A7D"]];
  return (
    <Art>
      {small.map(([x, y, s, c], i) => <path key={i} transform={`translate(${x} ${y}) scale(${s})`} fill={c} d={HEART} />)}
      <path transform="translate(140 16) scale(2.5)" fill="#B5475B" d={HEART} />
      <path transform="translate(155 31) scale(1.25)" fill="#F7E5E1" opacity="0.35" d={HEART} />
    </Art>
  );
}

function GiftsHeader() {
  return (
    <Art>
      <g fill="#EFE9DF" opacity="0.35">
        {[[30, 22, 2.5], [300, 18, 2], [70, 92, 2], [268, 94, 2.5], [120, 14, 1.8], [222, 20, 1.8]].map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r} />)}
      </g>
      <Box x={38} y={46} s={1} body="#EFE9DF" lid="#E0D5C3" ribbon="#B5654A" />
      <Box x={128} y={12} s={2} body="#B5654A" lid="#9E5540" ribbon="#EFE9DF" />
      <Box x={250} y={50} s={0.9} body="#D9B98C" lid="#C9A577" ribbon="#2A2622" />
    </Art>
  );
}

function HolidaysHeader() {
  return (
    <>
      <Art>
        <g stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" fill="none">
          {[[100, 18, 1], [244, 22, 1], [88, 88, 0.7], [256, 90, 0.8], [18, 20, 0.6], [322, 14, 0.6]].map(([x, y, s], i) => <path key={i} transform={`translate(${x} ${y}) scale(${s})`} d={SNOW} />)}
        </g>
        <g fill="#FFFFFF" opacity="0.6">
          {[[130, 96], [212, 98], [60, 40], [284, 48], [150, 10], [196, 8]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="1.4" />)}
        </g>
        <Tree x={42} y={26} balls={[[-6, 14, "#F4C430"], [8, 28, "#FFFFFF"], [-10, 34, "#F4C430"], [5, 4, "#FFFFFF"]]} />
        <Tree x={298} y={30} s={0.85} balls={[[6, 14, "#F4C430"], [-8, 28, "#FFFFFF"], [10, 34, "#F4C430"]]} />
      </Art>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#FFFFFF" }}>¡Felices Fiestas!</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 46, lineHeight: 1.05, color: "#F4C430" }}>2027</div>
      </div>
    </>
  );
}

function HolidaysDivider() {
  const colors = ["#F4C430", "#FF6B6B", "#FFFFFF"];
  return (
    <div style={{ height: 14, background: "#1E5B43", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", flexShrink: 0 }}>
      {Array.from({ length: 14 }, (_, i) => <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: colors[i % 3] }} />)}
    </div>
  );
}

function FlowersHeader() {
  return (
    <Art>
      <g fill="#5E8A5A">
        <ellipse cx="62" cy="80" rx="12" ry="5" transform="rotate(-30 62 80)" />
        <ellipse cx="160" cy="88" rx="14" ry="5.5" transform="rotate(25 160 88)" />
        <ellipse cx="190" cy="86" rx="14" ry="5.5" transform="rotate(-25 190 86)" />
        <ellipse cx="282" cy="78" rx="12" ry="5" transform="rotate(30 282 78)" />
      </g>
      <Flower x={50} y={60} color="#F4C6D7" />
      <Flower x={175} y={52} s={1.8} color="#FFFFFF" />
      <Flower x={292} y={58} s={1.1} color="#E8A0BF" />
      <Flower x={110} y={30} s={0.7} color="#D9C2EC" />
      <Flower x={240} y={24} s={0.6} color="#F4C6D7" />
    </Art>
  );
}

function BirthdayHeader() {
  const confetti = [[24, 18, 30, "#E4572E"], [112, 90, -20, "#2E86AB"], [150, 14, 45, "#FFFFFF"], [214, 96, 10, "#E4572E"], [312, 80, -40, "#FFFFFF"], [88, 30, 60, "#3E9B6A"], [262, 12, -15, "#3E9B6A"]];
  const balloons = [[56, 44, 15, 19, "#E4572E"], [276, 50, 14, 18, "#2E86AB"], [300, 36, 13, 17, "#3E9B6A"]];
  return (
    <>
      <Art>
        {confetti.map(([x, y, r, c], i) => <rect key={i} x={x} y={y} width="6" height="3" fill={c} transform={`rotate(${r} ${x + 3} ${y + 1})`} />)}
        <g fill="none" stroke="#6E5A35" strokeWidth="1" opacity="0.6">
          <path d="M56 64 C52 80, 62 92, 56 110" />
          <path d="M276 70 C282 84, 272 96, 278 110" />
          <path d="M300 58 C296 76, 306 92, 300 110" />
        </g>
        {balloons.map(([cx, cy, rx, ry, c], i) => (
          <g key={i}>
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={c} />
            <polygon points={`${cx},${cy + ry - 1} ${cx - 4},${cy + ry + 4} ${cx + 4},${cy + ry + 4}`} fill={c} />
            <ellipse cx={cx - 5} cy={cy - 7} rx="3.5" ry="6" fill="#FFFFFF" opacity="0.35" />
          </g>
        ))}
      </Art>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 30, color: "#2A2622" }}>¡Feliz cumple!</div>
      </div>
    </>
  );
}

function RelaxHeader() {
  const leaves = [[70, 40, -30, 1, "#7FA392"], [92, 70, 15, 0.8, "#A8C4B5"], [270, 34, 210, 1, "#7FA392"], [250, 76, 165, 0.8, "#A8C4B5"]];
  return (
    <Art>
      <g fill="none" stroke="#9FB8B2" strokeWidth="1.2" opacity="0.6">
        <path d="M40 100 Q170 90 300 100" />
        <path d="M80 106 Q170 98 260 106" />
      </g>
      {leaves.map(([x, y, r, s, c], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
          <path d={LEAF} fill={c} />
          <path d="M0 0 L30 0" stroke="#3F5E5A" strokeWidth="1" />
        </g>
      ))}
      <ellipse cx="170" cy="86" rx="32" ry="9" fill="#C9BBA5" />
      <ellipse cx="170" cy="70" rx="24" ry="8" fill="#DCD0BC" />
      <ellipse cx="170" cy="55" rx="17" ry="7" fill="#B8A88F" />
      <ellipse cx="170" cy="43" rx="10" ry="5" fill="#E8DFCF" />
    </Art>
  );
}

const line = (color) => () => <div style={{ height: 2, background: color, flexShrink: 0 }} />;

// title: nombre del negocio, código y "Escaneá" · service: nombre del servicio · text: textos secundarios
export const GIFT_CARD_THEMES = {
  classic: {
    card: "linear-gradient(160deg, #1C1A17 0%, #2A2622 60%, #1A1815 100%)", header: "transparent",
    Header: ClassicHeader,
    Divider: () => <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #C9A84C 20%, #D4AF37 50%, #C9A84C 80%, transparent)", flexShrink: 0 }} />,
    title: "#C9A84C", service: "#D4AF37", text: "rgba(239,233,223,0.85)", line: "rgba(201,168,76,0.3)",
  },
  hearts: {
    card: "#F7E5E1", header: "#EFCFCB", Header: HeartsHeader, Divider: line("#B5475B"),
    title: "#A33F52", service: "#8E2F45", text: "#5A3A40", line: "rgba(163,63,82,0.3)",
  },
  gifts: {
    card: "#F6F1E8", header: "#6E7F5C", Header: GiftsHeader, Divider: line("#B5654A"),
    title: "#9A5139", service: "#4E5C40", text: "#4A443B", line: "rgba(154,81,57,0.3)",
  },
  holidays: {
    card: "#1E5B43", header: "#C8323C", Header: HolidaysHeader, Divider: HolidaysDivider,
    title: "#F4C430", service: "#FFF6E5", text: "rgba(255,246,229,0.9)", line: "rgba(244,196,48,0.35)",
  },
  flowers: {
    card: "#F7F2F8", header: "#8E6BA8", Header: FlowersHeader, Divider: line("#7A4F96"),
    title: "#7A4F96", service: "#6A3F86", text: "#4E3E58", line: "rgba(122,79,150,0.3)",
  },
  birthday: {
    card: "#FFF8EE", header: "#F2B33D", Header: BirthdayHeader, Divider: line("#E4572E"),
    title: "#B8401E", service: "#245F80", text: "#4A443B", line: "rgba(228,87,46,0.35)",
  },
  relax: {
    card: "#EEF1EC", header: "#3F5E5A", Header: RelaxHeader, Divider: line("#8A6D3B"),
    title: "#7A5F30", service: "#2F4A46", text: "#3E4C49", line: "rgba(138,109,59,0.35)",
  },
};
