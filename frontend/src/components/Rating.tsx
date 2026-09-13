/** null は未評価、0 は評価済みの最低値として区別する。 */
export default function Rating({
  label,
  value,
  onChange,
  green = false,
}: {
  label: string;
  value: number | null;
  onChange: (n: number) => void;
  green?: boolean;
}) {
  return (
    <div className={`rating ${green ? 'green' : ''}`}>
      <span>{label}</span>
      <div className="rating-bars" role="group" aria-label={label}>
        {[0, 1, 2, 3, 4].map((n) => (
          <button
            key={n}
            aria-label={`${label}を${n}に設定`}
            aria-pressed={value === n}
            className={value !== null && n <= value ? 'filled' : ''}
            onClick={() => onChange(n)}
          />
        ))}
      </div>
      <strong>
        {value ?? '—'} <small>/ 4</small>
      </strong>
    </div>
  );
}
