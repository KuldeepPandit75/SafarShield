import { FC, ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

const FeatureCard: FC<FeatureCardProps> = ({
  icon,
  title,
  description,
}) => {
  return (
    <div className="bg-[#111827] p-8 rounded-2xl shadow-lg hover:scale-105 transition">
      <div className="w-12 h-12 mb-4 flex items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 text-xl">
        {icon}
      </div>
      <h4 className="text-xl font-semibold mb-2">{title}</h4>
      <p className="text-gray-400">{description}</p>
    </div>
  );
};

export default FeatureCard;