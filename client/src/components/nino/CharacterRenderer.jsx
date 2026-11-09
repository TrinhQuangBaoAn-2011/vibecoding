/* Nino — hình nhân của WEBCHECK AI. Thuần SVG (không ảnh, không lib ngoài):
 * thân blob màu brand, hai mắt trắng có tròng di chuyển theo con trỏ (truyền
 * qua prop `pupil` — do EyeTracking tính và giới hạn biên), miệng/tay/anten
 * đổi theo mood. Toàn bộ motion nằm trong nino.css, chỉ transform/opacity. */

const BODY = '#3b82f6';
const LIMB = '#2563eb';
const FEET = '#1d4ed8';
const INK = '#0f172a';

const FACE = {
  idle: { eyes: 'open', mouth: 'smile', wave: false, cheeks: false, antenna: 'steady' },
  looking: { eyes: 'open', mouth: 'smallO', wave: false, cheeks: false, antenna: 'steady' },
  walking: { eyes: 'open', mouth: 'smile', wave: false, cheeks: false, antenna: 'steady' },
  thinking: { eyes: 'squint', mouth: 'hmm', wave: false, cheeks: false, antenna: 'pulse' },
  greeting: { eyes: 'open', mouth: 'openLaugh', wave: true, cheeks: true, antenna: 'steady' },
  reacting: { eyes: 'open', mouth: 'smallO', wave: false, cheeks: false, antenna: 'pulse' },
  happy: { eyes: 'happy', mouth: 'openLaugh', wave: false, cheeks: true, antenna: 'happy' },
  concerned: { eyes: 'open', mouth: 'frown', wave: false, cheeks: false, antenna: 'pulse' },
};

const ANTENNA_COLOR = {
  steady: '#93c5fd',
  happy: '#34d399',
  pulse: '#fbbf24',
};

function OpenEye({ cx, pupil }) {
  const px = (pupil?.x || 0) * 2.4; // tròng lệch tối đa ~±2.2px — không lọt hốc
  const py = (pupil?.y || 0) * 1.8;
  return (
    <g className="nino-blink">
      <g style={{ transform: `translate(${px}px, ${py}px)` }}>
        <ellipse cx={cx} cy="50" rx="7" ry="8.5" fill="#ffffff" />
        <circle cx={cx + 1.4} cy="51.2" r="3.7" fill={INK} />
        <circle cx={cx + 3} cy="49.4" r="1.2" fill="#ffffff" opacity="0.95" />
      </g>
    </g>
  );
}

function SquintEye({ cx, pupil }) {
  const px = (pupil?.x || 0) * 1.6;
  return (
    <g>
      <g style={{ transform: `translate(${px}px, ${(pupil?.y || 0) * 1}px)` }}>
        <ellipse cx={cx} cy="51" rx="7.2" ry="4.2" fill="#ffffff" />
        <circle cx={cx + 1.4} cy="51.6" r="2.4" fill={INK} />
      </g>
    </g>
  );
}

function HappyEye({ cx }) {
  const off = cx < 60 ? -7 : 7;
  return (
    <path
      d={`M${cx + off} 50.5 Q${cx} 44 ${cx - off} 50.5`}
      stroke={INK}
      strokeWidth="3.4"
      strokeLinecap="round"
      fill="none"
    />
  );
}

function Mouth({ type }) {
  if (type === 'openLaugh') {
    return <path d="M50 64 Q60 80 70 64 Z" fill={INK} />;
  }
  if (type === 'smallO') {
    return <circle cx="60" cy="69" r="4.5" stroke={INK} strokeWidth="3" fill="none" />;
  }
  if (type === 'hmm') {
    return <path d="M53 69 L67 66.5" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />;
  }
  if (type === 'frown') {
    return <path d="M52 71.5 Q60 64.5 68 71.5" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />;
  }
  // smile mặc định
  return <path d="M51 66 Q60 73.5 69 66" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />;
}

export function CharacterRenderer({ mood = 'idle', pupil = null, facing = 1 }) {
  const face = FACE[mood] || FACE.idle;
  const antennaClass = face.antenna === 'pulse' ? 'nino-antenna-pulse' : '';

  return (
    <svg
      viewBox="0 0 120 124"
      className="nino block h-auto w-full"
      data-mood={mood}
      style={{
        transform: facing === -1 ? 'scaleX(-1)' : 'scaleX(1)',
        transition: 'transform 260ms ease',
      }}
      aria-hidden="true"
      focusable="false"
    >
      {/* Bóng dưới chân */}
      <ellipse cx="60" cy="117" rx="24" ry="4" fill={INK} opacity="0.07" />

      {/* Chân (nối dưới thân) */}
      <ellipse className="nino-foot-l" cx="49" cy="108" rx="8" ry="5.5" fill={FEET} />
      <ellipse className="nino-foot-r" cx="71" cy="108" rx="8" ry="5.5" fill={FEET} />

      <g className="nino-body-group">
        {/* Tay trái */}
        <ellipse cx="27" cy="60" rx="6.5" ry="11" fill={LIMB} transform="rotate(16 27 50)" />

        {/* Thân */}
        <rect x="28" y="18" width="64" height="80" rx="30" fill={BODY} />
        {/* Bụng sáng nhẹ — điểm nhận diện phẳng, không gradient */}
        <ellipse cx="60" cy="76" rx="19" ry="15" fill="#eff6ff" opacity="0.6" />

        {/* Anten */}
        <path d="M60 18 L60 9" stroke={LIMB} strokeWidth="4" strokeLinecap="round" fill="none" />
        <circle className={antennaClass} cx="60" cy="6" r="4.5" fill={ANTENNA_COLOR[face.antenna] || ANTENNA_COLOR.steady} />

        {/* Má hồng khi vui */}
        {face.cheeks && (
          <g fill="#fda4af" opacity="0.6">
            <ellipse cx="39.5" cy="60" rx="4.5" ry="3" />
            <ellipse cx="80.5" cy="60" rx="4.5" ry="3" />
          </g>
        )}

        {/* Mắt */}
        {face.eyes === 'happy' ? (
          <g>
            <HappyEye cx={46} />
            <HappyEye cx={74} />
          </g>
        ) : face.eyes === 'squint' ? (
          <g>
            <SquintEye cx={46} pupil={pupil} />
            <SquintEye cx={74} pupil={pupil} />
          </g>
        ) : (
          <g>
            <OpenEye cx={46} pupil={pupil} />
            <OpenEye cx={74} pupil={pupil} />
          </g>
        )}

        {/* Lông mày lo */}
        {mood === 'concerned' && (
          <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M40 40.5 L51.5 43.5" />
            <path d="M80 40.5 L68.5 43.5" />
          </g>
        )}

        {/* Miệng */}
        <Mouth type={face.mouth} />
      </g>

      {/* Tay phải — duỗi thẳng hoặc giơ lên vẫy khi greeting */}
      {face.wave ? (
        <g transform="rotate(-42 88 50)">
          <g className="nino-arm-wave">
            <ellipse cx="94" cy="34" rx="6.5" ry="11" fill={LIMB} transform="rotate(14 94 24)" />
          </g>
        </g>
      ) : (
        <ellipse cx="93" cy="60" rx="6.5" ry="11" fill={LIMB} transform="rotate(-16 93 50)" />
      )}
    </svg>
  );
}
