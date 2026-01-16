const AnalyticsPanel = () => {
  return (
    <div className="bg-[#0f1a26] rounded-xl p-4 space-y-4">
      <h3 className="font-semibold">Live Tourist Count & Analytics</h3>

      <div className="text-4xl font-bold text-white">74,328</div>

      <div className="flex justify-between text-sm">
        <span className="text-emerald-400">Safe Zones: 12,234</span>
        <span className="text-red-400">Unsafe Zones: 12,234</span>
      </div>

      <div>
        <h4 className="mt-4 mb-2 font-medium">
          Nearest Responder Dispatch
        </h4>
        <div className="space-y-1 text-sm">
          <label><input type="checkbox" /> Police Unit</label><br />
          <label><input type="checkbox" /> NDRF Team</label><br />
          <label><input type="checkbox" /> CISF Unit</label><br />
          <label><input type="checkbox" /> Local Guides</label>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
