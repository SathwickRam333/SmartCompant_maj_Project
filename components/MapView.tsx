'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getComplaintLocations } from '@/services/stats.service';
import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, PRIORITY_LABELS } from '@/lib/types';

// Fix for default marker icons in Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom colored markers
const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const priorityColors = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

const statusColors: Record<string, string> = {
  submitted: '#3b82f6',
  under_review: '#f59e0b',
  in_progress: '#f97316',
  resolved: '#22c55e',
  closed: '#6b7280',
  escalated: '#dc2626',
  rejected: '#ef4444',
};

interface ComplaintLocation {
  id: string;
  title: string;
  trackingId: string;
  status: string;
  priority: string;
  department: string;
  latitude: number;
  longitude: number;
  address?: string;
  district?: string;
}

// Component to handle map center changes
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Heatmap-style circle markers for clusters
function HeatmapMarker({ position, intensity }: { position: [number, number]; intensity: number }) {
  return (
    <CircleMarker
      center={position}
      radius={Math.min(intensity * 5, 30)}
      pathOptions={{
        fillColor: '#ef4444',
        fillOpacity: 0.3 + (intensity * 0.1),
        color: '#ef4444',
        weight: 1,
      }}
    />
  );
}

export default function MapView() {
  const [locations, setLocations] = useState<ComplaintLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'markers' | 'heatmap'>('markers');

  // Telangana center coordinates
  const center: [number, number] = [17.385044, 78.486671];
  const defaultZoom = 7;

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const data = await getComplaintLocations();
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const displayLocations = locations;

  // Calculate cluster intensity for heatmap
  const getClusterIntensity = (lat: number, lng: number): number => {
    const nearby = displayLocations.filter((loc) => {
      const distance = Math.sqrt(
        Math.pow(loc.latitude - lat, 2) + Math.pow(loc.longitude - lng, 2)
      );
      return distance < 0.1;
    });
    return nearby.length;
  };

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('markers')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'markers'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Markers
        </button>
        <button
          onClick={() => setViewMode('heatmap')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'heatmap'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Heatmap
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">Priority:</span>
          <div className="flex gap-2">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-red-500" /> High
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-yellow-500" /> Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-green-500" /> Low
            </span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200">
        <MapContainer
          center={center}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {viewMode === 'markers' ? (
            // Regular markers
            displayLocations.map((complaint) => (
              <Marker
                key={complaint.id}
                position={[complaint.latitude, complaint.longitude]}
                icon={createColoredIcon(priorityColors[complaint.priority as keyof typeof priorityColors] || '#3b82f6')}
              >
                <Popup>
                  <div className="min-w-[200px] p-1">
                    <h3 className="font-semibold text-gray-800 mb-1">{complaint.title}</h3>
                    <p className="text-xs text-gray-500 mb-2">{complaint.trackingId}</p>
                    <div className="flex gap-1 mb-2">
                      <Badge
                        variant="secondary"
                        className="text-xs"
                        style={{
                          backgroundColor:
                            statusColors[complaint.status as keyof typeof statusColors] + '20',
                          color: statusColors[complaint.status as keyof typeof statusColors],
                        }}
                      >
                        {STATUS_LABELS[complaint.status as keyof typeof STATUS_LABELS]?.en || complaint.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {PRIORITY_LABELS[complaint.priority as keyof typeof PRIORITY_LABELS]?.en || complaint.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      <strong>Dept:</strong> {complaint.department}
                    </p>
                    <p className="text-xs text-gray-600">
                      <strong>Location:</strong> {complaint.address}
                    </p>
                    <p className="text-xs text-gray-600">
                      <strong>District:</strong> {complaint.district}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))
          ) : (
            // Heatmap-style circles
            displayLocations.map((complaint) => (
              <CircleMarker
                key={complaint.id}
                center={[complaint.latitude, complaint.longitude]}
                radius={15 + getClusterIntensity(complaint.latitude, complaint.longitude) * 5}
                pathOptions={{
                  fillColor: priorityColors[complaint.priority as keyof typeof priorityColors] || '#3b82f6',
                  fillOpacity: 0.4,
                  color: priorityColors[complaint.priority as keyof typeof priorityColors] || '#3b82f6',
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="min-w-[200px] p-1">
                    <h3 className="font-semibold text-gray-800 mb-1">{complaint.title}</h3>
                    <p className="text-xs text-gray-500 mb-2">{complaint.trackingId}</p>
                    <p className="text-xs text-gray-600">
                      <strong>District:</strong> {complaint.district}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))
          )}
        </MapContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-primary">{displayLocations.length}</p>
          <p className="text-xs text-gray-500">Total Markers</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-red-500">
            {displayLocations.filter((l) => l.priority === 'high').length}
          </p>
          <p className="text-xs text-gray-500">High Priority</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-orange-500">
            {displayLocations.filter((l) => l.status === 'in_progress').length}
          </p>
          <p className="text-xs text-gray-500">In Progress</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-green-500">
            {displayLocations.filter((l) => l.status === 'resolved').length}
          </p>
          <p className="text-xs text-gray-500">Resolved</p>
        </div>
      </div>
    </div>
  );
}
