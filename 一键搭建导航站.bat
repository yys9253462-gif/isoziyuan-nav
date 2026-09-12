@echo off
rem =======================================================
rem 爱搜资源 - 导航站一键全自动搭建脚本 (Cloudflare Pages + D1)
rem 项目: https://github.com/yys9253462-gif/isoziyuan-nav
rem 教程: https://isoziyuan.com/p/100139/
rem 流程: 环境检测 -> GitHub授权+Fork -> Cloudflare授权
rem       -> D1建库建表 -> Pages部署 -> 设置后台密码
rem =======================================================
setlocal
title 导航站一键全自动搭建工具
cd /d "%~dp0"

rem ---------- 自动检测并继承系统与 V2Ray 代理配置 (解决 GitHub/CF TLS 超时与阻断) ----------
set "SYS_PROXY="
set "PROXY_ENABLED=0"
for /f "tokens=3" %%i in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyEnable 2^>nul ^| findstr "0x1"') do (
    set "PROXY_ENABLED=1"
)
if "%PROXY_ENABLED%"=="1" (
    for /f "tokens=3" %%i in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v ProxyServer 2^>nul') do (
        set "SYS_PROXY=%%i"
    )
)

rem 如果系统代理未直接开启，自动侦测本地运行中的 V2Ray 核心端口 (10808 / 10809 / 7890)
if not "%SYS_PROXY%"=="" goto check_proxy_format
netstat -ano | findstr /c":10808" >nul 2>nul
if not errorlevel 1 (
    set "SYS_PROXY=127.0.0.1:10808"
    echo [网络环境] 自动侦测到本地运行中的 V2Ray 核心代理: 127.0.0.1:10808
    goto check_proxy_format
)
netstat -ano | findstr /c":10809" >nul 2>nul
if not errorlevel 1 (
    set "SYS_PROXY=127.0.0.1:10809"
    echo [网络环境] 自动侦测到本地运行中的 V2Ray HTTP 代理: 127.0.0.1:10809
    goto check_proxy_format
)
netstat -ano | findstr /c":7890" >nul 2>nul
if not errorlevel 1 (
    set "SYS_PROXY=127.0.0.1:7890"
    echo [网络环境] 自动侦测到本地运行中的代理端口: 127.0.0.1:7890
    goto check_proxy_format
)
:check_proxy_format

if "%SYS_PROXY%"=="" goto proxy_done
echo %SYS_PROXY% | findstr /i "://" >nul
if not errorlevel 1 goto proxy_ready
set "SYS_PROXY=http://%SYS_PROXY%"
:proxy_ready
set "HTTP_PROXY=%SYS_PROXY%"
set "HTTPS_PROXY=%SYS_PROXY%"
set "http_proxy=%SYS_PROXY%"
set "https_proxy=%SYS_PROXY%"
set "ALL_PROXY=%SYS_PROXY%"
set "all_proxy=%SYS_PROXY%"
echo [网络环境] 已成功挂接网络加速代理: %SYS_PROXY%
echo [网络环境] GitHub 与 Cloudflare 全套 API / 静态资源直传已全面开启网络加速。
echo.
:proxy_done

echo ==================================================
echo   导航站一键全自动搭建工具 (Cloudflare Pages + D1)
echo   全程只需在浏览器里点 2 次授权, 其余全自动
echo ==================================================
echo.

rem ---------- [0/8] 试运行模式检测与授权模式选择 ----------
set DRYRUN=0
set "SITE_URL="
if /i "%~1"=="dry" set DRYRUN=1

echo 请选择运行模式:
echo   [1] 识别本地已授权模式 (推荐, 自动检测并跳过已授权的账号)
echo   [2] 全新授权模式 (强制重新登录 GitHub 和 Cloudflare, 适合换号或重置)
echo   [3] 一键删除 GitHub / Cloudflare 中所有 isoziyuan 相关项目
echo   [4] 一键清除 GitHub 和 Cloudflare 所有登录状态
echo.
set AUTH_FORCE=0
set CLEANUP_MODE=0
set LOGOUT_MODE=0
if "%DRYRUN%"=="1" (
    echo   [试运行] 默认使用识别模式 [1]
    goto step_env
)
choice /c 1234 /m "请输入选项 [1、2、3 或 4]: "
if errorlevel 4 goto choose_logout
if errorlevel 3 goto choose_cleanup
if errorlevel 2 goto choose_force
set AUTH_FORCE=0
echo   已选择: [1] 识别本地已授权模式
goto step_env

:choose_logout
set LOGOUT_MODE=1
echo   已选择: [4] 清除所有登录状态
goto step_env

:choose_cleanup
set CLEANUP_MODE=1
echo   已选择: [3] 清理所有 isoziyuan 远程资源
goto step_env

:choose_force
set AUTH_FORCE=1
echo   已选择: [2] 全新授权模式
goto step_env

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
if "%LOGOUT_MODE%"=="1" goto logout_all
if "%CLEANUP_MODE%"=="1" goto cleanup_start
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
set "FAIL_REASON=缺少必要组件 (Git / Node.js / gh CLI), 需先手动安装"
goto fail_restart

rem ---------- [2/8] GitHub 授权 ----------
:step_github
echo.
if "%DRYRUN%"=="1" goto step_github_do
if "%AUTH_FORCE%"=="1" goto step_github_force
gh auth status >nul 2>nul
if not errorlevel 1 (
    echo   [OK] 检测到本机已有 GitHub 授权, 跳过登录步骤
    goto step_fork
)
goto step_github_do

:step_github_force
echo [提示] 正在退出当前已登录的 GitHub 旧账号...
call gh auth logout --hostname github.com 2>nul
echo [OK] 已清理旧 GitHub 登录状态，准备开始全新登录。
echo.

:step_github_do
echo [2/8] GitHub 授权 — 请按下面 3 步操作:
echo.
echo   第 1 步: 屏幕马上会显示一个一次性代码, 形如 XXXX-XXXX
echo           ^(代码已自动复制到剪贴板, 无需手动复制^)
echo   第 2 步: 看到英文提示 Press Enter to open ... 时, 按一下回车键,
echo           会自动打开浏览器进入 GitHub 登录页 ^(不是卡死, 就是在等你按键^)
echo   第 3 步: 在浏览器登录 GitHub 账号, 粘贴代码 ^(Ctrl+V^),
echo           点击 Authorize 授权, 然后回到本窗口继续
echo.
echo ----------------------------------------------
if "%DRYRUN%"=="1" (
    echo   [试运行] gh auth login --web --git-protocol https --clipboard
    goto step_fork
)
rem ---------- 自动重试机制: 最多 2 次全自动授权 ----------
set "GH_TRY=0"
:gh_login_loop
set /a GH_TRY+=1
echo.
echo [GitHub 授权] 第 %GH_TRY%/2 次尝试 ...
call gh auth login --hostname github.com --git-protocol https --web --clipboard
call gh auth status >nul 2>nul
if not errorlevel 1 goto gh_login_ok
if %GH_TRY% GEQ 2 goto fail_gh_login
echo   [提示] 第 %GH_TRY% 次授权未成功, 5 秒后自动进行第 2 次授权...
timeout /t 5 /nobreak >nul 2>nul
goto gh_login_loop

:gh_login_ok
echo   [OK] GitHub 授权成功
goto step_fork

:fail_gh_login
echo.
echo [X] GitHub 授权连续 2 次失败。常见原因:
echo     1. 浏览器授权页面未完成登录或未点击 Authorize
echo     2. 网络/代理无法访问 github.com
echo     3. 终端未继承系统代理 ^(脚本已自动尝试注入, 若仍失败请检查代理软件^)
echo 排查后可重新运行本脚本, 已完成的步骤会自动跳过。
set "FAIL_REASON=GitHub 授权连续 2 次失败"
goto fail_restart

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
set "FAIL_REASON=获取仓库代码失败"
goto fail_restart

rem ---------- [3/8] Cloudflare 授权 ----------
:step_cf_login
echo.
if "%DRYRUN%"=="1" goto step_cf_do
if "%AUTH_FORCE%"=="1" goto step_cf_force
call :check_cf_auth
if "%CF_AUTH_OK%"=="1" (
    echo   [OK] 检测到本机已有 Cloudflare 授权, 跳过登录步骤
    goto step_d1
)
goto step_cf_do

:step_cf_force
echo [提示] 正在退出当前已登录的 Cloudflare 旧账号...
call npx wrangler logout 2>nul
echo [OK] 已清理旧 Cloudflare 登录状态，准备开始全新登录。
echo.

:step_cf_do
echo [3/8] Cloudflare 授权 ^(会打开浏览器, 登录你的 Cloudflare 账号并点击 Allow^) ...
if "%DRYRUN%"=="1" (
    echo   [试运行] npx wrangler login
    goto step_d1
)
rem ---------- 自动重试机制: 最多 2 次全自动授权 ----------
set "CF_TRY=0"
:cf_login_loop
set /a CF_TRY+=1
if %CF_TRY% GTR 1 (
    echo   [提示] 正在清理上次授权的残留状态, 然后重新授权...
    call npx wrangler logout >nul 2>nul
    echo.
)
echo [Cloudflare 授权] 第 %CF_TRY%/2 次尝试 ...
call npx wrangler login
rem 登录命令和 whoami 的退出码都不可靠，必须检查实际输出
call :check_cf_auth
if "%CF_AUTH_OK%"=="1" goto cf_login_ok
if %CF_TRY% GEQ 2 goto fail_cf
echo   [提示] 第 %CF_TRY% 次授权未成功, 5 秒后自动进行第 2 次授权...
timeout /t 5 /nobreak >nul 2>nul
goto cf_login_loop

:cf_login_ok
echo   [OK] Cloudflare 授权验证通过
call npx wrangler whoami
goto step_d1

:fail_cf
echo.
echo [X] Cloudflare 授权连续 2 次失败。常见原因:
echo     1. 浏览器授权页面没有点击 Allow 就关闭了
echo     2. 网络或代理异常, 未收到授权回调
echo     3. 本机 8976 端口被占用, 导致回调失败
echo 排查后可重新运行本脚本, 已完成的步骤会自动跳过。
set "FAIL_REASON=Cloudflare 授权连续 2 次失败"
goto fail_restart

rem ---------- [4/8] 创建 D1 数据库 ----------
:step_d1
echo.
set "D1_NAME=isoziyuan-nav-db"
echo [4/8] 检查 D1 数据库: %D1_NAME% ...
if "%DRYRUN%"=="1" (
    echo   [试运行] npx wrangler d1 create %D1_NAME%
    goto step_schema
)
rem 每次都从当前 Cloudflare 账户读取真实 ID，避免使用旧的失效 ID
call :lookup_db_id
if defined NEW_DB_ID (
    echo   [OK] 检测到数据库已存在，真实 ID: %NEW_DB_ID%
    goto step_schema
)
if /i "%DB_LOOKUP_STATUS%"=="ERROR" echo   [提示] 数据库列表查询失败，直接尝试创建数据库...
call npx wrangler d1 create %D1_NAME% --binding NAV_DB --update-config > d1_create_result.txt 2>&1
if errorlevel 1 goto handle_d1_err
call :extract_uuid_from_file "d1_create_result.txt"
if exist d1_create_result.txt del d1_create_result.txt
if not defined NEW_DB_ID call :lookup_db_id
if not defined NEW_DB_ID goto fail_dbid
echo   [OK] 数据库创建成功
goto step_schema

:handle_d1_err
findstr /i /c:"already exists" d1_create_result.txt >nul 2>nul
if not errorlevel 1 (
    echo   [OK] 检测到数据库已存在，重新读取真实 ID。
    if exist d1_create_result.txt del d1_create_result.txt
    goto lookup_existing_d1
)
findstr /i /c:"A database with the name" d1_create_result.txt >nul 2>nul
if not errorlevel 1 (
    echo   [OK] 检测到数据库已存在，重新读取真实 ID。
    if exist d1_create_result.txt del d1_create_result.txt
    goto lookup_existing_d1
)
findstr /i /c:"logged in" d1_create_result.txt >nul 2>nul
if not errorlevel 1 goto fail_need_cf_login
findstr /i /c:"authentication" d1_create_result.txt >nul 2>nul
if not errorlevel 1 goto fail_need_cf_login
echo.
echo [警告] D1 数据库创建异常:
type d1_create_result.txt
if exist d1_create_result.txt del d1_create_result.txt
echo   尝试继续检测数据库绑定...
goto lookup_existing_d1

:lookup_existing_d1
set "NEW_DB_ID="
set "DBINFO_TRY=0"
:lookup_existing_d1_loop
set /a DBINFO_TRY+=1
call :lookup_db_id
if defined NEW_DB_ID goto step_schema
if %DBINFO_TRY% GEQ 3 goto fail_dbid
echo   [提示] 数据库 ID 暂时未读取到，3 秒后重试...
timeout /t 3 /nobreak >nul 2>nul
goto lookup_existing_d1_loop

:fail_need_cf_login
echo.
if exist d1_create_result.txt del d1_create_result.txt
if "%CF_REAUTH_TRIED%"=="1" goto fail_need_cf_login_final
set "CF_REAUTH_TRIED=1"
echo [提示] Cloudflare 登录状态无效，正在自动重新授权...
goto step_cf_do

:fail_need_cf_login_final
echo [X] 检测到 Cloudflare 登录状态无效, 无法继续创建数据库。
set "FAIL_REASON=Cloudflare 登录状态无效"
goto fail_restart

rem ---------- [5/8] 修正 wrangler.jsonc 中的数据库 ID 并初始化表 ----------
:step_schema
echo.
echo [5/8] 校准数据库绑定并初始化数据表 ...
if "%DRYRUN%"=="1" (
    echo   [试运行] 修正 wrangler.jsonc 的 database_id + 执行 schema.sql
    goto step_project
)
rem 稳健获取数据库 ID: 优先复用 [4/8] 建库输出中提取的本地 ID (零网络请求)
if defined NEW_DB_ID goto validate_db_id
set "DBINFO_TRY=0"
:dbinfo_loop
set /a DBINFO_TRY+=1
echo   [查询] 正在获取数据库信息 (第 %DBINFO_TRY%/2 次尝试) ...
rem 必须从账户清单按名称匹配；d1 info 会被旧 wrangler 绑定误导
call :lookup_db_id
if defined NEW_DB_ID goto validate_db_id
if %DBINFO_TRY% GEQ 2 goto fail_dbid
echo   [提示] 查询未成功, 3 秒后自动重试...
timeout /t 3 /nobreak >nul 2>nul
goto dbinfo_loop

:validate_db_id
rem 校验 ID 合法性 (仅允许十六进制字符和连字符), 防止把垃圾值写进配置
echo %NEW_DB_ID%| findstr /r /i /c:"^[0-9a-f][0-9a-f-]*" >nul
if errorlevel 1 goto fail_dbid
echo   新数据库 ID: %NEW_DB_ID%
powershell -NoProfile -Command "$f='wrangler.jsonc'; $t=[IO.File]::ReadAllText($f); $t=[regex]::Replace($t,'(?i)(database_id[^0-9a-f]*)([0-9a-f-]{36})',{param($m) $m.Groups[1].Value+$env:NEW_DB_ID}); [IO.File]::WriteAllText($f,$t)"
findstr /i /c:"%NEW_DB_ID%" wrangler.jsonc >nul 2>nul
if errorlevel 1 goto fail_config_dbid
call npx wrangler d1 info NAV_DB --json > d1_verify_result.txt 2>&1
if errorlevel 1 goto fail_config_dbid
findstr /i /c:"%NEW_DB_ID%" d1_verify_result.txt >nul 2>nul
if errorlevel 1 goto fail_config_dbid
if exist d1_verify_result.txt del d1_verify_result.txt
echo   [OK] wrangler.jsonc 已指向你的专属数据库

call npx wrangler d1 execute NAV_DB --remote --file schema.sql --yes
if errorlevel 1 goto fail_schema
call npx wrangler d1 execute NAV_DB --remote --command "SELECT count(*) AS table_count FROM sqlite_master WHERE type='table'" --json > d1_schema_verify.txt 2>&1
if errorlevel 1 goto fail_schema
findstr /i /c:"table_count" d1_schema_verify.txt >nul 2>nul
if errorlevel 1 goto fail_schema
if exist d1_schema_verify.txt del d1_schema_verify.txt
echo   [OK] 数据表初始化完成
goto step_project

:fail_dbid
echo [X] 获取数据库 ID 失败或 ID 格式非法, 常见原因:
echo     1. Cloudflare 未登录或授权失效 ^(重新运行脚本完成授权^)
echo     2. 网络异常, 查询数据库信息超时
echo     3. wrangler 版本输出格式变化
echo 排查后重新运行本脚本即可。
set "FAIL_REASON=获取数据库 ID 失败或 ID 格式非法"
goto fail_restart

:fail_schema
echo [X] 数据表初始化失败, 请检查网络后重新运行 ^(会自动跳过已完成步骤^)。
set "FAIL_REASON=数据表初始化失败"
goto fail_restart

:fail_config_dbid
if exist d1_verify_result.txt (
    echo [X] 数据库绑定验证失败，Wrangler 返回:
    type d1_verify_result.txt
    del d1_verify_result.txt
)
set "FAIL_REASON=数据库 ID 写入或验证失败"
goto fail_restart

:lookup_db_id
rem 从当前账户的 D1 清单中按名称精确获取 UUID，不读取 wrangler.jsonc 的旧绑定
set "NEW_DB_ID="
set "DB_LOOKUP_STATUS=ERROR"
set "DB_LIST_TMP=%TEMP%\nav_d1_list_%RANDOM%_%RANDOM%.json"
set "DB_ID_TMP=%TEMP%\nav_d1_id_%RANDOM%_%RANDOM%.tmp"
call npx wrangler d1 list --json > "%DB_LIST_TMP%" 2>nul
if errorlevel 1 goto lookup_db_cleanup
set "DB_LOOKUP_STATUS=MISSING"
powershell -NoProfile -Command "$data=ConvertFrom-Json -InputObject ([IO.File]::ReadAllText('%DB_LIST_TMP%')); foreach($item in @($data)){if($item.name -eq '%D1_NAME%'){[IO.File]::WriteAllText('%DB_ID_TMP%',$item.uuid); break}}" >nul 2>nul
if exist "%DB_ID_TMP%" set /p NEW_DB_ID=<"%DB_ID_TMP%"
if defined NEW_DB_ID set "DB_LOOKUP_STATUS=FOUND"
:lookup_db_cleanup
if exist "%DB_LIST_TMP%" del "%DB_LIST_TMP%" >nul 2>nul
if exist "%DB_ID_TMP%" del "%DB_ID_TMP%" >nul 2>nul
set "DB_LIST_TMP="
set "DB_ID_TMP="
if not defined NEW_DB_ID goto :eof
rem 严格校验提取到的 ID 是否为合法 UUID 格式 (32+ 字符)
echo %NEW_DB_ID%| findstr /r /i /c:"^[0-9a-f][0-9a-f-]*" >nul
if errorlevel 1 set "NEW_DB_ID="
goto :eof

:check_cf_auth
set "CF_AUTH_OK=0"
set "CF_AUTH_TMP=%TEMP%\nav_cf_auth_%RANDOM%_%RANDOM%.tmp"
call npx wrangler whoami > "%CF_AUTH_TMP%" 2>&1
findstr /i /c:"You are logged in" "%CF_AUTH_TMP%" >nul 2>nul
if not errorlevel 1 set "CF_AUTH_OK=1"
if exist "%CF_AUTH_TMP%" del "%CF_AUTH_TMP%" >nul 2>nul
set "CF_AUTH_TMP="
goto :eof

:extract_uuid_from_file
set "NEW_DB_ID="
set "DB_ID_TMP=%TEMP%\nav_d1_create_id_%RANDOM%_%RANDOM%.tmp"
powershell -NoProfile -Command "$text=[IO.File]::ReadAllText('%~1'); $match=[regex]::Match($text,'(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'); if($match.Success){[IO.File]::WriteAllText('%DB_ID_TMP%',$match.Value)}" >nul 2>nul
if exist "%DB_ID_TMP%" set /p NEW_DB_ID=<"%DB_ID_TMP%"
if exist "%DB_ID_TMP%" del "%DB_ID_TMP%" >nul 2>nul
set "DB_ID_TMP="
goto :eof

:generate_admin_pass
set "PASS_TMP=%TEMP%\nav_admin_pass_%RANDOM%_%RANDOM%.tmp"
powershell -NoProfile -Command "[IO.File]::WriteAllText('%PASS_TMP%','Nav'+[Guid]::NewGuid().ToString('N').Substring(0,10)+'2026')" >nul 2>nul
if exist "%PASS_TMP%" set /p ADMIN_PASS=<"%PASS_TMP%"
if exist "%PASS_TMP%" del "%PASS_TMP%" >nul 2>nul
set "PASS_TMP="
if not defined ADMIN_PASS set "ADMIN_PASS=NavAdmin2026"
goto :eof

rem ---------- [6/8] 创建 Pages 项目 ----------
:step_project
echo.
echo [6/8] 创建 Cloudflare Pages 项目: isoziyuan-nav ...
if "%DRYRUN%"=="1" (
    echo   [试运行] call npx wrangler pages project create isoziyuan-nav --production-branch main
    goto step_password
)
call npx wrangler pages project create isoziyuan-nav --production-branch main > pages_create.tmp 2>&1
if errorlevel 1 (
    findstr /i /c:"already exists" pages_create.tmp >nul 2>nul
    if not errorlevel 1 (
        echo   [OK] 项目已存在，继续使用现有项目。
    ) else (
        type pages_create.tmp
        if exist pages_create.tmp del pages_create.tmp
        goto fail_project
    )
) else (
    echo   [OK] Pages 项目创建成功
)
if exist pages_create.tmp del pages_create.tmp
goto step_password

:fail_project
echo [X] Pages 项目创建或查询失败。
set "FAIL_REASON=Cloudflare Pages 项目创建失败"
goto fail_restart

rem ---------- [7/8] 设置后台管理密码 ----------
:step_password
echo.
echo [7/8] 设置后台管理密码 ^(用于登录 /admin 管理面板^) ...
:ask_admin_pass
set "ADMIN_PASS="
set /p ADMIN_PASS=请输入 6-64 位字母或数字密码 ^(直接回车自动生成^): 
if not defined ADMIN_PASS call :generate_admin_pass
powershell -NoProfile -Command "if($env:ADMIN_PASS -match '^[A-Za-z0-9]{6,64}$'){exit 0}else{exit 1}" >nul 2>nul
if errorlevel 1 (
    echo [X] 密码只能包含字母和数字，长度为 6-64 位，请重新输入。
    goto ask_admin_pass
)
echo 你的后台管理密码: %ADMIN_PASS%
echo ^(请立即抄写保存, 后面还会再显示一次^)
if "%DRYRUN%"=="1" (
    echo   [试运行] call npx wrangler pages secret put ADMIN_PASSWORD --project-name isoziyuan-nav
    goto step_deploy
)
powershell -NoProfile -Command "[IO.File]::WriteAllText('adminpass.tmp',$env:ADMIN_PASS,[Text.UTF8Encoding]::new($false))"
call npx wrangler pages secret put ADMIN_PASSWORD --project-name isoziyuan-nav < adminpass.tmp
del adminpass.tmp
if errorlevel 1 goto fail_secret
call npx wrangler pages secret list --project-name isoziyuan-nav > secret_verify.tmp 2>&1
if errorlevel 1 goto fail_secret
findstr /i /c:"ADMIN_PASSWORD" secret_verify.tmp >nul 2>nul
if errorlevel 1 goto fail_secret
if exist secret_verify.tmp del secret_verify.tmp
call :save_credentials
echo   [OK] 管理密码已写入并验证，账号信息已保存到桌面
goto step_deploy

:fail_secret
if exist adminpass.tmp del adminpass.tmp >nul 2>nul
if exist secret_verify.tmp del secret_verify.tmp >nul 2>nul
echo [X] 密码写入失败, 请重新运行本脚本重试该步骤。
set "FAIL_REASON=后台管理密码写入失败"
goto fail_restart

rem ---------- [8/8] 部署上线 ----------
:step_deploy
echo.
echo [8/8] 正在部署到 Cloudflare 全球边缘节点 ...
if "%DRYRUN%"=="1" (
    echo   [试运行] npx wrangler pages deploy . --project-name isoziyuan-nav --branch main
    set "SITE_URL=https://your-project.pages.dev"
    goto done
)
set "DEPLOY_LOG=%TEMP%\isoziyuan_pages_deploy_%RANDOM%_%RANDOM%.log"
call npx wrangler pages deploy . --project-name isoziyuan-nav --branch main --commit-dirty=true > "%DEPLOY_LOG%" 2>&1
set "DEPLOY_EXIT=%errorlevel%"
if not "%DEPLOY_EXIT%"=="0" goto fail_deploy
call :extract_pages_url
if not defined SITE_URL goto fail_deploy_url
echo   [OK] Cloudflare Pages 部署成功
echo   [OK] 实际访问地址: %SITE_URL%
if exist "%DEPLOY_LOG%" del "%DEPLOY_LOG%" >nul 2>nul
goto done

:fail_deploy
powershell -NoProfile -Command "$text=[IO.File]::ReadAllText($env:DEPLOY_LOG,[Text.UTF8Encoding]::new($false)); $text=[regex]::Replace($text,[char]27+'\[[0-9;?]*[ -/]*[@-~]',''); [Console]::Write($text)" 2>nul
if exist "%DEPLOY_LOG%" del "%DEPLOY_LOG%" >nul 2>nul
echo [X] 部署失败, 请检查网络后重新运行本脚本。
set "FAIL_REASON=部署到 Cloudflare 全球节点失败"
goto fail_restart

:fail_deploy_url
if exist "%DEPLOY_LOG%" del "%DEPLOY_LOG%" >nul 2>nul
echo [X] 部署已经完成，但未能从 Wrangler 输出中识别 Pages 网址。
set "FAIL_REASON=无法识别 Cloudflare Pages 实际网址"
goto fail_restart

:extract_pages_url
set "URL_RESULT=%TEMP%\isoziyuan_pages_url_%RANDOM%_%RANDOM%.tmp"
powershell -NoProfile -Command "$text=[IO.File]::ReadAllText($env:DEPLOY_LOG); $m=[regex]::Match($text,'https://[A-Za-z0-9.-]+\.pages\.dev'); if($m.Success){$pageHost=([Uri]$m.Value).Host; $labels=$pageHost.Split('.'); if($labels.Length -ge 4){$pageHost=($labels[1..($labels.Length-1)] -join '.')}; [IO.File]::WriteAllText($env:URL_RESULT,'https://'+$pageHost)}" >nul 2>nul
if exist "%URL_RESULT%" set /p SITE_URL=<"%URL_RESULT%"
if exist "%URL_RESULT%" del "%URL_RESULT%" >nul 2>nul
set "URL_RESULT="
goto :eof

rem ---------- 完成 ----------
:done
echo.
echo ==================================================
echo   恭喜! 导航站搭建完成!
echo.
echo   你的导航站:  %SITE_URL%
echo   管理后台:    %SITE_URL%/admin
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
call :save_credentials
echo   [提示] 账号密码已自动备份到你的桌面: 导航站后台信息.txt
echo.
echo 部署完成，请妥善保存以上账号信息。
pause
exit /b 0

:save_credentials
set "CRED_FILE=%USERPROFILE%\Desktop\导航站后台信息.txt"
set "CRED_SITE_URL=%SITE_URL%"
if not defined CRED_SITE_URL set "CRED_SITE_URL=部署完成后自动更新"
> "%CRED_FILE%" echo ==============================
>> "%CRED_FILE%" echo 导航站搭建信息 - 请妥善保管
>> "%CRED_FILE%" echo ==============================
>> "%CRED_FILE%" echo 导航站网址: %CRED_SITE_URL%
>> "%CRED_FILE%" echo 管理后台:   %CRED_SITE_URL%/admin
>> "%CRED_FILE%" echo 管理员账号: admin
>> "%CRED_FILE%" echo 后台密码:   %ADMIN_PASS%
>> "%CRED_FILE%" echo 搭建时间:   %date% %time%
set "CRED_FILE="
set "CRED_SITE_URL="
goto :eof


rem ---------- 一键清除 GitHub / Cloudflare 登录状态 ----------
:logout_all
echo.
echo 正在清除 GitHub 和 Cloudflare 登录状态...
set "AUTH_DIR=%TEMP%\isoziyuan_logout_%RANDOM%_%RANDOM%"
mkdir "%AUTH_DIR%" >nul 2>nul
set "AUTH_JSON=%AUTH_DIR%\github-auth.json"
set "AUTH_TARGETS=%AUTH_DIR%\github-accounts.txt"

call gh auth status --json hosts > "%AUTH_JSON%" 2>nul
powershell -NoProfile -Command "$data=ConvertFrom-Json -InputObject ([IO.File]::ReadAllText('%AUTH_JSON%')); $out=[Collections.Generic.List[string]]::new(); foreach($hostItem in $data.hosts.PSObject.Properties){foreach($account in @($hostItem.Value)){if($account.login){$out.Add($hostItem.Name+'|'+$account.login)}}}; [IO.File]::WriteAllLines('%AUTH_TARGETS%',$out)" >nul 2>nul
if exist "%AUTH_TARGETS%" for /f "usebackq tokens=1,2 delims=|" %%h in ("%AUTH_TARGETS%") do call gh auth logout --hostname "%%h" --user "%%i" >nul 2>nul

call npx wrangler logout >nul 2>nul

if exist "%AUTH_DIR%" rmdir /s /q "%AUTH_DIR%"
echo [OK] GitHub CLI 和 Cloudflare Wrangler 登录状态已清除。
pause
exit /b 0


rem ---------- 一键删除 GitHub / Cloudflare 中的 isoziyuan 相关资源 ----------
:cleanup_start
echo.
echo 请选择删除范围:
echo   [1] 仅删除 Cloudflare 项目和 D1 数据库
echo   [2] 仅删除 GitHub 仓库
echo   [3] 同时删除 Cloudflare 和 GitHub
choice /c 123 /n /m "请选择 [1/2/3]: "
if errorlevel 3 goto cleanup_scope_both
if errorlevel 2 goto cleanup_scope_github
set "CLEAN_GH=0"
set "CLEAN_CF=1"
set "CLEAN_SCOPE_TEXT=Cloudflare"
goto cleanup_auth

:cleanup_scope_github
set "CLEAN_GH=1"
set "CLEAN_CF=0"
set "CLEAN_SCOPE_TEXT=GitHub"
goto cleanup_auth

:cleanup_scope_both
set "CLEAN_GH=1"
set "CLEAN_CF=1"
set "CLEAN_SCOPE_TEXT=Cloudflare 和 GitHub"

:cleanup_auth
echo.
echo 正在扫描 %CLEAN_SCOPE_TEXT% 中的 isoziyuan 资源...

if "%CLEAN_GH%"=="0" goto cleanup_cf_check
gh auth status >nul 2>nul
if errorlevel 1 goto cleanup_gh_login
goto cleanup_cf_check

:cleanup_gh_login
echo [授权] 请先登录 GitHub ...
call gh auth login --hostname github.com --git-protocol https --web --clipboard
if errorlevel 1 goto cleanup_auth_failed

:cleanup_cf_check
if "%CLEAN_CF%"=="0" goto cleanup_scan
call :check_cf_auth
if not "%CF_AUTH_OK%"=="1" goto cleanup_cf_login
goto cleanup_scan

:cleanup_cf_login
echo [授权] 请先登录 Cloudflare ...
call npx wrangler login
call :check_cf_auth
if not "%CF_AUTH_OK%"=="1" goto cleanup_auth_failed

:cleanup_scan
set "CLEAN_DIR=%TEMP%\isoziyuan_cleanup_%RANDOM%_%RANDOM%"
mkdir "%CLEAN_DIR%" >nul 2>nul
set "GH_JSON=%CLEAN_DIR%\github.json"
set "GH_TARGETS=%CLEAN_DIR%\github.txt"
set "PAGES_JSON=%CLEAN_DIR%\pages.json"
set "PAGES_TARGETS=%CLEAN_DIR%\pages.txt"
set "D1_JSON=%CLEAN_DIR%\d1.json"
set "D1_TARGETS=%CLEAN_DIR%\d1.txt"

if "%CLEAN_GH%"=="0" goto cleanup_scan_cloudflare
set "GH_USER="
for /f "usebackq delims=" %%u in (`gh api user -q .login 2^>nul`) do set "GH_USER=%%u"
if not defined GH_USER goto cleanup_scan_failed
call gh repo list "%GH_USER%" --limit 1000 --json nameWithOwner > "%GH_JSON%" 2>nul
if errorlevel 1 goto cleanup_scan_failed
powershell -NoProfile -Command "$data=ConvertFrom-Json -InputObject ([IO.File]::ReadAllText('%GH_JSON%')); $out=[Collections.Generic.List[string]]::new(); foreach($r in @($data)){if($r.nameWithOwner.IndexOf('isoziyuan',[StringComparison]::OrdinalIgnoreCase) -ge 0){$out.Add($r.nameWithOwner)}}; [IO.File]::WriteAllLines('%GH_TARGETS%',$out)" >nul 2>nul

:cleanup_scan_cloudflare
if "%CLEAN_CF%"=="0" goto cleanup_count_targets
call npx wrangler pages project list --json > "%PAGES_JSON%" 2>nul
if errorlevel 1 goto cleanup_scan_failed
powershell -NoProfile -Command "$data=ConvertFrom-Json -InputObject ([IO.File]::ReadAllText('%PAGES_JSON%')); $out=[Collections.Generic.List[string]]::new(); foreach($p in @($data)){$name=$p.name; if(-not $name){$name=$p.project_name}; if($name -and $name.IndexOf('isoziyuan',[StringComparison]::OrdinalIgnoreCase) -ge 0){$out.Add($name)}}; [IO.File]::WriteAllLines('%PAGES_TARGETS%',$out)" >nul 2>nul

call npx wrangler d1 list --json > "%D1_JSON%" 2>nul
if errorlevel 1 goto cleanup_scan_failed
powershell -NoProfile -Command "$data=ConvertFrom-Json -InputObject ([IO.File]::ReadAllText('%D1_JSON%')); $out=[Collections.Generic.List[string]]::new(); foreach($d in @($data)){if($d.name.IndexOf('isoziyuan',[StringComparison]::OrdinalIgnoreCase) -ge 0){$out.Add($d.name)}}; [IO.File]::WriteAllLines('%D1_TARGETS%',$out)" >nul 2>nul

:cleanup_count_targets
set GH_COUNT=0
set PAGES_COUNT=0
set D1_COUNT=0
if exist "%GH_TARGETS%" for /f "usebackq delims=" %%r in ("%GH_TARGETS%") do set /a GH_COUNT+=1
if exist "%PAGES_TARGETS%" for /f "usebackq delims=" %%p in ("%PAGES_TARGETS%") do set /a PAGES_COUNT+=1
if exist "%D1_TARGETS%" for /f "usebackq delims=" %%d in ("%D1_TARGETS%") do set /a D1_COUNT+=1

echo.
echo 找到: GitHub %GH_COUNT% 个，Pages %PAGES_COUNT% 个，D1 %D1_COUNT% 个。

if "%GH_COUNT%"=="0" if "%PAGES_COUNT%"=="0" if "%D1_COUNT%"=="0" goto cleanup_nothing
choice /c YN /n /m "确认删除 %CLEAN_SCOPE_TEXT% 中的全部 isoziyuan 资源? [Y/N]: "
if errorlevel 2 goto cleanup_cancel

if "%GH_COUNT%"=="0" goto cleanup_delete_pages
echo.
echo [GitHub] 正在申请删除仓库所需的 delete_repo 权限 ...
call gh auth refresh --hostname github.com --scopes delete_repo
if errorlevel 1 goto cleanup_delete_failed
for /f "usebackq delims=" %%r in ("%GH_TARGETS%") do call gh repo delete "%%r" --yes
if errorlevel 1 goto cleanup_delete_failed

:cleanup_delete_pages
if "%PAGES_COUNT%"=="0" goto cleanup_delete_d1
echo.
echo [Cloudflare] 正在删除 Pages 项目 ...
for /f "usebackq delims=" %%p in ("%PAGES_TARGETS%") do call npx wrangler pages project delete "%%p" --yes
if errorlevel 1 goto cleanup_delete_failed

:cleanup_delete_d1
if "%D1_COUNT%"=="0" goto cleanup_done
echo.
echo [Cloudflare] 正在删除 D1 数据库 ...
for /f "usebackq delims=" %%d in ("%D1_TARGETS%") do call npx wrangler d1 delete "%%d" --cwd "%CLEAN_DIR%" --skip-confirmation
if errorlevel 1 goto cleanup_delete_failed

:cleanup_done
echo.
echo [OK] 所有扫描到的 isoziyuan 远程资源已删除。
if exist "%CLEAN_DIR%" rmdir /s /q "%CLEAN_DIR%"
pause
exit /b 0

:cleanup_nothing
echo [OK] 没有发现名称包含 isoziyuan 的远程资源。
if exist "%CLEAN_DIR%" rmdir /s /q "%CLEAN_DIR%"
pause
exit /b 0

:cleanup_cancel
if exist "%CLEAN_DIR%" rmdir /s /q "%CLEAN_DIR%"
exit /b 0

:cleanup_auth_failed
echo [X] GitHub 或 Cloudflare 授权失败，未删除任何资源。
pause
exit /b 1

:cleanup_scan_failed
echo [X] 远程资源扫描失败，未删除任何资源。
if defined CLEAN_DIR if exist "%CLEAN_DIR%" rmdir /s /q "%CLEAN_DIR%"
pause
exit /b 1

:cleanup_delete_failed
echo [X] 删除过程中有命令失败，请查看上方输出并重新运行清理模式。
if defined CLEAN_DIR if exist "%CLEAN_DIR%" rmdir /s /q "%CLEAN_DIR%"
pause
exit /b 1


rem ---------- 统一失败出口: 展示原因 + 支持一键重新开始 ----------
:fail_restart
echo.
echo ==================================================
echo   [X] 流程中断原因: %FAIL_REASON%
echo   具体排查建议见上方红色 [X] 输出, 已完成的步骤重跑时会自动跳过。
echo ==================================================
echo.
pause
choice /c YN /m "是否立即重新运行本脚本? [Y] 重新开始 / [N] 退出: "
if errorlevel 2 exit /b 1
echo.
echo 正在重新启动脚本...
"%~f0"
exit /b 1

