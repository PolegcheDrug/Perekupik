-- ====================================================================
-- RLS Career Studio for BeamNG.drive World Editor (F11)
-- File I/O, Backup Manager & JSON Serializer
-- Path: lua/ge/extensions/editor/rlsCareerEditor/ioManager.lua
-- ====================================================================

local M = {}
local logTag = "rlsCareerEditor_io"

local core = nil -- Ссылка на главный контроллер

-- Относительный путь для данных карьеры внутри уровня
local RLS_DIR_NAME = "rls_career"

function M.init(mainController)
  core = mainController
end

-- Получение базового пути к папке уровня
local function getLevelBasePath(levelName)
  levelName = levelName or (core and core.state.currentLevel)
  if not levelName or levelName == "" or levelName == "Уровень не загружен" then
    return nil
  end
  return "levels/" .. levelName .. "/"
end

-- Получение пути к папке rls_career уровня
local function getRlsDirectoryPath(levelName)
  local basePath = getLevelBasePath(levelName)
  if not basePath then return nil end
  return basePath .. RLS_DIR_NAME .. "/"
end

-- Проверка и создание папки rls_career, если она еще не создана
local function ensureDirectoryExists(dirPath)
  if not FS:directoryExists(dirPath) then
    FS:directoryCreate(dirPath)
    log("I", logTag, "Создана директория: " .. dirPath)
  end
end

-- Создание резервной копии существующего файла перед перезаписью
local function createBackupFile(filePath)
  if not FS:fileExists(filePath) then return end

  local timestamp = os.date("%Y%m%d_%H%M%S")
  local backupPath = filePath .. ".bak_" .. timestamp
  FS:copyFile(filePath, backupPath)
  log("I", logTag, "Создан бэкап: " .. backupPath)
end

-- Вспомогательная функция чтения JSON с парсингом
local function readJsonFile(filePath)
  if not FS:fileExists(filePath) then
    return nil
  end
  local content = jsonReadFile(filePath)
  if not content then
    log("W", logTag, "Не удалось прочитать или распарсить JSON: " .. filePath)
    return nil
  end
  return content
end

-- Вспомогательная функция записи таблицы в красивый отформатированный JSON
local function writeJsonFile(filePath, dataTable)
  createBackupFile(filePath)
  local success = jsonWriteFile(filePath, dataTable, true) -- true = pretty print
  if success then
    log("I", logTag, "Успешно записан файл: " .. filePath)
  else
    log("E", logTag, "Ошибка записи файла: " .. filePath)
  end
  return success
end

-- ====================================================================
-- ЗАГРУЗКА ДАННЫХ КАРЬЕРЫ
-- ====================================================================

function M.loadAllData(levelName)
  levelName = levelName or (core and core.state.currentLevel)
  local rlsDir = getRlsDirectoryPath(levelName)
  if not rlsDir then
    if core then core.setStatus("Ошибка: не удалось определить папку уровня", 1.0, 0.3, 0.3) end
    return false
  end

  ensureDirectoryExists(rlsDir)

  -- 1. Загрузка Facilities
  local facilitiesPath = rlsDir .. "facilities.json"
  local facData = readJsonFile(facilitiesPath)
  if facData then
    core.careerData.facilities = facData
    log("I", logTag, "Загружено предприятий: " .. tostring(#facData))
  else
    core.careerData.facilities = {}
  end

  -- 2. Загрузка Dealerships
  local dealerPath = rlsDir .. "dealerships.json"
  local dealerData = readJsonFile(dealerPath)
  if dealerData then
    core.careerData.dealerships = dealerData
    log("I", logTag, "Загружено автосалонов: " .. tostring(#dealerData))
  else
    core.careerData.dealerships = {}
  end

  -- 3. Загрузка Parking Spots
  local parkingPath = rlsDir .. "parkingSpots.json"
  local parkingData = readJsonFile(parkingPath)
  if parkingData then
    core.careerData.parkingSpots = parkingData
    log("I", logTag, "Загружено парковочных зон: " .. tostring(#parkingData))
  else
    core.careerData.parkingSpots = {}
  end

  local totalLoaded = #core.careerData.facilities + #core.careerData.dealerships + #core.careerData.parkingSpots
  if core then
    core.setStatus("Загружено объектов RLS: " .. totalLoaded, 0.4, 0.9, 0.4)
  end
  return true
end

-- ====================================================================
-- СОХРАНЕНИЕ ДАННЫХ КАРЬЕРЫ
-- ====================================================================

function M.saveAllData(levelName)
  levelName = levelName or (core and core.state.currentLevel)
  local rlsDir = getRlsDirectoryPath(levelName)
  if not rlsDir then
    if core then core.setStatus("Ошибка: путь сохранения недоступен", 1.0, 0.2, 0.2) end
    return false
  end

  ensureDirectoryExists(rlsDir)

  local fOk = writeJsonFile(rlsDir .. "facilities.json", core.careerData.facilities or {})
  local dOk = writeJsonFile(rlsDir .. "dealerships.json", core.careerData.dealerships or {})
  local pOk = writeJsonFile(rlsDir .. "parkingSpots.json", core.careerData.parkingSpots or {})

  if fOk and dOk and pOk then
    if core then
      core.setStatus("Все файлы RLS сохранены! (Бэкапы созданы)", 0.3, 1.0, 0.3)
    end
    return true
  else
    if core then
      core.setStatus("Ошибка при сохранении части файлов! Проверьте консоль (~)", 1.0, 0.3, 0.3)
    end
    return false
  end
end

-- Ручное создание бэкапа всей папки rls_career
function M.createBackup()
  local rlsDir = getRlsDirectoryPath()
  if not rlsDir then return end

  createBackupFile(rlsDir .. "facilities.json")
  createBackupFile(rlsDir .. "dealerships.json")
  createBackupFile(rlsDir .. "parkingSpots.json")
  
  if core then
    core.setStatus("Ручной бэкап файлов успешно создан", 0.7, 0.9, 1.0)
  end
end

-- ====================================================================
-- ВСПОМОГАТЕЛЬНЫЕ КОНВЕРТЕРЫ ПОЗИЦИЙ / ВЕКТОРОВ
-- ====================================================================

-- Преобразует таблицу координат {x, y, z} в vec3
function M.tableToVec3(tbl)
  if not tbl then return vec3(0, 0, 0) end
  return vec3(tbl[1] or tbl.x or 0, tbl[2] or tbl.y or 0, tbl[3] or tbl.z or 0)
end

-- Преобразует vec3 в массив [x, y, z] с округлением до 3 знаков
function M.vec3ToTable(v)
  if not v then return {0, 0, 0} end
  return {
    math.floor(v.x * 1000 + 0.5) / 1000,
    math.floor(v.y * 1000 + 0.5) / 1000,
    math.floor(v.z * 1000 + 0.5) / 1000
  }
end

-- Преобразует quat в массив [x, y, z, w]
function M.quatToTable(q)
  if not q then return {0, 0, 0, 1} end
  return {
    math.floor(q.x * 10000 + 0.5) / 10000,
    math.floor(q.y * 10000 + 0.5) / 10000,
    math.floor(q.z * 10000 + 0.5) / 10000,
    math.floor(q.w * 10000 + 0.5) / 10000
  }
end

-- Преобразует массив [x, y, z, w] в quat
function M.tableToQuat(tbl)
  if not tbl then return quat(0, 0, 0, 1) end
  return quat(tbl[1] or tbl.x or 0, tbl[2] or tbl.y or 0, tbl[3] or tbl.z or 0, tbl[4] or tbl.w or 1)
end

return M
