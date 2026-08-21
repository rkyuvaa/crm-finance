import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';

import ActivityTypesPanel from '@/features/configuration/ActivityTypesPanel';
import FinanciersPanel from '@/features/configuration/FinanciersPanel';
import StagesPanel from '@/features/configuration/StagesPanel';
import TabsPanel from '@/features/configuration/TabsPanel';
import VehicleModelsPanel from '@/features/configuration/VehicleModelsPanel';

export default function ConfigurationPage() {
  const [tab, setTab] = useState(0);

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

      <Box sx={{ borderBottom: 1, borderColor: '#E4EBE1', mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, next) => setTab(next)}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            '& .MuiTab-root': { textTransform: 'none', fontSize: 13, fontWeight: 600 },
          }}
        >
          <Tab label="Module Tabs" />
          <Tab label="Vehicle Models" />
          <Tab label="Financiers" />
          <Tab label="Stages" />
          <Tab label="Activity Types" />
        </Tabs>
      </Box>

      {tab === 0 && <TabsPanel />}
      {tab === 1 && <VehicleModelsPanel />}
      {tab === 2 && <FinanciersPanel />}
      {tab === 3 && <StagesPanel />}
      {tab === 4 && <ActivityTypesPanel />}
    </div>
  );
}
