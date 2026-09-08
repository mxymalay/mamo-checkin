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
Copy-Item 'build/win-installer/Install Windows OCR.exe' $bundle
Copy-Item INSTALL-WINDOWS.md "$bundle/INSTALL.md"
Compress-Archive -Path "$bundle/*" -DestinationPath build/mamo-checkin-windows.zip -Force
