-- ====================================================================
-- RLS Career Studio for BeamNG.drive World Editor (F11)
-- 3D Scene Prop Auto-Scanner & Bulk Generator
-- Path: lua/ge/extensions/editor/rlsCareerEditor/scanner.lua
-- ====================================================================

local M = {}
local logTag = "rlsCareerEditor_scanner"

local core = nil
local im = ui_imgui

-- Правила сопоставления мешей пропсов карты с шаблонами RLS
M.scanRules = {
  fuel = {
    name = "Топливные колонки АЗС",
    patterns = {"gas_pump", "fuel_pump", "petrol", "benzin", "gas_station", "fuelstation"},
    targetType = "gasStation",
    category = "Топливо / Сервис"
  },
  garage = {
    name = "Гаражные ворота и боксы",
    patterns = {"garage_door", "rollup_door", "industrial_door", "service_door", "car_lift"},
    targetType = "repairGarage",
    category = "Автосервис / Ремонт"
  },
  dock = {
    name = "Складские рампы и докшелтеры",
    patterns = {"loading_dock", "dock_shelter", "warehouse_door", "cargo_door", "ramp_dock"},
    targetType = "logisticsHub",
    category = "Логистика / Склад"
  },
  bulk = {
    name = "Силосы, карьеры и сыпучие склады",
    patterns = {"silo", "gravel", "aggregate", "quarry", "crusher", "conveyor"},
    targetType = "constructionSite",
    category = "Стройка / Сыпучка"
  }
}

-- Результаты последнего сканирования
M.foundProps = {}
M.isScanning = false

function M.init(mainController)
  core = mainController
end

-- ====================================================================
-- АЛГОРИТМ СКАНИРОВАНИЯ СЦЕНЫ
-- ====================================================================

local function matchesAnyPattern(str, patterns)
  if not str or str == "" then return false end
  local lowerStr = string.lower(str)
  for _, pattern in ipairs(patterns) do
    if string.find(lowerStr, pattern) then
      return true
    end
  end
  return false
end

function M.runSceneScan()
  M.foundProps = {}
  M.isScanning = true

  -- Получаем корневую группу объектов уровня
  local missionGroup = scenetree.MissionGroup
  if not missionGroup then
    if core then core.setStatus("Ошибка: MissionGroup не найден в сцене", 1.0, 0.3, 0.3) end
    M.isScanning = false
    return
  end

  local scannedCount = 0
  local candidatesCount = 0

  -- Рекурсивный обход дерева объектов
  local function traverseGroup(group)
    local count = group:size()
    for i = 0, count - 1 do
      local obj = group:at(i)
      if obj then
        if obj:isSubClassOf("SimGroup") then
          traverseGroup(Sim.upcast(obj))
        elseif obj:isSubClassOf("TSStatic") then
          scannedCount = scannedCount + 1
          local shapeName = obj.shapeName or ""
          local objName = obj:getName() or ""

          for ruleKey, rule in pairs(M.scanRules) do
            if matchesAnyPattern(shapeName, rule.patterns) or matchesAnyPattern(objName, rule.patterns) then
              candidatesCount = candidatesCount + 1
              
              local pos = obj:getPosition()
              local rot = obj:getRotation()

              table.insert(M.foundProps, {
                id = obj:getId(),
                name = (objName ~= "" and objName) or ("Prop_" .. obj:getId()),
                shapeName = shapeName,
                ruleKey = ruleKey,
                ruleName = rule.name,
                category = rule.category,
                targetType = rule.targetType,
                pos = vec3(pos.x, pos.y, pos.z),
                rot = quat(rot.x, rot.y, rot.z, rot.w),
                selected = true
              })
              break
            end
          end
        end
      end
    end
  end

  traverseGroup(missionGroup)
  M.isScanning = false

  if core then
    core.setStatus("Сканирование завершено: проверено " .. scannedCount .. ", найдено " .. candidatesCount, 0.4, 1.0, 0.4)
  end
  log("I", logTag, "Сканирование завершено. Найдено подходящих пропсов: " .. candidatesCount)
end

-- ====================================================================
-- АВТОГЕНЕРАЦИЯ ОБЪЕКТОВ RLS ИЗ НАЙДЕННЫХ ПРОПСОВ
-- ====================================================================

function M.generateSelectedProps()
  if not core or not core.templates then return end
  local addedCount = 0

  for _, item in ipairs(M.foundProps) do
    if item.selected then
      local snappedPos = core.viewport.snapToGround(item.pos)
      local newFacility = core.templates.createFacilityFromPreset(item.targetType, snappedPos, item.rot)
      
      if newFacility then
        newFacility.name = item.name .. " (" .. item.category .. ")"
        table.insert(core.careerData.facilities, newFacility)
        addedCount = addedCount + 1
      end
    end
  end

  -- Очищаем выборку сгенерированных
  M.foundProps = {}

  if core then
    core.setStatus("Сгенерировано предприятий RLS: " .. addedCount, 0.2, 1.0, 0.4)
  end
end

-- ====================================================================
-- GUI ВКЛАДКИ АВТО-СКАНЕРА
-- ====================================================================

function M.renderGui()
  im.TextColored(im.ImVec4(0.3, 0.8, 1.0, 1.0), "Авто-детекция объектов инфраструктуры на карте")
  im.TextWrapped("Сканер анализирует 3D-меши TSStatic уровня по сигнатурам (колонки АЗС, ворота доков, подъемники, силосы) и автоматически строит вокруг них корректные триггеры и рампы.")
  im.Separator()

  if im.Button("Запустить сканирование карты", im.ImVec2(260, 34)) then
    M.runSceneScan()
  end

  im.SameLine()
  if #M.foundProps > 0 then
    if im.Button("Сгенерировать выбранные (" .. #M.foundProps .. ")", im.ImVec2(240, 34)) then
      M.generateSelectedProps()
    end
  end

  im.Spacing()

  if #M.foundProps == 0 then
    im.TextColored(im.ImVec4(0.6, 0.6, 0.6, 1.0), "Список кандидатов пуст. Нажмите кнопку запуска сканирования выше.")
    return
  end

  im.Text("Найдено потенциальных объектов инфраструктуры: " .. tostring(#M.foundProps))
  im.Separator()

  -- Таблица кандидатов
  if im.BeginChild("ScannerResultsScroll", im.ImVec2(0, 420), true) then
    for idx, item in ipairs(M.foundProps) do
      im.PushID1("prop_item_" .. idx)
      
      -- Чекбокс включения в генерацию
      local selPtr = im.BoolPtr(item.selected)
      if im.Checkbox("##select", selPtr) then
        item.selected = selPtr[0]
      end
      
      im.SameLine()
      im.TextColored(im.ImVec4(1.0, 0.8, 0.2, 1.0), "[" .. item.category .. "]")
      
      im.SameLine()
      im.Text(item.name)

      im.SameLine(im.GetWindowWidth() - 220)
      if im.SmallButton("Телепорт к объекту") then
        core.viewport.teleportCameraTo(item.pos)
      end

      im.TextDisabled("  Меш: " .. item.shapeName)
      im.Separator()
      im.PopID()
    end
    im.EndChild()
  end
end

return M
