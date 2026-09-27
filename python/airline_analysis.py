"""
Airline Data Analysis & Visualization Project
----------------------------------------------
This is the Python/Pandas analysis engine used to produce the
precomputed JSON and cleaned CSV consumed by the GitHub Pages site.

Run:
    pip install -r requirements.txt
    python python/airline_analysis.py

The script follows:
1. Data Collection
2. Data Loading
3. Data Exploration
4. Data Cleaning
5. Feature Engineering
6. Exploratory Data Analysis
7. Data Visualization / analysis outputs
8. Statistical Analysis
9. Data Interpretation / Insights
10. Reporting / Export
"""

from pathlib import Path
import json
import numpy as np
import pandas as pd
from scipy.stats import chi2_contingency

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
INPUT = DATA_DIR / "Airline Dataset Updated - v2.csv"
OUTPUT_CSV = DATA_DIR / "airline_cleaned.csv"
OUTPUT_JSON = DATA_DIR / "analysis.json"


def load_data(path=INPUT):
    return pd.read_csv(path)


def clean_data(df):
    df = df.copy()

    df = df.drop(
        columns=[
            "Passenger ID", "First Name", "Last Name",
            "Pilot Name", "Airport Continent", "Airport Country Code"
        ],
        errors="ignore"
    )

    date_string = df["Departure Date"].astype(str).str.strip()

    slash_dates = pd.to_datetime(
        date_string, format="%m/%d/%Y", errors="coerce"
    )
    hyphen_dates = pd.to_datetime(
        date_string, format="%m-%d-%Y", errors="coerce"
    )

    df["Departure Date"] = slash_dates.fillna(hyphen_dates)

    # Change only invalid Age values; do not blank entire rows.
    df.loc[(df["Age"] < 1) | (df["Age"] > 100), "Age"] = np.nan
    df["Age"] = df["Age"].fillna(df["Age"].median())

    df["Gender"] = df["Gender"].astype(str).str.strip()
    df["Flight Status"] = df["Flight Status"].astype(str).str.strip()

    return df


def feature_engineering(df):
    df = df.copy()

    df["Departure Year"] = df["Departure Date"].dt.year
    df["Departure Month"] = df["Departure Date"].dt.month
    df["Departure Month Name"] = df["Departure Date"].dt.month_name()
    df["Departure Day"] = df["Departure Date"].dt.day
    df["Day of Week"] = df["Departure Date"].dt.day_name()

    df["Weekend/Weekday"] = np.where(
        df["Departure Date"].dt.dayofweek >= 5,
        "Weekend",
        "Weekday"
    )

    df["Age Group"] = pd.cut(
        df["Age"],
        bins=[0, 12, 18, 35, 60, 100],
        labels=["Child", "Teenager", "Young Adult", "Adult", "Senior"]
    )

    # Approximate classification based on nationality and airport country.
    df["Domestic/International"] = np.where(
        df["Nationality"].str.lower() ==
        df["Country Name"].str.lower(),
        "Domestic",
        "International"
    )

    return df


def chi_square(a, b):
    table = pd.crosstab(a, b)
    chi2, p, dof, expected = chi2_contingency(table)

    return {
        "chi2": round(float(chi2), 4),
        "p_value": float(p),
        "degrees_of_freedom": int(dof),
        "significant_at_0_05": bool(p < 0.05)
    }


def run_analysis(df):
    result = {
        "total_records": int(len(df)),
        "average_age": round(float(df["Age"].mean()), 2),
        "median_age": round(float(df["Age"].median()), 2),
        "minimum_age": int(df["Age"].min()),
        "maximum_age": int(df["Age"].max()),
        "std_age": round(float(df["Age"].std()), 2),
        "nationalities": int(df["Nationality"].nunique()),
        "airports": int(df["Airport Name"].nunique()),
        "arrival_airports": int(df["Arrival Airport"].nunique()),
        "continents": int(df["Continents"].nunique()),
    }

    return result


def main():
    raw = load_data()

    print("Rows and columns:", raw.shape)
    print("\nFirst records:")
    print(raw.head())

    print("\nData types:")
    print(raw.dtypes)

    print("\nMissing values:")
    print(raw.isnull().sum())

    print("\nDuplicate records:")
    print(raw.duplicated().sum())

    df = clean_data(raw)
    df = feature_engineering(df)

    print("\nProcessed shape:", df.shape)
    print("\nAverage passenger age:", round(df["Age"].mean(), 2))
    print("\nGender distribution:")
    print(df["Gender"].value_counts())

    print("\nFlight status:")
    print(df["Flight Status"].value_counts())

    print("\nFlight status by continent:")
    print(pd.crosstab(df["Continents"], df["Flight Status"]))

    print("\nChi-square: Gender vs Flight Status")
    print(chi_square(df["Gender"], df["Flight Status"]))

    export_df = df.copy()
    export_df["Departure Date"] = export_df["Departure Date"].dt.strftime("%Y-%m-%d")
    export_df.to_csv(OUTPUT_CSV, index=False)

    print("\nSaved:", OUTPUT_CSV)
    print("Run the notebook/dashboard build to regenerate analysis.json.")


if __name__ == "__main__":
    main()
