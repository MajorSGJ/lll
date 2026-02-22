RegisterNUICallback('getContacts', function(_, cb)
    local result = lib.callback.await('qbx_phone:getContacts')
    cb(result or {})
end)

RegisterNUICallback('addContact', function(data, cb)
    TriggerServerEvent('qbx_phone:addContact', {
        name = data.name,
        number = data.number,
        avatar = data.avatar
    })
    cb({})
end)

RegisterNUICallback('editContact', function(data, cb)
    TriggerServerEvent('qbx_phone:editContact', {
        id = data.id,
        name = data.name,
        number = data.number,
        avatar = data.avatar
    })
    cb({})
end)

RegisterNUICallback('deleteContact', function(data, cb)
    TriggerServerEvent('qbx_phone:deleteContact', {
        id = data.id
    })
    cb({})
end)

RegisterNUICallback('startSms', function(data, cb)
    TriggerServerEvent('qbx_phone:startSms', {
        number = data.number,
        message = data.message
    })
    cb({})
end)

RegisterNetEvent('qbx_phone:contactsUpdated', function(contacts)
    SendNUIMessage({
        type = 'contactsUpdated',
        contacts = contacts
    })
end)

RegisterNetEvent('qbx_phone:smsSent', function(payload)
    SendNUIMessage({
        type = 'smsSent',
        payload = payload or {}
    })
end)

RegisterNetEvent('qbx_phone:smsReceived', function(payload)
    SendNUIMessage({
        type = 'smsReceived',
        payload = payload or {}
    })
end)
