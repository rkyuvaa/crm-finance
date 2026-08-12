export type UserRole =
  | 'SALES_EXECUTIVE'
  | 'FINANCE_OFFICER'
  | 'DELIVERY_TEAM'
  | 'ADMIN';

export type ApplicationStatus =
  | 'LEAD'
  | 'APPLICATION'
  | 'VERIFICATION'
  | 'FINANCE'
  | 'QUERY'
  | 'SANCTIONED'
  | 'DELIVERY'
  | 'DISBURSEMENT'
  | 'COMPLETED'
  | 'REJECTED';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  initials: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface KpiValue {
  value: number;
  sub: string;
}

export interface Kpis {
  total_applications: KpiValue;
  doc_pending: KpiValue;
  verification_pending: KpiValue;
  finance_query: KpiValue;
  sanctioned: KpiValue;
  disbursement: KpiValue;
}

export interface PipelineStage {
  key: string;
  status: ApplicationStatus;
  label: string;
  tip: string;
  count: number;
}

export interface RecentApplication {
  id: number;
  app_no: string;
  customer_name: string;
  customer_phone: string;
  vehicle: string;
  amount: number;
  status: ApplicationStatus;
  aging_label: string;
  aging_tone: string;
}

export interface AttentionItem {
  id: number;
  app_no: string;
  customer_name: string;
  issue: string;
  wait_label: string;
  urgent: boolean;
  action: string;
}

export interface WaitingItem {
  id: number;
  app_no: string;
  customer_name: string;
  who: string;
  wait_label: string;
  hot: boolean;
}

export interface FinanceCompany {
  id: number;
  name: string;
  total_apps: number;
  approved: number;
  rejected: number;
  avg_time_days: number;
  bar_pct: number;
}

export interface FinanceCompanyOption {
  id: number;
  name: string;
}

export interface VehicleModel {
  id: number;
  name: string;
  vehicle_price: number;
  down_payment: number;
  loan_amount: number;
  finance_company_id: number | null;
  finance_company_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleModelInput {
  name: string;
  vehicle_price: number;
  down_payment: number;
  loan_amount: number;
  finance_company_id: number | null;
}

export interface Activity {
  id: number;
  app_no: string | null;
  actor_name: string;
  action: string;
  created_at: string;
}

export interface NavCounts {
  leads: number;
  applications: number;
  documents: number;
  verification: number;
  finance: number;
  delivery: number;
  disbursement: number;
  notifications: number;
}

export interface TabCounts {
  all: number;
  mine: number;
  pending: number;
}

export interface DashboardData {
  kpis: Kpis;
  pipeline: PipelineStage[];
  recent_applications: RecentApplication[];
  recent_total: number;
  tab_counts: TabCounts;
  needs_attention: AttentionItem[];
  needs_attention_total: number;
  waiting_on: WaitingItem[];
  waiting_on_total: number;
  finance_companies: FinanceCompany[];
  activities: Activity[];
  nav_counts: NavCounts;
}

export interface ApplicationItem {
  id: number;
  app_no: string;
  customer_name: string;
  customer_phone: string;
  vehicle: string;
  amount: number;
  status: ApplicationStatus;
  finance_company_id: number | null;
  finance_company_name: string | null;
  vehicle_model_id: number | null;
  vehicle_price: number | null;
  down_payment: number | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
  aging_label: string;
  aging_tone: string;
}

export interface ApplicationListResponse {
  items: ApplicationItem[];
  total: number;
  page: number;
  page_size: number;
  tab_counts: TabCounts;
}

export interface NotificationItem {
  id: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface StageRow {
  id: number;
  app_no: string;
  customer_name: string;
  status: string;
  [key: string]: string | number | null;
}

export interface ReportsSummary {
  pipeline: PipelineStage[];
  finance_companies: FinanceCompany[];
  monthly: { month: string; count: number }[];
}
