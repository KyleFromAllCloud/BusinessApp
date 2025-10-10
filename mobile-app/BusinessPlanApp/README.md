# Business Plan Mobile App

A React Native mobile application that integrates with the Agentcore AI Business Coach to help users manage their business plans and financial projections.

## Features

- **Business Plan Dashboard**: Track progress of different business plan sections (Market Analysis, Financial Plan, Marketing Strategy)
- **Profit Analyzer**: View financial projections, revenue breakdowns, and profit calculations
- **AI Chat Integration**: Global chat window that communicates with the Agentcore AI agent
- **Real-time Data Sync**: Automatically updates widgets based on AI agent responses
- **Local Testing**: Configured for local development and testing

## Screenshots

The app includes two main screens based on the provided mockups:

1. **Business Plan Screen**: Shows progress cards for different business plan sections
2. **Profit Analyzer Screen**: Displays financial projections and profit breakdowns

## Prerequisites

- Node.js (v18 or higher)
- React Native CLI
- iOS Simulator (for iOS development)
- Android Studio/Emulator (for Android development)
- Your Agentcore backend running locally or deployed

## Installation

1. Navigate to the mobile app directory:
   ```bash
   cd /Users/kyle.keough/Documents/agentcore/mobile-app/BusinessPlanApp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. For iOS, install CocoaPods dependencies:
   ```bash
   cd ios && pod install && cd ..
   ```

## Configuration

Update the Agentcore service URL in `src/config/index.ts`:

```typescript
export const CONFIG = {
  AGENTCORE_BASE_URL: 'http://localhost:8080', // Update to your deployed URL
  // ... other config
};
```

## Running the App

### iOS
```bash
npx react-native run-ios
```

### Android
```bash
npx react-native run-android
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── ChatWindow.tsx   # Global chat interface
├── screens/            # Main app screens
│   ├── BusinessPlanScreen.tsx
│   └── ProfitAnalyzerScreen.tsx
├── services/           # API and external service integrations
│   └── agentcoreService.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── utils/              # Utility functions
│   └── helpers.ts
├── config/             # App configuration
│   └── index.ts
└── App.tsx             # Main app component
```

## Integration with Agentcore

The app communicates with your Agentcore backend through the following endpoints:

- `POST /invoke` - Send messages to the AI agent
- `POST /invocations` - Alternative endpoint
- `POST /v1/invoke` - Versioned endpoint
- `POST /call` - Alias endpoint

### API Integration

The `AgentcoreService` class handles all communication with the backend:

```typescript
const agentcore = AgentcoreService.getInstance();
const response = await agentcore.sendMessage("Hello, AI!");
```

### Data Flow

1. User interacts with the app (views screens, sends chat messages)
2. App sends requests to Agentcore backend
3. Backend processes with AI agent and returns response + state
4. App updates UI widgets based on the returned state
5. User sees real-time updates in the interface

## Features

### Business Plan Tracking
- Market Analysis progress
- Financial Plan completion
- Marketing Strategy status
- Real-time data from AI agent

### Profit Analysis
- Monthly Recurring Revenue calculations
- Annual Revenue projections
- Cost breakdowns (Development, Marketing)
- Net Profit calculations
- Export and adjustment capabilities

### AI Chat Integration
- Global chat window accessible from any screen
- Real-time communication with AI agent
- Message history and timestamps
- Loading states and error handling

## Customization

### Styling
Update colors and themes in `src/config/index.ts`:

```typescript
UI: {
  PRIMARY_COLOR: '#007BFF',
  SUCCESS_COLOR: '#28A745',
  // ... other colors
}
```

### Adding New Screens
1. Create new screen component in `src/screens/`
2. Add navigation logic in `src/App.tsx`
3. Update types in `src/types/index.ts` if needed

### Extending AI Integration
Add new methods to `AgentcoreService` class for additional AI interactions.

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `npx react-native start --reset-cache`
2. **iOS build issues**: Clean build folder in Xcode
3. **Android build issues**: Clean with `cd android && ./gradlew clean`
4. **Connection issues**: Verify Agentcore backend is running and accessible

### Debug Mode
Enable debug mode by setting `__DEV__` to true in your environment.

## Development

### Adding New Features
1. Create feature branch
2. Implement changes
3. Test on both iOS and Android
4. Update documentation
5. Submit pull request

### Testing
- Test on both iOS and Android simulators
- Test with different screen sizes
- Verify AI integration works correctly
- Test offline scenarios

## Deployment

### iOS
1. Configure signing in Xcode
2. Build for release
3. Upload to App Store Connect

### Android
1. Generate signed APK
2. Upload to Google Play Console

## Support

For issues related to:
- React Native: Check React Native documentation
- Agentcore integration: Verify backend is running and accessible
- App-specific issues: Check this README and code comments

## License

This project is part of the Agentcore ecosystem.