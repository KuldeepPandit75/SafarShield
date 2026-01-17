"use client";

import SectionTitle from "./SectionTitle";
import LayerToggle from "./LayerToggle";

export default function LiveTrackingSidebar() {
  return (
    <aside className="w-72 bg-[#0f1a26] p-4 rounded-xl space-y-6">

      {/* LEGEND */}
      <div>
        <SectionTitle title="Legend" />
        <div className="space-y-2">
          <LayerToggle label="Risk Zones" defaultChecked />
          <LayerToggle label="Safe Zones" defaultChecked />
          <LayerToggle label="Restricted Zones" defaultChecked />
        </div>
      </div>

      {/* TOURIST STATUS */}
      <div>
        <SectionTitle title="Tourist Status" />
        <div className="space-y-2">
          <LayerToggle label="Safe Tourists" defaultChecked />
          <LayerToggle label="At-Risk Tourists" defaultChecked />
        </div>
      </div>

      {/* MOVEMENT */}
      <div>
        <SectionTitle title="Tourist Movement History" />
        <LayerToggle label="Show Trails" />
      </div>

      {/* ALERTS */}
      <div>
        <SectionTitle title="Alerts" />
        <LayerToggle label="Active Alerts" defaultChecked />
      </div>

    </aside>
  );
}
