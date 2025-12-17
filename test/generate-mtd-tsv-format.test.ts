import * as fs from "fs";
import {
    readTsv,
    loadBrandCodes,
    loadCategoryCodes,
    extractSeriesData,
    generateMtdTsvFormat,
    logWarning,
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
            mockFs.existsSync.mockReturnValue(true);
            const tsvContent = "series_code\tbrand_code\nS1\tB1\nS2\tB2";
            mockFs.readFileSync.mockReturnValue(tsvContent);

            const result = loadBrandCodes("m_series.tsv");
            expect(result.get("S1")).toBe("B1");
            expect(result.get("S2")).toBe("B2");
        });

        it("should throw error if required columns are missing", () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue("col1\tcol2");
            expect(() => loadBrandCodes("m_series.tsv")).toThrow("Required columns");
        });

        it("should return empty map if file does not exist", () => {
            mockFs.existsSync.mockReturnValue(false);
            const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
            const result = loadBrandCodes("non_existent.tsv");
            expect(result.size).toBe(0);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining("Warning: m_series file not found")
            );
            consoleSpy.mockRestore();
        });
    });

    describe("logWarning", () => {
        it("should log warning to console and file", () => {
            const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
            const appendFileSpy = jest.spyOn(mockFs, "appendFileSync").mockImplementation();
            const mkdirSpy = jest.spyOn(mockFs, "mkdirSync").mockImplementation();
            mockFs.existsSync.mockReturnValue(false); // logs dir does not exist

            logWarning("Test warning");

            expect(consoleSpy).toHaveBeenCalledWith("Test warning");
            expect(mkdirSpy).toHaveBeenCalledWith("logs", { recursive: true });
            expect(appendFileSpy).toHaveBeenCalledWith(
                expect.stringContaining("logs/warning.log"),
                expect.stringContaining("Test warning")
            );

            consoleSpy.mockRestore();
        });
    });

    describe("loadCategoryCodes", () => {
        it("should load category codes from m_category_series file", () => {
            mockFs.existsSync.mockReturnValue(true);
            const tsvContent = "series_code\tcategory_code\tdelete_flag\nS1\tC1\t0\nS2\tC2\t0";
            mockFs.readFileSync.mockReturnValue(tsvContent);

            const result = loadCategoryCodes("m_category_series.tsv");
            expect(result.get("S1")).toBe("C1");
            expect(result.get("S2")).toBe("C2");
        });

        it("should ignore records with delete_flag = 1", () => {
            mockFs.existsSync.mockReturnValue(true);
            const tsvContent =
                "series_code\tcategory_code\tdelete_flag\nS1\tC1\t0\nS2\tC2\t1\nS3\tC3\t0";
            mockFs.readFileSync.mockReturnValue(tsvContent);

            const result = loadCategoryCodes("m_category_series.tsv");
            expect(result.get("S1")).toBe("C1");
            expect(result.has("S2")).toBe(false);
            expect(result.get("S3")).toBe("C3");
        });

        it("should prioritize active records if duplicates exist", () => {
            mockFs.existsSync.mockReturnValue(true);
            // S1 has two records: one deleted, one active
            const tsvContent =
                "series_code\tcategory_code\tdelete_flag\nS1\tC1_deleted\t1\nS1\tC1_active\t0";
            mockFs.readFileSync.mockReturnValue(tsvContent);

            const result = loadCategoryCodes("m_category_series.tsv");
            expect(result.get("S1")).toBe("C1_active");
        });

        it("should throw error if required columns are missing", () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue("col1\tcol2");
            expect(() => loadCategoryCodes("m_category_series.tsv")).toThrow("Required columns");
        });

        it("should return empty map if file does not exist", () => {
            mockFs.existsSync.mockReturnValue(false);
            const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
            const result = loadCategoryCodes("non_existent.tsv");
            expect(result.size).toBe(0);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining("Warning: m_category_series file not found")
            );
            consoleSpy.mockRestore();
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
            const categoryCodeMap = new Map([["S1", "C1"]]);

            const result = extractSeriesData(
                "lang.tsv",
                "wysiwyg.tsv",
                brandCodeMap,
                categoryCodeMap,
                "TEST_REGION"
            );

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
                category_code: "C1",
            });
        });

        it("should warn if brand code or category code is missing", () => {
            const languageTsv = [
                "series_code\tseries_name\tcatchcopy\tseries_notice_top_1",
                "S1\tName1\tCatch1\tNotice1",
            ].join("\n");

            const wysiwygTsv = ["series_code\thtml", "S1\t<p>HTML1</p>"].join("\n");

            mockFs.readFileSync.mockImplementation((path: any) => {
                if (path === "lang.tsv") return languageTsv;
                if (path === "wysiwyg.tsv") return wysiwygTsv;
                return "";
            });

            const brandCodeMap = new Map();
            const categoryCodeMap = new Map();

            const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

            const result = extractSeriesData(
                "lang.tsv",
                "wysiwyg.tsv",
                brandCodeMap,
                categoryCodeMap,
                "TEST_REGION"
            );

            expect(result).toHaveLength(1);
            expect(result[0].brand_code).toBe("MSM1"); // Default
            expect(result[0].category_code).toBe("M1803060000"); // Default

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "Warning: Brand code not found for series: S1 (Region: TEST_REGION)"
                )
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "Warning: Category code not found for series: S1 (Region: TEST_REGION)"
                )
            );

            consoleSpy.mockRestore();
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
                category_code: "C1",
            };

            const result = generateMtdTsvFormat(seriesData, 100);
            const lines = result.split("\n");

            // ヘッダーチェック
            expect(lines[0]).toContain("anken_id");
            expect(lines[1]).toContain("B1"); // brand_code
            expect(lines[1]).toContain("C1"); // category_code
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
