import { FC } from "react";

const AuthHeader: FC = () => {
  return (
    <div className="w-full bg-[#1f2d3d] py-4 px-6 flex items-center justify-center rounded-t-xl">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-sm" />
        <h1 className="text-white font-semibold text-lg">
          SafarShield: Tourist Safety
        </h1>
      </div>
    </div>
  );
};

export default AuthHeader;
