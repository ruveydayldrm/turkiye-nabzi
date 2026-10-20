from typing import Protocol

from app.pipeline.text import PatternSet, lower_words

CATEGORIES = ("ekonomi", "spor", "asayis", "kultur-sanat", "egitim", "saglik", "hava-cevre")


class Categorizer(Protocol):
    def classify(self, text: str, title: str = "") -> str | None:
        """Returns one of CATEGORIES, or None when the article fits none of them."""
        ...


KEYWORDS: dict[str, tuple[str, ...]] = {
    "ekonomi": (
        "ekonomi*", "ihracat*", "ithalat*", "yatırım*", "enflasyon*", "faiz*", "döviz*", "borsa*", "esnaf*",
        "sanayi*", "fabrika*", "istihdam*", "işsiz*", "ihale*", "fiyat*", "zam", "zamm*", "zamlar*", "kira", "kiralar*",
        "kiracı*", "tarım*", "çiftçi*", "hasat*", "üretim*", "kooperatif*", "turizm*", "ticaret*", "vergi*",
        "maaş*", "emekli*", "konut*", "ekonomik*",
    ),
    "spor": (
        "maç", "maçı*", "maçta", "maçın*", "gol", "golle", "golü", "goller*", "lig", "ligi*", "ligde", "futbol*",
        "basketbol*", "voleybol*", "taraftar*", "transfer*", "teknik direktör*", "antrenör*", "şampiyon*",
        "derbi*", "stadyum*", "spor", "sporcu*", "atlet*", "olimpiyat*", "galibiyet*", "mağlubiyet*",
        "deplasman*", "hakem*", "kulüp*", "kulübü*",
    ),
    "asayis": (
        "kaza", "kazası*", "kazada", "kazasında", "kazay*", "kazalar*", "yangın*", "itfaiye*", "arama kurtarma*",
        "boğul*", "polis*", "jandarma*", "operasyon*", "gözaltı*",
        "tutuklan*", "cinayet*", "saldırı*", "hırsız*", "dolandırıc*", "silah*", "bıçak*", "kavga*", "uyuşturucu*",
        "kaçakçı*", "yaralı*", "yaralandı*", "öldü", "öldürül*", "hayatını kaybet*", "trafik*", "çarpış*",
        "devrildi", "şüpheli*", "mahkeme*", "cezaevi*", "firari*",
    ),
    "kultur-sanat": (
        "festival*", "konser*", "sergi*", "müze*", "tiyatro*", "sinema*", "film", "filmi*", "kitap*", "yazar*",
        "sanat*", "kültür*", "kazı", "kazıda*", "kazısı*", "antik*", "tarihi", "restorasyon*", "opera*", "bale*",
        "müzik*", "edebiyat*",
    ),
    "egitim": (
        "okul*", "öğrenci*", "öğretmen*", "üniversite*", "eğitim*", "sınav*", "lgs", "yks", "burs*",
        "derslik*", "müfredat*", "akademisyen*", "rektör*", "mezun*", "kreş*", "anaokul*",
    ),
    "saglik": (
        "hastane*", "doktor*", "hekim*", "sağlık*", "hasta", "hastalar*", "hastalık*", "aşı", "aşısı*", "aşılama*",
        "grip*", "virüs*", "salgın*", "ameliyat*", "acil servis*", "tedavi*", "ilaç*", "kanser*", "organ nakli*",
        "eczane*",
    ),
    "hava-cevre": (
        "yağış*", "yağmur*", "kar yağışı*", "sel", "seli", "selde", "sele", "su baskın*", "fırtına*",
        "hava durumu*", "meteoroloji*", "sıcaklık*", "kuraklık*", "orman yangın*", "çevre*", "kirlilik*",
        "atık*", "fidan*", "ağaçlandırma*", "deprem*", "heyelan*", "dolu", "rüzgar*", "rüzgâr*", "iklim*", "baraj*",
    ),
}

TITLE_WEIGHT = 2.0


class KeywordCategorizer:
    """Keyword scorer. Swap in a zero-shot model by implementing `Categorizer`."""

    def __init__(self, keywords: dict[str, tuple[str, ...]] = KEYWORDS):
        self.patterns = {category: PatternSet(values) for category, values in keywords.items()}

    def classify(self, text: str, title: str = "") -> str | None:
        scores = dict.fromkeys(CATEGORIES, 0.0)
        for chunk, weight in ((title, TITLE_WEIGHT), (text, 1.0)):
            if not chunk:
                continue
            words = lower_words(chunk)
            for category in CATEGORIES:
                scores[category] += weight * self.patterns[category].count(words)
        best = max(scores, key=lambda category: scores[category])
        return best if scores[best] > 0 else None
