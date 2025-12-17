#!/bin/bash

# data/series-code-filter内のすべてのテキストファイルに対して
# 1. extract-series.shを実行
# 2. generate-mtd-tsv-format.shを実行
# を順次実行する

series_filter_dir='data/series-code-filter'

# ログファイルを初期化
log_file="logs/warning.log"
if [ -f "$log_file" ]; then
  rm "$log_file"
fi

if [ ! -d "$series_filter_dir" ]; then
  echo "Error: Directory not found: $series_filter_dir"
  exit 1
fi

echo "Processing series code files in $series_filter_dir..."
echo "========================================"
echo ""

# 各リージョンディレクトリに対して処理を実行
for region_dir in "$series_filter_dir"/*; do
  if [ ! -d "$region_dir" ]; then
    continue
  fi

  region=$(basename "$region_dir")
  
  # リージョン内の各テキストファイルに対して処理を実行
  for txt_file in "$region_dir"/*.txt; do
    if [ ! -e "$txt_file" ]; then
      continue
    fi

    # ファイル名からprefixを取得（拡張子なし）
    filename=$(basename "$txt_file")
    
    echo "Processing: $filename (Region: $region)"
    echo "----------------------------------------"
    
    # 1. 該当するシリーズコードのデータを抽出
    echo "Step 1: Extracting data for the specified series codes..."
    ./extract-series.sh "$txt_file" "$region"
    
    if [ $? -ne 0 ]; then
      echo "Error: Failed to extract series data for $filename"
      echo ""
      continue
    fi
    
    echo ""
    
    # 2. MTD 形式のTSVを生成
    echo "Step 2: Generating MTD format TSV..."
    ./generate-mtd-tsv-format.sh "$region"
    
    if [ $? -ne 0 ]; then
      echo "Error: Failed to generate MTD format for $filename"
      echo ""
      continue
    fi
    
    echo ""
    echo "✓ Completed processing for $filename"
    echo "========================================"
    echo ""
  done
done

echo ""
echo "All processing completed!"
echo "Check the output/mtd-tsv directory for results."