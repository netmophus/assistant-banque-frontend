export default function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Blue rounded square background */}
      <rect width="44" height="44" rx="10" fill="#1B3A8C" />

      {/* N letterform — white, geometric */}
      <path
        d="M11 32V12L23 32V12"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Gold ascending arc — horizon / croissance */}
      <path
        d="M26 30C27.5 26 30 21 32 15"
        stroke="#C9A84C"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Gold star dot at apex */}
      <circle cx="32" cy="13" r="2.5" fill="#C9A84C" />
    </svg>
  );
}
