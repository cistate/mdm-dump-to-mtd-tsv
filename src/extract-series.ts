import * as fs from "fs";
import * as readline from "readline";

// シリーズコードリストをファイルから読み込む
export function loadSeriesCodes(filePath: string): string[] {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Series codes file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const codes = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (codes.length === 0) {
        throw new Error(`No series codes found in file: ${filePath}`);
    }

    return codes;
}

export async function extractSeries(
    inputFile: string,
    outputFile: string,
    seriesCodesFile: string
) {
    // シリーズコードをファイルから読み込む
    const TARGET_SERIES_CODES = loadSeriesCodes(seriesCodesFile);
    console.error(`Loading ${TARGET_SERIES_CODES.length} series codes from ${seriesCodesFile}...`);
    const fileStream = fs.createReadStream(inputFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    const outputStream = fs.createWriteStream(outputFile);
    let isFirstLine = true;
    let matchCount = 0;

    for await (const line of rl) {
        // ヘッダー行は常に出力
        if (isFirstLine) {
            outputStream.write(line + "\n");
            isFirstLine = false;
            continue;
        }

        // series_codeをチェック（最初のカラム）
        const seriesCode = line.split("\t")[0];
        if (TARGET_SERIES_CODES.includes(seriesCode)) {
            outputStream.write(line + "\n");
            matchCount++;
            console.error(`Found: ${seriesCode}`);
        }
    }

    outputStream.end();
    console.error(`\nTotal matches: ${matchCount}`);
    console.error(`Output written to: ${outputFile}`);
}

if (require.main === module) {
    const inputFile = process.argv[2];
    const outputFile = process.argv[3];
    const seriesCodesFile = process.argv[4];

    if (!inputFile || !outputFile || !seriesCodesFile) {
        console.error(
            "Usage: ts-node src/extract-series.ts <input.tsv> <output.tsv> <series_codes.txt>"
        );
        console.error(
            "Example: ts-node src/extract-series.ts data/JP/m_series_language_jp.tsv output/extracted.tsv data/series-code-filter/MJPJPN/series-code.txt"
        );
        process.exit(1);
    }

    extractSeries(inputFile, outputFile, seriesCodesFile).catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });
}
