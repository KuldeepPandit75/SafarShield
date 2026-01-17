"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

export default function AuthorityMap() {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [78.5, 30.5], // Himalayas-ish
      zoom: 7,
    });

    map.on("load", () => {
      // 🔴 Restricted Zone
      map.addSource("restricted", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [[[78,30],[79,30],[79,29],[78,29],[78,30]]]
              },
              properties: {}
            }
          ]
        }
      });

      map.addLayer({
        id: "restricted-layer",
        type: "fill",
        source: "restricted",
        paint: {
          "fill-color": "#ff0000",
          "fill-opacity": 0.5
        }
      });

      // 🟢 Tourist marker
      new maplibregl.Marker({ color: "green" })
        .setLngLat([78.4, 30.4])
        .addTo(map);

      // 🔴 SOS marker
      const el = document.createElement("div");
      el.className = "sos-marker";

      new maplibregl.Marker(el)
        .setLngLat([78.6, 30.3])
        .addTo(map);
    });

    return () => map.remove();
  }, []);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-xl overflow-hidden"
    />
  );
}
