"""
backend/build_flickr8k_dataset.py

Builds posts_relabeled.csv from REAL data instead of the old synthetic
IG00XXXXX-filename dataset, which referenced image files that never
existed anywhere in the project.

WHAT THIS REPLACES
--------------------
The old pipeline was: posts_merged_dataset.csv (fabricated IG00XXXXX image
filenames, random engagement counts) -> relabel_dataset.py -> posts_relabeled.csv
-> train_pipeline.py. That worked fine for caption/category/timing/follower
signal, but the "image_path" column pointed at files that were never part
of the project, so every image-feature column was a constant neutral
default (0 real images resolved out of 7999 rows) -- useless for training
and correctly ignored by the model (0 image features in top 25 SHAP).

This script instead starts from:
  - datasets/Flickr8k/Image/<hash>.jpg           <- 675 REAL image files
  - datasets/Flickr8k/captions.txt                <- REAL captions for them
    (format: image_name|caption_number|caption_text, 5 captions/image)

and builds one row per (image, caption) pair -- up to 675 * 5 = 3375 rows,
all backed by real files on disk, so img_* features will have real,
non-constant, informative values this time.

WHY ROW COUNT DROPPED FROM 7999 TO ~3375
-------------------------------------------
This is the honest tradeoff of using real images instead of fabricated
ones: only 675 real images exist in this project's data, vs. the 7999
synthetic rows the old pipeline pretended to have images for. Fewer rows
means a noisier, less stable model than the old 7999-row run -- expect
this and don't be surprised if metrics look different (not necessarily
worse on ROC-AUC, since the image signal is now real, but training will
have more variance run-to-run).

CRITICAL: GROUP-AWARE SPLITTING REQUIRED DOWNSTREAM
-------------------------------------------------------
Because each image appears in up to 5 rows (one per caption), a plain
random train/test split in train_pipeline.py WILL leak: the same image
could appear in both train and test with a different caption, inflating
apparent accuracy. This script writes an explicit `image_id` column.
train_pipeline.py's train_test_split MUST be changed to a group-aware
split (e.g. sklearn's GroupShuffleSplit on `image_id`) before you trust
any metric it reports. This script cannot fix that file without seeing
its current content -- flag this to whoever reviews train_pipeline.py.

NON-VISUAL METADATA (category, follower_count, post_hour, hashtags, ...)
-------------------------------------------------------------------------
Flickr8k captions have no real Instagram-style metadata attached (no real
category, no real follower count -- those concepts don't exist in this
dataset). These columns are generated the same documented, seeded way as
before: not claimed to be real, just a transparent synthetic assumption
consistent with the rest of this project's design (see CATEGORY_WEIGHT
etc. below, same values as the previous relabel_dataset.py).

Usage:
    python build_flickr8k_dataset.py
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
from image_features import extract_from_path, FEATURE_NAMES as IMG_FEATURE_NAMES

DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# ---- real data locations (confirmed to exist on disk) ----
CAPTIONS_PATH = BASE_DIR / "datasets" / "Flickr8k" / "captions.txt"
IMAGE_DIR = BASE_DIR / "datasets" / "Flickr8k" / "Image"
OUTPUT_PATH = DATA_DIR / "posts_relabeled.csv"

RANDOM_STATE = 42
rng = np.random.RandomState(RANDOM_STATE)

# Set to False to use only 1 caption/image (675 rows) instead of all 5
# (up to 3375 rows). More rows helps a small real dataset, at the cost of
# each image appearing multiple times -- hence the group-split requirement
# above.
USE_ALL_CAPTIONS = True

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
CATEGORIES = list(CATEGORY_WEIGHT.keys())

HOOK_PHRASES = [
    "you won't believe", "wait for it", "here's why", "how to",
    "the truth about", "nobody talks about", "this changed",
    "before and after", "vs", "top ", "?",
]

PEAK_HOURS = {11, 12, 13, 18, 19, 20, 21}

NOISE_STD = 0.2
SIGNAL_SCALE = 2.2
BASE_RATE_INTERCEPT = -3.05  # same value as the last working image-aware run;
                              # re-tune if "New viral rate" drifts far from ~0.30-0.40


def load_real_captions() -> pd.DataFrame:
    """
    Parses captions.txt (image_name|caption_number|caption_text) and keeps
    only rows whose image actually exists in IMAGE_DIR -- i.e. exactly the
    675 real images this project has, not the full ~8000-image Flickr8k set
    captions.txt describes.
    """
    if not CAPTIONS_PATH.exists():
        raise SystemExit(f"captions.txt not found at {CAPTIONS_PATH}")
    if not IMAGE_DIR.exists():
        raise SystemExit(f"Image folder not found at {IMAGE_DIR}")

    raw = pd.read_csv(CAPTIONS_PATH, sep="|", engine="python",
                       names=["image_name", "caption_number", "caption_text"],
                       header=0)
    raw["image_name"] = raw["image_name"].str.strip()
    raw["caption_text"] = raw["caption_text"].str.strip()

    available = {p.name for p in IMAGE_DIR.glob("*.jpg")}
    print(f"Found {len(available)} real image files in {IMAGE_DIR}")

    raw = raw[raw["image_name"].isin(available)].copy()
    print(f"{raw['image_name'].nunique()} unique images have captions "
          f"({len(raw)} image-caption pairs total)")

    if not USE_ALL_CAPTIONS:
        raw = raw.sort_values("caption_number").groupby("image_name").head(1)
        print(f"USE_ALL_CAPTIONS=False -> kept 1 caption/image "
              f"({len(raw)} rows)")

    return raw.reset_index(drop=True)


def sentiment_features(captions):
    sia = SentimentIntensityAnalyzer()
    scores = captions.apply(sia.polarity_scores).apply(pd.Series)
    scores.columns = [f"sent_{c}" for c in scores.columns]
    return scores


def hook_score(caption: str) -> float:
    c = caption.lower()
    hits = sum(1 for phrase in HOOK_PHRASES if phrase in c)
    return min(hits, 3) / 3.0


def make_hashtags(category: str, rng_local: np.random.RandomState) -> str:
    """Small deterministic-per-row synthetic hashtag generator."""
    pool = {
        "Comedy": ["funny", "lol", "meme", "comedy"],
        "Travel": ["travel", "wanderlust", "explore", "vacation"],
        "Food": ["foodie", "yum", "food", "recipe"],
        "Fashion": ["ootd", "fashion", "style"],
        "Fitness": ["fitness", "gym", "workout"],
        "Lifestyle": ["lifestyle", "life", "daily"],
        "Music": ["music", "song", "playlist"],
        "Photography": ["photography", "photo", "shot"],
        "Technology": ["tech", "gadget", "innovation"],
        "Beauty": ["beauty", "makeup", "skincare"],
    }
    options = pool.get(category, ["content"])
    n = rng_local.randint(0, 4)
    if n == 0:
        return ""
    chosen = rng_local.choice(options, size=min(n, len(options)), replace=False)
    return " ".join(f"#{tag}" for tag in chosen)


def main():
    print("Loading real captions + verifying real image files...")
    df = load_real_captions()
    df = df.rename(columns={"caption_text": "caption"})
    df["image_id"] = df["image_name"].str.replace(".jpg", "", regex=False)
    df["post_id"] = df["image_id"] + "_cap" + df["caption_number"].astype(str)
    df["image_path"] = df["image_name"].apply(
        lambda name: str((IMAGE_DIR / name).relative_to(BASE_DIR))
    )

    print("Generating synthetic pre-publish metadata "
          "(category/timing/follower/hashtags -- documented, seeded)...")
    n = len(df)
    df["content_category"] = rng.choice(CATEGORIES, size=n)
    df["post_hour"] = rng.randint(0, 24, size=n)
    df["day_of_week"] = rng.randint(0, 7, size=n)
    # log-normal-ish follower distribution: mostly small accounts, some large
    df["follower_count"] = np.round(np.exp(rng.normal(6.5, 2.2, size=n))).astype(int).clip(0, 5_000_000)
    df["hashtags"] = [make_hashtags(cat, rng) for cat in df["content_category"]]
    df["media_type"] = "image"
    df["platform"] = "Instagram"

    print("Computing VADER sentiment...")
    sent = sentiment_features(df["caption"])

    print("Computing engineered caption features...")
    df["caption_word_count"] = df["caption"].str.split().apply(len)
    df["hook_score"] = df["caption"].apply(hook_score)
    df["hashtag_count"] = df["hashtags"].apply(
        lambda h: len([t for t in str(h).split() if t.strip()])
    )

    print("Computing REAL image features from disk "
          "(this can take a minute for 3000+ rows)...")
    img_rows = []
    resolved_count = 0
    full_paths = df["image_path"].apply(lambda p: str(BASE_DIR / p))
    for i, full_path in enumerate(full_paths):
        feats = extract_from_path(full_path)
        img_rows.append(feats)
        if Path(full_path).exists():
            resolved_count += 1
        if (i + 1) % 500 == 0:
            print(f"  ... {i + 1}/{n} images processed")
    img_df = pd.DataFrame(img_rows)[IMG_FEATURE_NAMES]
    df = pd.concat([df.reset_index(drop=True), img_df], axis=1)
    print(f"Resolved {resolved_count}/{n} rows against real image files "
          f"({resolved_count / n:.1%}) -- should be ~100% since every row "
          f"comes from a filename we verified exists.")

    cat_weight = df["content_category"].map(CATEGORY_WEIGHT)
    hour_boost = df["post_hour"].apply(lambda h: 0.5 if int(h) in PEAK_HOURS else 0.0)
    follower_boost = (np.log1p(df["follower_count"].clip(lower=0))
                       / np.log1p(1_000_000)).clip(0, 1)
    length_score = df["caption_word_count"].apply(
        lambda w: 0.3 if 40 <= w <= 150 else (0.1 if w < 40 else -0.1)
    )

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
    signal = SIGNAL_SCALE * weighted_terms + BASE_RATE_INTERCEPT
    noise = rng.normal(0, NOISE_STD, size=n)

    signal_std = signal.std()
    noise_std = noise.std()
    ratio = signal_std / noise_std if noise_std > 0 else float("inf")
    print(f"signal std = {signal_std:.3f}, noise std = {noise_std:.3f}, "
          f"signal/noise ratio = {ratio:.2f}")
    if ratio < 1.5:
        print("WARNING: signal/noise ratio below 1.5.")

    logit = signal + noise
    prob_viral = 1 / (1 + np.exp(-logit))
    viral = (rng.uniform(0, 1, size=n) < prob_viral).astype(int)
    df["viral_probability"] = prob_viral.round(4)
    df["viral"] = viral

    print(f"\nRows: {n}  (from {df['image_id'].nunique()} unique real images)")
    print(f"New viral rate: {df['viral'].mean():.3f}")
    print("Viral rate by content_category:")
    print(df.groupby("content_category")["viral"].mean().round(3))
    print(f"corr(sent_compound, viral) = {sent['sent_compound'].corr(df['viral']):.3f}")
    print(f"corr(img_colorfulness, viral) = {df['img_colorfulness'].corr(df['viral']):.3f}")
    print(f"corr(img_edge_density, viral) = {df['img_edge_density'].corr(df['viral']):.3f}")
    print(f"corr(img_brightness_mean, viral) = {df['img_brightness_mean'].corr(df['viral']):.3f}")

    df.to_csv(OUTPUT_PATH, index=False)
    print(f"\nWrote {OUTPUT_PATH}")
    print("REMINDER: train_pipeline.py's train/test split must be group-aware "
          "on `image_id` before you trust its metrics -- the same image now "
          "appears in up to 5 rows.")


if __name__ == "__main__":
    main()