import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { ProfitData, BusinessState } from '../types';
import { AgentcoreService } from '../services/agentcoreService';

const ProfitAnalyzerScreen: React.FC = () => {
  const [profitData, setProfitData] = useState<ProfitData>({
    monthlyRecurringRevenue: {
      value: '$10.4K',
      growth: '12% growth',
    },
    annualRevenue: {
      value: '$125K',
      target: 'Year 1 target',
    },
    breakdown: {
      subscriptionRevenue: '$125K',
      developmentCosts: '-$45K',
      marketingSpend: '-$25K',
      netProfit: '$55K',
    },
  });

  const [businessState, setBusinessState] = useState<BusinessState | null>(null);

  useEffect(() => {
    loadBusinessState();
  }, []);

  const loadBusinessState = async () => {
    try {
      const agentcore = AgentcoreService.getInstance();
      const response = await agentcore.getState();
      setBusinessState(response.state);
      
      // Calculate profit data from business state
      calculateProfitData(response.state);
    } catch (error) {
      console.error('Error loading business state:', error);
    }
  };

  const calculateProfitData = (state: BusinessState) => {
    if (state.budget_finance) {
      const { customer_count = 0, revenue_per_customer = 0, cost_per_customer = 0 } = state.budget_finance;
      
      const monthlyRevenue = (customer_count * revenue_per_customer) / 12;
      const annualRevenue = customer_count * revenue_per_customer;
      const totalCosts = customer_count * cost_per_customer;
      const netProfit = annualRevenue - totalCosts;
      
      // Estimate development and marketing costs (these would typically be separate inputs)
      const developmentCosts = Math.round(annualRevenue * 0.36); // 36% of revenue
      const marketingSpend = Math.round(annualRevenue * 0.20); // 20% of revenue
      const adjustedNetProfit = annualRevenue - developmentCosts - marketingSpend;

      setProfitData({
        monthlyRecurringRevenue: {
          value: `$${(monthlyRevenue / 1000).toFixed(1)}K`,
          growth: '12% growth', // This would be calculated from historical data
        },
        annualRevenue: {
          value: `$${Math.round(annualRevenue / 1000)}K`,
          target: 'Year 1 target',
        },
        breakdown: {
          subscriptionRevenue: `$${Math.round(annualRevenue / 1000)}K`,
          developmentCosts: `-$${Math.round(developmentCosts / 1000)}K`,
          marketingSpend: `-$${Math.round(marketingSpend / 1000)}K`,
          netProfit: `$${Math.round(adjustedNetProfit / 1000)}K`,
        },
      });
    }
  };

  const handleExport = () => {
    console.log('Export profit data');
    // Implement export functionality
  };

  const handleAdjust = () => {
    console.log('Adjust profit data');
    // Navigate to adjustment screen or open modal
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Profit Analyzer</Text>
          <Text style={styles.subtitle}>AI-powered fitness app</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Revenue Projections Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Text style={styles.sectionIcon}>📊</Text>
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Revenue Projections</Text>
              <Text style={styles.sectionSubtitle}>Your financial forecast for the next 3 years</Text>
            </View>
          </View>

          <View style={styles.revenueCards}>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>Monthly Recurring Revenue</Text>
              <Text style={styles.revenueValue}>{profitData.monthlyRecurringRevenue.value}</Text>
              <View style={styles.growthContainer}>
                <Text style={styles.growthIcon}>↗</Text>
                <Text style={styles.growthText}>{profitData.monthlyRecurringRevenue.growth}</Text>
              </View>
            </View>

            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>Annual Revenue</Text>
              <Text style={styles.revenueValue}>{profitData.annualRevenue.value}</Text>
              <Text style={styles.revenueTarget}>{profitData.annualRevenue.target}</Text>
            </View>
          </View>
        </View>

        {/* Profit Breakdown Section */}
        <View style={styles.section}>
          <Text style={styles.breakdownTitle}>Profit Breakdown</Text>
          
          <View style={styles.breakdownList}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Subscription Revenue</Text>
              <Text style={[styles.breakdownValue, styles.positiveValue]}>
                {profitData.breakdown.subscriptionRevenue}
              </Text>
            </View>
            
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Development Costs</Text>
              <Text style={[styles.breakdownValue, styles.negativeValue]}>
                {profitData.breakdown.developmentCosts}
              </Text>
            </View>
            
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Marketing Spend</Text>
              <Text style={[styles.breakdownValue, styles.negativeValue]}>
                {profitData.breakdown.marketingSpend}
              </Text>
            </View>
            
            <View style={[styles.breakdownItem, styles.netProfitItem]}>
              <Text style={styles.breakdownLabel}>Net Profit</Text>
              <Text style={[styles.breakdownValue, styles.positiveValue]}>
                {profitData.breakdown.netProfit}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
            <Text style={styles.exportIcon}>↓</Text>
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.adjustButton} onPress={handleAdjust}>
            <Text style={styles.adjustIcon}>✏️</Text>
            <Text style={styles.adjustText}>Adjust</Text>
          </TouchableOpacity>
        </View>

        {/* AI Assistant Message */}
        <View style={styles.aiMessage}>
          <View style={styles.aiIconContainer}>
            <Text style={styles.aiIcon}>🤖</Text>
          </View>
          <Text style={styles.aiMessageText}>
            Great! I've analyzed your fitness app's financial projections. Your Year 1 revenue target of $125K looks achievable with 520 customers at $240/year each. Consider optimizing your customer acquisition cost to improve profitability.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    marginRight: 16,
  },
  backArrow: {
    fontSize: 24,
    color: '#000000',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#28A745',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6C757D',
  },
  revenueCards: {
    flexDirection: 'row',
    gap: 12,
  },
  revenueCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  revenueLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 8,
  },
  revenueValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  growthIcon: {
    fontSize: 12,
    color: '#28A745',
    marginRight: 4,
  },
  growthText: {
    fontSize: 12,
    color: '#28A745',
    fontWeight: '500',
  },
  revenueTarget: {
    fontSize: 12,
    color: '#6C757D',
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },
  breakdownList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  netProfitItem: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: '#E9ECEF',
    marginTop: 8,
    paddingTop: 16,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6C757D',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positiveValue: {
    color: '#28A745',
  },
  negativeValue: {
    color: '#DC3545',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderRadius: 8,
    paddingVertical: 12,
  },
  exportIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#6C757D',
  },
  exportText: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
  },
  adjustButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28A745',
    borderRadius: 8,
    paddingVertical: 12,
  },
  adjustIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  adjustText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  aiMessage: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007BFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiIcon: {
    fontSize: 16,
  },
  aiMessageText: {
    flex: 1,
    fontSize: 14,
    color: '#212529',
    lineHeight: 20,
  },
});

export default ProfitAnalyzerScreen;
