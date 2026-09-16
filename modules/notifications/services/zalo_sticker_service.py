import os
import random
from pathlib import Path
from functools import lru_cache

# Danh sách fallback tĩnh nếu không đọc được từ zalo_stickers.txt
_FALLBACK_NORMAL_STICKERS: tuple[str, ...] = (
    "9eb3a59c99d9708729c8",
    "5cb6159929dcc08299cd",
    "8658b2778e32676c3e23",
    "53084f6472219b7fc230",
    "2dcb3aa707e2eebcb7f3",
    "7b2e9e73a2364b681227",
    "fb8204df389ad1c4888b",
    "961a76474a02a35cfa13",
    "b572512f6d6a8434dd7b",
    "a28205d03995d0cb8984",
    "c0d266805ac5b39bead4",
    "0f0345b679f390adc9e2",
    "22e167545b11b24feb00",
    "6f7133c40f81e6dfbf90",
    "f92de19edddb34856dca",
    "49265f9563d08a8ed3c1",
    "f567dbd4e7910ecf5780",
    "5ec0127c2e39c7679e28",
    "8594b0288c6d65333c7c",
)

_FALLBACK_ANGRY_STICKERS: tuple[str, ...] = (
    # Giận Rồi Nha
    "44fe3e760233eb6db222",
    "5987220f1e4af714ae5b",
    "45a3312b0d6ee430bd7f",
    "cd13b89b84de6d8034cf",
    "0ed3785b441ead40f40f",
    "aa7fddf7e1b208ec51a3",
    "0f817f09434caa12f35d",
    "b6d8c750fb15124b4b04",
    "535321db1d9ef4c0ad8f",
    "f03483bcbff956a70fe8",
    "fa2976a04ae5a3bbfaf4",
    "d7945a1d66588f06d649",
    "1a5394daa89f41c1188e",
    "f3537cda409fa9c1f08e",
    "7081f808c44d2d13745c",
    "d6465fcf638a8ad4d39b",
    "8984030d3f48d6168f59",
    "b57c3ef502b0ebeeb2a1",
    "09348dbdb1f858a601e9",
    "08918d18b15d5803014c",
    # Thỏ Cáu Kỉnh
    "c70c9753ab1642481b07",
    "9bd2ca8df6c81f9646d9",
    "318063df5f9ab6c4ef8b",
    "cd0e9e51a2144b4a1205",
    "e0958ccab08f59d1009e",
    "048169de559bbcc5e58a",
    "92effcb0c0f529ab70e4",
    "1c9773c84f8da6d3ff9c",
    "c875a02a9c6f75312c7e",
    "0d266479583cb162e82d",
    "4cd3268c1ac9f397aad8",
    "423929661523fc7da532",
    # Zookiz Cục Súc
    "878eaed692937bcd2282",
    "e940c318ff5d16034f4c",
    "2cab07f33bb6d2e88ba7",
    "6bb04fe873ad9af3c3bc",
    "a8158d4db10858560119",
    "40df66875ac2b39cead3",
    "adc38a9bb6de5f8006cf",
    "65dd458579c0909ec9d1",
    "d8d7f98fc5ca2c9475db",
    "d300f158cd1d24437d0c",
    "84e5a7bd9bf872a62be9",
    "0a8536dd0a98e3c6ba89",
    # Kim & Yim Nóng Nảy
    "906450386c7d8523dc6c",
    "75f2b4ae88eb61b538fa",
    "f6e034bc08f9e1a7b8e8",
    "0a2cc970f5351c6b4524",
    "093cd560e925007b5934",
    "c2f11fad23e8cab693f9",
    "3832e66eda2b33756a3a",
    "9e3841647d21947fcd30",
    # Bà Già Kêu Ca
    "ed21cea3f2e61bb842f7",
    "6a3f56bd6af883a6dae9",
    "7b9d461f7a5a9304ca4b",
    "2dce134c2f09c6579f18",
    "193126b31af6f3a8aae7",
)


@lru_cache(maxsize=1)
def load_stickers_from_file() -> tuple[tuple[str, ...], tuple[str, ...]]:
    """Đọc danh sách sticker từ zalo_stickers.txt nếu có."""
    search_paths = [
        Path.cwd() / "zalo_stickers.txt",
        Path(__file__).resolve().parents[3] / "zalo_stickers.txt",
    ]

    for p in search_paths:
        if p.is_file():
            try:
                normals: list[str] = []
                angrys: list[str] = []
                current_section = "NORMAL"

                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        stripped = line.strip()
                        if not stripped or stripped.startswith("#"):
                            continue
                        if stripped.startswith("[") and stripped.endswith("]"):
                            sec = stripped[1:-1].strip().upper()
                            if "ANGRY" in sec or "DEADLINE" in sec:
                                current_section = "ANGRY"
                            else:
                                current_section = "NORMAL"
                            continue
                        
                        # Chỉ lấy alphanumeric id
                        token = stripped.split()[0].strip()
                        if token and len(token) >= 10:
                            if current_section == "ANGRY":
                                angrys.append(token)
                            else:
                                normals.append(token)

                if normals or angrys:
                    return (
                        tuple(normals) if normals else _FALLBACK_NORMAL_STICKERS,
                        tuple(angrys) if angrys else _FALLBACK_ANGRY_STICKERS,
                    )
            except Exception:
                pass

    return (_FALLBACK_NORMAL_STICKERS, _FALLBACK_ANGRY_STICKERS)


def get_normal_stickers() -> tuple[str, ...]:
    return load_stickers_from_file()[0]


def get_angry_stickers() -> tuple[str, ...]:
    return load_stickers_from_file()[1]


def is_deadline_or_urgent(event_type: str = "", title: str = "", content: str = "") -> bool:
    """Kiểm tra xem nội dung thông báo có liên quan tới hạn chót, trễ hạn, giục giã không."""
    urgent_event_types = {
        "task_overdue",
        "task_due_soon",
        "deadline_reminder",
        "overdue_reminder",
        "deadline",
        "overdue",
    }
    if event_type.lower() in urgent_event_types:
        return True

    text_to_check = f"{event_type} {title} {content}".lower()
    urgent_keywords = [
        "quá hạn",
        "trễ hạn",
        "trễ",
        "chậm trễ",
        "muộn",
        "sắp đến hạn",
        "sắp hết hạn",
        "hạn hoàn thành",
        "hạn chót",
        "deadline",
        "nhắc deadline",
        "khẩn cấp",
        "gấp",
    ]
    return any(kw in text_to_check for kw in urgent_keywords)


def get_random_normal_sticker() -> str:
    stickers = get_normal_stickers()
    return random.choice(stickers)


def get_random_angry_sticker() -> str:
    stickers = get_angry_stickers()
    return random.choice(stickers)


def get_sticker_for_notification(
    event_type: str = "",
    title: str = "",
    content: str = "",
    default_sticker_id: str | None = None,
) -> str:
    """Lấy sticker phù hợp theo ngữ cảnh thông báo.
    
    - Nếu đã có default_sticker_id: dùng default_sticker_id
    - Nếu là trễ hạn, nhắc deadline: chọn ngẫu nhiên sticker tức giận / giận dỗi
    - Ngược lại: chọn ngẫu nhiên sticker bình thường
    """
    if default_sticker_id:
        return default_sticker_id

    if is_deadline_or_urgent(event_type, title, content):
        return get_random_angry_sticker()

    return get_random_normal_sticker()
