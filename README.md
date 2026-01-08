
# ProQuote: Kurumsal Teklif Yönetim ve Doğrulama Sistemi

ProQuote, karmaşık ürün kataloglarını dijital bir veri bankasına dönüştüren ve müşteri taleplerini bu verilerle eşleştirerek hatasız teklifler oluşturan profesyonel bir operasyonel asistan yazılımıdır.

---

## 🇹🇷 TÜRKÇE DOKÜMANTASYON

### 🚀 ProQuote Nedir?
İşletmelerin teklif hazırlama sürecindeki manuel iş yükünü ortadan kaldırmak için geliştirilmiş bağımsız bir sistemdir. Yazılım, yüklenen dökümanlardaki tablo yapılarını ve teknik hiyerarşiyi analiz ederek bir "Sanal Mühendislik Denetimi" gerçekleştirir.

### 🔑 Teknik Gereksinimler & Sistem Yapılandırması
Bu uygulama, dökümanları anlamlandırmak için yüksek performanslı bulut tabanlı dil işleme modellerini kullanır.

1.  **Sistem Lisans / Erişim Anahtarı:** Uygulamanın döküman analiz kabiliyetlerini kullanabilmesi için geçerli bir erişim anahtarına (API Key) ihtiyacı vardır.
2.  **Anahtarı Tanımlamak:** Yazılım, gerekli anahtarı sistem ortam değişkenlerinden (`process.env.API_KEY`) otomatik olarak okur.
    *   *Yerel kullanımda:* Proje ana dizininde bir `.env` dosyası oluşturup içine `API_KEY=SİZİN_ANAHTARINIZ` eklemeniz yeterlidir.
3.  **İşlem Motorları:**
    *   **Veri İndeksleme Ünitesi:** Hızlı ve maliyet etkin teknik döküman taraması için optimize edilmiştir.
    *   **Muhakeme ve Analiz Ünitesi:** Karmaşık el yazısı ve teknik eşleştirme senaryoları için yüksek doğruluk payı ile çalışır.

### 🛠 Kurulum Kılavuzu

#### 🪟 Windows
1. [nodejs.org](https://nodejs.org/) adresinden LTS sürümünü kurun.
2. Proje klasöründe terminali açın.
3. `npm install` komutuyla bağımlılıkları yükleyin.
4. `npm start` komutuyla uygulamayı başlatın.

#### 🐧 Linux
1. `sudo apt update && sudo apt install nodejs npm`
2. Proje klasörüne gidin: `npm install`
3. Başlatın: `npm start`

### ⚙️ Sistemi Özelleştirme (Geliştiriciler İçin)
Sistemin teknik davranışını veya sektör odaklı analiz mantığını özelleştirmek için şu dosyayı kullanabilirsiniz:
*   `services/geminiService.ts`: Buradaki talimat setlerini (systemInstruction) değiştirerek yazılımın uzmanlık alanını (Örn: İnşaattan Tekstile) güncelleyebilirsiniz.

---

## 🇺🇸 ENGLISH DOCUMENTATION

### 🚀 What is ProQuote?
ProQuote is a stand-alone enterprise solution designed to eliminate manual workload in the quotation process. The software performs a "Virtual Engineering Audit" by analyzing table structures and technical hierarchies.

### 🔑 Technical Requirements & Configuration
The application utilizes high-performance cloud-based neural processing engines for document understanding.

1.  **System Access Key:** A valid access key (API Key) is required for the document analysis features.
2.  **Configuring the Key:** The system retrieves the key from environment variables (`process.env.API_KEY`).
    *   *For local development:* Create a `.env` file in the root directory and add: `API_KEY=YOUR_ACTUAL_KEY`.
3.  **Processing Units:**
    *   **Indexing Unit:** Optimized for high-speed technical document parsing.
    *   **Reasoning Unit:** Optimized for precision in complex handwriting analysis and technical matching.

### 🛠 Installation Guide

#### 🪟 Windows
1. Install Node.js (LTS) from [nodejs.org](https://nodejs.org/).
2. Open terminal in the project folder.
3. Run `npm install` to download dependencies.
4. Run `npm start` to launch the app.

#### 🐧 Linux
1. Run `sudo apt update && sudo apt install nodejs npm`.
2. Navigate to folder and run `npm install`.
3. Launch with `npm start`.

### ⚙️ Customizing the System
To modify core logic or matching behaviors, focus on:
*   `services/geminiService.ts`: You can adjust the internal processing instructions to pivot the software's expertise to different industrial sectors.

*This software is a professional tool optimized for commercial and operational efficiency.*
