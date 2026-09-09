$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
python -m PyInstaller --noconfirm --clean --onedir --console --name mamo-host --hidden-import windows_ocr --paths native --distpath build/win-runtime --workpath build/pyinstaller-host native/host.py
if ($LASTEXITCODE) { throw 'Host build failed' }
python -m PyInstaller --noconfirm --clean --onefile --console --name 'Install Windows OCR' --distpath build/win-installer --workpath build/pyinstaller-install native/windows_install.py
if ($LASTEXITCODE) { throw 'Installer build failed' }
$bundle = 'build/windows'
if (Test-Path $bundle) { Remove-Item $bundle -Recurse -Force }
New-Item $bundle -ItemType Directory | Out-Null
Copy-Item extension "$bundle/extension" -Recurse
'local-service.js','offscreen.html','offscreen.js','ocr-controller.js','ocr-engine.js' | ForEach-Object { Remove-Item "$bundle/extension/$_" -ErrorAction SilentlyContinue }
Copy-Item build/win-runtime/mamo-host "$bundle/host" -Recurse
New-Item "$bundle/host/tessdata" -ItemType Directory | Out-Null
python -c "import gzip,pathlib; pathlib.Path('build/windows/host/tessdata/eng.traineddata').write_bytes(gzip.decompress(pathlib.Path('node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz').read_bytes()))"
if ($LASTEXITCODE) { throw 'Bundled English model is missing' }
Copy-Item native/licenses/tessdata-LICENSE.txt "$bundle/host/tessdata/LICENSE.txt"
Set-Content "$bundle/host/tessdata/SOURCE.txt" '@tesseract.js-data/eng 1.0.0 / 4.0.0_best_int, unmodified. Source: https://github.com/naptha/tessdata'
Copy-Item 'build/win-installer/Install Windows OCR.exe' $bundle
Copy-Item INSTALL-WINDOWS.md "$bundle/INSTALL.md"
Compress-Archive -Path "$bundle/*" -DestinationPath build/mamo-checkin-windows.zip -Force
$companion = 'build/windows-ocr'
if (Test-Path $companion) { Remove-Item $companion -Recurse -Force }
New-Item $companion -ItemType Directory | Out-Null
Copy-Item "$bundle/host" "$companion/host" -Recurse
Copy-Item "$bundle/Install Windows OCR.exe" $companion
Copy-Item store/OCR-INSTALL.md "$companion/INSTALL.md"
Compress-Archive -Path "$companion/*" -DestinationPath build/mamo-ocr-windows.zip -Force
