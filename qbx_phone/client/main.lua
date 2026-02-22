phoneOpen = false
local phoneProp = nil
local playerData = {}

local function LoadAnimDict(dict)
    RequestAnimDict(dict)
    while not HasAnimDictLoaded(dict) do
        Wait(0)
    end
end

local function LoadModel(model)
    local modelHash = GetHashKey(model)
    RequestModel(modelHash)
    while not HasModelLoaded(modelHash) do
        Wait(0)
    end
    return modelHash
end

local function ClosePhone()
    if not phoneOpen then
        return
    end

    SetNuiFocus(false, false)
    SendNUIMessage({ type = 'closePhone' })
    ClearPedTasks(PlayerPedId())

    if phoneProp and DoesEntityExist(phoneProp) then
        DeleteObject(phoneProp)
    end

    phoneProp = nil
    phoneOpen = false
end

local function OpenPhone()
    local ped = PlayerPedId()

    LoadAnimDict('cellphone@')
    local phoneModel = LoadModel('prop_phone_ing')

    local coords = GetEntityCoords(ped)
    phoneProp = CreateObject(phoneModel, coords.x, coords.y, coords.z, true, true, false)

    AttachEntityToEntity(
        phoneProp,
        ped,
        GetPedBoneIndex(ped, 57005),
        0.15,
        0.02,
        -0.03,
        170.0,
        90.0,
        20.0,
        true,
        true,
        false,
        true,
        1,
        true
    )

    TaskPlayAnim(ped, 'cellphone@', 'cellphone_call_listen_base', 8.0, -8.0, -1, 49, 0.0, false, false, false)
    SetNuiFocus(true, true)
    phoneOpen = true
    SendNUIMessage({
        type = 'openPhone',
        playerData = playerData
    })
end

local function togglePhone()
    if phoneOpen then
        ClosePhone()
        return
    end

    if Config.RequireItem and not exports.qbx_core:HasItem(Config.PhoneItem) then
        TriggerEvent('ox_lib:notify', { type = 'error', description = 'Nie posiadasz telefonu.' })
        return
    end

    OpenPhone()
end

local function CaptureSelfie()
    if GetResourceState('screenshot-basic') ~= 'started' then
        SendNUIMessage({
            type = 'selfieCaptured',
            success = false,
            error = 'screenshot_unavailable'
        })
        return
    end

    local uploadUrl = Config.ScreenshotUploadURL
    if uploadUrl and uploadUrl ~= '' then
        exports['screenshot-basic']:requestScreenshotUpload(uploadUrl, 'files[]', function(response)
            local ok, parsed = pcall(json.decode, response)
            local imageUrl = nil

            if ok and parsed then
                imageUrl = parsed.url or parsed.link or (parsed.files and parsed.files[1] and parsed.files[1].url)
            end

            SendNUIMessage({
                type = 'selfieCaptured',
                success = imageUrl ~= nil,
                image = imageUrl,
                error = imageUrl and nil or 'upload_failed'
            })
        end)
        return
    end

    exports['screenshot-basic']:requestScreenshot({ encoding = 'jpg', quality = 0.8 }, function(data)
        SendNUIMessage({
            type = 'selfieCaptured',
            success = data ~= nil,
            image = data,
            error = data and nil or 'capture_failed'
        })
    end)
end

RegisterCommand('phone_toggle', function()
    togglePhone()
end, false)

RegisterCommand('selfie', function()
    CaptureSelfie()
end, false)

RegisterKeyMapping('phone_toggle', 'Otwórz/zamknij telefon', 'keyboard', 'F1')

RegisterNetEvent('qbx_phone:receivePlayerData', function(data)
    playerData = data or {}

    if phoneOpen then
        SendNUIMessage({
            type = 'openPhone',
            playerData = playerData
        })
        return
    end

    SendNUIMessage({
        type = 'setPlayerData',
        playerData = playerData
    })
end)

RegisterNUICallback('closePhone', function(_, cb)
    ClosePhone()
    cb({})
end)

RegisterNUICallback('ready', function(_, cb)
    TriggerServerEvent('qbx_phone:getPlayerData')
    cb({})
end)

RegisterNUICallback('takeSelfie', function(_, cb)
    CaptureSelfie()
    cb({})
end)
