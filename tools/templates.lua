-- ====================================================================
-- RLS Career Studio for BeamNG.drive World Editor (F11)
-- Archetype Templates, Ghost Dimensions & Cargo Catalog
-- Path: lua/ge/extensions/editor/rlsCareerEditor/templates.lua
-- ====================================================================

local M = {}

-- Каталог стандартных типов грузов для RLS Career
M.cargoTypes = {
  { id = "parcel",       name = "Мелкие посылки (Курьер)",      category = "light",   icon = "📦" },
  { id = "dry_goods",    name = "Паллеты (Сухие товары)",       category = "medium",  icon = "🪵" },
  { id = "refrigerated", name = "Рефрижератор (Продукты)",      category = "medium",  icon = "❄️" },
  { id = "construction", name = "Стройматериалы / Металл",      category = "heavy",   icon = "🏗️" },
  { id = "bulk",         name = "Сыпучие грузы (Самосвал)",      category = "heavy",   icon = "🪨" },
  { id = "liquid",       name = "Наливные грузы (Цистерна)",    category = "heavy",   icon = "🛢️" },
  { id = "container_20", name = "Морской контейнер 20ft",       category = "heavy",   icon = "🚢" },
  { id = "container_40", name = "Морской контейнер 40ft",       category = "heavy",   icon = "🚛" },
  { id = "vehicles",     name = "Перевозка техники (Автовоз)",  category = "special", icon = "🚗" }
}

-- Физические габариты техники (для swept path, детекции клиренса и Ghost Car)
-- Размеры в метрах: { length, width, height, wheelBase, frontOverhang, rearOverhang }
M.vehicleProfiles = {
  compact = {
    name = "Компакт (Covet / Vivace)",
    dims = vec3(1.75, 3.8, 1.4),
    wheelbase = 2.4,
    color = {0.2, 0.8, 0.2, 0.35}
  },
  sedan = {
    name = "Седан / Универсал (Pessima / Bastion)",
    dims = vec3(1.9, 4.8, 1.45),
    wheelbase = 2.8,
    color = {0.2, 0.6, 1.0, 0.35}
  },
  pickup = {
    name = "Внедорожник / Пикап (D-Series)",
    dims = vec3(2.1, 5.4, 1.9),
    wheelbase = 3.3,
    color = {0.9, 0.6, 0.1, 0.35}
  },
  van = {
    name = "Фургон доставки (H-Series Cargo)",
    dims = vec3(2.2, 5.8, 2.5),
    wheelbase = 3.6,
    color = {0.8, 0.3, 0.9, 0.35}
  },
  mediumTruck = {
    name = "Грузовик одиночка (T-Series Rigid)",
    dims = vec3(2.5, 9.2, 3.6),
    wheelbase = 5.2,
    color = {1.0, 0.4, 0.1, 0.35}
  },
  semiTruckTrailer = {
    name = "Седельный тягач с полуприцепом (48/53ft)",
    dims = vec3(2.6, 17.5, 4.1),
    wheelbase = 12.5,
    articulated = true,
    color = {1.0, 0.1, 0.1, 0.35}
  }
}

-- Пресеты предприятий (Facilities)
M.facilityPresets = {
  logisticsHub = {
    id_prefix = "facility_logistics",
    name = "Логистический комплекс",
    type = "logistics",
    description = "Крупный распределительный центр штучных и паллетных грузов.",
    accessTrigger = {
      size = vec3(3.0, 3.0, 2.5),
      offset = vec3(0, 0, 0)
    },
    zones = {
      {
        id_suffix = "_bay_dry_1",
        name = "Рампа #1 (Паллеты)",
        type = "loading_bay",
        size = vec3(3.5, 12.0, 4.0),
        cargoFilter = {"dry_goods", "parcel"},
        vehicleProfile = "semiTruckTrailer"
      },
      {
        id_suffix = "_bay_dry_2",
        name = "Рампа #2 (Рефрижератор)",
        type = "loading_bay",
        size = vec3(3.5, 12.0, 4.0),
        cargoFilter = {"refrigerated", "dry_goods"},
        vehicleProfile = "semiTruckTrailer"
      },
      {
        id_suffix = "_van_dock",
        name = "Зона экспресс-доставки (Фургоны)",
        type = "delivery_van_spot",
        size = vec3(3.0, 7.0, 3.0),
        cargoFilter = {"parcel"},
        vehicleProfile = "van"
      }
    }
  },

  gasStation = {
    id_prefix = "facility_gas_station",
    name = "Автозаправочный комплекс",
    type = "fuel_service",
    description = "АЗС с магазином сопутствующих товаров и постом разгрузки цистерн.",
    accessTrigger = {
      size = vec3(2.5, 2.5, 2.5),
      offset = vec3(0, 0, 0)
    },
    zones = {
      {
        id_suffix = "_tanker_dropoff",
        name = "Слив нефтепродуктов",
        type = "fuel_intake",
        size = vec3(3.5, 16.0, 3.8),
        cargoFilter = {"liquid"},
        vehicleProfile = "semiTruckTrailer"
      },
      {
        id_suffix = "_shop_delivery",
        name = "Разгрузка маркета",
        type = "loading_bay",
        size = vec3(3.0, 6.5, 3.0),
        cargoFilter = {"parcel", "dry_goods"},
        vehicleProfile = "van"
      }
    }
  },

  constructionSite = {
    id_prefix = "facility_construction",
    name = "Строительный объект",
    type = "construction",
    description = "Стройплощадка. Требуются регулярные поставки бетона, сыпучих смесей и металлоконструкций.",
    accessTrigger = {
      size = vec3(3.0, 3.0, 2.5),
      offset = vec3(0, 0, 0)
    },
    zones = {
      {
        id_suffix = "_bulk_dump",
        name = "Зона выгрузки сыпучих материалов",
        type = "dump_zone",
        size = vec3(5.0, 10.0, 4.5),
        cargoFilter = {"bulk"},
        vehicleProfile = "mediumTruck"
      },
      {
        id_suffix = "_crane_unload",
        name = "Зона крановой разгрузки (Металл/Плиты)",
        type = "crane_zone",
        size = vec3(4.0, 14.0, 4.5),
        cargoFilter = {"construction"},
        vehicleProfile = "semiTruckTrailer"
      }
    }
  },

  repairGarage = {
    id_prefix = "facility_service_garage",
    name = "Автотехцентр / Мастерская",
    type = "mechanic",
    description = "Станция сервисного обслуживания, шиномонтаж и кузовной ремонт.",
    accessTrigger = {
      size = vec3(2.5, 2.5, 2.5),
      offset = vec3(0, 0, 0)
    },
    zones = {
      {
        id_suffix = "_parts_delivery",
        name = "Приемка запчастей и масел",
        type = "loading_bay",
        size = vec3(3.0, 6.0, 2.8),
        cargoFilter = {"parcel", "liquid"},
        vehicleProfile = "van"
      },
      {
        id_suffix = "_service_bay",
        name = "Бокс техосмотра",
        type = "service_bay",
        size = vec3(3.2, 7.0, 3.0),
        cargoFilter = {},
        vehicleProfile = "pickup"
      }
    }
  }
}

-- Пресеты автосалонов (Dealerships)
M.dealershipPresets = {
  usedCars = {
    id_prefix = "dealer_used",
    name = "Авторынок б/у автомобилей",
    type = "used_cars",
    description = "Площадка подержанных автомобилей с пробегом.",
    interactTrigger = { size = vec3(3.0, 3.0, 2.5) },
    previewSpot = { size = vec3(2.5, 5.5, 2.0) },
    deliverySpotsCount = 2,
    deliverySpotSize = vec3(2.6, 5.5, 2.2),
    classes = {"budget", "sedan", "hatchback", "beater"}
  },

  officialDealer = {
    id_prefix = "dealer_premium",
    name = "Официальный дилерский центр",
    type = "new_cars",
    description = "Продажа новых автомобилей с заводской гарантией.",
    interactTrigger = { size = vec3(3.5, 3.5, 2.5) },
    previewSpot = { size = vec3(2.5, 5.5, 2.0) },
    deliverySpotsCount = 3,
    deliverySpotSize = vec3(2.8, 6.0, 2.2),
    classes = {"modern", "sports", "suv", "luxury"}
  },

  heavyCommercial = {
    id_prefix = "dealer_commercial",
    name = "Центр коммерческого транспорта",
    type = "heavy_machinery",
    description = "Продажа тягачей, фургонов, автобусов и спецтехники.",
    interactTrigger = { size = vec3(4.0, 4.0, 2.8) },
    previewSpot = { size = vec3(3.5, 12.0, 3.8) },
    deliverySpotsCount = 2,
    deliverySpotSize = vec3(3.5, 14.0, 4.0),
    classes = {"truck", "semi", "bus", "trailer"}
  }
}

-- Вспомогательный генератор нового объекта Facility на основе пресета
function M.createFacilityFromPreset(presetKey, originPos, originRot)
  local preset = M.facilityPresets[presetKey]
  if not preset then return nil end

  local timestamp = os.date("%H%M%S")
  local facilityId = preset.id_prefix .. "_" .. timestamp

  local facility = {
    id = facilityId,
    name = preset.name,
    type = preset.type,
    description = preset.description,
    position = { originPos.x, originPos.y, originPos.z },
    rotation = { originRot.x, originRot.y, originRot.z, originRot.w },
    accessTrigger = {
      pos = { originPos.x, originPos.y, originPos.z },
      size = { preset.accessTrigger.size.x, preset.accessTrigger.size.y, preset.accessTrigger.size.z }
    },
    zones = {}
  }

  -- Смещение для рамп, чтобы они не спавнились в одной точке
  local offsetDist = 6.0
  for i, zoneTemplate in ipairs(preset.zones) do
    local offsetPos = originPos + (originRot * vec3((i - 1) * offsetDist + 5.0, 0, 0))
    table.insert(facility.zones, {
      id = facilityId .. zoneTemplate.id_suffix,
      name = zoneTemplate.name,
      type = zoneTemplate.type,
      pos = { offsetPos.x, offsetPos.y, offsetPos.z },
      rot = { originRot.x, originRot.y, originRot.z, originRot.w },
      size = { zoneTemplate.size.x, zoneTemplate.size.y, zoneTemplate.size.z },
      cargoTypes = deepcopy(zoneTemplate.cargoFilter),
      profile = zoneTemplate.vehicleProfile
    })
  end

  return facility
end

return M
