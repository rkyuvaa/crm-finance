import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { TaskItem } from '@/api/projectsApi';

interface TaskCalendarViewProps {
  tasks: TaskItem[];
  onOpenTaskDetail: (task: TaskItem) => void;
}

export default function TaskCalendarView({ tasks, onOpenTaskDetail }: TaskCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Group tasks by due date YYYY-MM-DD
  const tasksByDate: Record<string, TaskItem[]> = {};
  tasks.forEach((t) => {
    if (t.due_date) {
      const dateKey = t.due_date.split('T')[0];
      if (!tasksByDate[dateKey]) tasksByDate[dateKey] = [];
      tasksByDate[dateKey].push(t);
    }
  });

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: '12px', bgcolor: 'background.paper' }}>
      {/* Header Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CalendarIcon size={20} color="#04552B" />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {monthNames[month]} {year}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={handlePrevMonth}>
            <ChevronLeft size={20} />
          </IconButton>
          <Typography
            variant="body2"
            onClick={handleToday}
            sx={{ fontWeight: 700, cursor: 'pointer', px: 1.5, py: 0.5, borderRadius: '6px', bgcolor: 'action.hover' }}
          >
            Today
          </Typography>
          <IconButton size="small" onClick={handleNextMonth}>
            <ChevronRight size={20} />
          </IconButton>
        </Box>
      </Box>

      {/* Weekday Labels */}
      <Grid container spacing={1} sx={{ mb: 1, textAlign: 'center' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
          <Grid item xs={12 / 7} key={w}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12 }}>
              {w}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* Days Grid */}
      <Grid container spacing={1}>
        {calendarDays.map((dayNum, idx) => {
          if (dayNum === null) {
            return (
              <Grid item xs={12 / 7} key={`empty-${idx}`}>
                <Box sx={{ minHeight: 100, bgcolor: 'background.default', borderRadius: '8px', opacity: 0.4 }} />
              </Grid>
            );
          }

          const dayStr = String(dayNum).padStart(2, '0');
          const monthStr = String(month + 1).padStart(2, '0');
          const fullDateStr = `${year}-${monthStr}-${dayStr}`;

          const dayTasks = tasksByDate[fullDateStr] || [];
          const isToday =
            new Date().getFullYear() === year &&
            new Date().getMonth() === month &&
            new Date().getDate() === dayNum;

          return (
            <Grid item xs={12 / 7} key={fullDateStr}>
              <Paper
                variant="outlined"
                sx={{
                  minHeight: 110,
                  p: 1,
                  borderRadius: '8px',
                  bgcolor: isToday ? '#F0FDF4' : 'background.paper',
                  borderColor: isToday ? '#16A34A' : 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: isToday ? '#16A34A' : 'text.secondary',
                    alignSelf: 'flex-end',
                    mb: 0.5,
                  }}
                >
                  {dayNum}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, overflowY: 'auto', flex: 1 }}>
                  {dayTasks.map((t) => (
                    <Box
                      key={t.id}
                      onClick={() => onOpenTaskDetail(t)}
                      sx={{
                        p: 0.5,
                        px: 0.75,
                        borderRadius: '4px',
                        bgcolor: t.is_completed ? '#DCFCE7' : '#EFF6FF',
                        borderLeft: '3px solid',
                        borderLeftColor: t.is_completed ? '#16A34A' : '#2563EB',
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.85 },
                      }}
                    >
                      <Typography
                        variant="caption"
                        noWrap
                        sx={{
                          fontWeight: 700,
                          fontSize: 11,
                          display: 'block',
                          color: t.is_completed ? '#166534' : '#1E40AF',
                          textDecoration: t.is_completed ? 'line-through' : 'none',
                        }}
                      >
                        {t.task_number || `T-${t.id}`}: {t.title}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
}
