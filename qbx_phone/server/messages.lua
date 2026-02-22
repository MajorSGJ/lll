local lastMessageTime = {}

lib.callback.register('qbx_phone:getConversations', function(source)
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return {}
    end

    local metadata = Player.PlayerData.metadata or {}
    local myNumber = metadata.phoneNumber
    if not myNumber or myNumber == '' then
        return {}
    end

    local conversations = MySQL.query.await([[ 
        SELECT
            m.sender,
            m.receiver,
            m.message,
            m.timestamp,
            CASE WHEN m.sender = ? THEN m.receiver ELSE m.sender END AS other_number,
            (
                SELECT COUNT(*)
                FROM phone_messages pm
                WHERE pm.receiver = ?
                  AND pm.sender = CASE WHEN m.sender = ? THEN m.receiver ELSE m.sender END
                  AND pm.is_read = 0
            ) AS unread_count
        FROM phone_messages m
        WHERE m.id IN (
            SELECT MAX(id)
            FROM phone_messages
            WHERE sender = ? OR receiver = ?
            GROUP BY CASE WHEN sender = ? THEN receiver ELSE sender END
        )
        ORDER BY m.timestamp DESC
    ]], { myNumber, myNumber, myNumber, myNumber, myNumber, myNumber })

    return conversations or {}
end)

lib.callback.register('qbx_phone:getMessages', function(source, theirNumber)
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return {}
    end

    local metadata = Player.PlayerData.metadata or {}
    local myNumber = metadata.phoneNumber
    if not myNumber or myNumber == '' or not theirNumber or theirNumber == '' then
        return {}
    end

    local messages = MySQL.query.await(
        'SELECT id, sender, receiver, message, timestamp, is_read FROM phone_messages WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?) ORDER BY timestamp DESC LIMIT ?',
        { myNumber, theirNumber, theirNumber, myNumber, Config.MaxMessages }
    )

    return messages or {}
end)

RegisterNetEvent('qbx_phone:sendMessage', function(data)
    local source = source
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return
    end

    local metadata = Player.PlayerData.metadata or {}
    local myNumber = metadata.phoneNumber
    local citizenid = Player.PlayerData.citizenid
    local number = data and data.number
    local message = data and data.message

    if not myNumber or myNumber == '' or not number or number == '' or not message or message == '' then
        TriggerClientEvent('qbx_phone:messageFailed', source, { reason = 'invalid_data' })
        return
    end

    local receiverExists = MySQL.scalar.await('SELECT COUNT(*) FROM players WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, "$.phoneNumber")) = ?', { number }) or 0
    if receiverExists == 0 then
        TriggerClientEvent('qbx_phone:messageFailed', source, { reason = 'receiver_not_found' })
        return
    end

    local now = GetGameTimer()
    local lastTime = lastMessageTime[source] or 0
    if now - lastTime < Config.RateLimit then
        TriggerClientEvent('qbx_phone:messageFailed', source, { reason = 'rate_limit' })
        return
    end

    lastMessageTime[source] = now

    local messageTimestamp = os.time() * 1000

    MySQL.insert.await('INSERT INTO phone_messages (citizenid, sender, receiver, message) VALUES (?, ?, ?, ?)', {
        citizenid,
        myNumber,
        number,
        message
    })

    local targetSource = FindPlayerSourceByPhoneNumber(number)
    if targetSource then
        TriggerClientEvent('qbx_phone:receiveMessage', targetSource, {
            sender = myNumber,
            message = message,
            timestamp = messageTimestamp
        })
        TriggerClientEvent('qbx_phone:messagesUpdated', targetSource)
    end

    TriggerClientEvent('qbx_phone:messageSent', source, {
        number = number,
        message = message,
        timestamp = messageTimestamp
    })
    TriggerClientEvent('qbx_phone:messagesUpdated', source)
end)

RegisterNetEvent('qbx_phone:markAsRead', function(data)
    local source = source
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return
    end

    local metadata = Player.PlayerData.metadata or {}
    local myNumber = metadata.phoneNumber
    local theirNumber = data and data.number

    if not myNumber or myNumber == '' or not theirNumber or theirNumber == '' then
        return
    end

    MySQL.update.await('UPDATE phone_messages SET is_read = 1 WHERE receiver = ? AND sender = ? AND is_read = 0', {
        myNumber,
        theirNumber
    })

    TriggerClientEvent('qbx_phone:messagesUpdated', source)
end)
