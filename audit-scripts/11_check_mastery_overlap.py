#!/usr/bin/env python3
"""Check overlap between deletion plan and student mastery records."""
import json, csv
from pathlib import Path

OUT = Path(__file__).parent.parent / "PHASE-2-CLEANUP"

# Load bucket A (safe to delete)
bucket_a_ids = set()
with open(OUT / 'bucket-A-safe-to-delete.csv', 'r', encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        bucket_a_ids.add(row['vocab_id'])

# Load bucket B (needs review)
bucket_b_ids = set()
with open(OUT / 'bucket-B-needs-review.csv', 'r', encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        bucket_b_ids.add(row['vocab_id'])

# Mastery vocab IDs (from DB query — L1 and L3 only)
mastery_ids = set([
    "304d0303-11cd-4726-b885-c833414b9cca", "67afddfe-840e-4f97-b1db-6ad2c4de27a8",
    "264e74af-5f7b-43c7-8686-0db4ec55e646", "ebcd74f6-c264-4700-9411-5b691026f9c6",
    "eb104056-e700-48d5-b9dd-c98828787a12", "e52967e8-2dbc-4072-8036-6ff19a0db8b7",
    "640d8946-a5b7-4e24-b80f-884775edccb0", "6bec16a0-dd4e-41cd-8f5a-b5df517971d4",
    "6b3683aa-3907-4a46-b73c-f31193887330", "4f84a070-7c70-4173-89a3-0eec2d5abe39",
    "cc3bc7a7-508c-46c8-96b8-09878547b0a4", "f2b87492-a004-4298-903e-0d13499e528f",
    "96cb50e3-d068-425a-94ae-a3a4b6b29b59", "5d012cd3-0561-4320-8a62-4a442bc32c1f",
    "f9136bcc-d0c4-48cb-898c-72ca15595e4f", "74a57c91-1d73-4259-b655-49bebb10cb9e",
    "7801c80c-b5ef-426a-b4cc-2157c03cae2a", "eb8856d4-ea3c-4760-a790-dd1e4d41ae44",
    "b4d7b580-37af-4760-9cce-bfc533f3e5ce", "ffcb3f4d-535b-49b2-8b92-f5463faeb89a",
    "2e819138-3dae-40b0-a985-ddc3ef3f7f84", "823d1b36-376a-4cdc-b97f-6540ab96d524",
    "d71d6b12-cde3-47b5-819b-fb10ee9b24ed", "f2ee5721-fef6-4c72-af46-e51ca88139a1",
    "ec09ffdd-626d-45a1-98d5-e00a8ec1b603", "853aa9b1-cba7-4d4f-8f66-514182c562dc",
    "357586e5-fa6f-4eef-a710-70f5ee14cd39", "bb65ead3-d6ff-409c-9ed8-5bf03fea842f",
    "82a11622-9bfc-4637-b7e6-049283cacbce", "3c296cdd-aa6d-45aa-af97-b1573874e621",
    "56fee195-8e8a-43a1-91c2-804fa65caca2", "1daea946-5f94-43ca-8a3e-12b3d3bc2beb",
    "5fdcdfd7-351c-4fa6-847f-d5e106916827", "125ea0ea-03f6-47ee-970e-1e0a428d1619",
    "fa2f446f-6a41-4182-90ff-10615c9932a4", "dae36dc5-e8e9-4242-8b07-dd1f09f60e90",
    "34d749e9-18f6-47ac-ba95-54b1bf061578", "ef842995-b83c-472a-8d06-3c045f0eca99",
    "b38f49fc-35d7-47ee-8666-c6bbbd9e1094", "d010ba49-5f19-4d16-9c8f-7f1b0ddefdcf",
    "835c1612-8947-4afa-a41e-f26b1f8c0341", "0d2605b9-6a56-4b67-96a7-bce8e7fb4bd6",
    "ebb677e8-8201-4891-938e-db11a754945f", "994df41a-94f1-4fa4-85a5-0be6894a8989",
    "ef3870ea-fa6e-4f73-a808-a214d07633b9", "538533ef-70c9-46bc-98ad-035e073b54d6",
    "076d1f5d-a67c-4a56-aa71-eb34e1c10b56", "1dc9def6-3724-4102-8d60-2c2d53c6624a",
    "55addb56-629e-4393-9c7d-07a4a9d2e169", "6b87921f-699d-4060-8a44-22a2ba04d038",
    "119978d9-4dac-4e31-aaf6-f7377dd5fa8b", "9bb907b9-c877-4091-bc32-1be9348668f7",
    "fa720dad-6b2d-466b-9e84-d25a5b958dec", "f53d7cd1-a71f-4e90-afc2-7606da67db04",
    "1b9772cc-5f4a-480a-bfd0-168ad117f0d7", "0ee79157-a89b-404a-b628-636982b53923",
    "e44a4f5a-2926-4f78-94b5-6ffa4217b376", "3b0785f7-4afb-4a68-816b-87ececfa13b6",
    "cb6a98a8-8d6f-46b8-90fb-141220d77d92", "fe767f6b-f137-479a-b66a-0b7230431597",
    "9b0da77b-720d-41fd-9e27-592fa0efc8a7", "84150772-7dc0-4fca-b60d-417c8009c26e",
    "69426f58-5045-4d17-b54d-3ac2a790020d", "ff8a1a8c-6379-4350-97dd-86708f56fdc8",
    "ff3ea02f-ec65-43a3-b796-2ef6390ac64a", "1470dc5f-e2d9-4397-8e2e-6935e2f46ccb",
    "a891ea78-d0b6-4613-b34e-a827cb6833ae", "4d8dcb26-e46c-43f9-b55a-498e29f85f34",
    "57ed0be7-5753-47e8-8133-a6e260eb80a1", "cc8b4523-46a2-4d66-ada3-3518ac65a265",
    "e8a777c6-fb7b-486b-8fa4-485ef2dfb2c1", "d1bdfd11-8cc9-4ac0-ad5f-bfb737b711f2",
    "fa3c370f-ed5f-4fac-8fca-16a0b3c6ff14", "d69b575a-25e1-4ac5-be2e-a9f40a1876b9",
    "98a6d2ca-1869-4f80-af7d-ee6bf8f49b3a", "edde355a-3464-4e22-a4a3-2b33a5819392",
    "9aa15b37-4468-4a20-bbf4-a8cf85a662ec", "705e7c9d-c195-4f42-9220-95f19e1ad3ca",
])

overlap_a = bucket_a_ids & mastery_ids
overlap_b = bucket_b_ids & mastery_ids

print(f"Bucket A IDs: {len(bucket_a_ids)}")
print(f"Bucket B IDs: {len(bucket_b_ids)}")
print(f"Mastery IDs (unique): {len(mastery_ids)}")
print(f"Overlap A ∩ Mastery: {len(overlap_a)} (WOULD NEED MIGRATION)")
print(f"Overlap B ∩ Mastery: {len(overlap_b)} (PENDING REVIEW)")
if overlap_a:
    print(f"  Affected IDs in Bucket A: {overlap_a}")
if overlap_b:
    print(f"  Affected IDs in Bucket B: {overlap_b}")

# Write student work migration plan
with open(OUT / 'student-work-migration-plan.csv', 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['vocab_id_to_delete', 'bucket', 'in_mastery', 'action'])
    for vid in overlap_a:
        writer.writerow([vid, 'A', 'YES', 'Migrate mastery to kept duplicate before deleting'])
    for vid in overlap_b:
        writer.writerow([vid, 'B', 'YES', 'If Ali approves deletion: migrate mastery first'])
    if not overlap_a and not overlap_b:
        writer.writerow(['NONE', '-', '-', 'No mastery records affected by planned deletions'])

print(f"\nstudent-work-migration-plan.csv written")
