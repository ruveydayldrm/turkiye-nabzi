from collections import Counter
from collections.abc import Iterable

from app.pipeline.text import fold, tokenize, turkish_lower

STOPWORDS = {
    fold(word)
    for word in """
    ve veya ile ama fakat ancak de da ki mi mu bu şu o bir iki üç için gibi kadar daha çok en her hiç
    olan olarak oldu olduğu olduğunu olacak oluyor etti eden edildi edilen yaptı yapılan yapıldı
    sonra önce artık bile yine ise diye göre karşı arasında üzerine tarafından nedeniyle sırasında
    ilk son yeni büyük küçük tüm bütün bazı birçok birlikte şehir kent il ilçe merkez merkezinde
    açıklama açıkladı belirtti dedi söyledi ifade konu konusunda haber haberi gün bugün dün yarın
    yıl yılı yılında ay saat dakika kişi kişinin bin milyon milyar lira yüzde mahalle
    ardından olmak olması olan olanlar düzenlenen düzenledi yapılacak gerçekleştirildi gerçekleşti başladı
    devam ediyor sürüyor yükseldi geldi gelen aldı alınan verdi veren ettiği ettiler bulunan bulundu
    kendi kendisi şekilde sadece ayrıca şöyle böyle bunun buna bunu şunu ekim kasım aralık ocak şubat
    mart nisan mayıs haziran temmuz ağustos eylül pazartesi salı çarşamba perşembe cuma cumartesi pazar
    """.split()
}


def top_keywords(texts: Iterable[str], exclude: set[str], limit: int = 18) -> list[tuple[str, int]]:
    """Most frequent content words; `exclude` holds folded place names."""
    counts: Counter[str] = Counter()
    display: dict[str, str] = {}
    for text in texts:
        for token in tokenize(text):
            key = fold(token.base)
            if len(key) < 4 or key in STOPWORDS or key in exclude:
                continue
            counts[key] += 1
            display.setdefault(key, turkish_lower(token.base))
    return [(display[key], count) for key, count in counts.most_common(limit)]
