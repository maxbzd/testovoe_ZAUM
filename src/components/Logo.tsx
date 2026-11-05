interface Props {
  /** Высота знака в пикселях; ширина считается по пропорциям. */
  height?: number;
  className?: string;
}

/**
 * Логотип ZAUM вектором. Цвет берётся из `currentColor`, поэтому знак сам
 * становится светлым в тёмной теме.
 */
export function Logo({ height = 14, className }: Props) {
  return (
    <svg
      className={className}
      height={height}
      width={(height * 291) / 50}
      viewBox="0 0 291 50"
      fill="currentColor"
      role="img"
      aria-label="ZAUM"
    >
      <path d="M0 1H66V10.5L22 39.5H66V49H0V39.5L44 10.5H0Z" />
      <path
        fillRule="evenodd"
        d="M75 49 100 1H116L141 49H129L123.5 38H92.5L87 49ZM96.5 28.5 108 8 119.5 28.5Z"
      />
      <path d="M150 1H161.5V33A4.5 4.5 0 0 0 166 37.5H200A4.5 4.5 0 0 0 204.5 33V1H216V33A16 16 0 0 1 200 49H166A16 16 0 0 1 150 33Z" />
      <path d="M225 49V1H240.5L258 31 275.5 1H291V49H279.5V15L262 44H254L236.5 15V49Z" />
    </svg>
  );
}
