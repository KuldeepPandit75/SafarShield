export default function StatsPanel() {
  return (
    <div className="bg-[#0f1a26] p-4 rounded-xl space-y-4">
      <h3 className="font-semibold">Nearest Responder Dispatch</h3>

      <label><input type="checkbox" /> Police Units</label><br />
      <label><input type="checkbox" /> Medical Units</label><br />
      <label><input type="checkbox" /> Rescue Teams</label>
    </div>
  );
}
