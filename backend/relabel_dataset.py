"""
Relabel posts_merged_dataset.csv so that `viral` is genuinely CAUSED BY
caption/content/timing/follower/image signals, instead of being derived
from randomly-generated engagement counts.

WHY THIS EXISTS
----------------
The original dataset pairs random Flickr8k captions with randomly generated
early_likes/early_shares/early_comments/saves/reach/impressions, then defines
`viral` from those random numbers. Result: viral rate is ~flat across every
caption/category/timing slice, corr(follower_count, viral) ~ 0.008. There is
nothing for a model to learn from content, because in this data virality is
statistically independent of content.

This script replaces the `viral` label with one computed from documented,
inspectable weights on features a user actually has *before* publishing:
  - caption sentiment (VADER compound)
  - caption length / word count
  - "hook" phrases (question, imperative, numbers/list format)
  - hashtag count
  - content_category
  - post_hour / day_of_week
  - follower_count (log-scaled, diminishing returns)
  - image characteristics (colorfulness, edge density, brightness) -- NEW
  - Gaussian noise, so it's a genuine classification problem

WHY IMAGE FEATURES WERE ADDED (2nd revision)
-----------------------------------------------
Adding image features to train_pipeline.py alone is not enough. If the
`viral` label has zero relationship to the image, the model will correctly
learn to ignore the image entirely -- SHAP importance near zero -- and
predictions will look "generic" with respect to image input all over again,
exactly like the original engagement-leakage bug. For the image to
genuinely affect predictions, the LABEL must depend on the image, not just
the feature set. This mirrors the same fix already applied to the text
features. Weights below are the same "documented approximation of a real
pattern, not a scientific ground truth" spirit as the rest of this file:
brighter, more colorful, higher-detail images get a modest boost.

Run this BEFORE train_pipeline.py. It writes posts_relabeled.csv into the
same data/ directory. train_pipeline.py should be pointed at that file.

Usage:
    python relabel_dataset.py
"""
import sys
from pathlib import Path
import numpy as np
import pandas as pd

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
except ImportError as e:
    raise SystemExit(
        "vaderSentiment is required. Install it with:\n"
        "    pip install vaderSentiment"
    ) from e

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
from image_features import extract_from_path, extract_image_features, FEATURE_NAMES as IMG_FEATURE_NAMES

DATA_DIR = BASE_DIR / "data"
RANDOM_STATE = 42
rng = np.random.RandomState(RANDOM_STATE)

INPUT_PATH = DATA_DIR / "posts_merged_dataset.csv"
OUTPUT_PATH = DATA_DIR / "posts_relabeled.csv"

# Candidate roots to search for image_path values -- adjust if your images
# live somewhere else. The first existing path wins.
IMAGE_SEARCH_ROOTS = [
    BASE_DIR,
    BASE_DIR / "datasets",
    BASE_DIR / "datasets" / "Flickr8k",
    BASE_DIR / "datasets" / "Instagram",
]

CATEGORY_WEIGHT = {
    "Comedy": 0.9,
    "Travel": 0.6,
    "Food": 0.55,
    "Fashion": 0.5,
    "Fitness": 0.45,
    "Lifestyle": 0.4,
    "Music": 0.35,
    "Photography": 0.3,
    "Technology": 0.25,
    "Beauty": 0.2,
}
DEFAULT_CATEGORY_WEIGHT = 0.15

HOOK_PHRASES = [
    "you won't believe", "wait for it", "here's why", "how to",
    "the truth about", "nobody talks about", "this changed",
    "before and after", "vs", "top ", "?",
]

PEAK_HOURS = {11, 12, 13, 18, 19, 20, 21}

NOISE_STD = 0.2
SIGNAL_SCALE = 2.2


def sentiment_features(captions):
    sia = SentimentIntensityAnalyzer()
    scores = captions.apply(sia.polarity_scores).apply(pd.Series)
    scores.columns = [f"sent_{c}" for c in scores.columns]
    return scores


def hook_score(caption: str) -> float:
    c = caption.lower()
    hits = sum(1 for phrase in HOOK_PHRASES if phrase in c)
    return min(hits, 3) / 3.0


def hashtag_count(row) -> int:
    tag_field = str(row.get("hashtags", "") or "")
    if tag_field.strip():
        return len([t for t in tag_field.replace(",", " ").split() if t.strip()])
    return str(row.get("caption", "")).count("#")


def resolve_image_path(raw_path: str) -> str:
    raw = str(raw_path or "").strip()
    if not raw:
        return ""
    candidates = [Path(raw)] + [root / raw for root in IMAGE_SEARCH_ROOTS]
    for c in candidates:
        try:
            if c.exists() and c.is_file():
                return str(c)
        except OSError:
            continue
    return ""


def main():
    print(f"Loading {INPUT_PATH} ...")
    df = pd.read_csv(INPUT_PATH)
    df["caption"] = df["caption"].astype(str).str.strip()

    print("Computing VADER sentiment...")
    sent = sentiment_features(df["caption"])

    print("Computing engineered content features...")
    df["caption_word_count"] = df["caption"].str.split().apply(len)
    df["hook_score"] = df["caption"].apply(hook_score)
    df["hashtag_count"] = df.apply(hashtag_count, axis=1)

    print("Computing image features (this can take a minute for large datasets)...")
    image_path_col = "image_path" if "image_path" in df.columns else None
    resolved_count = 0
    img_rows = []
    for i, raw_path in enumerate((df[image_path_col] if image_path_col else [""] * len(df))):
        resolved = resolve_image_path(raw_path)
        if resolved:
            resolved_count += 1
        img_rows.append(extract_from_path(resolved) if resolved else extract_image_features(None))
        if (i + 1) % 2000 == 0:
            print(f"  ... {i + 1}/{len(df)} images processed")
    img_df = pd.DataFrame(img_rows)[IMG_FEATURE_NAMES]
    df = pd.concat([df, img_df], axis=1)

    print(f"Resolved {resolved_count}/{len(df)} image files on disk "
          f"({len(df) - resolved_count} used neutral default features).")
    if resolved_count == 0:
        print("WARNING: no image files were found under IMAGE_SEARCH_ROOTS. "
              "Every row is using neutral default image features, which "
              "means the image signal below will be flat / uninformative. "
              "Check that IMAGE_SEARCH_ROOTS points at your actual image "
              "folders, or that the image_path column values are correct.")

    cat_weight = df["content_category"].map(
        lambda c: CATEGORY_WEIGHT.get(str(c), DEFAULT_CATEGORY_WEIGHT)
    )
    unmatched = set(df["content_category"].astype(str)) - set(CATEGORY_WEIGHT)
    if unmatched:
        print(f"WARNING: categories falling back to DEFAULT_CATEGORY_WEIGHT "
              f"({DEFAULT_CATEGORY_WEIGHT}): {sorted(unmatched)}.")

    hour_boost = df["post_hour"].apply(lambda h: 0.5 if int(h) in PEAK_HOURS else 0.0)
    follower_boost = np.log1p(df["follower_count"].clip(lower=0)) / np.log1p(1_000_000)
    follower_boost = follower_boost.clip(0, 1)

    length_score = df["caption_word_count"].apply(
        lambda w: 0.3 if 40 <= w <= 150 else (0.1 if w < 40 else -0.1)
    )

    # ---- image score: documented, transparent approximation ----
    # Colorfulness and edge density are normalised into a rough 0-1 range
    # using empirically reasonable ceilings for this metric (not universal
    # constants -- tune if your dataset's images are unusually flat/vivid).
    # Brightness gets a small bonus in a "well-exposed" mid-range and a
    # penalty at the extremes (very dark or blown-out images).
    colorfulness_score = (df["img_colorfulness"] / 80.0).clip(0, 1)
    edge_score = (df["img_edge_density"] / 0.3).clip(0, 1)
    brightness_score = df["img_brightness_mean"].apply(
        lambda b: 0.3 if 70 <= b <= 190 else -0.1
    )
    image_score = 0.5 * colorfulness_score + 0.3 * edge_score + 0.2 * brightness_score.clip(-0.1, 0.3)

    weighted_terms = (
        1.6 * sent["sent_compound"]
        + 1.2 * df["hook_score"]
        + 1.2 * cat_weight
        + 0.6 * hour_boost
        + 0.5 * follower_boost
        + 0.4 * length_score
        + 0.15 * np.minimum(df["hashtag_count"], 10) / 10.0
        + 0.5 * image_score
    )
    BASE_RATE_INTERCEPT = -3.05  # retuned to account for the added image term;
                                  # verify the printed "New viral rate" below
                                  # and nudge if it drifts far from ~0.30-0.40
    signal = SIGNAL_SCALE * weighted_terms + BASE_RATE_INTERCEPT
    noise = rng.normal(0, NOISE_STD, size=len(df))

    signal_std = signal.std()
    noise_std = noise.std()
    ratio = signal_std / noise_std if noise_std > 0 else float("inf")
    print(f"signal std = {signal_std:.3f}, noise std = {noise_std:.3f}, "
          f"signal/noise ratio = {ratio:.2f}")
    if ratio < 1.5:
        print("WARNING: signal/noise ratio below 1.5 -- noise may still be "
              "drowning out content signal. Consider lowering NOISE_STD further.")

    logit = signal + noise
    prob_viral = 1 / (1 + np.exp(-logit))
    viral = (rng.uniform(0, 1, size=len(df)) < prob_viral).astype(int)

    df["viral_probability"] = prob_viral.round(4)
    df["viral"] = viral

    print(f"New viral rate: {df['viral'].mean():.3f}")
    print("Viral rate by content_category:")
    print(df.groupby("content_category")["viral"].mean().round(3))
    print("Viral rate by whether post_hour is a peak hour:")
    print(df.assign(is_peak=df["post_hour"].isin(PEAK_HOURS))
            .groupby("is_peak")["viral"].mean().round(3))
    print(f"corr(sent_compound, viral) = {sent['sent_compound'].corr(df['viral']):.3f}")
    print(f"corr(follower_count, viral) = {df['follower_count'].corr(df['viral']):.3f}")
    print(f"corr(img_colorfulness, viral) = {df['img_colorfulness'].corr(df['viral']):.3f}")
    print(f"corr(img_edge_density, viral) = {df['img_edge_density'].corr(df['viral']):.3f}")
    print(f"corr(img_brightness_mean, viral) = {df['img_brightness_mean'].corr(df['viral']):.3f}")

    df.to_csv(OUTPUT_PATH, index=False)
    print(f"\nWrote relabeled dataset -> {OUTPUT_PATH}")
    print("Point train_pipeline.py at posts_relabeled.csv (see DATA_FILE constant).")


if __name__ == "__main__":
    main()