interface Props {
  label: string;
  defaultChecked?: boolean;
}

export default function LayerToggle({ label, defaultChecked }: Props) {
  return (
    <label className="flex items-center justify-between text-sm text-gray-300 cursor-pointer">
      <span>{label}</span>
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="accent-emerald-500"
      />
    </label>
  );
}
