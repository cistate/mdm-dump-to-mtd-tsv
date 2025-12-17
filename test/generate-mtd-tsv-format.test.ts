import * as fs from "fs";
import {
    readTsv,
    loadBrandCodes,
    extractSeriesData,
    generateMtdTsvFormat,
    SeriesData,
} from "../src/generate-mtd-tsv-format";

// fsモジュールのモック化
jest.mock("fs");

describe("generate-mtd-tsv-format", () => {
    const mockFs = fs as jest.Mocked<typeof fs>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("readTsv", () => {
        it("should read TSV file and return 2D array", () => {
            mockFs.readFileSync.mockReturnValue("col1\tcol2\nval1\tval2");
            const result = readTsv("test.tsv");
            expect(result).toEqual([
                ["col1", "col2"],
                ["val1", "val2"],
            ]);
        });
    });

    describe("loadBrandCodes", () => {
        it("should load brand codes from m_series file", () => {
            const tsvContent = "series_code\tbrand_code\nS1\tB1\nS2\tB2";
            mockFs.readFileSync.mockReturnValue(tsvContent);

            const result = loadBrandCodes("m_series.tsv");
            expect(result.get("S1")).toBe("B1");
            expect(result.get("S2")).toBe("B2");
        });

        it("should throw error if required columns are missing", () => {
            mockFs.readFileSync.mockReturnValue("col1\tcol2");
            expect(() => loadBrandCodes("m_series.tsv")).toThrow("Required columns");
        });
    });

    describe("extractSeriesData", () => {
        it("should extract series data correctly", () => {
            const languageTsv = [
                "series_code\tseries_name\tcatchcopy\tseries_notice_top_1",
                "S1\tName1\tCatch1\tNotice1",
            ].join("\n");

            const wysiwygTsv = ["series_code\thtml", "S1\t<p>HTML1</p>", "S1\t<p>HTML2</p>"].join(
                "\n"
            );

            mockFs.readFileSync.mockImplementation((path: any) => {
                if (path === "lang.tsv") return languageTsv;
                if (path === "wysiwyg.tsv") return wysiwygTsv;
                return "";
            });

            const brandCodeMap = new Map([["S1", "B1"]]);

            const result = extractSeriesData("lang.tsv", "wysiwyg.tsv", brandCodeMap);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                series_code: "S1",
                series_name: "Name1",
                catchcopy: "Catch1",
                series_notice_top_1: "Notice1",
                series_notice_top_2: "",
                series_notice_top_3: "",
                series_notice_top_4: "",
                series_notice_top_5: "",
                html_list: ["<p>HTML1</p>", "<p>HTML2</p>"],
                brand_code: "B1",
            });
        });
    });

    describe("generateMtdTsvFormat", () => {
        it("should generate correct TSV format", () => {
            const seriesData: SeriesData = {
                series_code: "S1",
                series_name: "Name1",
                catchcopy: "Catch1",
                series_notice_top_1: "Notice1",
                series_notice_top_2: "",
                series_notice_top_3: "",
                series_notice_top_4: "",
                series_notice_top_5: "",
                html_list: ["<p>HTML1</p>"],
                brand_code: "B1",
            };

            const result = generateMtdTsvFormat(seriesData, 100);
            const lines = result.split("\n");

            // ヘッダーチェック
            expect(lines[0]).toContain("anken_id");
            expect(lines[1]).toContain("B1"); // brand_code
            expect(lines[2]).toContain("task_detail_id");

            // データ行チェック
            // シリーズ名称
            expect(lines[3]).toContain("100");
            expect(lines[3]).toContain("シリーズ名称");
            expect(lines[3]).toContain("Name1");

            // キャッチコピー
            expect(lines[4]).toContain("101");
            expect(lines[4]).toContain("キャッチコピー");
            expect(lines[4]).toContain("Catch1");

            // 注意文
            expect(lines[5]).toContain("102");
            expect(lines[5]).toContain("商品注意案内文1");
            expect(lines[5]).toContain("Notice1");

            // HTML
            expect(lines[6]).toContain("103");
            expect(lines[6]).toContain("HTML");
            expect(lines[6]).toContain("<p>HTML1</p>");
        });
    });
});
