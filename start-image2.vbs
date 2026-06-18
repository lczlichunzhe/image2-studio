Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
safeRoot = Replace(root, "'", "''")
shell.CurrentDirectory = root

ps = "$owners = Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; " & _
  "foreach ($ownerPid in $owners) { try { Stop-Process -Id $ownerPid -Force -ErrorAction SilentlyContinue } catch {} }; " & _
  "Start-Sleep -Milliseconds 450; " & _
  "Start-Process -WindowStyle Hidden -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory '" & safeRoot & "'; " & _
  "Start-Sleep -Milliseconds 1200; " & _
  "Start-Process 'http://localhost:4173'"

command = "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command " & Chr(34) & ps & Chr(34)
shell.Run command, 0, False
