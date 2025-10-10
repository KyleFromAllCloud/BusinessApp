export interface BusinessState {
  business_idea: {
    business_name?: string;
    idea?: string;
    market?: string;
  } | null;
  budget_finance: {
    customer_count?: number;
    revenue_per_customer?: number;
    cost_per_customer?: number;
  } | null;
  todos: Array<{
    id: string;
    task: string;
    due_date: string;
    progress: string;
  }>;
}

export interface AgentResponse {
  reply: string;
  state: BusinessState;
}

export interface BusinessPlanSection {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in_progress' | 'not_started';
  icon: string;
  data?: {
    [key: string]: string | number;
  };
}

export interface ProfitData {
  monthlyRecurringRevenue: {
    value: string;
    growth: string;
  };
  annualRevenue: {
    value: string;
    target: string;
  };
  breakdown: {
    subscriptionRevenue: string;
    developmentCosts: string;
    marketingSpend: string;
    netProfit: string;
  };
}

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}
