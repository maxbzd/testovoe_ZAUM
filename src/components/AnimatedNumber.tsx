import { useCountUp } from '../hooks/useCountUp';

interface Props {
  value: number;
  format: (value: number) => string;
}

export function AnimatedNumber({ value, format }: Props) {
  const shown = useCountUp(value);
  return <span>{format(shown)}</span>;
}
