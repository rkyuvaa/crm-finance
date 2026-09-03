import sqlite3

conn = sqlite3.connect('dev.db')
c = conn.cursor()
c.execute("INSERT OR IGNORE INTO task_statuses (id, name, color, display_order, is_terminal) VALUES (1, 'To Do', '#64748B', 1, 0), (2, 'In Progress', '#2563EB', 2, 0), (3, 'In Review', '#D97706', 3, 0), (4, 'Done', '#16A34A', 4, 1), (5, 'Blocked', '#DC2626', 5, 0)")
c.execute("INSERT OR IGNORE INTO project_statuses (id, name, color, display_order, is_terminal) VALUES (1, 'Planning', '#64748B', 1, 0), (2, 'In Progress', '#2563EB', 2, 0), (3, 'On Hold', '#D97706', 3, 0), (4, 'Completed', '#16A34A', 4, 1), (5, 'Cancelled', '#DC2626', 5, 1)")
conn.commit()
conn.close()
print("Seeded successfully.")
