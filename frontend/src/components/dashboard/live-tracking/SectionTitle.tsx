interface Props {
  title: string;
}

export default function SectionTitle({ title }: Props) {
  return (
    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
      {title}
    </h3>
  );
}
