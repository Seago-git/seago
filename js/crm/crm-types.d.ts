/**
 * SEAGÖ CRM 2.0 — Frontend Type Definitions & API Contract Interfaces
 * This file serves as the source of truth for backend developers implementing API endpoints.
 */

export type ChannelType = 'whatsapp' | 'instagram' | 'facebook' | 'website' | 'linkedin' | 'x' | 'direct';

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'quotation' | 'negotiation' | 'won' | 'lost';

export type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent';

export type CustomerType = 'Commercial Ferry Operator' | 'Eco-Resort / Hotel' | 'Tourism Fleet' | 'Government / Port Authority' | 'Private Yacht Owner' | 'Fisheries Cooperative';

export type HandoverStatus = 'bot_active' | 'human_requested' | 'human_assigned' | 'human_active' | 'resolved';

export type TaskType = 'follow_up_call' | 'whatsapp_followup' | 'email_followup' | 'product_demo' | 'technical_discussion' | 'quotation_prep' | 'meeting' | 'payment_followup' | 'other';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type IntegrationStatus = 'connected' | 'disconnected' | 'pending_setup' | 'awaiting_approval' | 'error' | 'reconnect_required';

export interface CustomerContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  customer_type: CustomerType;
  location: string;
  city: string;
  state: string;
  assigned_to: string;
  tags: string[];
  priority: PriorityLevel;
  opt_in_whatsapp: boolean;
  opt_in_timestamp?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityTimelineEvent {
  id: string;
  contact_id: string;
  lead_id?: string;
  type: 'inquiry_received' | 'message_sent' | 'message_received' | 'call_logged' | 'stage_changed' | 'quotation_sent' | 'task_created' | 'note_added' | 'handover_changed';
  channel: ChannelType;
  title: string;
  description: string;
  actor: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface Lead {
  id: string;
  contact_id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  customer_type: CustomerType;
  location: string;
  channel: ChannelType;
  source_ref: string;
  campaign_id?: string;
  product_category: 'Outboard Motor' | 'Marine Battery' | 'Custom Electric Boat' | 'Custom Solar Boat' | 'Commercial Ferry';
  product_model: string;
  motor_hp?: string;
  vessel_length?: string;
  seating_capacity?: number;
  quantity: number;
  budget_estimate?: number;
  estimated_value: number;
  currency: string;
  purchase_timeline: 'Immediate (< 2 wks)' | '1–3 Months' | '3–6 Months' | 'Exploring / Budgeting';
  stage: LeadStage;
  priority: PriorityLevel;
  assigned_to: string;
  opt_in_whatsapp: boolean;
  bot_status: HandoverStatus;
  tags: string[];
  notes: LeadNote[];
  created_at: string;
  updated_at: string;
  next_followup?: string;
  last_activity_at: string;
}

export interface LeadNote {
  id: string;
  author: string;
  text: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound' | 'bot' | 'system';
  sender_name: string;
  text: string;
  media_url?: string;
  media_type?: 'image' | 'pdf' | 'audio' | 'video';
  channel: ChannelType;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
}

export interface Conversation {
  id: string;
  contact_id: string;
  lead_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_handle?: string;
  channel: ChannelType;
  channel_account_id?: string;
  assigned_to: string;
  handover_status: HandoverStatus;
  unread_count: number;
  last_message: string;
  last_message_at: string;
  priority: PriorityLevel;
  is_resolved: boolean;
  messages: ChatMessage[];
}

export interface Opportunity {
  id: string;
  name: string;
  contact_id: string;
  lead_id?: string;
  customer_name: string;
  company: string;
  product: string;
  quantity: number;
  estimated_value: number;
  currency: string;
  expected_close_date: string;
  assigned_to: string;
  stage: 'qualification' | 'quotation_demo' | 'negotiation' | 'won' | 'lost';
  probability_pct: number;
  quotation_ref?: string;
  win_loss_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface CrmTask {
  id: string;
  title: string;
  task_type: TaskType;
  contact_id?: string;
  lead_id?: string;
  customer_name?: string;
  assigned_to: string;
  due_date: string;
  priority: PriorityLevel;
  status: TaskStatus;
  notes?: string;
  completed_at?: string;
  created_at: string;
}

export interface WebhookEventLog {
  id: string;
  provider: ChannelType;
  event_type: string;
  received_at: string;
  processing_status: 'success' | 'failed' | 'retrying' | 'ignored';
  retry_count: number;
  related_lead_id?: string;
  payload_summary: string;
  error_message?: string;
}

export interface DashboardMetrics {
  total_leads: number;
  new_leads_today: number;
  unassigned_leads: number;
  qualified_leads: number;
  active_opportunities: number;
  quotations_sent: number;
  followups_due: number;
  overdue_followups: number;
  orders_won: number;
  conversion_rate_pct: number;
  pipeline_value_inr: number;
  channel_distribution: Record<ChannelType, number>;
  stage_distribution: Record<LeadStage, number>;
}

