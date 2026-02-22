local pendingCalls = {}
local activeCalls = {}
local playerCallIndex = {}

local function setPlayerCall(playerSource, callId)
    playerCallIndex[playerSource] = callId
end

local function clearPlayerCall(playerSource)
    playerCallIndex[playerSource] = nil
end

local function isPlayerBusy(playerSource)
    return playerCallIndex[playerSource] ~= nil
end

local function setCallChannel(playerSource, channelId)
    if not playerSource then
        return
    end

    local voipResource = Config.VoipResource or 'pma-voice'
    if GetResourceState(voipResource) ~= 'started' then
        return
    end

    if voipResource == 'pma-voice' then
        pcall(function()
            exports['pma-voice']:setPlayerChannel(playerSource, channelId)
        end)
    end
end

local function clearCallChannel(playerSource)
    setCallChannel(playerSource, 0)
end

local function saveCallHistory(citizenid, callerNumber, receiverNumber, duration, callType)
    MySQL.insert.await(
        'INSERT INTO phone_calls (citizenid, caller, receiver, duration, call_type) VALUES (?, ?, ?, ?, ?)',
        { citizenid, callerNumber, receiverNumber, duration, callType }
    )
end

local function getCitizenIdFromSource(playerSource)
    local Player = exports.qbx_core:GetPlayer(playerSource)
    if Player and Player.PlayerData and Player.PlayerData.citizenid then
        return Player.PlayerData.citizenid
    end

    return 'unknown'
end

local function resolveCallerSource(data)
    if not data then
        return nil
    end

    return data.callerSource
end

RegisterNetEvent('qbx_phone:startCall', function(data)
    local source = source
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return
    end

    local number = data and data.number
    local callerNumber = GetPhoneNumberFromPlayer(Player)

    if not number or number == '' then
        TriggerClientEvent('qbx_phone:callFailed', source, { reason = 'invalid_number' })
        return
    end

    if not callerNumber or callerNumber == number then
        TriggerClientEvent('qbx_phone:callFailed', source, { reason = 'invalid_target' })
        return
    end

    if isPlayerBusy(source) then
        TriggerClientEvent('qbx_phone:callFailed', source, { reason = 'busy' })
        return
    end

    local targetSource = FindPlayerSourceByPhoneNumber(number)
    if not targetSource then
        TriggerClientEvent('qbx_phone:callFailed', source, { reason = 'offline' })
        return
    end

    if isPlayerBusy(targetSource) then
        TriggerClientEvent('qbx_phone:callFailed', source, { reason = 'busy' })
        return
    end

    local callId = ('%s_%s'):format(source, GetGameTimer())
    local channelId = math.random(10000, 99999)

    pendingCalls[callId] = {
        callId = callId,
        callerSource = source,
        receiverSource = targetSource,
        callerNumber = callerNumber,
        receiverNumber = number,
        channelId = channelId,
        createdAt = os.time()
    }

    setPlayerCall(source, callId)
    setPlayerCall(targetSource, callId)

    TriggerClientEvent('qbx_phone:outgoingCallStarted', source, {
        callId = callId,
        number = number
    })

    TriggerClientEvent('qbx_phone:incomingCall', targetSource, {
        callId = callId,
        number = callerNumber
    })

    SetTimeout(30000, function()
        local pending = pendingCalls[callId]
        if not pending then
            return
        end

        pendingCalls[callId] = nil
        clearPlayerCall(pending.callerSource)
        clearPlayerCall(pending.receiverSource)

        TriggerClientEvent('qbx_phone:callEnded', pending.callerSource, {
            reason = 'timeout'
        })
        TriggerClientEvent('qbx_phone:callEnded', pending.receiverSource, {
            reason = 'missed'
        })

        local callerCitizenId = getCitizenIdFromSource(pending.callerSource)
        saveCallHistory(callerCitizenId, pending.callerNumber, pending.receiverNumber, 0, 'missed')
    end)
end)

RegisterNetEvent('qbx_phone:acceptCall', function(data)
    local source = source
    local callId = data and data.callId
    local pending = pendingCalls[callId]

    if not pending then
        return
    end

    if pending.receiverSource ~= source then
        return
    end

    pendingCalls[callId] = nil
    activeCalls[callId] = {
        callId = callId,
        callerSource = pending.callerSource,
        receiverSource = pending.receiverSource,
        callerNumber = pending.callerNumber,
        receiverNumber = pending.receiverNumber,
        channelId = pending.channelId,
        startedAt = os.time()
    }

    setCallChannel(pending.callerSource, pending.channelId)
    setCallChannel(pending.receiverSource, pending.channelId)

    local payload = {
        callId = callId,
        number = pending.callerNumber,
        channelId = pending.channelId,
        startedAt = os.time() * 1000
    }

    TriggerClientEvent('qbx_phone:callAccepted', pending.callerSource, {
        callId = callId,
        number = pending.receiverNumber,
        channelId = pending.channelId,
        startedAt = payload.startedAt
    })
    TriggerClientEvent('qbx_phone:callAccepted', pending.receiverSource, payload)
end)

RegisterNetEvent('qbx_phone:declineCall', function(data)
    local source = source
    local callId = data and data.callId
    local pending = pendingCalls[callId]

    if not pending then
        return
    end

    pendingCalls[callId] = nil
    clearPlayerCall(pending.callerSource)
    clearPlayerCall(pending.receiverSource)

    local callerSource = resolveCallerSource(pending)
    local targetSource = source == pending.callerSource and pending.receiverSource or pending.callerSource

    TriggerClientEvent('qbx_phone:callEnded', callerSource, { reason = 'declined' })
    TriggerClientEvent('qbx_phone:callEnded', targetSource, { reason = 'declined' })

    local callerCitizenId = getCitizenIdFromSource(pending.callerSource)
    saveCallHistory(callerCitizenId, pending.callerNumber, pending.receiverNumber, 0, 'missed')
end)

RegisterNetEvent('qbx_phone:endCall', function(data)
    local source = source
    local callId = data and data.callId or playerCallIndex[source]
    local call = activeCalls[callId]

    if not call then
        return
    end

    activeCalls[callId] = nil
    clearPlayerCall(call.callerSource)
    clearPlayerCall(call.receiverSource)

    clearCallChannel(call.callerSource)
    clearCallChannel(call.receiverSource)

    local duration = math.max(os.time() - (call.startedAt or os.time()), 0)
    local callerCitizenId = getCitizenIdFromSource(call.callerSource)
    local receiverCitizenId = getCitizenIdFromSource(call.receiverSource)
    saveCallHistory(callerCitizenId, call.callerNumber, call.receiverNumber, duration, 'outgoing')
    saveCallHistory(receiverCitizenId, call.callerNumber, call.receiverNumber, duration, 'incoming')

    TriggerClientEvent('qbx_phone:callEnded', call.callerSource, { reason = 'ended' })
    TriggerClientEvent('qbx_phone:callEnded', call.receiverSource, { reason = 'ended' })
end)

lib.callback.register('qbx_phone:getCallHistory', function(source)
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return {}
    end

    local metadata = Player.PlayerData.metadata or {}
    local myNumber = metadata.phoneNumber
    if not myNumber or myNumber == '' then
        return {}
    end

    local history = MySQL.query.await(
        'SELECT id, caller, receiver, duration, timestamp, call_type FROM phone_calls WHERE caller = ? OR receiver = ? ORDER BY timestamp DESC LIMIT 100',
        { myNumber, myNumber }
    )

    return history or {}
end)

AddEventHandler('playerDropped', function()
    local source = source
    local callId = playerCallIndex[source]

    if not callId then
        return
    end

    local pending = pendingCalls[callId]
    if pending then
        pendingCalls[callId] = nil
        clearPlayerCall(pending.callerSource)
        clearPlayerCall(pending.receiverSource)

        local otherSource = source == pending.callerSource and pending.receiverSource or pending.callerSource
        TriggerClientEvent('qbx_phone:callEnded', otherSource, { reason = 'ended' })
        local callerCitizenId = getCitizenIdFromSource(pending.callerSource)
        saveCallHistory(callerCitizenId, pending.callerNumber, pending.receiverNumber, 0, 'missed')
        return
    end

    local active = activeCalls[callId]
    if active then
        activeCalls[callId] = nil
        clearPlayerCall(active.callerSource)
        clearPlayerCall(active.receiverSource)
        clearCallChannel(active.callerSource)
        clearCallChannel(active.receiverSource)

        local duration = math.max(os.time() - (active.startedAt or os.time()), 0)
        local callerCitizenId = getCitizenIdFromSource(active.callerSource)
        local receiverCitizenId = getCitizenIdFromSource(active.receiverSource)
        saveCallHistory(callerCitizenId, active.callerNumber, active.receiverNumber, duration, 'outgoing')
        saveCallHistory(receiverCitizenId, active.callerNumber, active.receiverNumber, duration, 'incoming')

        local otherSource = source == active.callerSource and active.receiverSource or active.callerSource
        TriggerClientEvent('qbx_phone:callEnded', otherSource, { reason = 'ended' })
    end
end)
