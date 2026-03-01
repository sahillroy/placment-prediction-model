import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

df = pd.read_csv('placement_data.csv')

plt.figure(figsize=(12, 8))
sns.heatmap(df.corr(), annot=True, fmt='.2f', cmap='coolwarm')
plt.title('Feature Correlation Matrix — Placement Dataset')
plt.tight_layout()
plt.savefig('correlation_matrix.png')
print("✅ Saved: correlation_matrix.png")