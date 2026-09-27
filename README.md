# Airline Data Analysis and Visualization System

A 2nd-year college project built around the Kaggle Airline Dataset.

## Project objective

The project applies a complete data-analysis workflow:

1. Data Collection
2. Data Loading
3. Data Exploration
4. Data Cleaning
5. Feature Engineering
6. Exploratory Data Analysis (EDA)
7. Data Visualization
8. Statistical Analysis
9. Data Interpretation / Insights
10. Reporting / Presentation

## Technology

- Python
- Pandas
- NumPy
- SciPy
- HTML5
- CSS3
- JavaScript
- Chart.js
- Papa Parse

## Dataset

Kaggle Airline Dataset:
https://www.kaggle.com/datasets/iamsouravbanerjee/airline-dataset

Original dataset:
- Rows: 98,619
- Columns: 15
- Processed rows: 98,619
- Processed columns: 17

## Important GitHub Pages architecture

GitHub Pages is a static hosting service and does not execute Python or Flask on the server.

Therefore this project uses:

```text
Python/Pandas
    ↓
Generate analysis.json + airline_cleaned.csv
    ↓
GitHub Pages
    ↓
HTML/CSS/JavaScript
    ↓
Interactive dashboard
```

The complete Python source is included in:

```text
python/airline_analysis.py
```

The browser reads the precomputed:

```text
data/analysis.json
```

and the Data Explorer reads:

```text
data/airline_cleaned.csv
```

This keeps the analytical calculations in Python while making the final dashboard compatible with GitHub Pages.

## How to run the analysis locally

Install dependencies:

```bash
pip install -r requirements.txt
```

Run:

```bash
python python/airline_analysis.py
```

## How to run the website locally

Because the browser loads JSON/CSV files, use a local web server instead of opening `index.html` directly.

For example:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## How to publish on GitHub Pages

1. Create a new GitHub repository.
2. Upload everything inside this folder.
3. Commit and push.
4. Open repository **Settings**.
5. Open **Pages**.
6. Under **Build and deployment**, select:
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/ (root)`
7. Save.
8. Wait for GitHub Pages to deploy.
9. Open the generated Pages URL.

The important files for the live site are:

```text
index.html
assets/
data/
```

The Python folder is included for project documentation/reproducibility.

## Main dashboard sections

- Overview
- Passenger Analysis
- Flight Analysis
- Geographic Analysis
- Time Analysis
- Airport Analysis
- Statistical Analysis
- Data Explorer
- Insights
- Methodology

## Data cleaning used

The project removes identifier/personal-name fields that are not required for the statistical dashboard:

- Passenger ID
- First Name
- Last Name
- Pilot Name
- Airport Continent
- Airport Country Code

`Continents` is retained because it is the readable continent field.

Age values outside the expected 1–100 range are treated as missing and filled using the median age.

## Feature engineering

The project creates:

- Departure Year
- Departure Month
- Departure Month Name
- Departure Day
- Day of Week
- Weekend/Weekday
- Age Group
- Domestic/International

The Domestic/International field is an approximate classification based on whether passenger nationality matches the airport's Country Name field. It should be described as an approximate analytical feature, not a true ticket-level domestic/international classification.

## Notes

The dashboard is intentionally designed as a polished 2nd-year college project: substantial enough to demonstrate data analysis and web development, while avoiding unnecessary machine learning, authentication, databases, APIs, or complex production architecture.
