import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import BusinessPlanScreen from './screens/BusinessPlanScreen';
import ProfitAnalyzerScreen from './screens/ProfitAnalyzerScreen';
import ChatWindow from './components/ChatWindow';

type Screen = 'business-plan' | 'profit-analyzer';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('business-plan');
  const [isChatVisible, setIsChatVisible] = useState(false);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'business-plan':
        return <BusinessPlanScreen />;
      case 'profit-analyzer':
        return <ProfitAnalyzerScreen />;
      default:
        return <BusinessPlanScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Main Content */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={[styles.navItem, currentScreen === 'business-plan' && styles.navItemActive]}
          onPress={() => setCurrentScreen('business-plan')}
        >
          <Text style={styles.navIcon}>📋</Text>
          <Text style={[styles.navLabel, currentScreen === 'business-plan' && styles.navLabelActive]}>
            Business Plan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentScreen === 'profit-analyzer' && styles.navItemActive]}
          onPress={() => setCurrentScreen('profit-analyzer')}
        >
          <Text style={styles.navIcon}>💰</Text>
          <Text style={[styles.navLabel, currentScreen === 'profit-analyzer' && styles.navLabelActive]}>
            Profit Analyzer
          </Text>
        </TouchableOpacity>
      </View>

      {/* Floating Chat Button */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => setIsChatVisible(true)}
      >
        <Text style={styles.chatButtonIcon}>💬</Text>
      </TouchableOpacity>

      {/* Chat Window */}
      <ChatWindow
        isVisible={isChatVisible}
        onClose={() => setIsChatVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    paddingBottom: 8,
    paddingTop: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navItemActive: {
    backgroundColor: '#F8F9FA',
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#007BFF',
  },
  chatButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007BFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  chatButtonIcon: {
    fontSize: 24,
  },
});

export default App;
