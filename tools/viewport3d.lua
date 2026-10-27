-- ====================================================================
-- RLS Career Studio for BeamNG.drive World Editor (F11)
-- 3D Viewport Rendering, Ghost Car, Raycast & Link Visualizer
-- Path: lua/ge/extensions/editor/rlsCareerEditor/viewport3d.lua
-- ====================================================================

local M = {}
local logTag = "rlsCareerEditor_viewport"

local core = nil -- Ссылка на главный контроллер

-- Цветовая палитра для debugDrawer (ColorF: r, g, b, a)
local COLORS = {
  facilityMain = ColorF(0.2, 0.7, 1.0, 0.6),      -- Голубой: терминал/офис
  loadingBay   = ColorF(0.2, 1.0, 0.3, 0.5),      -- Зеленый: рампы и зоны погрузки
  dealerTrigger= ColorF(1.0, 0.8, 0.1, 0.6),      -- Желтый: меню автосалона
  dealerSpawn  = ColorF(1.0, 0.4, 0.0, 0.5),      -- Оранжевый: выдача проданных машин
  parkingSpot  = ColorF(0.4, 0.5, 1.0, 0.4),      -- Синий: парковочные места
  selected     = ColorF(1.0, 1.0, 1.0, 0.9),      -- Белый: выбранный в GUI объект
  linkLine     = ColorF(0.1, 0.9, 0.9, 0.7),      -- Бирюзовый: вектор связи
  navWarning   = ColorF(1.0, 0.1, 0.1, 0.8)       -- Красный: предупреждение/ошибка
}

function M.init(mainController)
  core = mainController
end

-- ====================================================================
-- РАБОТА С КАМЕРОЙ И ПРИВЯЗКА К ЗЕМЛЕ (RAYCAST)
-- ====================================================================

-- Получение текущей позиции свободной камеры редактора
function M.getCameraTransform()
  local camPos = core_camera.getPosition()
  local camQuat = core_camera.getQuat()
  return camPos, camQuat
end

-- Raycast вниз: пробивает луч сквозь сцену до асфальта/земли
function M.snapToGround(pos)
  if not pos then return vec3(0, 0, 0) end
  local rayStart = vec3(pos.x, pos.y, pos.z + 15.0)
  local rayDown  = vec3(0, 0, -50.0)

  local hitDist = castRayStatic(rayStart, rayDown)
  if hitDist and hitDist < 50.0 then
    return vec3(pos.x, pos.y, rayStart.z - hitDist + 0.05)
  end
  return pos
end

-- Телепортация камеры редактора к выбранному объекту
function M.teleportCameraTo(targetPos)
  if not targetPos then return end
  local eyePos = targetPos + vec3(-6.0, -6.0, 5.0)
  core_camera.setPosRot(eyePos.x, eyePos.y, eyePos.z, 0, 0, 0)
end

function M.teleportToSelected()
  if not core then return end
  local pos = nil

  if core.state.selectedTab == 0 and core.state.selectedFacilityIndex then
    local fac = core.careerData.facilities[core.state.selectedFacilityIndex]
    if fac and fac.position then
      pos = core.io.tableToVec3(fac.position)
    end
  elseif core.state.selectedTab == 1 and core.state.selectedDealerIndex then
    local dealer = core.careerData.dealerships[core.state.selectedDealerIndex]
    if dealer and dealer.position then
      pos = core.io.tableToVec3(dealer.position)
    end
  end

  if pos then
    M.teleportCameraTo(pos)
    core.setStatus("Камера перемещена к объекту", 0.5, 1.0, 0.5)
  else
    core.setStatus("Сначала выберите объект в списке", 1.0, 0.6, 0.2)
  end
end

-- ====================================================================
-- ОТРИСОВКА ПРИЗРАКА ТЕХНИКИ (GHOST CAR)
-- ====================================================================

local function drawGhostCar(pos, rot, profileKey)
  if not core.templates then return end
  local profile = core.templates.vehicleProfiles[profileKey] or core.templates.vehicleProfiles.van
  local dims = profile.dims

  -- Половины размеров для центрирования бокса
  local halfX = dims.x * 0.5
  local halfY = dims.y * 0.5
  local height = dims.z

  -- 8 локальных вершин параллелепипеда
  local localCorners = {
    vec3(-halfX, -halfY, 0),
    vec3( halfX, -halfY, 0),
    vec3( halfX,  halfY, 0),
    vec3(-halfX,  halfY, 0),
    vec3(-halfX, -halfY, height),
    vec3( halfX, -halfY, height),
    vec3( halfX,  halfY, height),
    vec3(-halfX,  halfY, height)
  }

  local worldCorners = {}
  for i, c in ipairs(localCorners) do
    worldCorners[i] = pos + (rot * c)
  end

  -- Цвет призрака из профиля
  local col = ColorF(profile.color[1], profile.color[2], profile.color[3], profile.color[4])
  local edgeCol = ColorF(profile.color[1] * 1.2, profile.color[2] * 1.2, profile.color[3] * 1.2, 0.9)

  -- Отрисовка 12 ребер контура машины
  local function drawLine(i1, i2)
    debugDrawer:drawLine(worldCorners[i1], worldCorners[i2], edgeCol)
  end

  -- Нижний и верхний контуры
  drawLine(1, 2); drawLine(2, 3); drawLine(3, 4); drawLine(4, 1)
  drawLine(5, 6); drawLine(6, 7); drawLine(7, 8); drawLine(8, 5)
  -- Вертикальные стойки
  drawLine(1, 5); drawLine(2, 6); drawLine(3, 7); drawLine(4, 8)

  -- Стрелка направления движения (капот / лобовое стекло)
  local frontCenter = (worldCorners[3] + worldCorners[4]) * 0.5
  local hoodCenter  = pos + (rot * vec3(0, halfY * 0.5, height * 0.3))
  local arrowTip    = pos + (rot * vec3(0, halfY + 1.2, 0.2))

  debugDrawer:drawLine(hoodCenter, arrowTip, ColorF(1, 1, 0, 0.9))
  debugDrawer:drawSphere(arrowTip, 0.15, ColorF(1, 0.8, 0, 1))

  -- Текстовая метка над призраком
  local labelPos = pos + vec3(0, 0, height + 0.4)
  debugDrawer:drawTextAdvanced(labelPos, String(profile.name), ColorF(1, 1, 1, 0.9), true, false, ColorI(0, 0, 0, 200))
end

-- ====================================================================
-- ОТРИСОВКА ТРИГГЕР-БОКСОВ И ВЕКТОРОВ СВЯЗЕЙ
-- ====================================================================

-- Отрисовка ориентированного 3D-бокса зоны
local function drawOrientedBox(pos, rot, size, color, label)
  local hX, hY, hZ = size.x * 0.5, size.y * 0.5, size.z * 0.5

  local localCorners = {
    vec3(-hX, -hY, -hZ), vec3( hX, -hY, -hZ), vec3( hX,  hY, -hZ), vec3(-hX,  hY, -hZ),
    vec3(-hX, -hY,  hZ), vec3( hX, -hY,  hZ), vec3( hX,  hY,  hZ), vec3(-hX,  hY,  hZ)
  }

  local w = {}
  for i, c in ipairs(localCorners) do
    w[i] = pos + (rot * c)
  end

  local edgeCol = ColorF(color.r, color.g, color.b, 0.85)

  local function edge(a, b) debugDrawer:drawLine(w[a], w[b], edgeCol) end
  edge(1,2); edge(2,3); edge(3,4); edge(4,1)
  edge(5,6); edge(6,7); edge(7,8); edge(8,5)
  edge(1,5); edge(2,6); edge(3,7); edge(4,8)

  -- Диагональный крест на полу для центровки
  debugDrawer:drawLine(w[1], w[3], ColorF(color.r, color.g, color.b, 0.3))
  debugDrawer:drawLine(w[2], w[4], ColorF(color.r, color.g, color.b, 0.3))

  if label then
    debugDrawer:drawTextAdvanced(pos + vec3(0, 0, hZ + 0.2), String(label), ColorF(1, 1, 1, 0.9), true, false, ColorI(20, 20, 20, 180))
  end
end

-- ====================================================================
-- ГЛАВНЫЙ ЦИКЛ 3D ОТРИСОВКИ
-- ====================================================================

function M.draw3D()
  if not core or not core.careerData then return end

  -- 1. Отрисовка Предприятий (Facilities)
  for fIdx, fac in ipairs(core.careerData.facilities) do
    local isFacSelected = (core.state.selectedTab == 0 and core.state.selectedFacilityIndex == fIdx)
    local facPos = core.io.tableToVec3(fac.position)
    local facRot = core.io.tableToQuat(fac.rotation)

    -- Главный триггер офиса
    local trigSize = (fac.accessTrigger and fac.accessTrigger.size) and core.io.tableToVec3(fac.accessTrigger.size) or vec3(3, 3, 2.5)
    local trigColor = isFacSelected and COLORS.selected or COLORS.facilityMain
    drawOrientedBox(facPos, facRot, trigSize, trigColor, fac.name or fac.id)

    -- Рампы и зоны предприятия
    if fac.zones then
      for zIdx, zone in ipairs(fac.zones) do
        local isZoneSelected = (isFacSelected and core.state.selectedZoneIndex == zIdx)
        local zPos = core.io.tableToVec3(zone.pos)
        local zRot = core.io.tableToQuat(zone.rot)
        local zSize = core.io.tableToVec3(zone.size or {3.5, 12.0, 4.0})

        local zColor = isZoneSelected and COLORS.selected or COLORS.loadingBay
        drawOrientedBox(zPos, zRot, zSize, zColor, zone.name or zone.id)

        -- Линия связи от офиса к рампе
        debugDrawer:drawLine(facPos, zPos, COLORS.linkLine)

        -- Если зона выбрана и включен Ghost Car — рисуем призрак машины
        if isZoneSelected and core.state.showGhostCar then
          drawGhostCar(zPos, zRot, zone.profile or core.state.ghostVehicleType)
        end
      end
    end
  end

  -- 2. Отрисовка Автосалонов (Dealerships)
  for dIdx, dealer in ipairs(core.careerData.dealerships) do
    local isDealerSelected = (core.state.selectedTab == 1 and core.state.selectedDealerIndex == dIdx)
    local dPos = core.io.tableToVec3(dealer.position)
    local dRot = core.io.tableToQuat(dealer.rotation)

    local dColor = isDealerSelected and COLORS.selected or COLORS.dealerTrigger
    drawOrientedBox(dPos, dRot, vec3(3.5, 3.5, 2.5), dColor, dealer.name or dealer.id)

    -- Точки выдачи купленных авто (delivery spots)
    if dealer.deliverySpots then
      for sIdx, spot in ipairs(dealer.deliverySpots) do
        local sPos = core.io.tableToVec3(spot.pos)
        local sRot = core.io.tableToQuat(spot.rot)
        local sSize = core.io.tableToVec3(spot.size or {2.8, 6.0, 2.2})

        drawOrientedBox(sPos, sRot, sSize, COLORS.dealerSpawn, "Выдача #" .. sIdx)
        debugDrawer:drawLine(dPos, sPos, COLORS.dealerSpawn)

        if isDealerSelected and core.state.showGhostCar then
          drawGhostCar(sPos, sRot, "sedan")
        end
      end
    end
  end

  -- 3. Отрисовка Парковочных мест (Parking Spots)
  for pIdx, park in ipairs(core.careerData.parkingSpots) do
    local pPos = core.io.tableToVec3(park.pos)
    local pRot = core.io.tableToQuat(park.rot)
    local pSize = core.io.tableToVec3(park.size or {2.5, 5.0, 2.0})

    drawOrientedBox(pPos, pRot, pSize, COLORS.parkingSpot, park.id)
  end
end

return M
