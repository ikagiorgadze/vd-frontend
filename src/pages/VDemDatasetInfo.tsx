import React from 'react';

export default function VDemDatasetInfo() {
  return (
    <div className="p-6 mx-auto w-full max-w-4xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">About the V-Dem Dataset</h1>
        <p className="text-muted-foreground mt-1">Varieties of Democracy (V-Dem) Project</p>
      </header>

      <section className="mb-8 space-y-4">
        <p className="text-lg">
          The dataset used in this website is the <strong>V-Dem Country-Year: Full+Others dataset (v15)</strong>, 
          one of the most comprehensive resources on democracy and political institutions worldwide.
        </p>
        
        <p>
          This dataset is produced by the Varieties of Democracy (V-Dem) project, which provides systematic 
          measurements of democratic institutions and processes across countries and time. The V-Dem project 
          employs expert surveys and advanced statistical methods to create reliable, cross-nationally 
          comparable indicators of democracy.
        </p>

        <p>
          The specific dataset we use contains:
        </p>
        <ul className="list-disc ml-6 space-y-1">
          <li><strong>531 V-Dem indicators</strong> covering various aspects of democratic governance</li>
          <li><strong>245 composite indices</strong> that aggregate related indicators</li>
          <li><strong>60 additional indicators</strong> from other reputable data sources</li>
        </ul>

        <p>
          This comprehensive collection enables researchers and analysts to explore democracy from multiple 
          perspectives, including electoral processes, civil liberties, rule of law, and political participation 
          across different countries and time periods.
        </p>

        <p>
          <strong>Learn more:</strong>{' '}
          <a href="https://www.v-dem.net/data/the-v-dem-dataset/" target="_blank" rel="noreferrer" className="text-primary underline">
            Visit the official V-Dem dataset page
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Citation Information</h2>
        <p className="mb-4">
          If you use data from this website in your research, please cite the V-Dem dataset appropriately. 
          The V-Dem project requests that researchers cite both the dataset and the measurement methodology.
        </p>

        <div className="bg-muted rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-2">Primary Citations:</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">V-Dem Dataset v15:</p>
              <p>Coppedge, Michael, John Gerring, Carl Henrik Knutsen, et al. (2025). "V-Dem Country-Year Dataset v15" Varieties of Democracy (V-Dem) Project. https://doi.org/10.23696/vdemds25</p>
            </div>
            <div>
              <p className="font-medium">V-Dem Measurement Model:</p>
              <p>Pemstein, Daniel, Kyle L. Marquardt, Eitan Tzelgov, et al. (2025). "The V-Dem Measurement Model: Latent Variable Analysis for Cross-National and Cross-Temporal Expert-Coded Data". V-Dem Working Paper No. 21. 10th edition.</p>
            </div>
          </div>
        </div>

        <details className="bg-card border rounded-lg p-4">
          <summary className="cursor-pointer font-medium mb-3">Show complete BibTeX citations</summary>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium">V-Dem Dataset:</h3>
            <p className="mt-1">
              Coppedge, Michael, John Gerring, Carl Henrik Knutsen, Staffan I. Lindberg, Jan Teorell, David Altman, Fabio Angiolillo, Michael Bernhard, Agnes Cornell, M. Steven Fish, Linnea Fox, Lisa Gastaldi, Haakon Gjerløw, Adam Glynn, Ana Good God, Sandra Grahn, Allen Hicken, Katrin Kinzelbach, Joshua Krusell, Kyle L. Marquardt, Kelly McMann, Valeriya Mechkova, Juraj Medzihorsky, Natalia Natsika, Anja Neundorf, Pamela Paxton, Daniel Pemstein, Johannes von Römer, Brigitte Seim, Rachel Sigman, Svend-Erik Skaaning, Jeffrey Staton, Aksel Sundström, Marcus Tannenberg, Eitan Tzelgov, Yi-ting Wang, Felix Wiebrecht, Tore Wig, Steven Wilson and Daniel Ziblatt. 2025. ”V-Dem [Country-Year/Country-Date] Dataset v15” Varieties of Democracy (V-Dem) Project. https://doi.org/10.23696/vdemds25.
            </p>
            <p className="mt-2">
              Pemstein, Daniel, Kyle L. Marquardt, Eitan Tzelgov, Yi-ting Wang, Juraj Medzihorsky, Joshua Krusell, Farhad Miri, and Johannes von Römer. 2025. “The V-Dem Measurement Model: Latent Variable Analysis for Cross-National and Cross-Temporal Expert-Coded Data”. V-Dem Working Paper No. 21. 10th edition. University of Gothenburg: Varieties of Democracy Institute.
            </p>
          </div>

          <div>
            <h3 className="font-medium">V-Dem Codebook:</h3>
            <p className="mt-1">
              Coppedge, Michael, John Gerring, Carl Henrik Knutsen, Staffan I. Lindberg, Jan Teorell, David Altman, Fabio Angiolillo, Michael Bernhard, Agnes Cornell, M. Steven Fish, Linnea Fox, Lisa Gastaldi, Haakon Gjerløw, Adam Glynn, Ana Good God, Sandra Grahn, Allen Hicken, Katrin Kinzelbach, Kyle L. Marquardt, Kelly McMann, Valeriya Mechkova, Anja Neundorf, Pamela Paxton, Daniel Pemstein, Johannes von Römer, Brigitte Seim, Rachel Sigman, Svend-Erik Skaaning, Jeffrey Staton, Aksel Sundström, Marcus Tannenberg, Eitan Tzelgov, Yi-ting Wang, Felix Wiebrecht, Tore Wig, and Daniel Ziblatt. 2025. ”V-Dem Codebook v15” Varieties of Democracy (V-Dem) Project.
            </p>
          </div>

          <div>
            <h3 className="font-medium">V-Dem Methodology:</h3>
            <p className="mt-1">
              Coppedge, Michael, John Gerring, Carl Henrik Knutsen, Staffan I. Lindberg, Jan Teorell, Kyle L. Marquardt, Juraj Medzihorsky, Daniel Pemstein, Linnea Fox, Lisa Gastaldi, Eitan Tzelgov, Yi-ting Wang, and Steven Wilson. 2025. ”V-Dem Methodology v15” Varieties of Democracy (V-Dem) Project.
            </p>
          </div>

          <div>
            <h3 className="font-medium">V-Dem Country Coding Units:</h3>
            <p className="mt-1">
              Coppedge, Michael, John Gerring, Carl Henrik Knutsen, Staffan I. Lindberg, Jan Teorell, Lisa Gastaldi, Ana Good God, and Sandra Grahn. 2025. ”V-Dem Country Coding Units v15” Varieties of Democracy (V-Dem) Project.
            </p>
          </div>

          <div>
            <h3 className="font-medium">V-Dem Organization and Management:</h3>
            <p className="mt-1">
              Coppedge, Michael, John Gerring, Carl Henrik Knutsen, Staffan I. Lindberg, Jan Teorell, Sara Andersson Haug, Susanna Burmeister, Linnea Fox, Lisa Gastaldi, Ana Good God, Sandra Grahn, Melina Liethmann, Natalia Natsika, Evie Papada, Josefine Pernes, and Maria Verkhovtseva. 2025. ”V-Dem Organization and Management v15” Varieties of Democracy (V-Dem) Project.
            </p>
          </div>
        </div>
        </details>
      </section>
    </div>
  );
}
