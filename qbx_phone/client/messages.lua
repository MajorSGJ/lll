local currentChatNumber = nil

RegisterNUICallback('getConversations', function(_, cb)
    local result = lib.callback.await('qbx_phone:getConversations')
    cb(result or {})
end)

RegisterNUICallback('getMessages', function(data, cb)
    local result = lib.callback.await('qbx_phone:getMessages', false, data.number)
    cb(result or {})
end)

RegisterNUICallback('sendMessage', function(data, cb)
    TriggerServerEvent('qbx_phone:sendMessage', {
        number = data.number,
        message = data.message
    })
    cb({})
end)

RegisterNUICallback('markAsRead', function(data, cb)
    TriggerServerEvent('qbx_phone:markAsRead', {
        number = data.number
    })
    cb({})
end)

RegisterNUICallback('openChat', function(data, cb)
    currentChatNumber = data.number
    cb({})
end)

RegisterNUICallback('closeChat', function(_, cb)
    currentChatNumber = nil
    cb({})
end)

RegisterNetEvent('qbx_phone:receiveMessage', function(messageData)
    if phoneOpen then
        if currentChatNumber == messageData.sender then
            SendNUIMessage({
                type = 'newMessage',
                message = messageData
            })
        else
            SendNUIMessage({
                type = 'pushNotification',
                app = 'SMS',
                title = messageData.sender,
                body = messageData.message,
                sender = messageData.sender
            })
        end
    else
        SendNUIMessage({
            type = 'pushNotification',
            app = 'SMS',
            title = messageData.sender,
            body = messageData.message,
            sender = messageData.sender
        })
    end

    SendNUIMessage({
        type = 'conversationsUpdated'
    })
end)

RegisterNetEvent('qbx_phone:messageSent', function(payload)
    SendNUIMessage({
        type = 'messageSent',
        payload = payload
    })
end)

RegisterNetEvent('qbx_phone:messageFailed', function(payload)
    SendNUIMessage({
        type = 'sendFailed',
        payload = payload or {}
    })
end)

RegisterNetEvent('qbx_phone:messagesUpdated', function()
    SendNUIMessage({
        type = 'conversationsUpdated'
    })
end)
