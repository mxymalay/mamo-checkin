$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

python -m PyInstaller --noconfirm --clean --onedir --console --name mamo-host --hidden-import windows_ocr --hidden-import PIL --hidden-import PIL.Image --hidden-import PIL.ImageOps --paths native --distpath build/win-runtime --workpath build/pyinstaller-host native/host.py
if ($LASTEXITCODE) { throw 'Host build failed' }
python -m PyInstaller --noconfirm --clean --onefile --console --name 'Install Windows OCR' --distpath build/win-installer --workpath build/pyinstaller-install native/windows_install.py
if ($LASTEXITCODE) { throw 'Installer build failed' }
python -m PyInstaller --noconfirm --clean --onefile --console --name 'Uninstall Windows OCR' --distpath build/win-uninstaller --workpath build/pyinstaller-uninstall native/windows_uninstall.py
if ($LASTEXITCODE) { throw 'Uninstaller build failed' }

$bundle = 'build/windows-ocr'
if (Test-Path $bundle) { Remove-Item $bundle -Recurse -Force }
New-Item $bundle -ItemType Directory | Out-Null
Copy-Item build/win-runtime/mamo-host "$bundle/host" -Recurse
New-Item "$bundle/host/tessdata" -ItemType Directory | Out-Null
python -c "import gzip,pathlib; pathlib.Path('build/windows-ocr/host/tessdata/eng.traineddata').write_bytes(gzip.decompress(pathlib.Path('node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz').read_bytes()))"
if ($LASTEXITCODE) { throw 'Bundled English model is missing' }
Copy-Item native/licenses/tessdata-LICENSE.txt "$bundle/host/tessdata/LICENSE.txt"
Set-Content "$bundle/host/tessdata/SOURCE.txt" '@tesseract.js-data/eng 1.0.0 / 4.0.0_best_int, unmodified. Source: https://github.com/naptha/tessdata'
Copy-Item 'build/win-installer/Install Windows OCR.exe' $bundle
$localizedInstaller = Join-Path $bundle '安装 Windows OCR.cmd'
[IO.File]::WriteAllText($localizedInstaller, "@echo off`r`n`"%~dp0Install Windows OCR.exe`"`r`n", [Text.Encoding]::ASCII)
Copy-Item 'build/win-uninstaller/Uninstall Windows OCR.exe' $bundle
$englishUninstaller = Join-Path $bundle 'Uninstall Windows OCR.cmd'
[IO.File]::WriteAllText($englishUninstaller, "@echo off`r`n`"%~dp0Uninstall Windows OCR.exe`" --language en`r`n", [Text.Encoding]::ASCII)
$localizedUninstaller = Join-Path $bundle '卸载 Windows OCR.cmd'
[IO.File]::WriteAllText($localizedUninstaller, "@echo off`r`n`"%~dp0Uninstall Windows OCR.exe`" --language zh`r`n", [Text.Encoding]::ASCII)
node scripts/package-docs.mjs windows ocr $bundle
Get-ChildItem $bundle -Filter '.DS_Store' -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
Compress-Archive -Path "$bundle/*" -DestinationPath build/mamo-ocr-windows.zip -Force

node scripts/build-extension.mjs
