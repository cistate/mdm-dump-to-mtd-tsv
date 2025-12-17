import * as fs from "fs";
import * as path from "path";

export interface SeriesData {
    series_code: string;
    series_name: string;
    catchcopy: string;
    series_notice_top_1: string;
    series_notice_top_2: string;
    series_notice_top_3: string;
    series_notice_top_4: string;
    series_notice_top_5: string;
    html_list: string[];
    brand_code: string;
    category_code: string;
}

// ログ出力
export function logWarning(message: string) {
    console.warn(message);

    const logDir = "logs";
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, "warning.log");
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
}

// TSVファイルを読み込む
export function readTsv(filePath: string): string[][] {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");
    return lines.map((line) => line.split("\t"));
}

// m_series.tsv から brand_code を読み込む
export function loadBrandCodes(mSeriesFile: string): Map<string, string> {
    if (!fs.existsSync(mSeriesFile)) {
        logWarning(
            `Warning: m_series file not found: ${mSeriesFile}. Proceeding with empty brand codes.`
        );
        return new Map<string, string>();
    }

    const rows = readTsv(mSeriesFile);
    const headers = rows[0];
    const seriesCodeIdx = headers.indexOf("series_code");
    const brandCodeIdx = headers.indexOf("brand_code");

    if (seriesCodeIdx === -1 || brandCodeIdx === -1) {
        throw new Error("Required columns (series_code, brand_code) not found in m_series file");
    }

    const brandCodeMap = new Map<string, string>();
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const seriesCode = row[seriesCodeIdx];
        const brandCode = row[brandCodeIdx];
        if (seriesCode && brandCode) {
            brandCodeMap.set(seriesCode, brandCode);
        }
    }
    return brandCodeMap;
}

// m_category_series.tsv から category_code を読み込む
export function loadCategoryCodes(mCategorySeriesFile: string): Map<string, string> {
    if (!fs.existsSync(mCategorySeriesFile)) {
        logWarning(
            `Warning: m_category_series file not found: ${mCategorySeriesFile}. Proceeding with empty category codes.`
        );
        return new Map<string, string>();
    }

    const rows = readTsv(mCategorySeriesFile);
    const headers = rows[0];
    const seriesCodeIdx = headers.indexOf("series_code");
    const categoryCodeIdx = headers.indexOf("category_code");
    const deleteFlagIdx = headers.indexOf("delete_flag");

    if (seriesCodeIdx === -1 || categoryCodeIdx === -1) {
        throw new Error(
            "Required columns (series_code, category_code) not found in m_category_series file"
        );
    }

    const categoryCodeMap = new Map<string, string>();
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const seriesCode = row[seriesCodeIdx];
        const categoryCode = row[categoryCodeIdx];
        const deleteFlag = deleteFlagIdx !== -1 ? row[deleteFlagIdx] : "0";

        // delete_flag が 1 の場合はスキップ
        if (deleteFlag === "1") {
            continue;
        }

        if (seriesCode && categoryCode) {
            categoryCodeMap.set(seriesCode, categoryCode);
        }
    }
    return categoryCodeMap;
}

// extracted_m_series_language.tsvとextracted_m_series_wysiwyg_language.tsvからデータを抽出
export function extractSeriesData(
    languageFile: string,
    wysiwygFile: string,
    brandCodeMap: Map<string, string>,
    categoryCodeMap: Map<string, string>,
    region: string
): SeriesData[] {
    const languageRows = readTsv(languageFile);
    const languageHeaders = languageRows[0];

    const seriesCodeIdx = languageHeaders.indexOf("series_code");
    const seriesNameIdx = languageHeaders.indexOf("series_name");
    const catchcopyIdx = languageHeaders.indexOf("catchcopy");
    const noticeTop1Idx = languageHeaders.indexOf("series_notice_top_1");
    const noticeTop2Idx = languageHeaders.indexOf("series_notice_top_2");
    const noticeTop3Idx = languageHeaders.indexOf("series_notice_top_3");
    const noticeTop4Idx = languageHeaders.indexOf("series_notice_top_4");
    const noticeTop5Idx = languageHeaders.indexOf("series_notice_top_5");

    if (seriesCodeIdx === -1 || seriesNameIdx === -1 || catchcopyIdx === -1) {
        throw new Error("Required columns not found in language file");
    }

    // wysiwygファイルからHTMLデータを読み込む
    const wysiwygRows = readTsv(wysiwygFile);
    const wysiwygHeaders = wysiwygRows[0];

    const wysiwygSeriesCodeIdx = wysiwygHeaders.indexOf("series_code");
    const htmlIdx = wysiwygHeaders.indexOf("html");

    if (wysiwygSeriesCodeIdx === -1 || htmlIdx === -1) {
        throw new Error("Required columns not found in wysiwyg file");
    }

    // series_codeごとにHTMLをマッピング
    const htmlMap = new Map<string, string[]>();
    for (let i = 1; i < wysiwygRows.length; i++) {
        const row = wysiwygRows[i];
        const seriesCode = row[wysiwygSeriesCodeIdx];
        const html = row[htmlIdx];

        if (seriesCode && html) {
            if (!htmlMap.has(seriesCode)) {
                htmlMap.set(seriesCode, []);
            }
            htmlMap.get(seriesCode)!.push(html);
        }
    }

    const seriesDataList: SeriesData[] = [];

    for (let i = 1; i < languageRows.length; i++) {
        const row = languageRows[i];
        const seriesCode = row[seriesCodeIdx];
        const seriesName = row[seriesNameIdx];
        const catchcopy = row[catchcopyIdx];
        const noticeTop1 = noticeTop1Idx !== -1 ? row[noticeTop1Idx] : "";
        const noticeTop2 = noticeTop2Idx !== -1 ? row[noticeTop2Idx] : "";
        const noticeTop3 = noticeTop3Idx !== -1 ? row[noticeTop3Idx] : "";
        const noticeTop4 = noticeTop4Idx !== -1 ? row[noticeTop4Idx] : "";
        const noticeTop5 = noticeTop5Idx !== -1 ? row[noticeTop5Idx] : "";

        if (seriesCode && seriesName) {
            const brandCode = brandCodeMap.get(seriesCode);
            if (!brandCode) {
                logWarning(
                    `Warning: Brand code not found for series: ${seriesCode} (Region: ${region})`
                );
            }

            const categoryCode = categoryCodeMap.get(seriesCode);
            if (!categoryCode) {
                logWarning(
                    `Warning: Category code not found for series: ${seriesCode} (Region: ${region})`
                );
            }

            seriesDataList.push({
                series_code: seriesCode,
                series_name: seriesName,
                catchcopy: catchcopy || "",
                series_notice_top_1: noticeTop1 || "",
                series_notice_top_2: noticeTop2 || "",
                series_notice_top_3: noticeTop3 || "",
                series_notice_top_4: noticeTop4 || "",
                series_notice_top_5: noticeTop5 || "",
                html_list: htmlMap.get(seriesCode) || [],
                brand_code: brandCode || "MSM1", // デフォルト値
                category_code: categoryCode || "M1803060000", // デフォルト値
            });
        }
    }

    return seriesDataList;
}

// フォーマットに従ってTSVを生成
export function generateMtdTsvFormat(
    seriesData: SeriesData,
    baseTaskDetailId: number = 3909817
): string {
    const lines: string[] = [];

    // ヘッダー行（1行目）
    const header1 = [
        "anken_id",
        "duplication_manage_id",
        "department_code",
        "category_code",
        "brand_code",
        "from_subsidiary_code",
        "from_language_code",
        "to_subsidiary_code",
        "to_language_code",
        "translate_status",
    ].join("\t");
    lines.push(header1);

    // ★★★ 手動設定 ★★★
    // メタデータ行（2行目）
    const metaData = [
        "ECSI01202509173395", // 任意
        "DUP1000000215574", // 任意
        "el", // 任意
        seriesData.category_code, // category_code は自動設定済み
        seriesData.brand_code, // brand_code は自動設定済み
        "MJP", // from_subsidiary_code
        "JPN", // from_language_code
        "COM", // to_subsidiary_code
        "ENG", // to_language_code
        "1",
    ].join("\t");
    lines.push(metaData);

    // タスク詳細ヘッダー行（3行目）
    const header2 = [
        "task_detail_id",
        "record_seq",
        "series_code",
        "additional_item",
        "reference_url",
        "item_name",
        "from_value",
        "to_value",
    ].join("\t");
    lines.push(header2);

    let currentTaskDetailId = baseTaskDetailId;
    let recordSeq = 1;

    // ★★★ 手動設定 ★★★
    const referenceUrl = `https://jp.misumi-ec.com/vona2/detail/${seriesData.series_code}/`; // jp

    // データ行1：シリーズ名称（値が空でない場合のみ出力）
    if (seriesData.series_name) {
        const row1 = [
            currentTaskDetailId.toString(),
            recordSeq.toString(),
            seriesData.series_code,
            "種類",
            referenceUrl,
            "シリーズ名称",
            seriesData.series_name,
            "",
        ].join("\t");
        lines.push(row1);
        currentTaskDetailId++;
        recordSeq++;
    }

    // データ行2：キャッチコピー（値が空でない場合のみ出力）
    if (seriesData.catchcopy) {
        const row2 = [
            currentTaskDetailId.toString(),
            recordSeq.toString(),
            seriesData.series_code,
            "種類",
            referenceUrl,
            "キャッチコピー",
            seriesData.catchcopy,
            "",
        ].join("\t");
        lines.push(row2);
        currentTaskDetailId++;
        recordSeq++;
    }

    // データ行3-7：商品注意案内文1〜5（値が空でない場合のみ出力）
    const noticeFields = [
        { value: seriesData.series_notice_top_1, name: "商品注意案内文1" },
        { value: seriesData.series_notice_top_2, name: "商品注意案内文2" },
        { value: seriesData.series_notice_top_3, name: "商品注意案内文3" },
        { value: seriesData.series_notice_top_4, name: "商品注意案内文4" },
        { value: seriesData.series_notice_top_5, name: "商品注意案内文5" },
    ];

    for (const field of noticeFields) {
        if (field.value) {
            const noticeRow = [
                currentTaskDetailId.toString(),
                recordSeq.toString(),
                seriesData.series_code,
                "種類",
                referenceUrl,
                field.name,
                field.value,
                "",
            ].join("\t");
            lines.push(noticeRow);
            currentTaskDetailId++;
            recordSeq++;
        }
    }

    // データ行8以降：HTML（複数ある場合は連番で追加）
    for (const html of seriesData.html_list) {
        const htmlRow = [
            currentTaskDetailId.toString(),
            recordSeq.toString(),
            seriesData.series_code,
            "種類",
            referenceUrl,
            "HTML",
            html,
            "",
        ].join("\t");
        lines.push(htmlRow);
        currentTaskDetailId++;
        recordSeq++;
    }

    return lines.join("\n");
}

// メイン処理
export function main() {
    const args = process.argv.slice(2);

    if (args.length < 4) {
        console.error(
            "Usage: ts-node src/generate-mtd-tsv-format.ts <series_tsv> <wysiwyg_tsv> <brand_code_tsv> <category_code_tsv> [output_dir]"
        );
        console.error(
            "Example: ts-node src/generate-mtd-tsv-format.ts output/extracted_m_series_language.tsv output/extracted_m_series_wysiwyg_language.tsv output/m_series.tsv data/mdm-dump-tsv/MJPJPN/m_category_series.tsv output/mtd"
        );
        process.exit(1);
    }

    const languageFile = args[0];
    const wysiwygFile = args[1];
    const mSeriesFile = args[2];
    const mCategorySeriesFile = args[3];
    const outputDir = args[4] || "output/mtd";
    const prefix = "series-code";

    if (!fs.existsSync(languageFile)) {
        console.error(`Error: Language file not found: ${languageFile}`);
        process.exit(1);
    }

    if (!fs.existsSync(wysiwygFile)) {
        console.error(`Error: WYSIWYG file not found: ${wysiwygFile}`);
        process.exit(1);
    }

    // m_seriesFile は存在しなくても続行する（loadBrandCodes内で警告を出す）

    // m_category_seriesFile は存在しなくても続行する（loadCategoryCodes内で警告を出す）

    // 出力ディレクトリを作成
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(
        `Reading data from: ${languageFile}, ${wysiwygFile}, ${mSeriesFile}, and ${mCategorySeriesFile}`
    );
    const brandCodeMap = loadBrandCodes(mSeriesFile);
    const categoryCodeMap = loadCategoryCodes(mCategorySeriesFile);
    const region = path.basename(outputDir);
    const seriesDataList = extractSeriesData(
        languageFile,
        wysiwygFile,
        brandCodeMap,
        categoryCodeMap,
        region
    );
    console.log(`Found ${seriesDataList.length} series`);

    let baseTaskDetailId = 3909817;

    for (const seriesData of seriesDataList) {
        const outputFileName = `cistate-test-${prefix}_${seriesData.series_code}.tsv`;
        const outputPath = path.join(outputDir, outputFileName);

        const tsvContent = generateMtdTsvFormat(seriesData, baseTaskDetailId);
        fs.writeFileSync(outputPath, tsvContent, "utf-8");

        console.log(`Generated: ${outputPath} (with ${seriesData.html_list.length} HTML entries)`);

        // 次のシリーズ用にtask_detail_idを進める
        // （実際に出力された行数分だけ進める）
        let incrementCount = seriesData.html_list.length;
        if (seriesData.series_name) incrementCount++;
        if (seriesData.catchcopy) incrementCount++;
        if (seriesData.series_notice_top_1) incrementCount++;
        if (seriesData.series_notice_top_2) incrementCount++;
        if (seriesData.series_notice_top_3) incrementCount++;
        if (seriesData.series_notice_top_4) incrementCount++;
        if (seriesData.series_notice_top_5) incrementCount++;
        baseTaskDetailId += incrementCount;
    }

    console.log("\nDone!");
}

if (require.main === module) {
    main();
}
