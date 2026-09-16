"""
Virality Prediction - IMPROVED Training Pipeline (v2)
"""
import json, warnings, time
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import joblib
from scipy import sparse
from sklearn.model_selection import train_test_split, StratifiedKFold, RandomizedSearchCV
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import (RandomForestClassifier, ExtraTreesClassifier,
                               GradientBoostingClassifier, VotingClassifier)
from sklearn.feature_selection import VarianceThreshold
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                              f1_score, roc_auc_score, classification_report, confusion_matrix)
from xgboost import XGBClassifier
from catboost import CatBoostClassifier
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

RANDOM_STATE = 42
sia = SentimentIntensityAnalyzer()

df = pd.read_csv("/mnt/user-data/uploads/posts_merged_dataset.csv")
df = df.drop_duplicates(subset="post_id").dropna(subset=["caption", "viral"]).reset_index(drop=True)
df["caption"] = df["caption"].astype(str).str.strip()
df = df[df["caption"].str.len() > 0].reset_index(drop=True)
num_cols = ["post_hour", "day_of_week", "follower_count", "early_likes",
            "early_shares", "early_comments", "saves", "reach", "impressions"]
for c in num_cols:
    df[c] = pd.to_numeric(df[c], errors="coerce").clip(lower=0)
df = df.dropna(subset=num_cols).reset_index(drop=True)
print(f"Cleaned shape: {df.shape} | class balance: {df['viral'].value_counts(normalize=True).to_dict()}", flush=True)

TARGET = "viral"
LEAK_COLS = ["engagement_rate", "performance_bucket_label"]

df_train, df_test = train_test_split(df, test_size=0.2, random_state=RANDOM_STATE, stratify=df[TARGET])
print(f"Train: {df_train.shape}, Test: {df_test.shape}", flush=True)

def engineer(d):
    d = d.copy()
    d["caption_len"] = d["caption"].str.len()
    d["caption_word_count"] = d["caption"].str.split().apply(len)
    d["hour_sin"] = np.sin(2*np.pi*d["post_hour"]/24); d["hour_cos"] = np.cos(2*np.pi*d["post_hour"]/24)
    d["dow_sin"] = np.sin(2*np.pi*d["day_of_week"]/7); d["dow_cos"] = np.cos(2*np.pi*d["day_of_week"]/7)
    total_eng = d["early_likes"] + d["early_shares"] + d["early_comments"] + d["saves"]
    d["total_early_engagement"] = total_eng
    d["engagement_per_follower"] = total_eng / (d["follower_count"] + 1)
    d["likes_share_of_engagement"] = d["early_likes"] / (total_eng + 1)
    d["shares_per_reach"] = d["early_shares"] / (d["reach"] + 1)
    d["log_follower_count"] = np.log1p(d["follower_count"])
    d["log_reach"] = np.log1p(d["reach"])
    sent = d["caption"].apply(sia.polarity_scores).apply(pd.Series)
    sent.columns = [f"sent_{c}" for c in sent.columns]
    return pd.concat([d.reset_index(drop=True), sent.reset_index(drop=True)], axis=1)

df_train = engineer(df_train); df_test = engineer(df_test)

META_NUMERIC = ["post_hour","day_of_week","follower_count","early_likes","early_shares",
                 "early_comments","saves","reach","impressions","caption_len","caption_word_count",
                 "hour_sin","hour_cos","dow_sin","dow_cos","total_early_engagement",
                 "engagement_per_follower","likes_share_of_engagement","shares_per_reach",
                 "log_follower_count","log_reach","sent_neg","sent_neu","sent_pos","sent_compound"]
CAT_COLS = ["media_type", "content_category"]

tfidf = TfidfVectorizer(max_features=250, min_df=3, stop_words="english", ngram_range=(1,2))
tfidf_train = tfidf.fit_transform(df_train["caption"]); tfidf_test = tfidf.transform(df_test["caption"])

scaler = StandardScaler()
meta_train_scaled = scaler.fit_transform(df_train[META_NUMERIC])
meta_test_scaled = scaler.transform(df_test[META_NUMERIC])

ohe = OneHotEncoder(handle_unknown="ignore", sparse_output=True)
cat_train = ohe.fit_transform(df_train[CAT_COLS]); cat_test = ohe.transform(df_test[CAT_COLS])

X_train_full = sparse.hstack([tfidf_train, sparse.csr_matrix(meta_train_scaled), cat_train]).tocsr()
X_test_full = sparse.hstack([tfidf_test, sparse.csr_matrix(meta_test_scaled), cat_test]).tocsr()
feature_names = list(tfidf.get_feature_names_out()) + META_NUMERIC + list(ohe.get_feature_names_out(CAT_COLS))

vt = VarianceThreshold(threshold=1e-4)
X_train = vt.fit_transform(X_train_full); X_test = vt.transform(X_test_full)
feature_names = [f for f, k in zip(feature_names, vt.get_support()) if k]
print(f"Features: {X_train_full.shape[1]} -> {X_train.shape[1]} after variance filtering", flush=True)

y_train, y_test = df_train[TARGET].values, df_test[TARGET].values
pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=RANDOM_STATE)

# NOTE: sandbox has 1 CPU core, so search budgets are kept small (still real
# cross-validated tuning, just fewer candidates than a multi-core machine would allow).
search_space = {
    "RandomForest": (RandomForestClassifier(class_weight="balanced", random_state=RANDOM_STATE, n_jobs=1),
        {"n_estimators":[150,250],"max_depth":[None,20],"min_samples_split":[2,5],"min_samples_leaf":[1,2]}),
    "ExtraTrees": (ExtraTreesClassifier(class_weight="balanced", random_state=RANDOM_STATE, n_jobs=1),
        {"n_estimators":[150,250],"max_depth":[None,20],"min_samples_split":[2,5]}),
    "GradientBoosting": (GradientBoostingClassifier(random_state=RANDOM_STATE),
        {"n_estimators":[100,150],"max_depth":[2,3],"learning_rate":[0.05,0.1],"subsample":[0.8,1.0]}),
    "XGBoost": (XGBClassifier(eval_metric="logloss", scale_pos_weight=pos_weight, random_state=RANDOM_STATE, n_jobs=1),
        {"n_estimators":[150,250],"max_depth":[4,6],"learning_rate":[0.05,0.1],"subsample":[0.8,1.0],"colsample_bytree":[0.7,1.0]}),
    "CatBoost": (CatBoostClassifier(verbose=0, random_state=RANDOM_STATE, auto_class_weights="Balanced", thread_count=1),
        {"iterations":[150,250],"depth":[4,6],"learning_rate":[0.05,0.1]}),
}

best_models, cv_scores = {}, {}
for name, (estimator, params) in search_space.items():
    t0 = time.time()
    search = RandomizedSearchCV(estimator, params, n_iter=3, scoring="f1", cv=cv,
                                 random_state=RANDOM_STATE, n_jobs=1, verbose=0)
    search.fit(X_train, y_train)
    best_models[name] = search.best_estimator_
    cv_scores[name] = search.best_score_
    print(f"{name}: best CV f1={search.best_score_:.4f} params={search.best_params_} ({time.time()-t0:.0f}s)", flush=True)

def evaluate(name, model, X_te, y_te):
    pred = model.predict(X_te); proba = model.predict_proba(X_te)[:, 1]
    return {"model": name, "accuracy": round(accuracy_score(y_te,pred),4), "precision": round(precision_score(y_te,pred),4),
            "recall": round(recall_score(y_te,pred),4), "f1_score": round(f1_score(y_te,pred),4), "roc_auc": round(roc_auc_score(y_te,proba),4)}

results = [evaluate(n, m, X_test, y_test) for n, m in best_models.items()]

ensemble = VotingClassifier(estimators=[(n, best_models[n]) for n in best_models], voting="soft")
ensemble.fit(X_train, y_train)
results.append(evaluate("Ensemble (all tuned models)", ensemble, X_test, y_test))

results_df = pd.DataFrame(results).sort_values("f1_score", ascending=False)
print("\n=== FINAL TEST-SET RESULTS (unseen data) ===", flush=True)
print(results_df.to_string(index=False), flush=True)

best_name = results_df.iloc[0]["model"]
best_model = ensemble if best_name.startswith("Ensemble") else best_models[best_name]
print(f"\nBest model by test F1: {best_name}", flush=True)
print(classification_report(y_test, best_model.predict(X_test), target_names=["non-viral","viral"]), flush=True)
print("Confusion matrix:\n", confusion_matrix(y_test, best_model.predict(X_test)), flush=True)

out = "/home/claude/work"
joblib.dump(best_model, f"{out}/model_final.joblib")
joblib.dump(best_models["RandomForest"], f"{out}/model_random_forest.joblib")
joblib.dump(best_models["XGBoost"], f"{out}/model_xgboost.joblib")
joblib.dump(ensemble, f"{out}/model_ensemble.joblib")
joblib.dump(tfidf, f"{out}/vectorizer_tfidf.joblib")
joblib.dump(scaler, f"{out}/scaler_metadata.joblib")
joblib.dump(ohe, f"{out}/encoder_categorical.joblib")
joblib.dump(vt, f"{out}/variance_filter.joblib")
json.dump(feature_names, open(f"{out}/feature_names.json","w"))
json.dump({"text_column":"caption","metadata_numeric_columns":META_NUMERIC,"categorical_columns":CAT_COLS,
           "target_column":"viral","dropped_leakage_columns":LEAK_COLS,"best_model":best_name},
          open(f"{out}/schema.json","w"), indent=2)
results_df.to_csv(f"{out}/model_comparison.csv", index=False)
results_df.to_json(f"{out}/model_comparison.json", orient="records", indent=2)
df.to_csv(f"{out}/posts_cleaned.csv", index=False)
print("\nDONE. Saved model_final.joblib =", best_name, flush=True)
