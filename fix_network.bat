@echo off
echo =======================================================
echo CCTV Network Fix Tool - Run this as Administrator
echo =======================================================

echo 1. Opening Firewall for Frontend (Port 5173)...
netsh advfirewall firewall add rule name="CCTV Frontend" dir=in action=allow protocol=TCP localport=5173

echo 2. Opening Firewall for Backend (Port 8000)...
netsh advfirewall firewall add rule name="CCTV Backend" dir=in action=allow protocol=TCP localport=8000

echo 3. Setting Wi-Fi network to Private (Allows other devices to connect)...
powershell -Command "Set-NetConnectionProfile -NetworkCategory Private"

echo.
echo =======================================================
echo DONE! 
echo Please restart the servers (or close this window if they are already running)
echo and try accessing https://192.168.1.19:5173 on your other device.
echo =======================================================
pause
