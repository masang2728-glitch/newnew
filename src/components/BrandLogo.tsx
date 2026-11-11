// 톱니바퀴 + 전차 로고. 그림 파일 없이 벡터로 그려 어떤 크기에서도 선명하다.
const TEETH = Array.from({ length: 12 }, (_, i) => i * 30);

export function TankShape({ color, wheel = "#fff" }: { color: string; wheel?: string }) {
  return (
    <g>
      <rect x="64" y="45" width="48" height="4.5" rx="1.5" fill={color} />
      <path d="M40 38 h27 l9 11 h-45 z" fill={color} />
      <rect x="50" y="33" width="10" height="5" rx="1" fill={color} />
      <path d="M12 51 h96 l-8 12 h-80 z" fill={color} />
      <rect x="10" y="63" width="100" height="15" rx="7.5" fill={color} />
      {[22, 38, 54, 70, 86, 99].map((cx) => (
        <circle key={cx} cx={cx} cy="70.5" r="3.6" fill={wheel} />
      ))}
    </g>
  );
}

// outline: 전차와 톱니바퀴 사이 띄움 선 색 = 로고가 놓일 바탕색 (초록 머리줄 위에서는 초록)
export default function BrandLogo({
  size = 120,
  color = "#1D4934",
  outline = "#fff",
}: {
  size?: number;
  color?: string;
  outline?: string;
}) {
  return (
    <svg width={size} height={(size * 84) / 120} viewBox="0 0 120 84" role="img" aria-label="장비단 로고">
      <g transform="translate(60 38)">
        {TEETH.map((deg) => (
          <rect key={deg} x="-5" y="-38" width="10" height="11" rx="1.5" fill={color} transform={`rotate(${deg})`} />
        ))}
        <circle r="29" fill="none" stroke={color} strokeWidth="9" />
      </g>
      {/* 전차가 톱니바퀴 앞에 오도록 흰 테두리로 띄운다 */}
      <g stroke={outline} strokeWidth="5" strokeLinejoin="round">
        <TankShape color={outline} />
      </g>
      <TankShape color={color} wheel={outline} />
    </svg>
  );
}
