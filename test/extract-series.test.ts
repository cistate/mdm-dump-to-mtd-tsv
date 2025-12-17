import * as fs from "fs";
import * as readline from "readline";
import { loadSeriesCodes, extractSeries } from "../src/extract-series";

// fsモジュールのモック化
jest.mock("fs");
// readlineモジュールのモック化
jest.mock("readline");

describe("extract-series", () => {
    const mockFs = fs as jest.Mocked<typeof fs>;
    const mockReadline = readline as jest.Mocked<typeof readline>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("loadSeriesCodes", () => {
        it("should throw error if file does not exist", () => {
            mockFs.existsSync.mockReturnValue(false);
            expect(() => loadSeriesCodes("non-existent.txt")).toThrow(
                "Series codes file not found"
            );
        });

        it("should throw error if file is empty", () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue("");
            expect(() => loadSeriesCodes("empty.txt")).toThrow("No series codes found in file");
        });

        it("should return list of codes", () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue("CODE1\nCODE2\n\nCODE3");
            const codes = loadSeriesCodes("codes.txt");
            expect(codes).toEqual(["CODE1", "CODE2", "CODE3"]);
        });
    });

    describe("extractSeries", () => {
        it("should extract matching series", async () => {
            const inputFile = "input.tsv";
            const outputFile = "output.tsv";
            const seriesCodesFile = "codes.txt";

            // モックの設定
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue("CODE1\nCODE2");

            // createReadStreamのモック
            const mockReadStream = {};
            (mockFs.createReadStream as jest.Mock).mockReturnValue(mockReadStream);

            // readline.createInterfaceのモック
            const mockRl = {
                [Symbol.asyncIterator]: async function* () {
                    yield "series_code\tdata";
                    yield "CODE1\tdata1";
                    yield "CODE3\tdata3";
                    yield "CODE2\tdata2";
                },
            };
            (mockReadline.createInterface as jest.Mock).mockReturnValue(mockRl);

            // createWriteStreamのモック
            const mockWriteStream = {
                write: jest.fn(),
                end: jest.fn(),
            };
            (mockFs.createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);

            await extractSeries(inputFile, outputFile, seriesCodesFile);

            // 検証
            expect(mockWriteStream.write).toHaveBeenCalledTimes(3); // ヘッダー + CODE1 + CODE2
            expect(mockWriteStream.write).toHaveBeenCalledWith("series_code\tdata\n");
            expect(mockWriteStream.write).toHaveBeenCalledWith("CODE1\tdata1\n");
            expect(mockWriteStream.write).toHaveBeenCalledWith("CODE2\tdata2\n");
            expect(mockWriteStream.end).toHaveBeenCalled();
        });
    });
});
