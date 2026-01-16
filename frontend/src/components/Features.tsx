import React from "react";
import FeatureCard from "./FeatureCard";

const Features: React.FC = () => {
  return (
    <section className="px-6 py-16">
      <h3 className="text-3xl font-bold text-center mb-12">
        Key <span className="text-emerald-400">Features</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <FeatureCard
          icon="🛡️"
          title="AI-Powered Safety"
          description="Proactive anomaly detection, smart alerts, and SOS powered by AI."
        />

        <FeatureCard
          icon="📡"
          title="Offline-First Tech"
          description="Works without internet using mesh sync and peer-to-peer networking."
        />

        <FeatureCard
          icon="🔐"
          title="Blockchain Digital ID"
          description="Tamper-proof, secure tourist identity verification."
        />
      </div>
    </section>
  );
};

export default Features;
