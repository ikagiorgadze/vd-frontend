import React from 'react';

export default function IMFDatasetInfo() {
  return (
    <div className="p-6 mx-auto w-full max-w-4xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">About the IMF Datasets</h1>
        <p className="text-muted-foreground mt-1">International Monetary Fund Economic Data</p>
      </header>

      <section className="mb-8 space-y-4">
        <p className="text-lg">
          The datasets used in this website are two complementary economic databases from the 
          <strong> International Monetary Fund (IMF)</strong>, providing comprehensive macroeconomic 
          indicators and national accounts data for countries worldwide.
        </p>
        
        <p>
          These datasets are maintained by different IMF departments and serve distinct but related purposes 
          in economic analysis and policy formulation. Together, they offer a complete picture of global 
          economic conditions, from high-level forecasts to detailed national accounting statistics.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">World Economic Outlook (WEO)</h3>
            <p className="text-sm mb-3">
              The WEO database contains macroeconomic data and projections from the IMF's biannual 
              World Economic Outlook reports, published every April and September/October.
            </p>
            <ul className="text-sm list-disc ml-4 space-y-1">
              <li>Economic forecasts and projections</li>
              <li>GDP, inflation, and unemployment data</li>
              <li>Balance of payments indicators</li>
              <li>Fiscal and trade statistics</li>
              <li>Data from 1980 to present with future projections</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              <strong>Source:</strong> IMF Research Department
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">National Economic Accounts (NEA)</h3>
            <p className="text-sm mb-3">
              The NEA dataset provides official national estimates of annual GDP and related economic 
              indicators, sourced directly from national authorities.
            </p>
            <ul className="text-sm list-disc ml-4 space-y-1">
              <li>Official expenditure-based GDP estimates</li>
              <li>Both nominal (current prices) and real (volume) terms</li>
              <li>National accounts from statistical institutes</li>
              <li>Data for economic policy analysis</li>
              <li>Annual data with regular updates</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              <strong>Source:</strong> IMF Statistics Department
            </p>
          </div>
        </div>

        <p className="mt-6">
          These datasets enable comprehensive economic analysis, from tracking current economic performance 
          to understanding long-term trends and making international comparisons. The combination provides 
          both forward-looking projections (WEO) and authoritative historical records (NEA).
        </p>

        <p>
          <strong>Learn more:</strong>{' '}
          <a href="https://data.imf.org/en/datasets/IMF.RES:WEO" target="_blank" rel="noreferrer" className="text-primary underline">
            World Economic Outlook Dataset
          </a>
          {' | '}
          <a href="https://data.imf.org/en/datasets/IMF.STA:ANEA" target="_blank" rel="noreferrer" className="text-primary underline">
            National Economic Accounts Dataset
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Citation Information</h2>
        <p className="mb-4">
          When using IMF data from this website in your research, please cite both datasets appropriately. 
          The IMF requires proper attribution for all data usage.
        </p>

        <div className="bg-muted rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-2">Primary Citations:</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">World Economic Outlook (WEO):</p>
              <p>International Monetary Fund. World Economic Outlook (WEO), https://data.imf.org/en/datasets/IMF.RES:WEO. Accessed on [current date].</p>
            </div>
            <div>
              <p className="font-medium">National Economic Accounts (NEA):</p>
              <p>International Monetary Fund. National Economic Accounts (NEA), Annual Data, https://data.imf.org/en/datasets/IMF.STA:ANEA. Accessed on [current date].</p>
            </div>
          </div>
        </div>

        <details className="bg-card border rounded-lg p-4">
          <summary className="cursor-pointer font-medium mb-3">Show complete BibTeX citations</summary>
          <div className="mt-3">
            <pre className="bg-muted text-xs rounded-md p-3 overflow-auto">
<code>{`@misc{IMFWEO2025,
  title = {World Economic Outlook (WEO)},
  author = {{International Monetary Fund}},
  year = {2025},
  url = {https://data.imf.org/en/datasets/IMF.RES:WEO},
  note = {Accessed on [current date]}
}

@misc{IMFNEA2025,
  title = {National Economic Accounts (NEA), Annual Data},
  author = {{International Monetary Fund}},
  year = {2025},
  url = {https://data.imf.org/en/datasets/IMF.STA:ANEA},
  note = {Accessed on [current date]}
}`}</code>
            </pre>
            <p className="text-xs text-muted-foreground mt-2">
              Note: Replace [current date] with the actual date you accessed the data. All IMF data is subject to their terms and conditions.
            </p>
          </div>
        </details>
      </section>
    </div>
  );
}
