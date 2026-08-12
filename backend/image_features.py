"""
backend/image_features.py

Handcrafted (non-deep-learning) visual feature extraction.

WHY HANDCRAFTED INSTEAD OF A PRETRAINED CNN EMBEDDING
-------------------------------------------------------
A pretrained ResNet/MobileNet embedding would be a stronger signal, but it
requires downloading weights (~15-100MB) and pinning torch/torchvision
versions exactly the same at train time and inference time. If those ever
drift, predictions silently become garbage with no error. Handcrafted
features are:
  - Deterministic: same image always produces the same numbers, no
    downloaded weights involved.
  - Fast: no model load, milliseconds per image.
  - Transparent: every feature has a clear meaning you can explain in a
    viva ("brighter, more colorful captions with visible edges score
    differently"), unlike a 512-dim CNN vector.
  - Only need Pillow + numpy, both already in your requirements.txt.

This is a legitimate, defensible design choice for a project report -- not
a workaround. If you later want to upgrade to a real CNN embedding, this
module's function signature (image -> dict of floats) is the only thing
you'd need to swap; nothing else in the pipeline needs to change.

FEATURES COMPUTED
------------------
img_brightness_mean   - average pixel luminance (0-255)
img_brightness_std    - contrast proxy: how spread out luminance values are
img_saturation_mean   - average color saturation (0-255, HSV)
img_saturation_std    - saturation contrast
img_colorfulness      - Hasler & Susstrunk (2003) colorfulness metric
img_edge_density       - fraction of pixels that are strong edges (proxy for
                          visual complexity / sharpness, computed via a
                          simple Sobel-style gradient, no extra deps)
img_warm_ratio        - fraction of "warm" hue pixels (red/orange/yellow)
                          vs "cool" hue pixels (blue/green/purple)
img_aspect_ratio      - width / height

All functions are pure and side-effect free. MUST be computed the exact
same way in train_pipeline.py (from a file path) and inference.py (from
base64 bytes) or the feature vector won't match what the scaler/model
expect. Both call extract_image_features(); do not duplicate this logic.
"""

import base64
import io
from typing import Dict, Optional

import numpy as np
from PIL import Image

FEATURE_NAMES = [
    "img_brightness_mean",
    "img_brightness_std",
    "img_saturation_mean",
    "img_saturation_std",
    "img_colorfulness",
    "img_edge_density",
    "img_warm_ratio",
    "img_aspect_ratio",
]

# Neutral defaults used when no image is supplied at all (e.g. a caption-only
# prediction). These sit at the middle of each feature's typical range so a
# missing image doesn't push the prediction toward either class.
DEFAULT_FEATURES: Dict[str, float] = {
    "img_brightness_mean": 128.0,
    "img_brightness_std": 50.0,
    "img_saturation_mean": 100.0,
    "img_saturation_std": 50.0,
    "img_colorfulness": 30.0,
    "img_edge_density": 0.1,
    "img_warm_ratio": 0.5,
    "img_aspect_ratio": 1.0,
}

_MAX_SIDE = 256  # downscale before computing features -- keeps this fast


def _load_and_resize(img: Image.Image) -> np.ndarray:
    img = img.convert("RGB")
    w, h = img.size
    scale = _MAX_SIDE / max(w, h) if max(w, h) > _MAX_SIDE else 1.0
    if scale < 1.0:
        img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))))
    return np.asarray(img, dtype=np.float64)


def _edge_density(gray: np.ndarray) -> float:
    """Simple gradient-magnitude edge proxy, no scipy/cv2 dependency."""
    gy = np.abs(np.diff(gray, axis=0))
    gx = np.abs(np.diff(gray, axis=1))
    # Trim to common shape
    h = min(gy.shape[0], gx.shape[0])
    w = min(gy.shape[1], gx.shape[1])
    grad = gy[:h, :w] + gx[:h, :w]
    threshold = 30.0  # empirical: gradient magnitude counted as an "edge"
    return float((grad > threshold).mean())


def _colorfulness(rgb: np.ndarray) -> float:
    """Hasler & Susstrunk (2003) colorfulness metric."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    rg = r - g
    yb = 0.5 * (r + g) - b
    std_rg, std_yb = rg.std(), yb.std()
    mean_rg, mean_yb = rg.mean(), yb.mean()
    return float(np.sqrt(std_rg ** 2 + std_yb ** 2) + 0.3 * np.sqrt(mean_rg ** 2 + mean_yb ** 2))


def _rgb_to_hsv_np(rgb_0_1: np.ndarray) -> np.ndarray:
    """Vectorized RGB->HSV, avoids a colorsys per-pixel Python loop."""
    r, g, b = rgb_0_1[..., 0], rgb_0_1[..., 1], rgb_0_1[..., 2]
    maxc = np.max(rgb_0_1, axis=-1)
    minc = np.min(rgb_0_1, axis=-1)
    v = maxc
    delta = maxc - minc
    s = np.where(maxc == 0, 0, delta / np.where(maxc == 0, 1, maxc))

    with np.errstate(divide="ignore", invalid="ignore"):
        rc = np.where(delta == 0, 0, (maxc - r) / np.where(delta == 0, 1, delta))
        gc = np.where(delta == 0, 0, (maxc - g) / np.where(delta == 0, 1, delta))
        bc = np.where(delta == 0, 0, (maxc - b) / np.where(delta == 0, 1, delta))

    h = np.zeros_like(maxc)
    is_r = (maxc == r) & (delta != 0)
    is_g = (maxc == g) & (delta != 0)
    is_b = (maxc == b) & (delta != 0)
    h[is_r] = (bc - gc)[is_r]
    h[is_g] = (2.0 + rc - bc)[is_g]
    h[is_b] = (4.0 + gc - rc)[is_b]
    h = (h / 6.0) % 1.0

    return np.stack([h, s, v], axis=-1)


def extract_image_features(img: Optional[Image.Image]) -> Dict[str, float]:
    """
    Compute the fixed set of handcrafted visual features for one PIL Image.
    Returns DEFAULT_FEATURES (unchanged) if img is None, so callers never
    need a separate "no image" code path.
    """
    if img is None:
        return dict(DEFAULT_FEATURES)

    try:
        rgb = _load_and_resize(img)
        gray = rgb.mean(axis=-1)
        hsv = _rgb_to_hsv_np(rgb / 255.0)

        w_px, h_px = img.size
        aspect_ratio = float(w_px) / float(h_px) if h_px > 0 else 1.0

        hue = hsv[..., 0] * 360.0
        is_warm = ((hue < 90) | (hue > 300)).astype(np.float64)
        warm_ratio = float(is_warm.mean())

        return {
            "img_brightness_mean": float(gray.mean()),
            "img_brightness_std": float(gray.std()),
            "img_saturation_mean": float(hsv[..., 1].mean() * 255.0),
            "img_saturation_std": float(hsv[..., 1].std() * 255.0),
            "img_colorfulness": _colorfulness(rgb),
            "img_edge_density": _edge_density(gray),
            "img_warm_ratio": warm_ratio,
            "img_aspect_ratio": aspect_ratio,
        }
    except Exception:
        # A corrupt/unreadable image should never crash a prediction --
        # fall back to neutral defaults, same as "no image supplied".
        return dict(DEFAULT_FEATURES)


def extract_from_path(path: str) -> Dict[str, float]:
    """Used by the training pipeline: reads an image file from disk."""
    try:
        with Image.open(path) as img:
            return extract_image_features(img)
    except Exception:
        return dict(DEFAULT_FEATURES)


def extract_from_base64(data_url_or_b64: str) -> Dict[str, float]:
    """
    Used by inference.py: accepts either a raw base64 string or a full
    data URL like 'data:image/png;base64,...' (what FileReader.readAsDataURL
    produces in the frontend).
    """
    if not data_url_or_b64:
        return dict(DEFAULT_FEATURES)
    try:
        raw = data_url_or_b64
        if "," in raw and raw.strip().lower().startswith("data:"):
            raw = raw.split(",", 1)[1]
        img_bytes = base64.b64decode(raw)
        with Image.open(io.BytesIO(img_bytes)) as img:
            return extract_image_features(img)
    except Exception:
        return dict(DEFAULT_FEATURES)