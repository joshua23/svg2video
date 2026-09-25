"""阿凡提对白合成：离线 FastSpeech2 + MB-MelGAN（zhtts 包里自带的标贝中文模型）。

输入：scripts/afanti/lines.json（由 audio.mjs 从 plan.ts 导出）
输出：build/afanti/voice/<id>.wav（24kHz 单声道原始合成，变声在 audio.mjs 里用 JS 完成）

依赖：pip install zhtts --no-deps && pip install "tensorflow-cpu==2.15.1" "numpy<2" pypinyin
"""
import json
import os
import sys
import wave
from pathlib import Path

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
import numpy as np  # noqa: E402
import tensorflow as tf  # noqa: E402
import zhtts.tensorflow_tts as _tt  # noqa: E402  （只借用它的文本前端和模型文件）
from zhtts.tensorflow_tts.processor import BakerProcessor  # noqa: E402

ASSET = Path(_tt.__file__).parent.parent / "asset"
SR = 24000


def main(lines_json: str, out_dir: str) -> None:
    lines = json.loads(Path(lines_json).read_text(encoding="utf-8"))
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    proc = BakerProcessor(data_dir=None, loaded_mapper_path=ASSET / "baker_mapper.json")
    acoustic = tf.lite.Interpreter(model_path=str(ASSET / "fastspeech2_quan.tflite"))
    vocoder = tf.lite.Interpreter(model_path=str(ASSET / "mb_melgan.tflite"))

    def synth(text: str, speed: float, f0: float, energy: float) -> np.ndarray:
        ids = proc.text_to_sequence(text, inference=True)
        ind = acoustic.get_input_details()
        acoustic.resize_tensor_input(ind[0]["index"], [1, len(ids)])
        acoustic.allocate_tensors()
        data = [
            np.array([ids], np.int32),
            np.array([0], np.int32),
            np.array([speed], np.float32),
            np.array([f0], np.float32),
            np.array([energy], np.float32),
        ]
        for i, d in enumerate(ind):
            acoustic.set_tensor(d["index"], data[i])
        acoustic.invoke()
        mel = acoustic.get_tensor(acoustic.get_output_details()[1]["index"])
        vi = vocoder.get_input_details()
        vocoder.resize_tensor_input(vi[0]["index"], mel.shape)
        vocoder.allocate_tensors()
        vocoder.set_tensor(vi[0]["index"], mel)
        vocoder.invoke()
        return vocoder.get_tensor(vocoder.get_output_details()[0]["index"])[0, :, 0]

    for ln in lines:
        audio = np.clip(synth(ln["say"], ln["speed"], ln["f0"], ln["energy"]), -1, 1)
        path = out / f"{ln['id']}.wav"
        with wave.open(str(path), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((audio * 32767).astype(np.int16).tobytes())
        print(f"{ln['id']}  {len(audio) / SR:5.2f}s  {ln['say']}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
