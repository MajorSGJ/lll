local function GeneratePhoneNumber()
    local number

    repeat
        number = string.format('555-%04d', math.random(1000, 9999))
    until MySQL.scalar.await('SELECT COUNT(*) FROM players WHERE JSON_EXTRACT(metadata, "$.phoneNumber") = ?', { number }) == 0

    return number
end

AddEventHandler('qbx_core:playerLoaded', function(playerSource)
    local source = playerSource
    local Player = exports.qbx_core:GetPlayer(source)

    if not Player then
        return
    end

    local metadata = Player.PlayerData.metadata or {}
    local phoneNumber = metadata.phoneNumber

    if not phoneNumber or phoneNumber == '' then
        local generatedNumber = GeneratePhoneNumber()
        Player.Functions.SetMetaData('phoneNumber', generatedNumber)
    end
end)

RegisterNetEvent('qbx_phone:getPlayerData', function()
    local source = source
    local Player = exports.qbx_core:GetPlayer(source)

    if not Player then
        return
    end

    local charinfo = Player.PlayerData.charinfo or {}
    local metadata = Player.PlayerData.metadata or {}

    TriggerClientEvent('qbx_phone:receivePlayerData', source, {
        phoneNumber = metadata.phoneNumber,
        firstName = charinfo.firstname,
        lastName = charinfo.lastname,
        citizenid = Player.PlayerData.citizenid,
        bankingEnabled = Config.BankingIntegration
    })
end)

lib.callback.register('qbx_phone:getPhoneNumber', function(source, citizenid)
    local Player = exports.qbx_core:GetPlayer(source)

    if not Player then
        return nil
    end

    if not citizenid or citizenid == Player.PlayerData.citizenid then
        local metadata = Player.PlayerData.metadata or {}
        return metadata.phoneNumber
    end

    local number = MySQL.scalar.await('SELECT JSON_EXTRACT(metadata, "$.phoneNumber") FROM players WHERE citizenid = ?', { citizenid })

    if type(number) == 'string' then
        number = number:gsub('^"(.*)"$', '%1')
    end

    return number
end)

function GetPhoneNumberFromPlayer(player)
    if not player then
        return nil
    end

    local metadata = player.PlayerData.metadata or {}
    return metadata.phoneNumber
end

function FindPlayerSourceByPhoneNumber(number)
    local players = GetPlayers()

    for i = 1, #players do
        local playerSource = tonumber(players[i])
        local targetPlayer = exports.qbx_core:GetPlayer(playerSource)

        if targetPlayer then
            local targetNumber = GetPhoneNumberFromPlayer(targetPlayer)
            if targetNumber == number then
                return playerSource
            end
        end
    end

    return nil
end

RegisterNetEvent('qbx_phone:startSms', function(data)
    local source = source
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return
    end

    local number = data and data.number
    local message = data and data.message
    if not number or number == '' or not message or message == '' then
        return
    end

    local citizenid = Player.PlayerData.citizenid
    local senderNumber = GetPhoneNumberFromPlayer(Player)
    if not senderNumber then
        return
    end

    MySQL.insert.await('INSERT INTO phone_messages (citizenid, sender, receiver, message) VALUES (?, ?, ?, ?)', {
        citizenid,
        senderNumber,
        number,
        message
    })

    TriggerClientEvent('qbx_phone:smsSent', source, {
        number = number,
        message = message
    })

    local targetSource = FindPlayerSourceByPhoneNumber(number)
    if targetSource then
        TriggerClientEvent('qbx_phone:smsReceived', targetSource, {
            sender = senderNumber,
            message = message
        })
    end
end)
