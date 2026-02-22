RegisterNUICallback('getTwitterProfile', function(_, cb)
    local result = lib.callback.await('qbx_phone:getTwitterProfile')
    cb(result or { username = 'unknown' })
end)

RegisterNUICallback('getTweets', function(data, cb)
    local result = lib.callback.await('qbx_phone:getTweets', false, data and data.page or 0)
    cb(result or {})
end)

RegisterNUICallback('postTweet', function(data, cb)
    local result = lib.callback.await('qbx_phone:postTweet', false, {
        message = data and data.message
    })
    cb(result or { success = false, error = 'unknown_error' })
end)

RegisterNUICallback('likeTweet', function(data, cb)
    local result = lib.callback.await('qbx_phone:likeTweet', false, data and data.id)
    cb(result or { success = false, error = 'unknown_error' })
end)

RegisterNUICallback('deleteTweet', function(data, cb)
    local result = lib.callback.await('qbx_phone:deleteTweet', false, data and data.id)
    cb(result or { success = false, error = 'unknown_error' })
end)

RegisterNUICallback('setTwitterUsername', function(data, cb)
    local result = lib.callback.await('qbx_phone:setTwitterUsername', false, data and data.username)
    cb(result or { success = false, error = 'unknown_error' })
end)

RegisterNetEvent('qbx_phone:tweetsUpdated', function()
    SendNUIMessage({
        type = 'tweetsUpdated'
    })
end)

RegisterNetEvent('qbx_phone:pushNotification', function(payload)
    SendNUIMessage({
        type = 'pushNotification',
        app = payload and payload.app,
        title = payload and payload.title,
        body = payload and payload.body,
        sender = payload and payload.sender,
        icon = payload and payload.icon
    })
end)
