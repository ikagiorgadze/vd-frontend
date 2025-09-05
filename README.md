# V-Dem Compare

A modern web application for exploring and comparing democracy indicators from the V-Dem (Varieties of Democracy) v15 dataset. Built for politicians, researchers, and democracy enthusiasts.

## Features

### 🏛️ **Democracy Data Explorer**
- Interactive charts for V-Dem democracy indicators
- Country comparison across multiple metrics
- Time series analysis from 1990-2024
- Real-time data filtering and visualization

### 📊 **Chart Types & Analysis**
- Line charts for trend analysis
- Bar charts for direct comparison
- Area charts for cumulative views
- Scatter plots for correlation analysis
- Sparkline previews on dashboard cards

### 🗺️ **Global Coverage**
- 180+ countries with V-Dem data
- Regional analysis and comparison
- Flag-based country identification
- Search and filter functionality

### 🎯 **Key Democracy Indicators**
- **Elections**: Suffrage, clean elections index
- **Civil Liberty**: Freedom of expression, media freedom
- **Regime**: Judicial constraints, executive accountability  
- **Media**: Media perspectives and independence
- **Political Equality**: Egalitarian democracy measures

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Charts**: Recharts for interactive visualizations
- **Routing**: React Router with URL state management
- **Data**: V-Dem Institute v15 dataset (sample included)

## Quick Start

1. **Clone and install**:
   \`\`\`bash
   git clone <your-repo-url>
   cd v-dem-compare
   npm install
   \`\`\`

2. **Start development server**:
   \`\`\`bash
   npm run dev
   \`\`\`

3. **Open in browser**: http://localhost:8080

## Usage Guide

### Dashboard (/)
- Browse example democracy indicator cards
- Click any card to view detailed charts
- Use category buttons in header to build custom queries
- Filter by country, time period, and specific measures

### Chart Explorer (/chart)
- Interactive line charts with multiple countries
- Modify panel for real-time adjustments
- Download data as CSV
- Share chart links with URL parameters
- Compare across different chart types

### Query Builder
- **Countries**: Multi-select with search (default: Moldova, Germany, Ukraine)
- **Time Period**: Year range slider (default: 2010-2024)  
- **Categories**: Elections, Civil Liberty, Regime, Media, Political Equality
- **Measures**: Searchable list of V-Dem variables

## Data Integration

### Current Setup
- Sample data generator for demonstration
- 6 key V-Dem variables pre-configured
- Mock data follows realistic patterns and scales

### Expanding the Dataset

To use the full V-Dem dataset:

1. **Download V-Dem data**: Get the CSV/Parquet export from [v-dem.net](https://v-dem.net)

2. **Update data layer** (\`src/lib/data.ts\`):
   \`\`\`typescript
   // Replace generateSampleData with actual data loading
   export async function fetchVDemData(countries, variable, startYear, endYear) {
     // Load from your V-Dem CSV file
     return actualVDemData;
   }
   \`\`\`

3. **Expand variables** (\`src/lib/variables.ts\`):
   \`\`\`typescript
   // Add more V-Dem variables to VDEM_VARIABLES array
   export const VDEM_VARIABLES = [
     // Add hundreds more V-Dem indicators
   ];
   \`\`\`

## Key Components

- **GlobalHeader**: Category navigation and query builder
- **Dashboard**: Card-based overview of democracy indicators  
- **ChartExplorer**: Interactive chart visualization with controls
- **QueryBuilder**: Modal for building custom data queries
- **ModifyPanel**: Sidebar controls for chart customization
- **ChartCard**: Preview cards with sparklines and latest values

## URL State Management

Charts and queries are shareable via URL parameters:

\`\`\`
/chart?countries=DEU,MDA,UKR&from=2010&to=2024&var=v2elsuffrage&chart=line
\`\`\`

## Design System

- **Colors**: V-Dem inspired blue/purple gradient theme
- **Typography**: Clean, readable fonts optimized for data
- **Cards**: Polymarket-style hover effects and shadows  
- **Animations**: Subtle, performant transitions
- **Responsive**: Mobile-first design principles

## Contributing

1. Fork the repository
2. Create feature branch: \`git checkout -b feature/new-indicator\`
3. Commit changes: \`git commit -m 'Add new democracy indicator'\`
4. Push branch: \`git push origin feature/new-indicator\`
5. Submit pull request

## Data Attribution

Data provided by the **V-Dem Institute** (Varieties of Democracy) v15.
- Website: [v-dem.net](https://v-dem.net)
- Citation: V-Dem Institute. 2024. "V-Dem Dataset v15" Varieties of Democracy (V-Dem) Project.

## License

MIT License - see LICENSE file for details.

---

Built with ❤️ for democracy research and analysis.