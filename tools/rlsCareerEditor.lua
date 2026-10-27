-- ====================================================================
-- RLS Career Studio for BeamNG.drive World Editor (F11)
-- Entry Point & Lifecycle Controller
-- Path: lua/ge/extensions/editor/rlsCareerEditor.lua
-- ====================================================================

local M = {}
local logTag = "rlsCareerEditor"

-- Инициализация ImGui
local im = ui_imgui

-- Имя окна и состояние видимости
local toolWindowName = "rlsCareerStudio"
local isWindowVisible = false

-- Подмодули (будут загружаться из этой же папки)
M.io = nil         -- Менеджер JSON, путей уровней и бэкапов
M.templates = nil  -- Пресеты предприятий, рамп и автосалонов
M.viewport = nil   -- 3D-дебаг, призрак техники (Ghost Car), Gizmo и лучи
M.scanner = nil    -- Автосканер пропсов карты (АЗС, ворота, боксы)
M.auditor = nil    -- Проверка уклонов и связности с Navgraph (ИИ-дорогами)

-- Внутреннее состояние редактора
M.state = {
  currentLevel = "",
  levelLoaded = false,
  selectedTab = 0,             -- 0: Facilities, 1: Dealerships, 2: Parking, 3: Auto-Scanner, 4: Diagnostics & Balance
  selectedFacilityIndex = nil,
  selectedZoneIndex = nil,
  statusMessage = "Готов к работе",
  statusColor = im.ImVec4(0.4, 0.9, 0.4, 1.0),
  showGhostCar = true,
  ghostVehicleType = "van",    -- compact, sedan, van, truck, semiTrailer
  snapToTerrain = true,
  snapToRoadHeading = true
}

-- Хранилище данных текущей карты в памяти
M.careerData = {
  facilities = {},
  dealerships = {},
  parkingSpots = {}
}

-- Вспомогательная функция для установки статуса в строке состояния
function M.setStatus(text, r, g, b)
  M.state.statusMessage = text or ""
  M.state.statusColor = im.ImVec4(r or 1.0, g or 1.0, b or 1.0, 1.0)
end

-- Открытие и закрытие окна
function M.open()
  editor.showWindow(toolWindowName)
  isWindowVisible = true
  M.onLevelCheck()
end

function M.close()
  editor.hideWindow(toolWindowName)
  isWindowVisible = false
end

function M.toggle()
  if isWindowVisible then
    M.close()
  else
    M.open()
  end
end

-- Проверка и определение открытого в данный момент уровня
function M.onLevelCheck()
  local currentLevelName = getCurrentLevelIdentifier()
  if not currentLevelName or currentLevelName == "" then
    M.state.levelLoaded = false
    M.state.currentLevel = "Уровень не загружен"
    M.setStatus("Ошибка: загрузите карту для работы с RLS", 1.0, 0.3, 0.3)
    return false
  end

  M.state.currentLevel = currentLevelName
  M.state.levelLoaded = true
  
  -- Если модуль ввода/вывода доступен, загружаем данные карты
  if M.io and M.io.loadAllData then
    M.io.loadAllData(currentLevelName)
  else
    M.setStatus("Уровень: " .. currentLevelName, 0.6, 0.8, 1.0)
  end
  return true
end

-- Отрисовка верхней панели вкладок
local function renderTopTabBar()
  if im.BeginTabBar("RLSMainTabBar") then
    if im.BeginTabItem("Предприятия (Facilities)") then
      M.state.selectedTab = 0
      im.EndTabItem()
    end
    if im.BeginTabItem("Автосалоны (Dealerships)") then
      M.state.selectedTab = 1
      im.EndTabItem()
    end
    if im.BeginTabItem("Парковки и Склады (Parking)") then
      M.state.selectedTab = 2
      im.EndTabItem()
    end
    if im.BeginTabItem("Авто-сканер 3D сцены") then
      M.state.selectedTab = 3
      im.EndTabItem()
    end
    if im.BeginTabItem("Аудит Navgraph и Баланс") then
      M.state.selectedTab = 4
      im.EndTabItem()
    end
    im.EndTabBar()
  end
end

-- Отрисовка нижней строки состояния
local function renderStatusBar()
  im.Separator()
  im.TextColored(im.ImVec4(0.7, 0.7, 0.7, 1.0), "Уровень: ")
  im.SameLine()
  im.TextColored(im.ImVec4(0.3, 0.8, 1.0, 1.0), tostring(M.state.currentLevel))
  
  im.SameLine(im.GetWindowWidth() - 320)
  im.TextColored(M.state.statusColor, M.state.statusMessage)
end

-- Главный цикл отрисовки GUI окна
function M.onEditorGui()
  if not isWindowVisible then return end

  -- Базовые размеры и ограничения окна
  im.SetNextWindowSize(im.ImVec2(980, 680), im.Cond_FirstUseEver)
  im.SetNextWindowSizeConstraints(im.ImVec2(720, 480), im.ImVec2(1920, 1080))

  if editor.beginWindow(toolWindowName, "RLS Career Studio & Level Integrator", im.WindowFlags_MenuBar) then
    -- Меню-бар окна
    if im.BeginMenuBar() then
      if im.BeginMenu("Файл") then
        if im.MenuItem("Перезагрузить JSON уровня") then
          M.onLevelCheck()
        end
        if im.MenuItem("Сохранить всё в карту (с бэкапом)") then
          if M.io and M.io.saveAllData then
            M.io.saveAllData()
          else
            M.setStatus("Модуль сохранения еще не загружен", 1.0, 0.5, 0.2)
          end
        end
        im.Separator()
        if im.MenuItem("Закрыть") then
          M.close()
        end
        im.EndMenu()
      end

      if im.BeginMenu("Инструменты") then
        if im.MenuItem("Создать бекап файлов RLS") then
          if M.io and M.io.createBackup then M.io.createBackup() end
        end
        if im.MenuItem("Телепорт к выбранной зоне") then
          if M.viewport and M.viewport.teleportToSelected then M.viewport.teleportToSelected() end
        end
        im.EndMenu()
      end
      im.EndMenuBar()
    end

    -- Переключатель вкладок
    renderTopTabBar()
    im.Separator()

    -- Если карта не загружена, выводим предупреждение
    if not M.state.levelLoaded then
      im.Spacing()
      im.TextColored(im.ImVec4(1.0, 0.4, 0.4, 1.0), "Внимание: Редактор не обнаружил загруженного уровня.")
      im.Text("Пожалуйста, загрузите нужную карту в игре, затем нажмите кнопку ниже:")
      if im.Button("Проверить карту повторно", im.ImVec2(240, 32)) then
        M.onLevelCheck()
      end
      renderStatusBar()
      editor.endWindow()
      return
    end

    -- Маршрутизация отрисовки в зависимости от активной вкладки
    if M.state.selectedTab == 0 then
      if M.guiFacilities then M.guiFacilities() else im.Text("Загрузка модуля Facilities...") end
    elseif M.state.selectedTab == 1 then
      if M.guiDealerships then M.guiDealerships() else im.Text("Загрузка модуля Dealerships...") end
    elseif M.state.selectedTab == 2 then
      if M.guiParking then M.guiParking() else im.Text("Загрузка модуля Parking...") end
    elseif M.state.selectedTab == 3 then
      if M.scanner and M.scanner.renderGui then M.scanner.renderGui() else im.Text("Загрузка модуля Авто-сканера...") end
    elseif M.state.selectedTab == 4 then
      if M.auditor and M.auditor.renderGui then M.auditor.renderGui() else im.Text("Загрузка модуля Аудитора...") end
    end

    -- Нижний статус-бар
    renderStatusBar()
  end
  editor.endWindow()
end

-- Отрисовка 3D оверлея в мире (призраки машин, боксы триггеров, векторы связей)
function M.onEditorDraw3D()
  if not isWindowVisible or not M.state.levelLoaded then return end

  -- Делегируем отрисовку 3D-сцены модулю viewport
  if M.viewport and M.viewport.draw3D then
    M.viewport.draw3D()
  end
end

-- Инициализация расширения при запуске World Editor
function M.onEditorInitialized()
  -- Регистрация окна в редакторе
  editor.registerWindow(toolWindowName, im.ImVec2(980, 680))
  
  -- Добавление в меню "Gameplay" режима F11
  editor.addWindowMenuItem("RLS Career Studio", function() M.toggle() end, { groupMenuName = "Gameplay" })
  
  -- Безопасная загрузка связанных модулей
  pcall(function()
    M.templates = require("editor/rlsCareerEditor/templates")
    M.io        = require("editor/rlsCareerEditor/ioManager")
    M.viewport  = require("editor/rlsCareerEditor/viewport3d")
    M.scanner   = require("editor/rlsCareerEditor/scanner")
    M.auditor   = require("editor/rlsCareerEditor/auditor")
    
    -- Передаем ссылку на главный контроллер в подмодули
    if M.io then M.io.init(M) end
    if M.viewport then M.viewport.init(M) end
    if M.scanner then M.scanner.init(M) end
    if M.auditor then M.auditor.init(M) end
  end)

  log("I", logTag, "RLS Career Studio успешно интегрирован в World Editor.")
end

-- Обработка закрытия или деактивации редактора
function M.onEditorDeactivated()
  if isWindowVisible then
    M.close()
  end
end

return M
