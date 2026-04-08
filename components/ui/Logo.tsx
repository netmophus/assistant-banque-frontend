export default function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background — rounded square */}
      <rect width="44" height="44" rx="10" fill="#1B3A8C" />

      {/* M letterform — white, geometric */}
      <path
        d="M9 33V14L17 26L25 14V33"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Chart ascending line — gold */}
      <path
        d="M27 30L31 22L35 16"
        stroke="#C9A84C"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Connected data dots — gold */}
      <circle cx="27" cy="30" r="2" fill="#C9A84C" />
      <circle cx="31" cy="22" r="2" fill="#C9A84C" />
      <circle cx="35" cy="16" r="2.4" fill="#C9A84C" />

      {/* Connecting horizontal line — subtle */}
      <path
        d="M35 16L38 12"
        stroke="#C9A84C"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <circle cx="38" cy="11" r="1.5" fill="#C9A84C" opacity="0.7" />
    </svg>
  );
}
