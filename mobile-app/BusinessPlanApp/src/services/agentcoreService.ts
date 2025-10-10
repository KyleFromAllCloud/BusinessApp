import { AgentResponse } from '../types';

const AGENTCORE_BASE_URL = 'http://localhost:8080'; // Update this to your deployed agentcore URL

export class AgentcoreService {
  private static instance: AgentcoreService;
  private userId: string = 'mobile-user-123'; // Default user ID for mobile app

  static getInstance(): AgentcoreService {
    if (!AgentcoreService.instance) {
      AgentcoreService.instance = new AgentcoreService();
    }
    return AgentcoreService.instance;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  async sendMessage(message: string): Promise<AgentResponse> {
    try {
      const response = await fetch(`${AGENTCORE_BASE_URL}/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-actor-id': this.userId,
        },
        body: JSON.stringify({
          input: {
            user_id: this.userId,
            message: message,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.output;
    } catch (error) {
      console.error('Error sending message to agentcore:', error);
      throw error;
    }
  }

  async getState(): Promise<AgentResponse> {
    return this.sendMessage('Get current state');
  }

  // Helper method to update business idea
  async updateBusinessIdea(businessName: string, idea: string, market: string): Promise<AgentResponse> {
    const message = `Update business idea: Name: ${businessName}, Idea: ${idea}, Market: ${market}`;
    return this.sendMessage(message);
  }

  // Helper method to update budget/finance
  async updateBudgetFinance(customerCount: number, revenuePerCustomer: number, costPerCustomer: number): Promise<AgentResponse> {
    const message = `Update budget finance: Customer count: ${customerCount}, Revenue per customer: $${revenuePerCustomer}, Cost per customer: $${costPerCustomer}`;
    return this.sendMessage(message);
  }

  // Helper method to add todo
  async addTodo(task: string, dueDate: string, progress: string = 'not_started'): Promise<AgentResponse> {
    const message = `Add todo: Task: ${task}, Due date: ${dueDate}, Progress: ${progress}`;
    return this.sendMessage(message);
  }

  // Helper method to update todo
  async updateTodo(todoId: string, task?: string, dueDate?: string, progress?: string): Promise<AgentResponse> {
    let message = `Update todo ${todoId}`;
    if (task) message += `, Task: ${task}`;
    if (dueDate) message += `, Due date: ${dueDate}`;
    if (progress) message += `, Progress: ${progress}`;
    return this.sendMessage(message);
  }
}
