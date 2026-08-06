# Content Virality Prediction — Trained Models & Cleaned Dataset

Built from `posts_merged_dataset.csv` following the architecture in
**Major_Project_Report_Final_2.docx**: text features (TF-IDF + sentiment
analysis), metadata features, and an ensemble of Random Forest, SVM, and
XGBoost, with SHAP explainability.

## ⚠️ Important note on the image/CNN branch
The report's architecture has three modalities (text, image, metadata), but
only the CSV was uploaded — no images folder. `image_path` in the CSV points
to files that aren't included, so **the CNN visual branch was not trained**.
Everything here uses text + metadata only. If you upload the images folder
(matching `data/images/...` paths in the CSV), I can add a CNN feature
extractor (e.g. ResNet/MobileNet embeddings) and refit the ensemble on all
three modalities to fully match the report.

## Data cleaning
- Dropped exact duplicate `post_id`s (none found) and rows with missing
  caption/target values (none found — data was already clean).
- Coerced numeric columns, clipped any negative values.
- Trimmed whitespace on captions, removed empty captions.
- **Leakage removed:** `engagement_rate` and `performance_bucket_label` are
  both directly derived from the same early engagement counts used to build
  the `viral` label (verified: `engagement_rate ≈ (early_likes+early_shares+
  early_comments+saves)/impressions`, and `viral==1` exactly when
  `performance_bucket_label=='viral'`). Both were **excluded from the
  feature set** so the model predicts from raw early signals rather than
  reconstructing the label formula.
- `posts_cleaned.csv` = the cleaned dataset (all original columns kept for
  reference; use `schema.json` to know which columns are safe model inputs).

## Feature engineering
| Modality | Technique | Output |
|---|---|---|
| Text (caption) | TF-IDF (unigrams+bigrams, top 300 terms, English stopwords removed) | 300 sparse columns |
| Text (caption) | VADER sentiment analysis | `sent_neg`, `sent_neu`, `sent_pos`, `sent_compound` |
| Metadata | raw counts + engineered | `post_hour`, `day_of_week`, `follower_count`, `early_likes`, `early_shares`, `early_comments`, `saves`, `reach`, `impressions`, `caption_len`, `caption_word_count` (standard-scaled) |
| Categorical | one-hot encoding | `media_type`, `content_category` |

All fused into a single 328-column sparse matrix (`Step 3: Multimodal
Feature Fusion` from the report).

## Models trained (test set, 20% holdout, stratified)

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|
| Random Forest | 0.899 | 0.881 | 0.688 | 0.773 | 0.964 |
| SVM (RBF) | 0.876 | 0.690 | 0.913 | 0.786 | 0.953 |
| XGBoost | 0.938 | 0.832 | 0.940 | 0.883 | **0.984** |
| **Ensemble (soft voting)** | **0.937** | 0.873 | 0.875 | 0.874 | 0.980 |

XGBoost alone is the single strongest model; the soft-voting ensemble
(RF + SVM + XGBoost, matching the report's "ensemble classifier" design)
gives the most balanced precision/recall and is the default in `inference.py`.

## Explainability (SHAP)
`shap_top_features.json` has the top 25 features by mean |SHAP value| on
XGBoost. Top drivers: `early_likes`, `impressions`, `early_shares`, `saves`,
`reach`, `early_comments`, `follower_count`, `caption_len`, post timing, and
content category — i.e. early engagement velocity dominates, which matches
intuition for "early-stage virality prediction."

## Files in this package
```
posts_cleaned.csv              cleaned dataset (all original columns)
model_random_forest.joblib     trained Random Forest
model_svm.joblib               trained SVM
model_xgboost.joblib           trained XGBoost
model_ensemble.joblib          soft-voting ensemble (RF+SVM+XGB)
vectorizer_tfidf.joblib        fitted TF-IDF vectorizer (caption -> 300 cols)
scaler_metadata.joblib         fitted StandardScaler for numeric metadata
encoder_categorical.joblib     fitted OneHotEncoder (media_type, content_category)
feature_names.json             ordered list of all 328 fused feature names
schema.json                    which raw columns map to which feature block
shap_top_features.json         SHAP feature importance ranking
model_comparison.csv / .json   metrics table above, machine-readable
inference.py                   ready-to-import predict_virality() function
train_pipeline.py              full training script (rerun / retrain anytime)
```

## Using it in your backend
```python
from inference import predict_virality

result = predict_virality({
    "caption": "A golden retriever puppy playing in autumn leaves",
    "post_hour": 18,
    "day_of_week": 5,
    "follower_count": 12000,
    "early_likes": 300,
    "early_shares": 20,
    "early_comments": 15,
    "saves": 40,
    "reach": 8000,
    "impressions": 11000,
    "media_type": "reel",
    "content_category": "Lifestyle",
})
# {"viral": 1, "viral_probability": 0.83, "model": "ensemble"}
```
Drop `inference.py` plus all the `.joblib`/`.json` files into your Flask
project (same folder), install `vaderSentiment`, `xgboost`, `scikit-learn`,
`scipy`, `pandas`, `joblib`, and call `predict_virality()` from your route
handler — this is exactly the "Ensemble Classification" step (Step 4) in the
report's proposed system architecture.
