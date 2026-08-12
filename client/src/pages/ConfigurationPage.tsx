import VehicleModelsPanel from '@/features/configuration/VehicleModelsPanel';

export default function ConfigurationPage() {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3, color: '#023020' }}>
          Configuration
        </div>
        <div style={{ fontSize: 13, color: '#7A8B80', marginTop: 3 }}>
          Master data and defaults used across the application.
        </div>
      </div>

      <VehicleModelsPanel />
    </div>
  );
}
