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
import { BusinessPlanSection, BusinessState } from '../types';
import { AgentcoreService } from '../services/agentcoreService';

const BusinessPlanScreen: React.FC = () => {
  const [sections, setSections] = useState<BusinessPlanSection[]>([
    {
      id: 'market-analysis',
      title: 'Market Analysis',
      description: 'Target audience identified',
      status: 'completed',
      icon: '📊',
      data: {
        marketSize: '$15.6B',
        targetAge: '25-40',
      },
    },
    {
      id: 'financial-plan',
      title: 'Financial Plan',
      description: 'Revenue projections ready',
      status: 'completed',
      icon: '📈',
      data: {
        year1Revenue: '$125K',
      },
    },
    {
      id: 'marketing-strategy',
      title: 'Marketing Strategy',
      description: 'Not started yet',
      status: 'not_started',
      icon: '⚠️',
    },
  ]);

  const [businessState, setBusinessState] = useState<BusinessState | null>(null);

  useEffect(() => {
    loadBusinessState();
  }, []);

  const loadBusinessState = async () => {
    try {
      const agentcore = AgentcoreService.getInstance();
      const response = await agentcore.getState();
      setBusinessState(response.state);
      
      // Update sections based on actual data
      updateSectionsFromState(response.state);
    } catch (error) {
      console.error('Error loading business state:', error);
    }
  };

  const updateSectionsFromState = (state: BusinessState) => {
    const updatedSections = sections.map(section => {
      switch (section.id) {
        case 'market-analysis':
          return {
            ...section,
            status: state.business_idea?.market ? 'completed' : 'not_started',
            data: {
              marketSize: '$15.6B', // This could be calculated from market data
              targetAge: '25-40', // This could be derived from business idea
            },
          };
        case 'financial-plan':
          return {
            ...section,
            status: state.budget_finance ? 'completed' : 'not_started',
            data: state.budget_finance ? {
              year1Revenue: `$${Math.round((state.budget_finance.customer_count || 0) * (state.budget_finance.revenue_per_customer || 0))}K`,
            } : undefined,
          };
        case 'marketing-strategy':
          return {
            ...section,
            status: 'not_started', // This would be determined by other factors
          };
        default:
          return section;
      }
    });
    setSections(updatedSections);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#E8F5E8';
      case 'in_progress':
        return '#FFF3CD';
      case 'not_started':
        return '#FFF8DC';
      default:
        return '#F8F9FA';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in_progress':
        return '⏳';
      case 'not_started':
        return '⏰';
      default:
        return '❓';
    }
  };

  const renderSectionCard = (section: BusinessPlanSection) => (
    <TouchableOpacity
      key={section.id}
      style={[styles.sectionCard, { backgroundColor: getStatusColor(section.status) }]}
      onPress={() => {
        // Navigate to section detail or edit
        console.log('Navigate to section:', section.id);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Text style={styles.sectionIcon}>{section.icon}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionDescription}>{section.description}</Text>
        </View>
        <View style={styles.statusContainer}>
          <Text style={styles.statusIcon}>{getStatusIcon(section.status)}</Text>
        </View>
      </View>
      
      {section.data && (
        <View style={styles.dataContainer}>
          {Object.entries(section.data).map(([key, value]) => (
            <View key={key} style={styles.dataBox}>
              <Text style={styles.dataLabel}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</Text>
              <Text style={styles.dataValue}>{value}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Business Plan</Text>
          <Text style={styles.subtitle}>Your journey progress</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {sections.map(renderSectionCard)}
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
  sectionCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sectionIcon: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6C757D',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 20,
  },
  dataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dataBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    minWidth: 120,
    flex: 1,
  },
  dataLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
});

export default BusinessPlanScreen;
