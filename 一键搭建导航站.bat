@echo off
rem =======================================================
rem 爱搜资源 - 导航站一键全自动搭建脚本 (Cloudflare Pages + D1)
rem 项目: https://github.com/yys9253462-gif/isoziyuan-nav
rem 教程: https://isoziyuan.com/p/100139/
rem 流程: 环境检测 -> GitHub授权+Fork -> Cloudflare授权
rem       -> D1建库建表 -> Pages部署 -> 设置后台密码
rem =======================================================
setlocal
title 导航站一键全自动搭建工具 - 爱搜资源
cd /d "%~dp0"

echo ==================================================
echo   导航站一键全自动搭建工具 (Cloudflare Pages + D1)
echo   全程只需在浏览器里点 2 次授权, 其余全自动
echo ==================================================
echo.

rem ---------- [0/8] 试运行模式检测与授权模式选择 ----------
set DRYRUN=0
if /i "%~1"=="dry" set DRYRUN=1

echo 请选择运行模式:
echo   [1] 识别本地已授权模式 (推荐, 自动检测并跳过已授权的账号)
echo   [2] 全新授权模式 (强制重新登录 GitHub 和 Cloudflare, 适合换号或重置)
echo.
set AUTH_FORCE=0
if "%DRYRUN%"=="1" (
    echo   [试运行] 默认使用识别模式 [1]
    goto step_env
)
choice /c 12 /m "请输入选项 [1 或 2]: "
if errorlevel 2 (
    set AUTH_FORCE=1
    echo   已选择: [2] 全新授权模式
) else (
    set AUTH_FORCE=0
    echo   已选择: [1] 识别本地已授权模式
)
echo.

:step_env

rem ---------- [1/8] 环境检测: git / node / gh ----------
echo [1/8] 检测运行环境 (Git / Node.js / GitHub CLI) ...
set MISSING=0
where git >nul 2>nul
if errorlevel 1 (
    echo   [X] 未检测到 Git
    set MISSING=1
) else (
    echo   [OK] Git 已安装
)
where node >nul 2>nul
if errorlevel 1 (
    echo   [X] 未检测到 Node.js
    set MISSING=1
) else (
    echo   [OK] Node.js 已安装
)
where gh >nul 2>nul
if errorlevel 1 (
    echo   [X] 未检测到 GitHub CLI ^(gh^)
    set MISSING=1
) else (
    echo   [OK] GitHub CLI 已安装
)

if "%MISSING%"=="1" goto install_missing
goto step_github

:install_missing
echo.
echo 检测到缺少组件, 是否尝试用 winget 自动安装? ^(需要 Win10/11^)
choice /c YN /m "输入 Y 自动安装, N 退出后手动安装"
if errorlevel 2 goto abort_install
echo 正在通过 winget 安装缺失组件 (可能需要几分钟) ...
where git >nul 2>nul
if errorlevel 1 winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
where node >nul 2>nul
if errorlevel 1 winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
where gh >nul 2>nul
if errorlevel 1 winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
echo.
echo [提示] 组件安装完成。如果本窗口仍提示找不到命令,
echo        请关闭本窗口重新双击运行脚本 ^(刷新环境变量^)。
pause
exit /b 0

:abort_install
echo 请手动安装以下组件后重新运行本脚本:
echo   Git:      https://git-scm.com/download/win
echo   Node.js:  https://nodejs.org ^(LTS 版本^)
echo   gh CLI:   https://cli.github.com
pause
exit /b 1

rem ---------- [2/8] GitHub 授权 ----------
:step_github
echo.
if "%DRYRUN%"=="1" goto step_github_do
if "%AUTH_FORCE%"=="0" (
    gh auth status >nul 2>nul
    if not errorlevel 1 (
        echo   [OK] 检测到本机已有 GitHub 授权, 跳过登录步骤
        goto step_fork
    )
)
:step_github_do
echo [2/8] GitHub 授权 — 请按下面 3 步操作:
echo.
echo   第 1 步: 屏幕马上会显示一个一次性代码, 形如 XXXX-XXXX
echo           ^(英文提示 First copy your one-time code^), 请先选中它按回车复制
echo   第 2 步: 看到英文提示 Press Enter to open ... 时, 按一下回车键,
echo           会自动打开浏览器进入 GitHub 登录页 ^(不是卡死, 就是在等你按键^)
echo   第 3 步: 在浏览器登录 GitHub 账号, 输入刚才复制的代码,
echo           点击 Authorize 授权, 然后回到本窗口继续
echo.
echo ----------------------------------------------
if "%DRYRUN%"=="1" echo   [试运行] gh auth login --web --git-protocol https
if "%DRYRUN%"=="0" gh auth login --hostname github.com --git-protocol https --web
if errorlevel 1 goto fail_github
echo   [OK] GitHub 授权成功
:step_fork
echo.
echo [2/8] 正在准备项目代码 ...
rem 场景 A: 用户直接在解压/克隆的仓库根目录下运行本脚本
if exist "wrangler.jsonc" if exist "schema.sql" (
    echo   [OK] 检测到当前目录已是导航站源码目录, 无需重复克隆
    goto step_cf_login
)

rem 场景 B: 用户在外部目录运行, 且已有 isoziyuan-nav 子文件夹
if exist "isoziyuan-nav\wrangler.jsonc" (
    echo   [提示] 检测到已有完整代码目录, 直接复用
    cd isoziyuan-nav
    echo   [OK] 已进入 %cd%
    goto step_cf_login
)
if "%DRYRUN%"=="1" goto fork_done
rem 识别当前授权账号: 仓库作者本人运行时 GitHub 不允许 Fork 自己的仓库
set "GH_USER="
for /f "usebackq delims=" %%u in (`gh api user -q .login 2^>nul`) do set "GH_USER=%%u"
if "%GH_USER%"=="yys9253462-gif" goto fork_owner
echo   正在 Fork 仓库到你的 GitHub 账号 ^(%GH_USER%^) ...
gh repo fork yys9253462-gif/isoziyuan-nav --clone
if not errorlevel 1 goto fork_done
echo   [提示] Fork 未成功, 改为直接克隆仓库 ...
if not "%GH_USER%"=="" git clone --depth 1 https://github.com/%GH_USER%/isoziyuan-nav.git 2>nul
if exist "isoziyuan-nav" goto fork_done
git clone --depth 1 https://github.com/yys9253462-gif/isoziyuan-nav.git
goto fork_done

:fork_owner
echo   [提示] 当前账号就是仓库作者, 无需 Fork, 直接克隆
git clone --depth 1 https://github.com/yys9253462-gif/isoziyuan-nav.git

:fork_done
if "%DRYRUN%"=="1" goto step_cf_login
if not exist "isoziyuan-nav" goto fail_github
cd isoziyuan-nav
echo   [OK] 代码已克隆到 %cd%
goto step_cf_login

:fail_github
echo.
echo [X] 获取仓库代码失败, 常见原因:
echo     1. 网络无法访问 github.com ^(请检查代理/VPN 后重新运行^)
echo     2. GitHub 授权已过期 ^(运行: gh auth login 重新授权^)
echo     3. 目标文件夹里已有同名文件冲突
echo 修复后重新双击运行本脚本即可, 已完成的授权会自动跳过。
pause
exit /b 1

rem ---------- [3/8] Cloudflare 授权 ----------
:step_cf_login
echo.
if "%DRYRUN%"=="1" goto step_cf_do
if "%AUTH_FORCE%"=="0" (
    call npx wrangler whoami >nul 2>nul
    if not errorlevel 1 (
        echo   [OK] 检测到本机已有 Cloudflare 授权, 跳过登录步骤
        goto step_d1
    )
)
:step_cf_do
echo [3/8] Cloudflare 授权 ^(会打开浏览器, 登录你的 Cloudflare 账号并点击 Allow^) ...
if "%DRYRUN%"=="1" (
    echo   [试运行] npx wrangler login
    goto step_d1
)
call npx wrangler login
if errorlevel 1 goto fail_cf
call npx wrangler whoami
goto step_d1

:fail_cf
echo.
echo [X] Cloudflare 授权失败。请检查网络或代理后重新运行本脚本。
pause
exit /b 1

rem ---------- [4/8] 创建 D1 数据库 ----------
:step_d1
echo.
echo [4/8] 创建免费的 D1 数据库: isoziyuan-nav-db ...
if "%DRYRUN%"=="1" (
    echo   [试运行] npx wrangler d1 create isoziyuan-nav-db
    goto step_schema
)
call npx wrangler d1 create isoziyuan-nav-db > d1_create_result.txt 2>&1
if errorlevel 1 goto fail_d1
findstr /c:"database_id" d1_create_result.txt
del d1_create_result.txt
echo   [OK] 数据库创建成功
goto step_schema

:fail_d1
echo.
echo [提示] D1 数据库创建失败 ^(可能同名数据库已存在, 尝试复用^) ...
if exist d1_create_result.txt del d1_create_result.txt
goto step_schema

rem ---------- [5/8] 修正 wrangler.jsonc 中的数据库 ID 并初始化表 ----------
:step_schema
echo.
echo [5/8] 校准数据库绑定并初始化数据表 ...
if "%DRYRUN%"=="1" (
    echo   [试运行] 修正 wrangler.jsonc 的 database_id + 执行 schema.sql
    goto step_project
)
rem 稳健获取新数据库 ID 并写入 wrangler.jsonc (PowerShell 解析 JSON, 避免 token 切分错误)
set "NEW_DB_ID="
for /f "delims=" %%a in ('powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue'; $j = (npx wrangler d1 info isoziyuan-nav-db --json 2^>$null | ConvertFrom-Json); if($j.uuid){$j.uuid} elseif($j.database_id){$j.database_id}"') do set "NEW_DB_ID=%%a"
if "%NEW_DB_ID%"=="" (
    for /f "tokens=2 delims=: " %%a in ('call npx wrangler d1 info isoziyuan-nav-db --json 2^>nul ^| findstr /i "uuid database_id"') do set NEW_DB_ID=%%a
    set NEW_DB_ID=%NEW_DB_ID:"=%
    set NEW_DB_ID=%NEW_DB_ID:,=%
)
if "%NEW_DB_ID%"=="" goto fail_dbid
echo   新数据库 ID: %NEW_DB_ID%
powershell -NoProfile -Command "$f='wrangler.jsonc'; $enc=[System.Text.Encoding]::UTF8; $t=[IO.File]::ReadAllText($f, $enc); $t=[regex]::Replace($t,'\"database_id\":\s*\"[0-9a-fA-F-]+\"','\"database_id\": \"%NEW_DB_ID%\"'); [IO.File]::WriteAllText($f, $t, $enc)"
echo   [OK] wrangler.jsonc 已指向你的专属数据库

call npx wrangler d1 execute isoziyuan-nav-db --remote --file schema.sql -y
if errorlevel 1 goto fail_schema
echo   [OK] 数据表初始化完成
goto step_project

:fail_dbid
echo [X] 未能获取新数据库 ID, 请截图联系作者。
pause
exit /b 1

:fail_schema
echo [X] 数据表初始化失败, 请检查网络后重新运行 ^(会自动跳过已完成步骤^)。
pause
exit /b 1

rem ---------- [6/8] 创建 Pages 项目 ----------
:step_project
echo.
echo [6/8] 创建 Cloudflare Pages 项目: isoziyuan-nav ...
if "%DRYRUN%"=="1" (
    echo   [试运行] call npx wrangler pages project create isoziyuan-nav --production-branch main
    goto step_password
)
call npx wrangler pages project create isoziyuan-nav --production-branch main 2>nul
if errorlevel 1 (
    echo   [提示] 项目可能已存在, 继续使用现有项目。
)
echo   [OK] Pages 项目就绪
goto step_password

rem ---------- [7/8] 设置后台管理密码 ----------
:step_password
echo.
echo [7/8] 设置后台管理密码 ^(用于登录 /admin 管理面板^) ...
set "ADMIN_PASS="
set /p ADMIN_PASS=请输入你想设置的管理密码 ^(字母和数字, 直接回车自动生成随机密码^): 
if "%ADMIN_PASS%"=="" (
    for /f %%a in ('powershell -NoProfile -Command "-join((48..57)+(65..90)+(97..122) | Get-Random -Count 10 | %%{[char]$_})"') do set "ADMIN_PASS=Nav%%a2026"
)
echo 你的后台管理密码: %ADMIN_PASS%
echo ^(请立即抄写保存, 后面还会再显示一次^)
if "%DRYRUN%"=="1" (
    echo   [试运行] call npx wrangler pages secret put ADMIN_PASSWORD --project-name isoziyuan-nav
    goto step_deploy
)
powershell -NoProfile -Command "[IO.File]::WriteAllText('adminpass.tmp','%ADMIN_PASS%')"
call npx wrangler pages secret put ADMIN_PASSWORD --project-name isoziyuan-nav < adminpass.tmp
del adminpass.tmp
if errorlevel 1 goto fail_secret
echo   [OK] 管理密码已加密写入
goto step_deploy

:fail_secret
echo [X] 密码写入失败, 请重新运行本脚本重试该步骤。
pause
exit /b 1

rem ---------- [8/8] 部署上线 ----------
:step_deploy
echo.
echo [8/8] 正在部署到 Cloudflare 全球边缘节点 ...
if "%DRYRUN%"=="1" (
    echo   [试运行] npx wrangler pages deploy . --project-name isoziyuan-nav --branch main
    goto done
)
call npx wrangler pages deploy . --project-name isoziyuan-nav --branch main --commit-dirty=true
if errorlevel 1 goto fail_deploy
goto done

:fail_deploy
echo [X] 部署失败, 请检查网络后重新运行本脚本。
pause
exit /b 1

rem ---------- 完成 ----------
:done
echo.
echo ==================================================
echo   恭喜! 导航站搭建完成!
echo.
echo   你的导航站:  https://isoziyuan-nav.pages.dev
echo   管理后台:    https://isoziyuan-nav.pages.dev/admin
echo   后台密码:    %ADMIN_PASS%
echo.
echo   首次登录后台: 点击一次 [保存全部修改],
echo   即可把默认分类和站点导入你自己的数据库!
echo.
echo   绑定独立域名: Cloudflare 控制台 - Pages 项目
echo   - 自定义域 - 输入你的域名即可自动解析
echo ==================================================
echo.
rem 自动保存一份凭据到桌面, 防止手滑关闭窗口导致密码丢失
powershell -NoProfile -Command "$dt=[Environment]::GetFolderPath('Desktop'); $p=Join-Path $dt '导航站后台信息.txt'; $content="==============================`r`n导航站搭建信息 (请妥善保管)`r`n==============================`r`n导航站网址: https://isoziyuan-nav.pages.dev`r`n管理后台:   https://isoziyuan-nav.pages.dev/admin`r`n后台密码:   %ADMIN_PASS%`r`n搭建时间:   " + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss'); [IO.File]::WriteAllText($p, $content, [System.Text.Encoding]::UTF8); Write-Host '  [提示] 账号密码已自动备份到你的桌面: 导航站后台信息.txt'"
echo.
echo 感谢使用爱搜资源教程 ^(https://isoziyuan.com^)
pause
exit /b 0
