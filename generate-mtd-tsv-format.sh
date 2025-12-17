#!/bin/bash

# extracted_m_series_language.tsvとextracted_m_series_wysiwyg_language.tsvから
# MTD形式のTSVファイルを生成
#
# Usage: ./generate-mtd-tsv-format.sh <region>
# Example: ./generate-mtd-tsv-format.sh MJPJPN

if [ -z "$1" ]; then
  echo "Error: Region is required"
  echo "Usage: ./generate-mtd-tsv-format.sh <region>"
  echo "Example: ./generate-mtd-tsv-format.sh MJPJPN"
  exit 1
fi

region="$1"

input_dir="tmp/series-code-filtered/${region}"
series_file="${input_dir}/extracted_m_series_language.tsv"
wysiwyg_file="${input_dir}/extracted_m_series_wysiwyg_language.tsv"
brand_code_file="data/mdm-dump-tsv/${region}/m_series.tsv"
category_code_file="data/mdm-dump-tsv/${region}/m_category_series.tsv"
output_dir="output/mtd-tsv/${region}"

if [ ! -f "$series_file" ]; then
  echo "Error: Language file not found: $series_file"
  exit 1
fi

if [ ! -f "$wysiwyg_file" ]; then
  echo "Error: WYSIWYG file not found: $wysiwyg_file"
  exit 1
fi

# m_series file is optional
if [ ! -f "$brand_code_file" ]; then
  echo "Warning: m_series file not found: $brand_code_file"
fi

# m_category_series file is optional
if [ ! -f "$category_code_file" ]; then
  echo "Warning: m_category_series file not found: $category_code_file"
fi

echo "Generating MTD format TSV files..."
echo "Input directory: $input_dir"
echo "Output directory: $output_dir"
ts-node src/generate-mtd-tsv-format.ts "$series_file" "$wysiwyg_file" "$brand_code_file" "$category_code_file" "$output_dir"

echo ""
echo "Done! Check the $output_dir directory for results."