// 대기화면 배경 그림: 구름 낀 하늘 → 먼 산 → 언덕 → 전차 → 풀밭 (사진이 없을 때 쓰는 벡터 그림).
// 휴대폰 화면(390×844) 기준으로 그렸고, 화면 비율이 달라도 아래쪽(전차·땅)이 기준이 되도록 맞춘다.
const WHEELS = [72, 106, 140, 174, 208, 242, 276];

function Tank() {
  return (
    <g>
      <defs>
        <clipPath id="ss-hull">
          <path d="M40 62 L300 58 L318 78 L302 96 L50 98 L26 80 Z" />
          <path d="M112 20 L205 15 L240 28 L246 54 L122 60 L92 46 Z" />
        </clipPath>
        <linearGradient id="ss-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8E8F5E" />
          <stop offset="1" stopColor="#5E6140" />
        </linearGradient>
      </defs>
      {/* 그림자 */}
      <ellipse cx="175" cy="130" rx="170" ry="12" fill="#2C3020" opacity="0.35" />
      {/* 포신 */}
      <rect x="-112" y="36" width="214" height="7" rx="2" fill="#4F5334" />
      <rect x="-60" y="34" width="34" height="11" rx="2" fill="#5A5E3B" />
      <rect x="-122" y="33" width="16" height="13" rx="2" fill="#3E422A" />
      {/* 안테나 */}
      <line x1="228" y1="20" x2="236" y2="-46" stroke="#3B3E2A" strokeWidth="1.6" />
      <line x1="212" y1="18" x2="215" y2="-22" stroke="#3B3E2A" strokeWidth="1.3" />
      {/* 차체 + 포탑 */}
      <path d="M40 62 L300 58 L318 78 L302 96 L50 98 L26 80 Z" fill="url(#ss-metal)" />
      <path d="M112 20 L205 15 L240 28 L246 54 L122 60 L92 46 Z" fill="url(#ss-metal)" />
      {/* 위장 무늬 */}
      <g clipPath="url(#ss-hull)" opacity="0.85">
        <path d="M60 60 q30 -12 55 4 q-10 22 -45 20 q-25 -4 -10 -24z" fill="#4A5232" />
        <path d="M150 64 q40 -6 60 10 q-20 20 -55 14 q-20 -10 -5 -24z" fill="#6E6A45" />
        <path d="M230 60 q40 2 70 18 q-30 16 -60 8 q-20 -12 -10 -26z" fill="#3F4A2C" />
        <path d="M120 22 q30 -6 50 8 q-14 18 -40 16 q-20 -8 -10 -24z" fill="#4A5232" />
        <path d="M185 30 q30 -4 50 10 q-14 14 -38 10 q-18 -8 -12 -20z" fill="#6E6A45" />
      </g>
      {/* 포탑 윗부분·해치 */}
      <rect x="170" y="6" width="30" height="12" rx="3" fill="#565A38" />
      <rect x="132" y="11" width="22" height="9" rx="2" fill="#5E6140" />
      <path d="M92 46 L122 60 L246 54" fill="none" stroke="#3B3E28" strokeWidth="1.5" opacity="0.6" />
      {/* 옆 스커트 */}
      <rect x="44" y="76" width="262" height="18" rx="2" fill="#5A5E3B" />
      {[80, 118, 156, 194, 232, 270].map((x) => (
        <line key={x} x1={x} y1="77" x2={x} y2="93" stroke="#41452C" strokeWidth="1.4" />
      ))}
      {/* 궤도 + 바퀴 */}
      <rect x="40" y="92" width="276" height="34" rx="17" fill="#2B2C24" />
      <rect x="44" y="96" width="268" height="26" rx="13" fill="none" stroke="#3E4034" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="56" cy="108" r="11" fill="#45473A" />
      <circle cx="300" cy="108" r="11" fill="#45473A" />
      {WHEELS.map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="110" r="13" fill="#4C4F3C" />
          <circle cx={cx} cy="110" r="5" fill="#2F3127" />
        </g>
      ))}
    </g>
  );
}

export default function SplashScene() {
  return (
    <svg className="splash-scene" viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="ss-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7FAEDB" />
          <stop offset="0.38" stopColor="#B9D3EA" />
          <stop offset="0.62" stopColor="#E3ECF1" />
          <stop offset="1" stopColor="#EEF1EA" />
        </linearGradient>
        <linearGradient id="ss-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9C8F69" />
          <stop offset="1" stopColor="#7A6E4E" />
        </linearGradient>
        <linearGradient id="ss-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5E7A3C" />
          <stop offset="1" stopColor="#34482A" />
        </linearGradient>
        <filter id="ss-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="ss-haze">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      <rect width="390" height="844" fill="url(#ss-sky)" />

      {/* 구름 */}
      <g fill="#fff" filter="url(#ss-soft)">
        <ellipse cx="40" cy="70" rx="70" ry="26" opacity="0.85" />
        <ellipse cx="95" cy="55" rx="45" ry="22" opacity="0.7" />
        <ellipse cx="320" cy="90" rx="80" ry="28" opacity="0.8" />
        <ellipse cx="370" cy="70" rx="40" ry="20" opacity="0.7" />
        <ellipse cx="30" cy="250" rx="70" ry="30" opacity="0.75" />
        <ellipse cx="360" cy="235" rx="70" ry="34" opacity="0.8" />
        <ellipse cx="300" cy="260" rx="60" ry="22" opacity="0.6" />
        <ellipse cx="120" cy="300" rx="90" ry="20" opacity="0.5" />
        <ellipse cx="200" cy="420" rx="160" ry="24" opacity="0.45" />
      </g>

      {/* 먼 산 (푸른빛) */}
      <path
        d="M0 450 L30 428 L62 440 L98 398 L130 422 L170 384 L205 412 L240 392 L276 420 L312 396 L350 424 L390 404 V560 H0 Z"
        fill="#9AAAB6"
        filter="url(#ss-haze)"
      />
      {/* 가까운 산 */}
      <path
        d="M0 505 L40 482 L85 500 L130 474 L180 498 L225 480 L270 502 L320 486 L390 504 V580 H0 Z"
        fill="#7E8E7C"
      />
      {/* 언덕 + 나무 줄 */}
      <path d="M0 540 Q100 520 200 536 T390 530 V600 H0 Z" fill="#647A52" />
      <g fill="#4E6340">
        {[10, 34, 300, 326, 352, 378].map((x) => (
          <ellipse key={x} cx={x} cy="538" rx="14" ry="10" />
        ))}
      </g>

      {/* 흙길 */}
      <path d="M0 580 Q195 566 390 578 V844 H0 Z" fill="url(#ss-ground)" />

      {/* 전차 (포신이 왼쪽 화면 밖으로) */}
      <g transform="translate(38 490) scale(1.05)">
        <Tank />
      </g>

      {/* 앞쪽 풀밭 */}
      <path d="M0 668 Q90 640 190 660 T390 650 V844 H0 Z" fill="url(#ss-grass)" />
      <g stroke="#6F8D45" strokeWidth="2" strokeLinecap="round" opacity="0.8">
        {Array.from({ length: 34 }, (_, i) => {
          const x = 6 + i * 11.5;
          const h = 14 + ((i * 37) % 17);
          return <line key={i} x1={x} y1={672 + ((i * 13) % 20)} x2={x + ((i % 3) - 1) * 4} y2={672 + ((i * 13) % 20) - h} />;
        })}
      </g>
      <g fill="#2A3A22" opacity="0.55">
        <ellipse cx="60" cy="780" rx="90" ry="26" />
        <ellipse cx="330" cy="800" rx="100" ry="30" />
      </g>
    </svg>
  );
}
