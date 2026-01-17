export default function AlertsPanel() {
  return (
    <div className="bg-[#0f1a26] p-4 rounded-xl space-y-3">
      <h3 className="font-semibold">Real-Time Alerts</h3>

      <div className="text-red-400 text-sm">
        🔴 SOS Triggered – Tourist #2981
      </div>
      <div className="text-red-400 text-sm">
        🔴 Fall Detected – Zone B
      </div>
    </div>
  );
}
