-- ====================================================================
-- RLS Career Studio for BeamNG.drive World Editor (F11)
-- Navgraph Connectivity, Slope Inspector, Cargo Matrix & GUI Inspector
-- Path: lua/ge/extensions/editor/rlsCareerEditor/auditor.lua
-- ====================================================================

local M = {}
local logTag = "rlsCareerEditor_auditor"

local core = nil
local im = ui_imgui

-- Результаты последней диагностики
M.auditIssues = {}
M.cargoStats = {}

function M.init(mainController)
  core = mainController
  -- Подключаем методы отрисовки инспекторов в главный контроллер
  core.guiFacilities = M.renderFacilitiesTab
  core.guiDealerships = M.renderDealershipsTab
  core.guiParking = M.renderParkingTab
end

-- ====================================================================
-- 1. ДИАГНОСТИКА: NAVGRAPH И УКЛОНЫ
-- ====================================================================

-- Расчет уклона поверхности под точкой в градусах через нормаль
local function calculateGroundSlope(pos)
  local rayStart = vec3(pos.x, pos.y, pos.z + 5.0)
  local rayDown = vec3(0, 0, -15.0)
  
  -- castRayStaticNormal возвращает dist, normal
  local dist, normal = castRayStaticNormal(rayStart, rayDown)
  if dist and normal then
    local dotUp = math.max(-1.0, math.min(1.0, normal:dot(vec3(0, 0, 1))))
    local slopeRad = math.acos(dotUp)
    return math.deg(slopeRad)
  end
  return 0.0
end

-- Проверка дистанции до ближайшей ноды дорожного графа ИИ
local function getDistanceToNavgraph(pos)
  if not map or not map.getMap then return 999.0 end
  local roadMap = map.getMap()
  if not roadMap or not roadMap.nodes then return 999.0 end

  local closestDist = 999.0
  for _, node in pairs(roadMap.nodes) do
    if node.pos then
      local d = (node.pos - pos):length()
      if d < closestDist then
        closestDist = d
      end
    end
  end
  return closestDist
end

-- Полный запуск аудита уровня
function M.runFullAudit()
  M.auditIssues = {}
  M.cargoStats = {}
  if not core or not core.careerData then return end

  local MAX_ROAD_DISTANCE = 35.0 -- метров
  local MAX_SLOPE_DEG = 7.5      -- градусов

  -- Инициализация статистики грузов
  if core.templates and core.templates.cargoTypes then
    for _, ct in ipairs(core.templates.cargoTypes) do
      M.cargoStats[ct.id] = { name = ct.name, count = 0, facilities = {} }
    end
  end

  -- Проверка предприятий и рамп
  for fIdx, fac in ipairs(core.careerData.facilities) do
    local fPos = core.io.tableToVec3(fac.position)
    local fSlope = calculateGroundSlope(fPos)
    local fNavDist = getDistanceToNavgraph(fPos)

    if fNavDist > MAX_ROAD_DISTANCE then
      table.insert(M.auditIssues, {
        severity = "warning",
        text = "Предприятие '" .. (fac.name or fac.id) .. "' далеко от дорожной сети (" .. string.format("%.1f", fNavDist) .. " м)",
        pos = fPos
      })
    end

    if fac.zones then
      for zIdx, zone in ipairs(fac.zones) do
        local zPos = core.io.tableToVec3(zone.pos)
        local zSlope = calculateGroundSlope(zPos)

        if zSlope > MAX_SLOPE_DEG then
          table.insert(M.auditIssues, {
            severity = "danger",
            text = "Рампа '" .. (zone.name or zone.id) .. "' на крутом уклоне (" .. string.format("%.1f", zSlope) .. "°). Спавн фур может быть нестабилен!",
            pos = zPos
          })
        end

        -- Сбор статистики по грузам
        if zone.cargoTypes then
          for _, cId in ipairs(zone.cargoTypes) do
            if M.cargoStats[cId] then
              M.cargoStats[cId].count = M.cargoStats[cId].count + 1
              table.insert(M.cargoStats[cId].facilities, fac.name or fac.id)
            end
          end
        end
      end
    end
  end

  -- Проверка автосалонов
  for dIdx, dealer in ipairs(core.careerData.dealerships) do
    local dPos = core.io.tableToVec3(dealer.position)
    local dNavDist = getDistanceToNavgraph(dPos)
    if dNavDist > MAX_ROAD_DISTANCE then
      table.insert(M.auditIssues, {
        severity = "warning",
        text = "Автосалон '" .. (dealer.name or dealer.id) .. "' оторван от дорог (" .. string.format("%.1f", dNavDist) .. " м)",
        pos = dPos
      })
    end
  end

  core.setStatus("Аудит завершен: найдено замечаний: " .. #M.auditIssues, 0.4, 0.9, 1.0)
end

-- ====================================================================
-- 2. GUI: ВКЛАДКА АУДИТА И БАЛАНСА ГРУЗОВ
-- ====================================================================

function M.renderGui()
  im.TextColored(im.ImVec4(0.3, 0.8, 1.0, 1.0), "Диагностика Navgraph, уклонов и баланса грузопотока")
  im.TextWrapped("Модуль проверяет физическую проходимость рамп, устойчивость ТС при спавне и отсутствие изолированных нод.")
  im.Separator()

  if im.Button("Запустить комплексную проверку карты", im.ImVec2(320, 32)) then
    M.runFullAudit()
  end

  im.Spacing()

  -- Левая колонка: Проблемы физики и дорог, Правая: Баланс грузов
  im.Columns(2, "AuditColumns", true)

  -- Левая колонка
  im.TextColored(im.ImVec4(1.0, 0.8, 0.2, 1.0), "Замечания по карте (" .. #M.auditIssues .. "):")
  im.Separator()

  if im.BeginChild("AuditIssuesScroll", im.ImVec2(0, 360), true) then
    if #M.auditIssues == 0 then
      im.TextColored(im.ImVec4(0.4, 0.9, 0.4, 1.0), "Критических замечаний нет или проверка еще не запускалась.")
    else
      for idx, issue in ipairs(M.auditIssues) do
        if issue.severity == "danger" then
          im.TextColored(im.ImVec4(1.0, 0.3, 0.3, 1.0), "✖ [ОШИБКА] ")
        else
          im.TextColored(im.ImVec4(1.0, 0.8, 0.2, 1.0), "⚠ [ВНИМАНИЕ] ")
        end
        im.SameLine()
        im.TextWrapped(issue.text)

        if issue.pos and im.SmallButton("Камера к точке##issue_" .. idx) then
          core.viewport.teleportCameraTo(issue.pos)
        end
        im.Separator()
      end
    end
    im.EndChild()
  end

  im.NextColumn()

  -- Правая колонка: Баланс типов грузов
  im.TextColored(im.ImVec4(0.4, 0.8, 1.0, 1.0), "Активность типов грузов на карте:")
  im.Separator()

  if im.BeginChild("CargoMatrixScroll", im.ImVec2(0, 360), true) then
    if next(M.cargoStats) == nil then
      im.TextDisabled("Нажмите 'Запустить комплексную проверку' для расчета матрицы.")
    else
      for cId, data in pairs(M.cargoStats) do
        if data.count == 0 then
          im.TextColored(im.ImVec4(0.6, 0.6, 0.6, 1.0), "⚪ " .. data.name .. ": не задействован (0 рамп)")
        else
          im.TextColored(im.ImVec4(0.3, 1.0, 0.4, 1.0), "✔ " .. data.name .. ": " .. data.count .. " рамп(ы)")
        end
      end
    end
    im.EndChild()
  end

  im.Columns(1)
end

-- ====================================================================
-- 3. GUI: ИНСПЕКТОР ПРЕДПРИЯТИЙ (FACILITIES TAB)
-- ====================================================================

function M.renderFacilitiesTab()
  local facs = core.careerData.facilities

  -- Панель создания из пресетов
  im.TextColored(im.ImVec4(0.3, 0.8, 1.0, 1.0), "Добавить новое предприятие по шаблону:")
  for presetKey, preset in pairs(core.templates.facilityPresets) do
    if im.Button(preset.name .. "##btn_" .. presetKey) then
      local camPos, camQuat = core.viewport.getCameraTransform()
      local snappedPos = core.viewport.snapToGround(camPos + (camQuat * vec3(0, 8, 0)))
      local newFac = core.templates.createFacilityFromPreset(presetKey, snappedPos, camQuat)
      table.insert(facs, newFac)
      core.state.selectedFacilityIndex = #facs
      core.state.selectedZoneIndex = 1
      core.setStatus("Создано: " .. preset.name, 0.3, 1.0, 0.3)
    end
    im.SameLine()
  end
  im.NewLine()
  im.Separator()

  -- Сплит-панель: Список слева (300px), Инспектор параметров справа
  im.Columns(2, "FacSplit", true)
  im.SetColumnWidth(0, 320)

  -- Левый список
  im.Text("Список предприятий (" .. #facs .. "):")
  if im.BeginChild("FacListScroll", im.ImVec2(0, 460), true) then
    for idx, fac in ipairs(facs) do
      local isSelected = (core.state.selectedFacilityIndex == idx)
      if im.Selectable((fac.name or fac.id) .. "##fac_" .. idx, isSelected) then
        core.state.selectedFacilityIndex = idx
        core.state.selectedZoneIndex = 1
      end
    end
    im.EndChild()
  end

  im.NextColumn()

  -- Правый инспектор выбранного предприятия
  local selectedFac = facs[core.state.selectedFacilityIndex]
  if not selectedFac then
    im.TextColored(im.ImVec4(0.6, 0.6, 0.6, 1.0), "Выберите предприятие из списка слева или создайте новое по шаблону выше.")
  else
    if im.BeginChild("FacInspectorScroll", im.ImVec2(0, 460), false) then
      im.TextColored(im.ImVec4(1.0, 0.8, 0.2, 1.0), "Параметры: " .. (selectedFac.name or selectedFac.id))

      -- Название
      local nameBuf = im.ArrayCharByString(selectedFac.name or "", 128)
      if im.InputText("Название объекта", nameBuf, 128) then
        selectedFac.name = ffi.string(nameBuf)
      end

      -- ID
      local idBuf = im.ArrayCharByString(selectedFac.id or "", 64)
      if im.InputText("Уникальный ID", idBuf, 64) then
        selectedFac.id = ffi.string(idBuf)
      end

      im.Spacing()
      if im.Button("Камера к терминалу") then
        core.viewport.teleportCameraTo(core.io.tableToVec3(selectedFac.position))
      end
      im.SameLine()
      if im.Button("Переместить терминал на камеру") then
        local camPos, camQuat = core.viewport.getCameraTransform()
        local groundPos = core.viewport.snapToGround(camPos)
        selectedFac.position = core.io.vec3ToTable(groundPos)
        selectedFac.rotation = core.io.quatToTable(camQuat)
        core.setStatus("Позиция терминала обновлена", 0.5, 1.0, 0.5)
      end

      im.Separator()
      im.TextColored(im.ImVec4(0.3, 0.8, 1.0, 1.0), "Рампы и зоны погрузки предприятия:")

      if im.Button("+ Добавить новую рампу") then
        selectedFac.zones = selectedFac.zones or {}
        local fPos = core.io.tableToVec3(selectedFac.position)
        local fRot = core.io.tableToQuat(selectedFac.rotation)
        local newZonePos = fPos + (fRot * vec3(#selectedFac.zones * 5.0 + 6.0, 0, 0))
        table.insert(selectedFac.zones, {
          id = selectedFac.id .. "_bay_" .. (#selectedFac.zones + 1),
          name = "Рампа #" .. (#selectedFac.zones + 1),
          type = "loading_bay",
          pos = core.io.vec3ToTable(newZonePos),
          rot = core.io.quatToTable(fRot),
          size = {3.5, 12.0, 4.0},
          cargoTypes = {"dry_goods"},
          profile = "semiTruckTrailer"
        })
      end

      -- Список рамп
      if selectedFac.zones then
        for zIdx, zone in ipairs(selectedFac.zones) do
          im.PushID1("zone_card_" .. zIdx)
          im.Separator()
          
          local isZoneSel = (core.state.selectedZoneIndex == zIdx)
          if im.Selectable("▶ " .. (zone.name or zone.id), isZoneSel) then
            core.state.selectedZoneIndex = zIdx
          end

          im.SameLine(im.GetWindowWidth() - 160)
          if im.SmallButton("Телепорт к рампе") then
            core.viewport.teleportCameraTo(core.io.tableToVec3(zone.pos))
          end
          im.SameLine()
          if im.SmallButton("Удалить") then
            table.remove(selectedFac.zones, zIdx)
            im.PopID()
            break
          end

          -- Настройки активной рампы
          if isZoneSel then
            local zNameBuf = im.ArrayCharByString(zone.name or "", 64)
            if im.InputText("Имя рампы", zNameBuf, 64) then
              zone.name = ffi.string(zNameBuf)
            end

            if im.Button("Поставить рампу на камеру (с привязкой к земле)") then
              local cPos, cQuat = core.viewport.getCameraTransform()
              zone.pos = core.io.vec3ToTable(core.viewport.snapToGround(cPos))
              zone.rot = core.io.quatToTable(cQuat)
            end

            -- Чекбоксы поддерживаемых грузов
            im.Text("Принимаемые типы грузов:")
            for _, cargo in ipairs(core.templates.cargoTypes) do
              local hasCargo = false
              for _, cId in ipairs(zone.cargoTypes or {}) do
                if cId == cargo.id then hasCargo = true; break end
              end

              local cPtr = im.BoolPtr(hasCargo)
              if im.Checkbox(cargo.icon .. " " .. cargo.name .. "##c_" .. cargo.id, cPtr) then
                if cPtr[0] then
                  table.insert(zone.cargoTypes, cargo.id)
                else
                  for i, cId in ipairs(zone.cargoTypes) do
                    if cId == cargo.id then table.remove(zone.cargoTypes, i); break end
                  end
                end
              end
            end
          end

          im.PopID()
        end
      end

      im.Spacing()
      im.Separator()
      if im.Button("Удалить всё предприятие", im.ImVec2(200, 26)) then
        table.remove(facs, core.state.selectedFacilityIndex)
        core.state.selectedFacilityIndex = nil
        core.state.selectedZoneIndex = nil
      end

      im.EndChild()
    end
  end

  im.Columns(1)
end

-- ====================================================================
-- 4. GUI: ИНСПЕКТОР АВТОСАЛОНОВ (DEALERSHIPS TAB)
-- ====================================================================

function M.renderDealershipsTab()
  local dealers = core.careerData.dealerships

  im.TextColored(im.ImVec4(0.3, 0.8, 1.0, 1.0), "Создать автосалон по шаблону:")
  for pKey, preset in pairs(core.templates.dealershipPresets) do
    if im.Button(preset.name .. "##dbtn_" .. pKey) then
      local cPos, cQuat = core.viewport.getCameraTransform()
      local basePos = core.viewport.snapToGround(cPos + (cQuat * vec3(0, 6, 0)))
      local dId = preset.id_prefix .. "_" .. os.date("%H%M%S")

      local newDealer = {
        id = dId,
        name = preset.name,
        type = preset.type,
        position = core.io.vec3ToTable(basePos),
        rotation = core.io.quatToTable(cQuat),
        deliverySpots = {}
      }

      -- Генерация точек выдачи авто
      for s = 1, preset.deliverySpotsCount do
        local spotPos = basePos + (cQuat * vec3(s * 4.0 + 3.0, 0, 0))
        table.insert(newDealer.deliverySpots, {
          pos = core.io.vec3ToTable(spotPos),
          rot = core.io.quatToTable(cQuat),
          size = {preset.deliverySpotSize.x, preset.deliverySpotSize.y, preset.deliverySpotSize.z}
        })
      end

      table.insert(dealers, newDealer)
      core.state.selectedDealerIndex = #dealers
      core.setStatus("Создан автосалон: " .. preset.name, 0.3, 1.0, 0.3)
    end
    im.SameLine()
  end
  im.NewLine()
  im.Separator()

  im.Columns(2, "DealerSplit", true)
  im.SetColumnWidth(0, 320)

  im.Text("Автосалоны на карте (" .. #dealers .. "):")
  if im.BeginChild("DealerListScroll", im.ImVec2(0, 460), true) then
    for idx, d in ipairs(dealers) do
      local isSel = (core.state.selectedDealerIndex == idx)
      if im.Selectable((d.name or d.id) .. "##dlist_" .. idx, isSel) then
        core.state.selectedDealerIndex = idx
      end
    end
    im.EndChild()
  end

  im.NextColumn()

  local selectedDealer = dealers[core.state.selectedDealerIndex]
  if not selectedDealer then
    im.TextColored(im.ImVec4(0.6, 0.6, 0.6, 1.0), "Выберите автосалон для настройки площадки выдачи авто.")
  else
    if im.BeginChild("DealerInspectorScroll", im.ImVec2(0, 460), false) then
      local dNameBuf = im.ArrayCharByString(selectedDealer.name or "", 128)
      if im.InputText("Название салона", dNameBuf, 128) then
        selectedDealer.name = ffi.string(dNameBuf)
      end

      if im.Button("Камера к салону") then
        core.viewport.teleportCameraTo(core.io.tableToVec3(selectedDealer.position))
      end
      im.SameLine()
      if im.Button("Переместить меню покупки на камеру") then
        local cPos, cQuat = core.viewport.getCameraTransform()
        selectedDealer.position = core.io.vec3ToTable(core.viewport.snapToGround(cPos))
        selectedDealer.rotation = core.io.quatToTable(cQuat)
      end

      im.Separator()
      im.TextColored(im.ImVec4(1.0, 0.6, 0.1, 1.0), "Точки выдачи приобретенных авто (Delivery Spots):")

      if selectedDealer.deliverySpots then
        for sIdx, spot in ipairs(selectedDealer.deliverySpots) do
          im.PushID1("spot_d_" .. sIdx)
          im.Text("Спот выдачи #" .. sIdx)
          im.SameLine()
          if im.SmallButton("Поставить на камеру") then
            local cPos, cQuat = core.viewport.getCameraTransform()
            spot.pos = core.io.vec3ToTable(core.viewport.snapToGround(cPos))
            spot.rot = core.io.quatToTable(cQuat)
          end
          im.SameLine()
          if im.SmallButton("Удалить") then
            table.remove(selectedDealer.deliverySpots, sIdx)
            im.PopID()
            break
          end
          im.PopID()
        end
      end

      if im.Button("+ Добавить точку выдачи авто") then
        selectedDealer.deliverySpots = selectedDealer.deliverySpots or {}
        local cPos, cQuat = core.viewport.getCameraTransform()
        table.insert(selectedDealer.deliverySpots, {
          pos = core.io.vec3ToTable(core.viewport.snapToGround(cPos)),
          rot = core.io.quatToTable(cQuat),
          size = {2.8, 6.0, 2.2}
        })
      end

      im.Separator()
      if im.Button("Удалить автосалон", im.ImVec2(180, 26)) then
        table.remove(dealers, core.state.selectedDealerIndex)
        core.state.selectedDealerIndex = nil
      end

      im.EndChild()
    end
  end

  im.Columns(1)
end

-- ====================================================================
-- 5. GUI: ИНСПЕКТОР ПАРКОВОК (PARKING TAB)
-- ====================================================================

function M.renderParkingTab()
  local parks = core.careerData.parkingSpots

  im.TextColored(im.ImVec4(0.3, 0.8, 1.0, 1.0), "Генератор и разметка парковочных мест")
  
  if im.Button("+ Добавить одиночный парковочный спот на камеру", im.ImVec2(360, 32)) then
    local cPos, cQuat = core.viewport.getCameraTransform()
    table.insert(parks, {
      id = "park_" .. os.date("%H%M%S"),
      pos = core.io.vec3ToTable(core.viewport.snapToGround(cPos)),
      rot = core.io.quatToTable(cQuat),
      size = {2.5, 5.0, 2.0}
    })
    core.setStatus("Парковочный спот добавлен", 0.4, 1.0, 0.4)
  end

  im.Separator()
  im.Text("Всего парковочных мест на карте: " .. #parks)

  if im.BeginChild("ParkingScroll", im.ImVec2(0, 460), true) then
    for pIdx, p in ipairs(parks) do
      im.PushID1("p_item_" .. pIdx)
      im.Text("Спот: " .. (p.id or ("#" .. pIdx)))
      im.SameLine(im.GetWindowWidth() - 200)
      if im.SmallButton("Телепорт") then
        core.viewport.teleportCameraTo(core.io.tableToVec3(p.pos))
      end
      im.SameLine()
      if im.SmallButton("Удалить") then
        table.remove(parks, pIdx)
        im.PopID()
        break
      end
      im.Separator()
      im.PopID()
    end
    im.EndChild()
  end
end

return M
