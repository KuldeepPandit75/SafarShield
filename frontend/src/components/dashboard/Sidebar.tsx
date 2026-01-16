"use client";

const Sidebar = () => {
  const menu = [
    "Dashboard",
    "Live Tracking",
    "Emergency Alerts",
    "Tourist IDs",
    "Reports",
    "Analytics",
    "Setting",
  ];

  return (
    <aside className="w-64 bg-[#111b26] text-gray-300 p-6 space-y-6">
      <h2 className="text-emerald-400 text-xl font-bold">
        SafarShield
      </h2>

      <nav className="space-y-3">
        {menu.map((item) => (
          <div
            key={item}
            className="px-3 py-2 rounded-md cursor-pointer hover:bg-[#1c2a3a] hover:text-white transition"
          >
            {item}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
