<div align="center">

# Sapu Berita

**Read the news. Sweep the rest.** Indonesian news articles as one clean page: ads and pop-ups gone, and articles split over several pages merged into one.

[Install page](https://dhantyo.github.io/sapu-berita/) · [Chrome](https://chromewebstore.google.com/detail/cnpcdeijcckcobfngmglmdfgfcdlnglc) · [Edge](https://microsoftedge.microsoft.com/addons/detail/bhdciokajcobbbajokfomgjoonofcdbj) · [Android](docs/install-android.md) · [iPhone, iPad, Mac](docs/install-apple.md) · [Supported sites](#supported-sites)

<img src="docs/img/phone-light.png" width="200" alt="A cleaned-up Kompas article, light theme"> <img src="docs/img/phone-dark.png" width="200" alt="A Detik Travel article, dark theme"> <img src="docs/img/phone-settings.png" width="200" alt="Settings panel: text size, font, theme, language"> <img src="docs/img/phone-editor.png" width="200" alt="Adjusting the article: a paragraph picked, asking what it is">

</div>

> **Beta.** Sapu Berita is still early (0.x). If an article looks wrong, [report it](../../issues/new/choose) with the link.

## What it does

- **Removes the clutter:** ads, "Baca Juga" (read also) link lists, share buttons, Google News and newsletter prompts.
- **Merges pages:** articles split over 2, 3 or 5 pages appear whole, on one page.
- **Tidies summaries:** editor summary boxes ("Ringkasan Berita", key points) become one clean list.
- **Keeps what matters:** photos, captions, and social media posts that are part of the story.
- **Shows the outlet's logo**, taken from the site itself, so you always know who you're reading.
- **Your way:** text size, font (serif, sans, extra-legible), light, sepia or dark theme, Indonesian or English interface.

The **Original** button always takes you back to the publisher's page.

## Install

| Device | How it works | Get it |
|---|---|---|
| **Computer** (Chrome, Brave, Opera, Vivaldi, Edge) | An extension that runs automatically on every supported article and updates itself. | [Chrome Web Store](https://chromewebstore.google.com/detail/cnpcdeijcckcobfngmglmdfgfcdlnglc) · [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/bhdciokajcobbbajokfomgjoonofcdbj) |
| **Android** | The same extension, in Edge (or Firefox, once Mozilla approves it). Chrome for Android doesn't allow extensions; there you can use a bookmark instead. | [Android guide](docs/install-android.md) |
| **iPhone, iPad** | A Safari bookmark today, an Apple Shortcut (Share → Sapu Berita) soon. Always the latest version. | [Apple guide](docs/install-apple.md) |
| **Mac with Safari** | One button in Safari's Favourites bar. Always the latest version. | [Apple guide](docs/install-apple.md) |

The [install page](https://dhantyo.github.io/sapu-berita/) picks the right steps for your device and browser.

## Supported sites

Detik · Kompas · Tribunnews (including regional sites) · CNN Indonesia · CNBC Indonesia · Liputan6 · Merdeka · Suara · Okezone · Viva · iNews · JPNN · ANTARA · Republika · Bisnis.com · Tirto · Tribrata News · Kumparan · IDN Times · Sindonews · Jawa Pos · Pikiran Rakyat · Kontan · Katadata · Media Indonesia · Berita Satu · Medcom · Kompas TV

**Not yet:** Tempo (paywalled; Sapu Berita doesn't bypass paywalls). Want another site? [Suggest it](../../issues/new/choose).

## Updates

- **Site fixes** (when a news site changes its layout) arrive automatically, without updating the app.
- **Extension from a store:** nothing to do; the store updates it.
- **iPhone, iPad, Mac:** nothing to do. The Shortcut and the bookmark always run the newest version.

## Privacy

Everything runs on your device. Sapu Berita has no server, no analytics, and doesn't know what you read. Articles still load from the publisher's own site, so your visit counts for them as usual.

Once a day it downloads two small files from GitHub: the latest version number and the latest site rules. Nothing about you or your reading is sent. You can turn it off under **the gear button → Cek update** (check for updates). Feedback is only sent when you send it yourself, and changes from **Atur isi artikel** (adjust the article) only if you agree the first time it asks; both go to a Google Form. Details: [privacy page](https://dhantyo.github.io/sapu-berita/privacy.html).

## Made with AI

Sapu Berita is built with AI. Nearly all of its code, documentation and design were written by Claude, Anthropic's AI model, working under the direction of the maintainer, who decides what gets built, tests it and publishes each release. Site rules are checked against real articles by automated tests and a daily live check. If something looks wrong, please [report it](../../issues/new/choose).

## Contributing

News sites change their layouts often, so the per-site rules need care. Reporting a broken article already helps a lot: open **the gear button → Beri masukan** (give feedback) on that article. To work on code or rules, see [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/DEVELOPING.md](docs/DEVELOPING.md).

## License

[GPL-3.0](LICENSE). Ad filters and pagination rules are derived from [AdBlockID](https://github.com/realodix/AdBlockID), [ABPindo](https://github.com/ABPindo/indonesianadblockrules) and [AutoAllPage](https://github.com/reforget-id/AutoAllPage) (all GPL-3.0). Fonts: [Geist](https://github.com/vercel/geist-font), [Merriweather](https://github.com/SorkinType/Merriweather) and [Fira Sans](https://github.com/mozilla/Fira) under the SIL Open Font License 1.1 (see `fonts/`). Sapu Berita is not affiliated with any news outlet; their names and logos belong to their owners.

Part of the **Sapu** family, alongside Sapu Buzzer (coming soon).
