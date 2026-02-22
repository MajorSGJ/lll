RegisterNetEvent('qbx_phone:notifyPlayer', function(targetSource, payload)
    local source = source
    if type(targetSource) ~= 'number' then
        return
    end

    local Player = exports.qbx_core:GetPlayer(source)
    local Target = exports.qbx_core:GetPlayer(targetSource)
    if not Player or not Target then
        return
    end

    TriggerClientEvent('qbx_phone:pushNotification', targetSource, payload or {})
end)

RegisterNetEvent('qbx_phone:broadcastNotification', function(payload)
    local source = source
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return
    end

    TriggerClientEvent('qbx_phone:pushNotification', -1, payload or {})
end)
