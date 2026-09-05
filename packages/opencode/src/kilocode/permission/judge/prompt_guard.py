"""Local Prompt Guard 2 ONNX classifier. Install onnxruntime, tokenizers, numpy."""

import argparse
import json
from pathlib import Path
from http.server import BaseHTTPRequestHandler, HTTPServer


MODEL = "meta-llama/Llama-Prompt-Guard-2-86M"


def classify(text, tokenizer, model):
    import numpy as np

    encoded = tokenizer.encode(text)
    chunks = [encoded, *encoded.overflowing]
    scores = []
    for chunk in chunks:
        logits = model.run(["logits"], {
            "input_ids": np.asarray([chunk.ids], dtype=np.int64),
            "attention_mask": np.asarray([chunk.attention_mask], dtype=np.int64),
        })[0]
        weights = np.exp(logits - logits.max(axis=-1, keepdims=True))
        scores.append(float((weights / weights.sum(axis=-1, keepdims=True))[0, 1]))
    if not all(np.isfinite(score) for score in scores):
        raise RuntimeError("Non-finite classifier output")
    return {"model": MODEL, "score": max(scores), "chunks": len(scores)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--model", required=True, type=Path, help="Prompt Guard 2 86M ONNX file; config.json and tokenizer.json must be alongside it")
    args = parser.parse_args()
    import onnxruntime
    from tokenizers import Tokenizer

    config = json.loads(args.model.with_name("config.json").read_text(encoding="utf-8"))
    if config.get("_name_or_path") != MODEL or config.get("id2label") != {"0": "BENIGN", "1": "MALICIOUS"}:
        raise ValueError("Expected Prompt Guard 2 86M with BENIGN=0, MALICIOUS=1")
    tokenizer = Tokenizer.from_file(str(args.model.with_name("tokenizer.json")))
    tokenizer.enable_truncation(max_length=512, stride=128)
    model = onnxruntime.InferenceSession(str(args.model), providers=["CPUExecutionProvider"])
    if model.get_outputs()[0].shape[-1] != 2:
        raise ValueError("Expected binary classifier logits")

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path != "/classify":
                self.send_error(404)
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 1_000_000:
                    self.send_error(413)
                    return
                data = json.loads(self.rfile.read(length))
                if not isinstance(data, dict) or set(data) != {"text"} or not isinstance(data["text"], str) or not data["text"]:
                    self.send_error(400)
                    return
                result = classify(data["text"], tokenizer, model)
                body = json.dumps(result).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except (ValueError, TypeError):
                self.send_error(400)
            except Exception:
                self.log_error("Classifier inference failed")
                self.send_error(503)

    print(f"Prompt Guard 2 ready on http://127.0.0.1:{args.port}/classify", flush=True)
    HTTPServer(("127.0.0.1", args.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
