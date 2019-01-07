:: @echo off
:: set path=C:\Program Files\CMake\bin;%path%
:: call "C:\Program Files (x86)\Microsoft Visual Studio 14.0\VC\vcvarsall.bat"

@set ccp=%~dp0
@echo Code Contest Path %ccp%
@echo.

call :build_and_test Dino-Team         false
call :build_and_test Global_Domination true
call :build_and_test draginoi          false
call :build_and_test emm               false

goto :eof

:build_and_test

:: ----- Info -----

@echo --- Team %1 ---
@cd %ccp%.code-contest\%1\sched

:: ----- Build ----- 

cmake CMakeLists.txt
devenv ioccc.sln /build Release

:: ----- Test ----- 

python ..\..\..\code-contest-submit.py --srv http://localhost:8080/ --uid test-%1 --pid sched --cmd Release\ioccc.exe --src CMakeLists.txt --stdin %2

@echo.
goto :eof
