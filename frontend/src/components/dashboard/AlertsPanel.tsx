const AlertsPanel = () => {
  const alerts = Array(4).fill("SOS triggered: bjgh kjegn");

  return (
    <div className="bg-[#0f1a26] rounded-xl p-4">
      <h3 className="font-semibold mb-4">Real Time Alerts</h3>

      <div className="space-y-3">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className="flex items-start gap-2 text-sm text-red-400"
          >
            🔺 {alert}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsPanel;
