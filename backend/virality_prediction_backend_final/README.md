# Virality Prediction Backend — Complete Package (v3, report-aligned)

Matches Major_Project_Report_Final_2.docx architecture: Multimodal Feature
Fusion + Ensemble Classification, with Random Forest + SVM + XGBoost
soft-voting, CNN visual branch, and XAI insights output.

## What's inside

### Prediction engine
- **`inference.py`** — the only file your Flask app needs to import. Exposes:
  - `predict_virality(post_dict)` — text + metadata only. Returns viral flag,
    probability, and `xai_insights` (SHAP top contributing features).
  - `predict_virality_from_image(image_path)` — image only (weak alone; kept
    for completeness/report comparison, see `cnn_metrics.json`).
  - `predict_virality_fusion(post_dict, image_path)` — best model when both
    are available: CNN embedding + TF-IDF + tabular, concatenated, fed to a
    tuned classifier (accuracy 0.86, ROC-AUC 0.904 on held-out test).

### Models (all trained on the same 80/20 stratified split, random_state=42; test set never used for tuning)
| File | What it is | Test F1 |
|---|---|---|
| `model_final.joblib` | **Deployed model** — RF+SVM+XGBoost soft-voting ensemble | 0.881 |
| `model_random_forest.joblib` | RF component (tuned) | 0.800 |
| `model_svm.joblib` | SVM component (tuned) | 0.797 |
| `model_xgboost.joblib` | XGBoost component (tuned) | 0.878 |
| `model_ensemble_rf_svm_xgb.joblib` | Same object as `model_final.joblib`, kept under this name for report clarity | 0.881 |
| `model_cnn_mobilenetv2.keras` | CNN (MobileNetV2 transfer learning), image-only | 0.290 (below 0.76 majority baseline — see note below) |
| `model_fusion.joblib` + `scaler_fusion.joblib` | CNN+text+tabular fusion classifier | 0.731 |

**Honest note on CNN:** trained on the 663 posts that had matching images
(out of 7999 total). On its own, the CNN scores *below* the majority-class
baseline (0.76) — image content shows little real correlation with the
(synthetically-generated) viral label. Fusing it with tabular+text data
recovers strong performance (0.86 acc), so use `predict_virality_fusion()`
when an image is available, not `predict_virality_from_image()` alone.

### Preprocessing (required by inference.py — do not omit)
`vectorizer_tfidf.joblib`, `scaler_metadata.joblib`, `encoder_categorical.joblib`,
`variance_filter.joblib`, `schema.json`, `feature_names.json`

### Data
- `posts_cleaned.csv` — cleaned dataset (duplicates/nulls removed, leakage
  columns identified but kept for reference — `engagement_rate` and
  `performance_bucket_label` are NOT used as model features, see schema.json)

### Reference / reproducibility
- `train_pipeline.py` — full tabular training script (RF/SVM/XGBoost tuning
  + ensemble build). Re-run only if retraining.
- `model_comparison_report_spec.csv` — the table above, machine-readable
- `cnn_metrics.json` — CNN standalone evaluation detail
- `fusion_metrics.json` — fusion model evaluation detail

## Report → code mapping
| Report layer | File/function |
|---|---|
| Data Input Layer | `posts_cleaned.csv`, image files |
| Preprocessing & Feature Extraction | TF-IDF + VADER sentiment, scaler, encoder, CNN embedding |
| Multimodal Fusion Layer (Early Fusion) | `predict_virality_fusion()` |
| ML Classification Layer (ensemble) | `model_final.joblib` (RF+SVM+XGBoost voting) |
| Output & UI Layer | `inference.py` return dict → your Flask route (not included — see below) |

## Using it
```bash
pip install joblib pandas numpy scipy scikit-learn xgboost tensorflow vaderSentiment shap
```
```python
from inference import predict_virality, predict_virality_fusion

result = predict_virality({
    "caption": "Amazing sunset today!", "post_hour": 19, "day_of_week": 4,
    "follower_count": 8000, "early_likes": 600, "early_shares": 40,
    "early_comments": 25, "saves": 90, "reach": 7000, "impressions": 9500,
    "media_type": "reel", "content_category": "Lifestyle",
})
# {'viral': 1, 'viral_probability': 0.83, 'model': 'Ensemble (...)',
#  'xai_insights': [{'feature': 'early_likes', 'impact': 1.17}, ...]}
```

## NOT included in this package
This is the prediction engine only — **not a runnable web server**. Missing:
- Flask app (`app.py`) with `/predict` route
- Frontend (HTML/CSS/JS form)
- Image upload handling

Ask if you want these scaffolded — they're the remaining piece to match the
report's "Output & User Interface Layer" end-to-end.
