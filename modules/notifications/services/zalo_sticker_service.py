import os
import random
from pathlib import Path
from functools import lru_cache
from typing import Dict, List, Tuple


# ==============================================================================
# FALLBACK CLUSTERS NẾU KHÔNG TÌM THẤY zalo_stickers.txt
# ==============================================================================
_FALLBACK_NORMAL_CLUSTERS: Dict[str, Tuple[str, ...]] = {
    "BU_MAT_NGAO": (
        "e485deaae2ef0bb152fe", "9eb3a59c99d9708729c8", "8658b2778e32676c3e23",
        "57f962d65e93b7cdee82", "ba328c1db05859060049", "b3ed84c2b88751d90896",
        "b5d785f8b9bd50e309ac", "9d03ac2c906979372078", "1a8828a714e2fdbca4f3",
        "4f517c7e403ba965f02a", "23516f7e533bba65e32a", "b155fc7ac03f2961702e",
        "193f57106b55820bdb44", "b214fd3bc17e2820716f", "4d0e05213964d03a8975",
        "5cb6159929dcc08299cd", "cfea85c5b98050de0991", "1965524a6e0f8751de1e",
        "b54ff160cd25247b7d34", "13b4569b6ade8380dacf",
    ),
    "CO_LO_DI_LAM": (
        "c8aecfc2f2871bd94296", "fdfbfb97c6d22f8c76c3", "7b317a5d4718ae46f709",
        "74d274be49fba0a5f9ea", "1fa81cc42181c8df9190", "704472284f6da633ff7c",
        "b43fa95394167d482407", "53084f6472219b7fc230", "84e79b8ba6ce4f9016df",
        "51384f5472119b4fc200", "ef7bf617cb52220c7b43", "cb22d34eee0b07555e1a",
        "133908553510dc4e8501", "96318c5db11858460109", "5c044968742d9d73c43c",
        "2efc3a9007d5ee8bb7c4", "2dcb3aa707e2eebcb7f3", "7f8169ed54a8bdf6e4b9",
        "10bd01d13c94d5ca8c85", "379127fd1ab8f3e6aaa9",
    ),
    "TROC_TRANG": (
        "b572512f6d6a8434dd7b", "7b2e9e73a2364b681227", "bb9b5dc6618388ddd192",
        "7577922aae6f47311e7e", "961a76474a02a35cfa13", "ea910bcc3789ded78798",
        "a657440a784f9111c85e", "1dbefee3c2a62bf872b7", "cdbb31e60da3e4fdbdb2",
        "aaf157ac6be982b7dbf8", "7f2e8173bd3654680d27", "fb8204df389ad1c4888b",
    ),
    "USAGYUUUN_RA_DE": (
        "5882fdd0c19528cb7184", "c0d266805ac5b39bead4", "a28205d03995d0cb8984",
        "107cb02e8c6b65353c7a", "1eb6bfe483a16aff33b0", "fd775f2563608a3ed371",
        "2649851bb95e5000094f", "c8e474b648f3a1adf8e2", "d49869ca558fbcd1e59e",
        "6fffd1adede804b65df9", "19c3a6919ad4738a2ac5", "2be893baafff46a11fee",
        "c19378c14484addaf495", "1677ac259060793e2071", "0876b3248f61663f3f70",
        "9c2a2878143dfd63a42c", "29d39c81a0c4499a10d5", "1a97acc5908079de2091",
        "dcfc6bae57ebbeb5e7fa", "50f0e0a2dce735b96cf6", "0132b0608c25657b3c34",
        "44d6f684cac1239f7ad0", "a61015422907c0599916",
    ),
    "USAGYUUUN": (
        "8d9ac22ffe6a17344e7b", "9d51d5e4e9a100ff59b0", "34a27d174152a80cf143",
        "0f0345b679f390adc9e2", "3bb170044c41a51ffc50", "e9b6ad03914678182157",
        "22e167545b11b24feb00", "89f5cf40f3051a5b4314", "675f20ea1caff5f1acbe",
        "5a3f1a8a26cfcf9196de", "558114342871c12f9860", "cf5a8defb1aa58f401bb",
        "7cff3f4a030fea51b31e", "6f7133c40f81e6dfbf90", "faf9a74c9b0972572b18",
        "b3b9ed0cd14938176158", "a4b4fb01c7442e1a7755", "9848c0fdfcb815e64ca9",
        "8f1ad6afeaea03b45afb", "10b94a0c76499f17c658", "fcefa75a9b1f72412b0e",
        "a570f1c5cd8024de7d91", "97bcc209fe4c17124e5d", "9d8bcb3ef77b1e25476a",
    ),
    "HAI_CAU_AZA": (
        "a468badb869e6fc0368f", "52504de371a698f8c1b7", "f92de19edddb34856dca",
        "ea1af3a9cfec26b27ffd", "82a79814a4514d0f1440", "f20ae9b9d5fc3ca265ed",
        "ec48f8fbc4be2de074af", "ede6f855c4102d4e7401", "49265f9563d08a8ed3c1",
        "515b46e87aad93f3cabc", "cb83db30e7750e2b5764", "c793d620ea65033b5a74",
        "e7f8f54bc90e2050791f", "11d9026a3e2fd7718e3e", "e15acde9f1ac18f241bd",
        "bc909123ad6644381d77", "f567dbd4e7910ecf5780", "7c4753f46fb186efdfa0",
        "898ba1389d7d74232d6c", "f048d9fbe5be0ce055af",
    ),
    "CON_MA_CON_MA": (
        "26851a39267ccf22966d", "ed9ad026ec63053d5c72", "83a7bd1b815e6800314f",
        "dc85e339df7c36226f6d", "ca4ff2f3ceb627e87ea7", "d3c1ea7dd6383f666629",
        "a7c49d78a13d4863112c", "9562aede929b7bc5228a", "7a0a4eb672f39badc2e2",
        "8594b0288c6d65333c7c", "4586733a4f7fa621ff6e", "2d3e1a8226c7cf9996d6",
        "8238b2848ec1679f3ed0", "3cd30d6f312ad874813b", "e74bd5f7e9b200ec59a3",
        "485f7be347a6aef8f7b7", "5ec0127c2e39c7679e28", "8f4fc2f3feb617e84ea7",
        "21026fbe53fbbaa5e3ea", "562f199325d6cc8895c7", "9a2dd291eed4078a5ec5",
        "dbe0925cae1947471e08", "565e1ce220a7c9f990b6", "8b4dc0f1fcb415ea4ca5",
        "13b7570b6b4e8210db5f", "e16ca4d0989571cb2884", "f2c8b4748831616f3820",
    ),
}

_FALLBACK_ANGRY_CLUSTERS: Dict[str, Tuple[str, ...]] = {
    "GIAN_ROI_NHA": (
        "44fe3e760233eb6db222", "5987220f1e4af714ae5b", "45a3312b0d6ee430bd7f",
        "cd13b89b84de6d8034cf", "0ed3785b441ead40f40f", "aa7fddf7e1b208ec51a3",
        "0f817f09434caa12f35d", "b6d8c750fb15124b4b04", "535321db1d9ef4c0ad8f",
        "f03483bcbff956a70fe8", "fa2976a04ae5a3bbfaf4", "d7945a1d66588f06d649",
        "1a5394daa89f41c1188e", "f3537cda409fa9c1f08e", "7081f808c44d2d13745c",
        "d6465fcf638a8ad4d39b", "8984030d3f48d6168f59", "b57c3ef502b0ebeeb2a1",
        "09348dbdb1f858a601e9", "08918d18b15d5803014c",
    ),
    "THO_CAU_KINH": (
        "c70c9753ab1642481b07", "9bd2ca8df6c81f9646d9", "318063df5f9ab6c4ef8b",
        "cd0e9e51a2144b4a1205", "e0958ccab08f59d1009e", "048169de559bbcc5e58a",
        "92effcb0c0f529ab70e4", "1c9773c84f8da6d3ff9c", "c875a02a9c6f75312c7e",
        "0d266479583cb162e82d", "4cd3268c1ac9f397aad8", "423929661523fc7da532",
    ),
    "THO_CAU_KINH_2": (
        "a43dc062fc2715794c36", "e4468119bd5c54020d4d", "a663c03cfc7915274c68",
        "b98bded4e2910bcf5280", "d3e6b3b98ffc66a23fed", "7a391b662723ce7d9732",
        "dc99bec682836bdd3292", "0eee6db151f4b8aae1e5", "aee7d2b8eefd07a35eec",
        "218e5cd1609489cad085", "af23d17ced3904675d28", "152d6a725637bf69e626",
    ),
    "ZOOKIZ_CUC_SUC": (
        "878eaed692937bcd2282", "e940c318ff5d16034f4c", "2cab07f33bb6d2e88ba7",
        "6bb04fe873ad9af3c3bc", "a8158d4db10858560119", "40df66875ac2b39cead3",
        "adc38a9bb6de5f8006cf", "65dd458579c0909ec9d1", "d8d7f98fc5ca2c9475db",
        "d300f158cd1d24437d0c", "84e5a7bd9bf872a62be9", "0a8536dd0a98e3c6ba89",
    ),
    "KIM_YIM_NONG_NAY": (
        "906450386c7d8523dc6c", "75f2b4ae88eb61b538fa", "f6e034bc08f9e1a7b8e8",
        "0a2cc970f5351c6b4524", "093cd560e925007b5934", "c2f11fad23e8cab693f9",
        "3832e66eda2b33756a3a", "9e3841647d21947fcd30", "6965b1398d7c64223d6d",
        "2c94f5c8c98d20d3799c", "02e2d8bee4fb0da554ea", "6a1ab1468d03645d3d12",
        "9c9148cd74889dd6c499", "4f619a3da6784f261669", "935d45017944901ac955",
        "4542921eae5b47051e4a", "389ce8c0d4853ddb6494", "c76516392a7cc3229a6d",
        "cd911fcd2388cad69399", "b566663a5a7fb321ea6e",
    ),
    "BA_GIA_KEU_CA": (
        "ed21cea3f2e61bb842f7", "6a3f56bd6af883a6dae9", "7b9d461f7a5a9304ca4b",
        "2dce134c2f09c6579f18", "193126b31af6f3a8aae7", "a20f9a8da6c84f9616d9",
        "689551176d52840cdd43", "180b22891eccf792aedd", "bfd18453b81651480807",
        "ff6bcbe9f7ac1ef247bd", "6c5559d765928cccd583", "1f2529a715e2fcbca5f3",
        "3e6609e435a1dcff85b0", "fc72ccf0f0b519eb40a4", "29a418262463cd3d9472",
        "4e977c154050a90ef041", "92b7a1359d70742e2d61", "92f6de74e2310b6f5220",
        "51671ce520a0c9fe90b1", "5daf132d2f68c6369f79",
    ),
}


@lru_cache(maxsize=1)
def load_clusters_from_file() -> Tuple[Dict[str, List[str]], Dict[str, List[str]]]:
    """Đọc danh sách sticker chia theo từng CỤM từ zalo_stickers.txt."""
    search_paths = [
        Path.cwd() / "zalo_stickers.txt",
        Path(__file__).resolve().parents[3] / "zalo_stickers.txt",
    ]

    for p in search_paths:
        if p.is_file():
            try:
                normals: Dict[str, List[str]] = {}
                angrys: Dict[str, List[str]] = {}
                current_cluster: str = ""
                is_angry: bool = False

                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        stripped = line.strip()
                        if not stripped or stripped.startswith("#"):
                            continue
                        if stripped.startswith("[") and stripped.endswith("]"):
                            sec = stripped[1:-1].strip().upper()
                            is_angry = ("ANGRY" in sec or "DEADLINE" in sec)
                            current_cluster = sec
                            target_dict = angrys if is_angry else normals
                            if current_cluster not in target_dict:
                                target_dict[current_cluster] = []
                            continue

                        token = stripped.split()[0].strip()
                        if token and len(token) >= 10:
                            target_dict = angrys if is_angry else normals
                            if not current_cluster:
                                current_cluster = "ANGRY_DEFAULT" if is_angry else "NORMAL_DEFAULT"
                                target_dict.setdefault(current_cluster, [])
                            target_dict[current_cluster].append(token)

                if normals or angrys:
                    norm_res = normals if normals else {k: list(v) for k, v in _FALLBACK_NORMAL_CLUSTERS.items()}
                    ang_res = angrys if angrys else {k: list(v) for k, v in _FALLBACK_ANGRY_CLUSTERS.items()}
                    return norm_res, ang_res
            except Exception:
                pass

    return (
        {k: list(v) for k, v in _FALLBACK_NORMAL_CLUSTERS.items()},
        {k: list(v) for k, v in _FALLBACK_ANGRY_CLUSTERS.items()},
    )


def get_normal_clusters() -> Dict[str, List[str]]:
    return load_clusters_from_file()[0]


def get_angry_clusters() -> Dict[str, List[str]]:
    return load_clusters_from_file()[1]


def get_normal_stickers() -> List[str]:
    """Trả về danh sách phẳng tất cả sticker bình thường."""
    clusters = get_normal_clusters()
    res: List[str] = []
    for stks in clusters.values():
        res.extend(stks)
    return res


def get_angry_stickers() -> List[str]:
    """Trả về danh sách phẳng tất cả sticker tức giận / deadline."""
    clusters = get_angry_clusters()
    res: List[str] = []
    for stks in clusters.values():
        res.extend(stks)
    return res


class LotoStickerPicker:
    """Quản lý việc bốc lô tô sticker theo từng cụm.
    
    Cơ chế Lô Tô Từng Cụm:
    1. Chọn ngẫu nhiên 1 CỤM (hoặc luân phiên giữa các cụm).
    2. Trong cụm đã chọn, bốc ngẫu nhiên (lô tô không lặp lại theo vòng) 1 con sticker.
    3. Đảm bảo sự đa dạng, không bị trùng sticker hay dồn vào 1 bộ duy nhất!
    """

    def __init__(self) -> None:
        self._normal_decks: Dict[str, List[str]] = {}
        self._angry_decks: Dict[str, List[str]] = {}
        self._last_normal_cluster: str | None = None
        self._last_angry_cluster: str | None = None

    def _draw_from_clusters(
        self, clusters: Dict[str, List[str]], decks: Dict[str, List[str]], last_cluster: str | None
    ) -> Tuple[str, str]:
        if not clusters:
            return "9eb3a59c99d9708729c8", "DEFAULT"

        cluster_names = list(clusters.keys())
        # Ưu tiên đổi sang cụm khác với cụm vừa bốc để đa dạng tối đa
        available_clusters = [c for c in cluster_names if c != last_cluster] if len(cluster_names) > 1 else cluster_names
        chosen_cluster = random.choice(available_clusters)

        # Lấy bộ bài (deck) của cụm này để bốc số lô tô
        if chosen_cluster not in decks or not decks[chosen_cluster]:
            deck = list(clusters[chosen_cluster])
            random.shuffle(deck)
            decks[chosen_cluster] = deck

        # Bốc 1 con sticker trong cụm
        stk_id = decks[chosen_cluster].pop()
        return stk_id, chosen_cluster

    def draw_normal(self) -> Tuple[str, str]:
        clusters = get_normal_clusters()
        stk_id, cluster = self._draw_from_clusters(clusters, self._normal_decks, self._last_normal_cluster)
        self._last_normal_cluster = cluster
        return stk_id, cluster

    def draw_angry(self) -> Tuple[str, str]:
        clusters = get_angry_clusters()
        stk_id, cluster = self._draw_from_clusters(clusters, self._angry_decks, self._last_angry_cluster)
        self._last_angry_cluster = cluster
        return stk_id, cluster


# Singleton picker trong bộ nhớ
_loto_picker = LotoStickerPicker()


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
    """Bốc lô tô 1 sticker từ các cụm bình thường."""
    stk_id, _ = _loto_picker.draw_normal()
    return stk_id


def get_random_angry_sticker() -> str:
    """Bốc lô tô 1 sticker từ các cụm tức giận / deadline."""
    stk_id, _ = _loto_picker.draw_angry()
    return stk_id


def get_sticker_for_notification(
    event_type: str = "",
    title: str = "",
    content: str = "",
    default_sticker_id: str | None = None,
) -> str:
    """Bốc lô tô sticker theo từng cụm phù hợp với ngữ cảnh thông báo.
    
    - Nếu đã có default_sticker_id: dùng default_sticker_id
    - Nếu là trễ hạn, nhắc deadline: bốc lô tô theo cụm Tức giận / Giận dỗi
    - Ngược lại: bốc lô tô theo cụm Bình thường (Bư Mặt Ngáo, Cò Lõ Đi Làm, Trọc Trắng, Usagyuuun, Hải Cẩu Aza, Con Mả Con Ma)
    """
    if default_sticker_id:
        return default_sticker_id

    if is_deadline_or_urgent(event_type, title, content):
        return get_random_angry_sticker()

    return get_random_normal_sticker()
