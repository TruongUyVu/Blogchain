@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Thu muc hien tai: %cd%
if not exist dapp (
  echo KHONG thay thu muc dapp. Hay dat file nay trong D:\Blogchain
  pause
  exit /b
)
echo.
echo Dang bat may chu dapp. Khi thay dong "Serving!", mo trinh duyet vao:
echo     http://localhost:3000
echo GIU NGUYEN cua so nay trong luc dung dapp. Nhan Ctrl+C de dung.
echo.
call npx --yes serve dapp -l 3000
echo.
echo May chu da dung hoac bi loi. Chup man hinh cua so nay gui cho Claude.
pause
