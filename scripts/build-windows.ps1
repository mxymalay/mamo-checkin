$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

python -m PyInstaller --noconfirm --clean --onedir --console --name mamo-host --hidden-import windows_ocr --hidden-import PIL --hidden-import PIL.Image --hidden-import PIL.ImageOps --paths native --distpath build/win-runtime --workpath build/pyinstaller-host native/host.py
if ($LASTEXITCODE) { throw 'Host build failed' }
python -m PyInstaller --noconfirm --clean --onefile --console --name 'Install Windows OCR' --distpath build/win-installer-en --workpath build/pyinstaller-install-en native/windows_install.py
if ($LASTEXITCODE) { throw 'Installer build failed' }
python -m PyInstaller --noconfirm --clean --onefile --console --name '安装 Windows OCR' --distpath build/win-installer-zh --workpath build/pyinstaller-install-zh native/windows_install.py
if ($LASTEXITCODE) { throw 'Chinese installer build failed' }
python -m PyInstaller --noconfirm --clean --onefile --console --name 'Uninstall Windows OCR' --distpath build/win-uninstaller-en --workpath build/pyinstaller-uninstall-en native/windows_uninstall.py
if ($LASTEXITCODE) { throw 'Uninstaller build failed' }
python -m PyInstaller --noconfirm --clean --onefile --console --name '卸载 Windows OCR' --distpath build/win-uninstaller-zh --workpath build/pyinstaller-uninstall-zh native/windows_uninstall.py
if ($LASTEXITCODE) { throw 'Chinese uninstaller build failed' }

$bundle = 'build/windows-ocr'
if (Test-Path $bundle) { Remove-Item $bundle -Recurse -Force }
New-Item $bundle -ItemType Directory | Out-Null
$englishBundle = Join-Path $bundle 'English'
$localizedBundle = Join-Path $bundle '中文'
foreach($folder in @($englishBundle,$localizedBundle)){
 New-Item $folder -ItemType Directory | Out-Null
 Copy-Item build/win-runtime/mamo-host (Join-Path $folder 'host') -Recurse
 New-Item (Join-Path $folder 'host/tessdata') -ItemType Directory | Out-Null
 python -c "import gzip,pathlib; pathlib.Path(r'$folder/host/tessdata/eng.traineddata').write_bytes(gzip.decompress(pathlib.Path('node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz').read_bytes()))"
 if ($LASTEXITCODE) { throw 'Bundled English model is missing' }
 Copy-Item native/licenses/tessdata-LICENSE.txt (Join-Path $folder 'host/tessdata/LICENSE.txt')
 Set-Content (Join-Path $folder 'host/tessdata/SOURCE.txt') '@tesseract.js-data/eng 1.0.0 / 4.0.0_best_int, unmodified. Source: https://github.com/naptha/tessdata'
}
Copy-Item 'build/win-installer-en/Install Windows OCR.exe' (Join-Path $englishBundle 'Install Windows OCR.exe')
Copy-Item 'build/win-installer-zh/安装 Windows OCR.exe' (Join-Path $localizedBundle '安装 Windows OCR.exe')
Copy-Item 'build/win-uninstaller-en/Uninstall Windows OCR.exe' (Join-Path $englishBundle 'Uninstall Windows OCR.exe')
Copy-Item 'build/win-uninstaller-zh/卸载 Windows OCR.exe' (Join-Path $localizedBundle '卸载 Windows OCR.exe')
node scripts/package-docs.mjs windows ocr $bundle split
Get-ChildItem $bundle -Filter '.DS_Store' -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
Compress-Archive -Path "$bundle/*" -DestinationPath build/mamo-ocr-windows.zip -Force

node scripts/build-extension.mjs
