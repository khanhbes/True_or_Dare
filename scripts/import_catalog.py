#!/usr/bin/env python3
"""Validate a .todbackup.zip and send it to the protected catalog import API."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import urllib.error
import urllib.request
import zipfile
from pathlib import Path
from typing import Any


def sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def load_bundle(path: Path) -> dict[str, Any]:
    with zipfile.ZipFile(path) as archive:
        manifest = json.loads(archive.read("manifest.json"))
        for filename, expected in manifest.get("checksums", {}).items():
            if sha256(archive.read(filename)) != expected:
                raise ValueError(f"Checksum sai: {filename}")
        bundle = json.loads(archive.read("bundle.json"))
        for asset in bundle.get("assets", []):
            prefix = f"assets/{asset['sha256']}."
            candidates = [name for name in archive.namelist() if name.startswith(prefix)]
            if len(candidates) != 1:
                raise ValueError(f"Không tìm thấy đúng một file cho ảnh {asset['id']}")
            content = archive.read(candidates[0])
            if len(content) != asset["size"] or sha256(content) != asset["sha256"]:
                raise ValueError(f"Ảnh sai checksum: {asset['id']}")
            asset["dataBase64"] = base64.b64encode(content).decode("ascii")
        return bundle


def post_json(url: str, payload: dict[str, Any], access_token: str | None) -> dict[str, Any]:
    headers = {"content-type": "application/json", "accept": "application/json"}
    if access_token:
        headers["cf-access-token"] = access_token
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers=headers,
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code}: {body}") from error


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("backup", type=Path)
    parser.add_argument("--base-url", default="http://127.0.0.1:8788")
    parser.add_argument("--access-token", help="Cloudflare Access service token, nếu môi trường yêu cầu")
    parser.add_argument("--apply", action="store_true", help="Thực sự nhập sau dry-run")
    parser.add_argument("--replace", action="store_true", help="Thay catalog đã seed; server tự backup trước")
    args = parser.parse_args()
    bundle = load_bundle(args.backup)
    endpoint = f"{args.base_url.rstrip('/')}/api/admin/import"
    dry_run = post_json(endpoint, {"bundle": bundle, "dryRun": True, "replace": args.replace}, args.access_token)
    print(json.dumps({"dryRun": dry_run}, ensure_ascii=False))
    if args.apply:
        result = post_json(endpoint, {"bundle": bundle, "dryRun": False, "replace": args.replace}, args.access_token)
        print(json.dumps({"import": result}, ensure_ascii=False))


if __name__ == "__main__":
    main()
