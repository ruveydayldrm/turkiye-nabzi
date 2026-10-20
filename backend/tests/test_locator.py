import pytest

from app.pipeline.locator import get_locator


@pytest.mark.parametrize(
    ("title", "expected"),
    [
        ("Ankara'da yeni metro hattı açıldı", "06"),
        ("İzmir'in su sorunu meclis gündeminde", "35"),
        ("Yozgat'tan İstanbul'a otobüs seferleri arttı", None),
        ("Yozgat'tan gelen ekipler çalışmalara başladı", "66"),
        ("ANKARA'DA KAR YAĞIŞI ETKİLİ OLDU", "06"),
        ("Istanbul'da trafik yoğunluğu", "34"),
        ("Afyon'da termal turizm sezonu açıldı", "03"),
        ("Kars'ta kar kalınlığı 40 santime ulaştı", "36"),
        ("Muş'un köylerinde elektrik kesintisi", "49"),
        ("Trabzonlu taraftarlar kutlama yaptı", "61"),
        ("Kadıköy'de kültür festivali başladı", "34"),
        ("Bodrum'da tekne yangını", "48"),
        ("Çankaya Belediyesi yeni parkı hizmete açtı", "06"),
        ("Kahramankazan'da sanayi yatırımı", "06"),
    ],
)
def test_provinces_districts_and_suffixes(title: str, expected: str | None) -> None:
    assert get_locator().locate(title).plate == expected


@pytest.mark.parametrize(
    ("title", "expected"),
    [
        ("Ordu'da fındık hasadı başladı", "52"),
        ("Ordu Büyükşehir Belediyesi yeni otobüsler aldı", "52"),
        ("Türk Ordusu tatbikata katıldı", None),
        ("Rus ordu birlikleri sınıra yaklaştı", None),
        ("Kızıl Ordu marşı yeniden yorumlandı", None),
        ("Batman'da petrol üretimi arttı", "72"),
        ("Yeni Batman filmi vizyona girdi", None),
        ("Batman filminin fragmanı yayınlandı", None),
        ("Van'da deprem tatbikatı yapıldı", "65"),
        ("Van Gölü'nde inci kefali göçü başladı", "65"),
        ("Van Gogh sergisi büyük ilgi gördü", None),
        ("Aydın'da incir hasadı sürüyor", "09"),
        ("Bakan Ahmet Aydın açıklama yaptı", None),
        ("Mersin'de narenciye ihracatı rekor kırdı", "33"),
        ("Mersin balığı nesli tehlike altında", None),
        ("Hastaneye kaldırılan çocuğa tokat atıldığı iddia edildi", None),
    ],
)
def test_ambiguous_names_use_context(title: str, expected: str | None) -> None:
    assert get_locator().locate(title).plate == expected


def test_shared_district_name_needs_province_context() -> None:
    locator = get_locator()
    assert locator.locate("Gölbaşı'nda yol çalışması").plate is None
    assert locator.locate("Gölbaşı'nda yol çalışması", "Ankara Büyükşehir Belediyesi açıklama yaptı").plate == "06"


def test_summary_supports_title() -> None:
    result = get_locator().locate("Fındık fiyatları açıklandı", "Giresun'da üreticiler fiyatlardan memnun.")
    assert result.plate == "28"


def test_title_mentions_outweigh_summary() -> None:
    result = get_locator().locate("Rize'de heyelan", "Ekipler Trabzon'dan takviye aldı.")
    assert result.plate == "53"
