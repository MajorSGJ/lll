local incomingCall = nil
local activeCall = nil

local function loadCallAnim()
    RequestAnimDict('cellphone@')
    while not HasAnimDictLoaded('cellphone@') do
        Wait(0)
    end
end

local function startCallAnim()
    local ped = PlayerPedId()
    loadCallAnim()
    TaskPlayAnim(ped, 'cellphone@', 'cellphone_call_listen_base', 8.0, -8.0, -1, 49, 0.0, false, false, false)
end

local function stopCallAnim()
    ClearPedSecondaryTask(PlayerPedId())
end

RegisterNUICallback('startCall', function(data, cb)
    TriggerServerEvent('qbx_phone:startCall', {
        number = data.number
    })
    cb({})
end)

RegisterNUICallback('acceptCall', function(data, cb)
    TriggerServerEvent('qbx_phone:acceptCall', {
        callId = data.callId
    })
    cb({})
end)

RegisterNUICallback('declineCall', function(data, cb)
    TriggerServerEvent('qbx_phone:declineCall', {
        callId = data.callId
    })
    cb({})
end)

RegisterNUICallback('endCall', function(data, cb)
    TriggerServerEvent('qbx_phone:endCall', {
        callId = data.callId
    })
    cb({})
end)

RegisterNUICallback('getCallHistory', function(_, cb)
    local result = lib.callback.await('qbx_phone:getCallHistory')
    cb(result or {})
end)

RegisterNetEvent('qbx_phone:incomingCall', function(payload)
    incomingCall = payload
    SendNUIMessage({
        type = 'incomingCall',
        payload = payload
    })
end)

RegisterNetEvent('qbx_phone:outgoingCallStarted', function(payload)
    SendNUIMessage({
        type = 'outgoingCallStarted',
        payload = payload
    })
end)

RegisterNetEvent('qbx_phone:callAccepted', function(payload)
    incomingCall = nil
    activeCall = payload
    startCallAnim()

    SendNUIMessage({
        type = 'callAccepted',
        payload = payload
    })
end)

RegisterNetEvent('qbx_phone:callEnded', function(payload)
    incomingCall = nil
    activeCall = nil
    stopCallAnim()

    SendNUIMessage({
        type = 'callEnded',
        payload = payload or {}
    })

    SendNUIMessage({
        type = 'callsHistoryUpdated'
    })
end)

RegisterNetEvent('qbx_phone:callFailed', function(payload)
    SendNUIMessage({
        type = 'callFailed',
        payload = payload or {}
    })
end)

CreateThread(function()
    while true do
        if incomingCall and IsControlJustPressed(0, 322) then
            TriggerServerEvent('qbx_phone:declineCall', {
                callId = incomingCall.callId
            })
        end

        Wait(0)
    end
end)
