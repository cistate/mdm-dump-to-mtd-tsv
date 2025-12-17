#!/bin/bash


# シリーズコードリストに基づき、mdm-dump-tsv内の
# m_series_language.tsvおよびm_series_wysiwyg_language.tsvから
# 該当する原文データを抽出する
#
# Usage: ./extract-series.sh <series_codes_file> <region>
# Example: ./extract-series.sh data/series-code-filter/MJPJPN/series-code.txt MJPJPN

if [ -z "$1" ]; then
  echo "Error: Series codes file is required"
  echo "Usage: ./extract-series.sh <series_codes_file> <region>"
  echo "Example: ./extract-series.sh data/series-code-filter/MJPJPN/series-code.txt MJPJPN"
  exit 1
fi

series_codes_file="$1"
region="$2"

if [ -z "$region" ]; then
  echo "Error: Region is required"
  echo "Usage: ./extract-series.sh <series_codes_file> <region>"
  exit 1
fi

if [ ! -f "$series_codes_file" ]; then
  echo "Error: Series codes file not found: $series_codes_file"
  exit 1
fi

mdmdump_series="data/mdm-dump-tsv/${region}/m_series_language.tsv"
mdmdump_wy="data/mdm-dump-tsv/${region}/m_series_wysiwyg_language.tsv"

if [ ! -f "$mdmdump_series" ]; then
  echo "Error: Input file not found: $mdmdump_series"
  echo "Please place the required TSV files in data/mdm-dump-tsv/${region}/"
  exit 1
fi

if [ ! -f "$mdmdump_wy" ]; then
  echo "Error: Input file not found: $mdmdump_wy"
  echo "Please place the required TSV files in data/mdm-dump-tsv/${region}/"
  exit 1
fi

# 出力ディレクトリを作成
output_dir="tmp/series-code-filtered/${region}"
mkdir -p "$output_dir"

echo "Extracting series from: $series_codes_file"
echo "Output directory: $output_dir"
echo ""
echo "Extracting from m_series_language..."
ts-node src/extract-series.ts "$mdmdump_series" "${output_dir}/extracted_m_series_language.tsv" "$series_codes_file"

echo ""
echo "Extracting from m_series_wysiwyg_language..."
ts-node src/extract-series.ts "$mdmdump_wy" "${output_dir}/extracted_m_series_wysiwyg_language.tsv" "$series_codes_file"

echo ""
echo "Done! Check the $output_dir directory for results."