local function GetContacts(citizenid)
    local contacts = MySQL.query.await('SELECT id, name, number, avatar FROM phone_contacts WHERE citizenid = ? ORDER BY name ASC', { citizenid })
    return contacts or {}
end

lib.callback.register('qbx_phone:getContacts', function(source)
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return {}
    end

    local citizenid = Player.PlayerData.citizenid
    return GetContacts(citizenid)
end)

RegisterNetEvent('qbx_phone:addContact', function(data)
    local source = source
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return
    end

    local citizenid = Player.PlayerData.citizenid
    local totalContacts = MySQL.scalar.await('SELECT COUNT(*) FROM phone_contacts WHERE citizenid = ?', { citizenid }) or 0

    if totalContacts >= Config.MaxContacts then
        local contacts = GetContacts(citizenid)
        TriggerClientEvent('qbx_phone:contactsUpdated', source, contacts)
        return
    end

    MySQL.insert.await('INSERT INTO phone_contacts (citizenid, name, number, avatar) VALUES (?, ?, ?, ?)', {
        citizenid,
        data and data.name,
        data and data.number,
        data and data.avatar
    })

    local contacts = GetContacts(citizenid)
    TriggerClientEvent('qbx_phone:contactsUpdated', source, contacts)
end)

RegisterNetEvent('qbx_phone:editContact', function(data)
    local source = source
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return
    end

    local citizenid = Player.PlayerData.citizenid

    MySQL.update.await('UPDATE phone_contacts SET name = ?, number = ?, avatar = ? WHERE id = ? AND citizenid = ?', {
        data and data.name,
        data and data.number,
        data and data.avatar,
        data and data.id,
        citizenid
    })

    local contacts = GetContacts(citizenid)
    TriggerClientEvent('qbx_phone:contactsUpdated', source, contacts)
end)

RegisterNetEvent('qbx_phone:deleteContact', function(data)
    local source = source
    local Player = exports.qbx_core:GetPlayer(source)
    if not Player then
        return
    end

    local citizenid = Player.PlayerData.citizenid

    MySQL.update.await('DELETE FROM phone_contacts WHERE id = ? AND citizenid = ?', {
        data and data.id,
        citizenid
    })

    local contacts = GetContacts(citizenid)
    TriggerClientEvent('qbx_phone:contactsUpdated', source, contacts)
end)
