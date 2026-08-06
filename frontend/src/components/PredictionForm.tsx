import React from "react";
import type { PredictionFormState } from "../types";


interface PredictionFormProps {
  predictionInput: PredictionFormState;

  onInputChange: React.Dispatch<
    React.SetStateAction<PredictionFormState>
  >;

  onRunPrediction: () => void;

  loading: boolean;

  error: string;
}

export default function PredictionForm({
  predictionInput,
  onInputChange,
  onRunPrediction,
  loading,
  error,
}: PredictionFormProps) {
  const updateField = (
  field: keyof PredictionFormState,
  value: string | number | File | null
) => {
    onInputChange((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">

        <h1 className="text-2xl font-bold text-white mb-6">
          AI Virality Prediction Engine
        </h1>

        {error && (
          <div className="mb-5 rounded-lg bg-red-500/20 border border-red-500 p-4 text-red-300">
            {error}
          </div>
        )}

 <div>
  <label className="block text-sm text-zinc-400 mb-2">
    Upload Image
  </label>

  <input
    type="file"
    accept="image/*"
    onChange={(e) =>
      updateField(
        "image",
        e.target.files ? e.target.files[0] : null
      )
    }
    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white file:mr-4 file:rounded-md file:border-0 file:bg-purple-600 file:px-4 file:py-2 file:text-white hover:file:bg-purple-700"
  />

  {predictionInput.image && (
    <div className="mt-4">
      <img
        src={URL.createObjectURL(predictionInput.image)}
        alt="Preview"
        className="max-h-64 w-full rounded-lg border border-zinc-700 object-cover"
      />
    </div>
  )}
</div>

        {/* Caption */}

        <div className="mb-5">
          <label className="block text-sm text-zinc-400 mb-2">
            Caption
          </label>

          <textarea
            rows={4}
            value={predictionInput.caption}
            onChange={(e) =>
              updateField("caption", e.target.value)
            }
            placeholder="Write your caption..."
            className="w-full rounded-lg bg-zinc-950 border border-zinc-700 p-3 text-white"
          />
        </div>

        {/* Followers & Likes */}

        <div className="grid grid-cols-2 gap-4 mb-5">

          <div>
            <label className="block text-sm text-zinc-400 mb-2">
              Followers
            </label>

            <input
              type="number"
              value={predictionInput.follower_count}
              onChange={(e) =>
                updateField(
                  "follower_count",
                  Number(e.target.value)
                )
              }
              className="w-full rounded-lg bg-zinc-950 border border-zinc-700 p-3"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">
              Early Likes
            </label>

            <input
              type="number"
              value={predictionInput.early_likes}
              onChange={(e) =>
                updateField(
                  "early_likes",
                  Number(e.target.value)
                )
              }
              className="w-full rounded-lg bg-zinc-950 border border-zinc-700 p-3"
            />
          </div>

        </div>

        {/* Platform */}

        <div className="mb-5">

          <label className="block text-sm text-zinc-400 mb-2">
            Platform
          </label>

          <select
            value={predictionInput.platform}
            onChange={(e) =>
              updateField("platform", e.target.value)
            }
            className="w-full rounded-lg bg-zinc-950 border border-zinc-700 p-3"
          >
            <option>Instagram</option>
            <option>Facebook</option>
            <option>Twitter / X</option>
            <option>LinkedIn</option>
          </select>

        </div>

        {/* Category */}

        <div className="mb-5">

          <label className="block text-sm text-zinc-400 mb-2">
            Content Category
          </label>

          <select
            value={predictionInput.content_category}
            onChange={(e) =>
              updateField(
                "content_category",
                e.target.value
              )
            }
            className="w-full rounded-lg bg-zinc-950 border border-zinc-700 p-3"
          >
            <option>Lifestyle</option>
            <option>Technology</option>
            <option>Fitness</option>
            <option>Education</option>
            <option>Travel</option>
            <option>Business</option>
            <option>Entertainment</option>
          </select>

        </div>

        {/* Post Hour */}

<div>
  <label className="block text-sm text-zinc-400 mb-2">
    Posting Time
  </label>

  <input
    type="number"
    min={0}
    max={23}
    placeholder="Enter hour (e.g. 18)"
    value={predictionInput.post_hour}
    onChange={(e) =>
      updateField("post_hour", Number(e.target.value))
    }
    className="w-full rounded-lg bg-zinc-950 border border-zinc-700 p-3 text-white focus:border-purple-500 focus:outline-none"
  />
</div>

<div>
  <label className="block text-sm text-zinc-400 mb-2">
    Keywords / Hashtags
  </label>

  <textarea
    rows={3}
    placeholder="fitness, gym, workout, #fitness #viral"
    value={predictionInput.keywords}
    onChange={(e) =>
      updateField("keywords", e.target.value)
    }
    className="w-full rounded-lg bg-zinc-950 border border-zinc-700 p-3"
  />
</div>

        <button
          onClick={onRunPrediction}
          disabled={loading}
          className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 py-3 font-semibold transition disabled:opacity-50"
        >
          {loading ? "Predicting..." : "Predict Virality"}
        </button>

      </div>
    </div>
  );
}