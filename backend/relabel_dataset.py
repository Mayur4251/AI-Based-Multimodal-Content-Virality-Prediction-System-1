"""
Relabel posts_merged_dataset.csv so that `viral` is genuinely CAUSED BY
caption/content/timing/follower signals, instead of being derived from
randomly-generated engagement counts.

WHY THIS EXISTS
----------------
The original dataset pairs random Flickr8k captions with randomly generated
early_likes/early_shares/early_comments/saves/reach/impressions, then defines
`viral` from those random numbers. Result: viral rate is ~flat across every
caption/category/timing slice (0.22-0.27 everywhere), corr(follower_count,
viral) ~ 0.008, corr(post_hour, viral) ~ 0.01. There is nothing for a model
to learn from content, no matter how the pipeline is re-engineered, because
in this data virality is statistically independent of content.

This script does NOT touch the engagement columns' distribution -- it only
replaces the `viral` label with one computed from documented, inspectable
weights on features a user actually has *before* publishing:
  - caption sentiment (VADER compound)
  - caption length / word count
  - presence of "hook" phrases (question, imperative, numbers/list format)
  - hashtag count (from the `hashtags` column if present, else parsed from caption)
  - content_category (some categories perform better, by design)
  - post_hour (peak posting windows get a boost)
  - day_of_week
  - follower_count (log-scaled, diminishing returns)
  - Gaussian noise, so it's a genuine classification problem, not a lookup table

Run this BEFORE train_pipeline.py. It writes posts_relabeled.csv into the
same data/ directory. train_pipeline.py should be pointed at that file.

Usage:
    python relabel_dataset.py
"""
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
DATA_DIR = BASE_DIR / "data"
RANDOM_STATE = 42
rng = np.random.RandomState(RANDOM_STATE)

INPUT_PATH = DATA_DIR / "posts_merged_dataset.csv"
OUTPUT_PATH = DATA_DIR / "posts_relabeled.csv"

# Categories that (by documented design choice) skew higher/lower virality.
# Edit these weights to match your report's assumptions -- the point is that
# they are EXPLICIT and DOCUMENTED, not implicit in random data.
#
# NOTE: these keys must match df["content_category"].unique() exactly, or
# that category silently falls through to DEFAULT_CATEGORY_WEIGHT below and
# loses its distinct signal. All 10 categories present in the real dataset
# are listed explicitly -- a WARNING is printed at runtime if any category
# in the data doesn't match a key here.
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
DEFAULT_CATEGORY_WEIGHT = 0.15  # should be unused if CATEGORY_WEIGHT is complete

HOOK_PHRASES = [
    "you won't believe", "wait for it", "here's why", "how to",
    "the truth about", "nobody talks about", "this changed",
    "before and after", "vs", "top ", "?",
]

PEAK_HOURS = {11, 12, 13, 18, 19, 20, 21}  # lunch + evening scroll windows

# Standard deviation of the Gaussian noise added to the logit before
# thresholding into a binary label. Kept small relative to the signal's own
# stddev (see the printed signal/noise ratio at runtime) -- if noise is too
# large relative to signal, the label becomes statistically independent of
# content again, which is the exact bug this script exists to fix.
NOISE_STD = 0.2

# Multiplier applied to the whole weighted signal (NOT the intercept) before
# noise is added. Even with near-zero noise, a narrow-spread signal (small
# logit std) keeps the label close to a coin flip once it's passed through
# Bernoulli sampling -- widening the spread via this scale is what actually
# separates the classes, distinct from the noise/signal ratio fix above.
SIGNAL_SCALE = 2.2


def sentiment_features(captions):
    sia = SentimentIntensityAnalyzer()
    scores = captions.apply(sia.polarity_scores).apply(pd.Series)
    scores.columns = [f"sent_{c}" for c in scores.columns]
    return scores


def hook_score(caption: str) -> float:
    c = caption.lower()
    hits = sum(1 for phrase in HOOK_PHRASES if phrase in c)
    return min(hits, 3) / 3.0  # cap so one caption can't dominate


def hashtag_count(row) -> int:
    tag_field = str(row.get("hashtags", "") or "")
    if tag_field.strip():
        return len([t for t in tag_field.replace(",", " ").split() if t.strip()])
    return str(row.get("caption", "")).count("#")


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

    cat_weight = df["content_category"].map(
        lambda c: CATEGORY_WEIGHT.get(str(c), DEFAULT_CATEGORY_WEIGHT)
    )
    unmatched = set(df["content_category"].astype(str)) - set(CATEGORY_WEIGHT)
    if unmatched:
        print(f"WARNING: categories falling back to DEFAULT_CATEGORY_WEIGHT "
              f"({DEFAULT_CATEGORY_WEIGHT}): {sorted(unmatched)}. "
              f"Add them to CATEGORY_WEIGHT to give them distinct signal.")

    hour_boost = df["post_hour"].apply(lambda h: 0.5 if int(h) in PEAK_HOURS else 0.0)
    # log-scaled follower boost, diminishing returns, roughly 0..1 range
    follower_boost = np.log1p(df["follower_count"].clip(lower=0)) / np.log1p(1_000_000)
    follower_boost = follower_boost.clip(0, 1)

    # ideal caption length: 40-150 words gets a small boost, very short or
    # very long captions get penalized slightly
    length_score = df["caption_word_count"].apply(
        lambda w: 0.3 if 40 <= w <= 150 else (0.1 if w < 40 else -0.1)
    )

    # ---- documented linear model for viral log-odds ----
    # SIGNAL_SCALE widens the spread of predicted probabilities (see comment
    # at its definition) -- the intercept is added AFTER scaling so the base
    # rate stays controllable independent of how wide the spread is.
    weighted_terms = (
        1.6 * sent["sent_compound"]
        + 1.2 * df["hook_score"]
        + 1.2 * cat_weight            # raised from 0.8 -- category now carries more weight
        + 0.6 * hour_boost
        + 0.5 * follower_boost
        + 0.4 * length_score
        + 0.15 * np.minimum(df["hashtag_count"], 10) / 10.0
    )
    BASE_RATE_INTERCEPT = -2.9  # retuned after SIGNAL_SCALE=2.2 pushed viral rate to 0.81;
                                 # this should pull it back toward ~0.30-0.40 -- verify the
                                 # printed "New viral rate" below and nudge if it's off
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

    df.to_csv(OUTPUT_PATH, index=False)
    print(f"\nWrote relabeled dataset -> {OUTPUT_PATH}")
    print("Point train_pipeline.py at posts_relabeled.csv (see DATA_FILE constant).")


if __name__ == "__main__":
    main()