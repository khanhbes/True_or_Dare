#!/usr/bin/env python3
"""Build a checksummed .todbackup.zip without modifying the forensic source."""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


CATALOG_KEYS = {
    "customCards": "tod_couples_custom_cards",
    "editedCards": "tod_couples_edited_cards",
    "deletedSystemCardIds": "tod_couples_deleted_system_cards",
    "progressionConfig": "tod_couples_progression_config",
    "luxuryProgressionConfig": "tod_couples_luxury_progression_config",
}
EXPECTED = {"customCards": 51, "editedCards": 38, "deletedSystemCardIds": 2, "assets": 43}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True).encode("utf-8")


def configure_ccl(ccl_root: Path) -> None:
    candidates = [ccl_root / "ccl_chromium_reader", ccl_root / "ccl_simplesnappy", ccl_root / "deps"]
    missing = [str(path) for path in candidates if not path.exists()]
    if missing:
        raise FileNotFoundError(f"Thiếu công cụ forensic: {', '.join(missing)}")
    sys.path[:0] = [str(path) for path in candidates]


def read_local_storage(leveldb: Path, origin: str) -> dict[str, Any]:
    from ccl_chromium_reader import ccl_chromium_localstorage  # type: ignore

    latest: dict[str, tuple[int, str]] = {}
    with ccl_chromium_localstorage.LocalStoreDb(leveldb) as database:
        for record in database.iter_all_records():
            if record.storage_key != origin or record.script_key not in CATALOG_KEYS.values():
                continue
            current = latest.get(record.script_key)
            if current is None or record.leveldb_seq_number > current[0]:
                latest[record.script_key] = (record.leveldb_seq_number, record.value)
    missing = [key for key in CATALOG_KEYS.values() if key not in latest]
    if missing:
        raise ValueError(f"Thiếu localStorage keys: {', '.join(missing)}")
    result: dict[str, Any] = {}
    for output_key, storage_key in CATALOG_KEYS.items():
        result[output_key] = json.loads(latest[storage_key][1])
    return result


def read_indexeddb(leveldb: Path, blob_dir: Path) -> dict[str, bytes]:
    from ccl_chromium_reader import ccl_chromium_indexeddb  # type: ignore

    newest: dict[str, tuple[int, bytes]] = {}
    with ccl_chromium_indexeddb.WrappedIndexDB(leveldb, blob_dir) as wrapper:
        for database_id in wrapper.database_ids:
            database = wrapper[database_id.dbid_no]
            for store_name in database.object_store_names:
                store = database[store_name]
                for record in store.iterate_records():
                    key = record.key.value
                    if not isinstance(key, str) or not key.startswith("card-image:") or not record.is_live:
                        continue
                    try:
                        with record.get_blob_stream(record.value) as stream:
                            content = stream.read()
                    except (AttributeError, TypeError, FileNotFoundError):
                        continue
                    current = newest.get(key)
                    if current is None or record.ldb_seq_no > current[0]:
                        newest[key] = (record.ldb_seq_no, content)
    return {key: value[1] for key, value in newest.items()}


def image_type(content: bytes) -> tuple[str, str]:
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", "png"
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", "jpg"
    if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return "image/webp", "webp"
    if content.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif", "gif"
    guessed = mimetypes.guess_type("asset.bin")[0] or "application/octet-stream"
    return guessed, "bin"


def referenced_image_ids(cards: list[dict[str, Any]]) -> set[str]:
    return {
        card["customImageId"]
        for card in cards
        if isinstance(card, dict) and isinstance(card.get("customImageId"), str)
    }


def recover_unmapped_blob(images: dict[str, bytes], blob_dir: Path, expected_refs: set[str]) -> None:
    """Recover a blob whose old IndexedDB pointer was pruned but byte file remains.

    Chromium may keep only the newest blob files while the forensic parser resolves
    one duplicated key through an older external-object pointer. We only map an
    orphan automatically when the missing-reference/orphan relationship is unique.
    """
    missing = sorted(expected_refs - images.keys())
    if not missing:
        return
    known_hashes = {sha256(content) for content in images.values()}
    orphan_files = [
        path for path in blob_dir.rglob("*")
        if path.is_file() and sha256(path.read_bytes()) not in known_hashes
    ]
    if len(missing) == 1 and len(orphan_files) == 1:
        images[missing[0]] = orphan_files[0].read_bytes()


def validate_catalog(data: dict[str, Any], images: dict[str, bytes]) -> set[str]:
    for key in ("customCards", "editedCards", "deletedSystemCardIds"):
        if not isinstance(data.get(key), list):
            raise ValueError(f"{key} không phải mảng")
    for collection in (data["customCards"], data["editedCards"]):
        ids = [card.get("id") for card in collection if isinstance(card, dict)]
        if len(ids) != len(collection) or len(ids) != len(set(ids)) or any(not item for item in ids):
            raise ValueError("Có card thiếu ID hoặc trùng ID")
    refs = referenced_image_ids(data["customCards"] + data["editedCards"])
    missing = sorted(refs - images.keys())
    if missing:
        raise ValueError(f"Thiếu {len(missing)} ảnh được tham chiếu: {', '.join(missing[:5])}")
    counts = {
        "customCards": len(data["customCards"]),
        "editedCards": len(data["editedCards"]),
        "deletedSystemCardIds": len(data["deletedSystemCardIds"]),
        "assets": len(refs),
    }
    if counts != EXPECTED:
        raise ValueError(f"Số lượng phục hồi không khớp: {counts}, cần {EXPECTED}")
    return refs


def build_backup(source: Path, output: Path, ccl_root: Path, origin: str) -> None:
    configure_ccl(ccl_root)
    data = read_local_storage(source / "leveldb", origin)
    images = read_indexeddb(
        source / "http_192.168.1.9_3000.indexeddb.leveldb",
        source / "http_192.168.1.9_3000.indexeddb.blob",
    )
    all_refs = referenced_image_ids(data["customCards"] + data["editedCards"])
    recover_unmapped_blob(
        images,
        source / "http_192.168.1.9_3000.indexeddb.blob",
        all_refs,
    )
    refs = validate_catalog(data, images)
    created_at = datetime.now(timezone.utc).isoformat()
    assets: list[dict[str, Any]] = []
    asset_files: dict[str, bytes] = {}
    for image_id in sorted(refs):
        content = images[image_id]
        digest = sha256(content)
        mime_type, extension = image_type(content)
        path = f"assets/{digest}.{extension}"
        asset_files[path] = content
        assets.append({
            "id": image_id,
            "sha256": digest,
            "mimeType": mime_type,
            "size": len(content),
        })
    bundle = {
        "schemaVersion": 1,
        "createdAt": created_at,
        "sourceOrigin": origin,
        "customCards": data["customCards"],
        "editedCards": data["editedCards"],
        "deletedSystemCardIds": data["deletedSystemCardIds"],
        "progressionConfig": data["progressionConfig"],
        "luxuryProgressionConfig": data["luxuryProgressionConfig"],
        "assets": assets,
    }
    bundle_content = json_bytes(bundle)
    manifest = {
        "format": "todbackup",
        "version": 1,
        "createdAt": created_at,
        "sourceReadOnly": str(source.resolve()),
        "sourceOrigin": origin,
        "counts": {
            "systemCards": 108,
            "customCards": len(data["customCards"]),
            "editedCards": len(data["editedCards"]),
            "deletedSystemCards": len(data["deletedSystemCardIds"]),
            "assets": len(assets),
            "visibleCards": 108 - len(data["deletedSystemCardIds"]) + len(data["customCards"]),
        },
        "checksums": {
            "bundle.json": sha256(bundle_content),
            **{name: sha256(content) for name, content in asset_files.items()},
        },
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        archive.writestr("manifest.json", json_bytes(manifest))
        archive.writestr("bundle.json", bundle_content)
        for name, content in asset_files.items():
            archive.writestr(name, content)
    print(json.dumps({"output": str(output), **manifest["counts"], "sha256": sha256(output.read_bytes())}, ensure_ascii=False))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--ccl-root", type=Path, required=True)
    parser.add_argument("--origin", default="http://192.168.1.9:3000")
    args = parser.parse_args()
    build_backup(args.source, args.output, args.ccl_root, args.origin)


if __name__ == "__main__":
    main()
