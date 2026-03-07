# Quick Task 114: Remove placeholder AI/voice features from iOS Customer app

## Context
Apple App Store review requires all advertised features to be functional. The iOS Customer app contained placeholder/mock AI and voice features that could trigger rejection:
- "Smart Search" section with Voice Search + AI Picks cards (non-functional)
- AI Food Assistant banner on HomeView (links to search, implies AI)
- AI Recommendations sheet with mock data generation
- "AI Pick" button in search results
- Placeholder QuickVoiceSearchSheet and QuickAIRecommendationsSheet

## Tasks

### Task 1: Remove placeholder AI/voice UI from SearchRestaurantsView
- **files:** `apps/ios/customer/eatfaircustomer/Views/SearchRestaurantsView.swift`
- **action:** Remove Smart Search section (Voice Search + AI Picks cards), AdvancedSearchCard struct, QuickVoiceSearchSheet, QuickAIRecommendationsSheet, voice search mic button, related state vars (showVoiceSearch, showAIRecommendations), and .sheet modifiers
- **verify:** Build succeeds, no references to removed structs
- **done:** All placeholder AI/voice UI removed from search

### Task 2: Remove AI Recommendations from MainAppView
- **files:** `apps/ios/customer/eatfaircustomer/Views/MainAppView.swift`
- **action:** Remove "AI Pick" button, AIRecommendationsSheet struct (with mock recommendation generation), AIRecommendationCard, QuickSuggestionChip, showAIRecommendations state var, .sheet modifier
- **verify:** Build succeeds, no AI recommendation references remain
- **done:** All mock AI recommendation UI removed

### Task 3: Remove AI banner from HomeView
- **files:** `apps/ios/customer/eatfaircustomer/Views/HomeView.swift`
- **action:** Remove aiRecommendationBanner computed property and its reference in the ScrollView body
- **verify:** Build succeeds, HomeView renders without AI banner
- **done:** AI Food Assistant banner removed from home screen
