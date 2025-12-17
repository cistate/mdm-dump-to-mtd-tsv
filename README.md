# mdm-dump-to-mtd-tsv

MDMダンプデータからMTD形式のTSVファイルを生成するツールです。

## 準備

1. 依存パッケージをインストールします。

```bash
npm install
```

2. MDMダンプデータを配置します。
   `data/mdm-dump-tsv` ディレクトリ配下に、対象のリージョンディレクトリ（例: `MJPJPN`）を作成し、以下のTSVファイルを配置してください。

   - `m_series.tsv`: ブランドコードとシリーズコードを紐づけるダンプ
   - `m_series_language.tsv`: シリーズマスタのダンプ
   - `m_series_wysiwyg_language.tsv`: WYSIWYGのダンプ

   ディレクトリ構成例:
   ```
   data/
     mdm-dump-tsv/
       MJPJPN/
         m_series.tsv
         m_series_language.tsv
         m_series_wysiwyg_language.tsv
   ```

3. 抽出対象のシリーズコードリストを配置します。
   `data/series-code-filter` ディレクトリ配下に、対象のリージョンディレクトリを作成し、その中に抽出したいシリーズコードを記載したテキストファイルを配置します。

   - 例: `data/series-code-filter/MJPJPN/series-code.txt`
   - テキストファイルの中身はシリーズコードを改行区切りで記載します。

## 実行方法

以下のコマンドを実行します。

```bash
./run.sh
```

スクリプトは `data/series-code-filter` 内のファイルを読み込み、自動的に抽出と変換処理を行います。
生成されたファイルは `output/mtd-tsv` ディレクトリに出力されます。

## 手動設定が必要な項目

`src/generate-mtd-tsv-format.ts` ファイル内には、手動で設定が必要な箇所があります。
コード内で `// ★★★ 手動設定 ★★★` とコメントされている箇所を確認し、必要に応じて修正してください。

主な設定項目:
- **メタデータ行（2行目）**: 現法コード（`from_subsidiary_code`, `to_subsidiary_code`）言語コード（`from_language_code`, `to_language_code`）
- **参照URL**: `referenceUrl` EC サイトの実際の URL。対象の現法によって URL が異なる。
- **カテゴリコード (`category_code`)**: **注意!!!：スクリプトでは自動設定できないため、TSV生成後にブラウザ上でシリーズコードに対応するカテゴリコードを確認し、設定する必要があります。** 

該当コード例 (`src/generate-mtd-tsv-format.ts`):

```typescript
    // ★★★ 手動設定 ★★★
    // メタデータ行（2行目）
    const metaData = [
        // ...
        "M1803060000", //  注意：TSV 生成後に実際のサイトのページを確認してカテゴリを設定してください。
        // ...
        "MJP", // from_subsidiary_code
        "JPN", // from_language_code
        "COM", // to_subsidiary_code
        "ENG", // to_language_code
        // ...
    ].join("\t");

    // ...

    // ★★★ 手動設定 ★★★
    const referenceUrl = `https://jp.misumi-ec.com/vona2/detail/${seriesData.series_code}/`; // jp
```



## テスト実行方法

以下のコマンドで単体テストを実行できます。

```bash
npm test
```