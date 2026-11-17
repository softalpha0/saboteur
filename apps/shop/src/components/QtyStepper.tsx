import { MAX_QTY, MIN_QTY } from '../lib/cart';

type Props = {
  value: number;
  onChange(next: number): void;
  label: string;
};

export function QtyStepper({ value, onChange, label }: Props) {
  return (
    <div className="stepper" role="group" aria-label={`Quantity for ${label}`}>
      <button
        type="button"
        aria-label={`Decrease quantity of ${label}`}
        disabled={value <= MIN_QTY}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span className="qty" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase quantity of ${label}`}
        disabled={value >= MAX_QTY}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}
